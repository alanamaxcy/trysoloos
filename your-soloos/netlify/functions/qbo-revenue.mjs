import { getStore } from "@netlify/blobs";
// Returns year-to-date financials from QuickBooks Online: income, expenses, net
// profit, and a month-by-month breakdown, parsed from the Profit & Loss report.
// Keeps `revenue` (= total income) for backward compatibility with older clients.
// Requires a prior successful connect (tokens stored under "qbo").
// Env vars: QBO_CLIENT_ID, QBO_CLIENT_SECRET. Set QBO_ENV=production for live data (default = sandbox).
async function refresh(store, tok, clientId, secret) {
  const basic = Buffer.from(clientId + ":" + secret).toString("base64");
  const r = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: { authorization: "Basic " + basic, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(tok.refresh_token),
  });
  const tid = r.headers.get("intuit_tid") || "";
  const nt = await r.json();
  if (nt.error) {
    // Log with Intuit's transaction id (intuit_tid) so failures can be traced in support.
    console.error("[qbo] token refresh failed", { status: r.status, intuit_tid: tid, error: nt.error, description: nt.error_description });
    throw new Error(nt.error_description || nt.error);
  }
  const merged = { ...tok, access_token: nt.access_token, refresh_token: nt.refresh_token || tok.refresh_token, obtained: Date.now(), expires_in: nt.expires_in };
  await store.setJSON("qbo", merged);
  return merged;
}

// Pure parser for a Month-summarized Profit & Loss report. Exported for testing.
// Walks the report's summary rows (Total Income / Total Cost of Goods Sold /
// Total Expenses / Net Income) and reads each month column plus the Total column.
export function parsePnl(rep) {
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const cols = (rep && rep.Columns && rep.Columns.Column) || [];
  const nCols = cols.length;
  const totalIdx = nCols > 0 ? nCols - 1 : 0;
  // Column 0 is the account label; the last column is the row Total; the rest are months.
  const monthCols = [];
  for (let i = 1; i < totalIdx; i++) monthCols.push({ idx: i, label: (cols[i].ColTitle || "").trim() });
  const found = {};
  const want = [
    ["income", /^total income$/i],
    ["cogs", /^total cost of goods sold$/i],
    ["expenses", /^total expenses$/i],
    ["net", /^net income$/i],
  ];
  // Also collect leaf account rows per section (income / cogs / expenses) so the
  // app can show a real category breakdown with monthly trends.
  const cats = { income: [], cogs: [], expenses: [] };
  const walk = (rows, section) => {
    if (!rows) return;
    const arr = Array.isArray(rows.Row) ? rows.Row : Array.isArray(rows) ? rows : [];
    arr.forEach((row) => {
      const sum = row.Summary && row.Summary.ColData;
      const hdr = row.Header && row.Header.ColData && row.Header.ColData[0] && row.Header.ColData[0].value;
      const label = (sum && sum[0] && sum[0].value) || hdr || "";
      if (sum) want.forEach(([k, re]) => { if (re.test((label || "").trim()) && !found[k]) found[k] = sum; });
      let sec = section;
      if (hdr) {
        const h = String(hdr).trim().toLowerCase();
        if (h === "income") sec = "income"; else if (h === "cost of goods sold") sec = "cogs"; else if (h === "expenses") sec = "expenses";
      }
      if (sec && row.ColData && Array.isArray(row.ColData)) {
        const name = row.ColData[0] && row.ColData[0].value;
        if (name) {
          const total = num(row.ColData[totalIdx] && row.ColData[totalIdx].value);
          const ms = monthCols.map((mc) => Math.round(num(row.ColData[mc.idx] && row.ColData[mc.idx].value)));
          if (total || ms.some((v) => v)) cats[sec].push({ name: String(name).slice(0, 50), total: Math.round(total), months: ms });
        }
      }
      if (row.Rows) walk(row.Rows, sec);
    });
  };
  walk(rep && rep.Rows, null);
  const at = (k, idx) => (found[k] && found[k][idx] && found[k][idx].value != null) ? num(found[k][idx].value) : 0;
  const totIncome = at("income", totalIdx), totCogs = at("cogs", totalIdx), totExp = at("expenses", totalIdx);
  const totNet = found.net ? at("net", totalIdx) : (totIncome - totCogs - totExp);
  const months = monthCols.map((mc) => {
    const inc = at("income", mc.idx), cog = at("cogs", mc.idx), exp = at("expenses", mc.idx);
    const net = found.net ? at("net", mc.idx) : (inc - cog - exp);
    return { month: mc.label, income: Math.round(inc), expenses: Math.round(cog + exp), netProfit: Math.round(net) };
  });
  return {
    revenue: Math.round(totIncome), // backward compatible
    income: Math.round(totIncome),
    cogs: Math.round(totCogs),
    expenses: Math.round(totCogs + totExp),
    netProfit: Math.round(totNet),
    months,
    incomeCats: cats.income.sort((a, b) => b.total - a.total).slice(0, 8),
    expenseCats: cats.cogs.concat(cats.expenses).sort((a, b) => b.total - a.total).slice(0, 12),
  };
}

