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
  const walk = (rows) => {
    if (!rows) return;
    const arr = Array.isArray(rows.Row) ? rows.Row : Array.isArray(rows) ? rows : [];
    arr.forEach((row) => {
      const sum = row.Summary && row.Summary.ColData;
      const label = (sum && sum[0] && sum[0].value) ||
        (row.Header && row.Header.ColData && row.Header.ColData[0] && row.Header.ColData[0].value) || "";
      if (sum) want.forEach(([k, re]) => { if (re.test((label || "").trim()) && !found[k]) found[k] = sum; });
      if (row.Rows) walk(row.Rows);
    });
  };
  walk(rep && rep.Rows);
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
  };
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
    return json({ ...fin, year, source: "QuickBooks Profit & Loss", intuit_tid: tid });
  } catch (e) {
    console.error("[qbo] revenue sync error", { error: String(e) });
    return json({ error: String(e) });
  }
};
export const config = { path: "/api/qbo-revenue" };
