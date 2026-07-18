import { getStore } from "@netlify/blobs";
// Returns this year's transactions from QuickBooks Online (TransactionList report):
// date, type, name, account, amount — newest first, capped at 500. Used by the
// Finance page to show real activity and auto-detect recurring charges.
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
    console.error("[qbo] token refresh failed", { status: r.status, intuit_tid: tid, error: nt.error, description: nt.error_description });
    throw new Error(nt.error_description || nt.error);
  }
  const merged = { ...tok, access_token: nt.access_token, refresh_token: nt.refresh_token || tok.refresh_token, obtained: Date.now(), expires_in: nt.expires_in };
  await store.setJSON("qbo", merged);
  return merged;
}

// Pure parser for the TransactionList report. Exported for testing.
// Maps columns by title (Date, Transaction Type, Name, Memo/Description, Account,
// Amount) and walks all nested rows, returning compact records:
// { d: date, t: type, n: name (or memo fallback), a: amount, ac: account }.
export function parseTransactions(rep) {
  const cols = (rep && rep.Columns && rep.Columns.Column) || [];
  const idx = {};
  cols.forEach((c, i) => {
    const t = String(c.ColTitle || "").toLowerCase().trim();
    if (t.includes("date") && idx.d == null) idx.d = i;
    else if ((t.includes("transaction type") || t === "type") && idx.t == null) idx.t = i;
    else if (t === "name" && idx.n == null) idx.n = i;
    else if ((t.includes("memo") || t.includes("description")) && idx.m == null) idx.m = i;
    else if (t === "account" || t.includes("account name")) { if (idx.ac == null) idx.ac = i; }
    else if (t.includes("amount") && idx.a == null) idx.a = i;
  });
  const out = [];
  const walk = (rows) => {
    if (!rows) return;
    const arr = Array.isArray(rows.Row) ? rows.Row : Array.isArray(rows) ? rows : [];
    arr.forEach((r) => {
      if (r.ColData && Array.isArray(r.ColData)) {
        const g = (i) => (i != null && r.ColData[i] && r.ColData[i].value != null) ? String(r.ColData[i].value) : "";
        const d = g(idx.d);
        if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
          const a = parseFloat(g(idx.a).replace(/,/g, "")) || 0;
          out.push({ d: d.slice(0, 10), t: g(idx.t), n: g(idx.n) || g(idx.m), a, ac: g(idx.ac) });
        }
      }
      if (r.Rows) walk(r.Rows);
    });
  };
  walk(rep && rep.Rows);
  return out;
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
    const url = base + "/v3/company/" + tok.realmId + "/reports/TransactionList?start_date=" + year + "-01-01&end_date=" + year + "-12-31&minorversion=70";
    let r = await fetch(url, { headers: { authorization: "Bearer " + tok.access_token, accept: "application/json" } });
    if (r.status === 401) { tok = await refresh(store, tok, clientId, secret); r = await fetch(url, { headers: { authorization: "Bearer " + tok.access_token, accept: "application/json" } }); }
    const tid = r.headers.get("intuit_tid") || "";
    if (!r.ok) {
      console.error("[qbo] transaction list failed", { status: r.status, intuit_tid: tid, realmId: tok.realmId });
      return json({ error: "QuickBooks transactions returned " + r.status, intuit_tid: tid });
    }
    const rep = await r.json();
    const txns = parseTransactions(rep).sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 500);
    return json({ transactions: txns, count: txns.length, year, source: "QuickBooks TransactionList", intuit_tid: tid });
  } catch (e) {
    console.error("[qbo] transactions error", { error: String(e) });
    return json({ error: String(e) });
  }
};
export const config = { path: "/api/qbo-transactions" };