// Pure parser for the AgedReceivableSummary report: who owes you money, by
// aging bucket. Exported for testing.
export function parseAging(rep) {
  const num = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(/,/g, "")); return isNaN(n) ? 0 : n; };
  const cols = (rep && rep.Columns && rep.Columns.Column) || [];
  const idx = {};
  cols.forEach((c, i) => {
    const t = String(c.ColTitle || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (t === "current") idx.current = i;
    else if (/^1\s*-\s*30/.test(t)) idx.d30 = i;
    else if (/^31\s*-\s*60/.test(t)) idx.d60 = i;
    else if (/^61\s*-\s*90/.test(t)) idx.d90 = i;
    else if (/91|over/.test(t)) idx.d90p = i;
    else if (t === "total") idx.total = i;
  });
  const customers = [];
  const walk = (rows) => {
    if (!rows) return;
    const arr = Array.isArray(rows.Row) ? rows.Row : Array.isArray(rows) ? rows : [];
    arr.forEach((r) => {
      if (r.ColData && Array.isArray(r.ColData)) {
        const name = r.ColData[0] && r.ColData[0].value;
        const total = num(idx.total != null && r.ColData[idx.total] && r.ColData[idx.total].value);
        if (name && total) {
          const cur = num(idx.current != null && r.ColData[idx.current] && r.ColData[idx.current].value);
          customers.push({ name: String(name).slice(0, 50), total: Math.round(total), overdue: Math.round(total - cur) });
        }
      }
      if (r.Rows) walk(r.Rows);
    });
  };
  walk(rep && rep.Rows);
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90p: 0 };
  // Recompute buckets by re-walking (customer rows carry the per-bucket columns)
  const walk2 = (rows) => {
    if (!rows) return;
    const arr = Array.isArray(rows.Row) ? rows.Row : Array.isArray(rows) ? rows : [];
    arr.forEach((r) => {
      if (r.ColData && Array.isArray(r.ColData) && r.ColData[0] && r.ColData[0].value && idx.total != null && num(r.ColData[idx.total] && r.ColData[idx.total].value)) {
        ["current", "d30", "d60", "d90", "d90p"].forEach((k) => { if (idx[k] != null) buckets[k] += num(r.ColData[idx[k]] && r.ColData[idx[k]].value); });
      }
      if (r.Rows) walk2(r.Rows);
    });
  };
  walk2(rep && rep.Rows);
  Object.keys(buckets).forEach((k) => buckets[k] = Math.round(buckets[k]));
  const total = Math.round(customers.reduce((s, c) => s + c.total, 0));
  return { total, buckets, customers: customers.sort((a, b) => b.total - a.total).slice(0, 10) };
}

export default async (req) => {
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  const clientId = process.env.QBO_CLIENT_ID;
  const secret = process.env.QBO_CLIENT_SECRET;
  if (!clientId || !secret) return json({ error: "QuickBooks environment variables are missing." });
  const store = getStore("gwops");
  let tok = null;
  try { tok = await store.get("qbo", { type: "json" }); } catch { tok = null; }
  if (!tok || !tok.refresh_token) return json({ error: "QuickBooks is not connected yet. Click Connect first." });
  try {
    if (!tok.obtained || Date.now() - tok.obtained > 50 * 60 * 1000) tok = await refresh(store, tok, clientId, secret);
    const base = process.env.QBO_ENV === "production" ? "https://quickbooks.api.intuit.com" : "https://sandbox-quickbooks.api.intuit.com";
    const year = new Date().getFullYear();
    const url = base + "/v3/company/" + tok.realmId + "/reports/ProfitAndLoss?start_date=" + year + "-01-01&end_date=" + year + "-12-31&summarize_column_by=Month&minorversion=70";
    let r = await fetch(url, { headers: { authorization: "Bearer " + tok.access_token, accept: "application/json" } });
    if (r.status === 401) { tok = await refresh(store, tok, clientId, secret); r = await fetch(url, { headers: { authorization: "Bearer " + tok.access_token, accept: "application/json" } }); }
    // Capture Intuit's transaction id from the response so any failure can be traced in support.
    const tid = r.headers.get("intuit_tid") || "";
    if (!r.ok) {
      console.error("[qbo] report request failed", { status: r.status, intuit_tid: tid, realmId: tok.realmId });
      return json({ error: "QuickBooks report returned " + r.status, intuit_tid: tid });
    }
    const rep = await r.json();
    const fin = parsePnl(rep);
    // Also pull receivables aging (who owes you money). Non-fatal if unavailable.
    let ar = null;
    try {
      const ra = await fetch(base + "/v3/company/" + tok.realmId + "/reports/AgedReceivableSummary?minorversion=70",
        { headers: { authorization: "Bearer " + tok.access_token, accept: "application/json" } });
      if (ra.ok) ar = parseAging(await ra.json());
      else console.error("[qbo] AR report failed", { status: ra.status, intuit_tid: ra.headers.get("intuit_tid") || "" });
    } catch (e) { console.error("[qbo] AR fetch error", { error: String(e) }); }
    // Also pull last year's P&L so the app can filter charts to "Last year" and
    // show year-over-year comparisons. Non-fatal if unavailable.
    let prev = null;
    try {
      const py = year - 1;
      const pu = base + "/v3/company/" + tok.realmId + "/reports/ProfitAndLoss?start_date=" + py + "-01-01&end_date=" + py + "-12-31&summarize_column_by=Month&minorversion=70";
      const pr = await fetch(pu, { headers: { authorization: "Bearer " + tok.access_token, accept: "application/json" } });
      if (pr.ok) { const pp = parsePnl(await pr.json()); prev = { year: py, income: pp.income, expenses: pp.expenses, cogs: pp.cogs, netProfit: pp.netProfit, months: pp.months }; }
      else console.error("[qbo] prior-year report failed", { status: pr.status, intuit_tid: pr.headers.get("intuit_tid") || "" });
    } catch (e) { console.error("[qbo] prior-year fetch error", { error: String(e) }); }
    return json({ ...fin, ar, prev, year, source: "QuickBooks Profit & Loss", intuit_tid: tid });
  } catch (e) {
    console.error("[qbo] revenue sync error", { error: String(e) });
    return json({ error: String(e) });
  }
};
export const config = { path: "/api/qbo-revenue" };
