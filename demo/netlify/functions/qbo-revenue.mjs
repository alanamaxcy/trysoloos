import { getStore } from "@netlify/blobs";
// Returns year-to-date revenue (Total Income) from QuickBooks Online.
// Requires a prior successful connect (tokens stored under "qbo").
// Env vars: QBO_CLIENT_ID, QBO_CLIENT_SECRET. Set QBO_ENV=production for live data (default = sandbox).
async function refresh(store, tok, clientId, secret) {
  const basic = Buffer.from(clientId + ":" + secret).toString("base64");
  const r = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: { authorization: "Basic " + basic, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(tok.refresh_token),
  });
  const nt = await r.json();
  if (nt.error) throw new Error(nt.error_description || nt.error);
  const merged = { ...tok, access_token: nt.access_token, refresh_token: nt.refresh_token || tok.refresh_token, obtained: Date.now(), expires_in: nt.expires_in };
  await store.setJSON("qbo", merged);
  return merged;
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
    const url = base + "/v3/company/" + tok.realmId + "/reports/ProfitAndLoss?start_date=" + year + "-01-01&end_date=" + year + "-12-31&minorversion=70";
    let r = await fetch(url, { headers: { authorization: "Bearer " + tok.access_token, accept: "application/json" } });
    if (r.status === 401) { tok = await refresh(store, tok, clientId, secret); r = await fetch(url, { headers: { authorization: "Bearer " + tok.access_token, accept: "application/json" } }); }
    if (!r.ok) return json({ error: "QuickBooks report returned " + r.status });
    const rep = await r.json();
    let income = 0;
    const walk = (rows) => {
      if (!rows) return;
      const arr = Array.isArray(rows.Row) ? rows.Row : Array.isArray(rows) ? rows : [];
      arr.forEach((row) => {
        const label =
          (row.Header && row.Header.ColData && row.Header.ColData[0] && row.Header.ColData[0].value) ||
          (row.Summary && row.Summary.ColData && row.Summary.ColData[0] && row.Summary.ColData[0].value) || "";
        if (/total income/i.test(label || "")) {
          const cols = (row.Summary && row.Summary.ColData) || [];
          const v = cols.length ? parseFloat(cols[cols.length - 1].value || "0") : 0;
          if (!isNaN(v) && v) income = v;
        }
        if (row.Rows) walk(row.Rows);
      });
    };
    walk(rep.Rows);
    return json({ revenue: Math.round(income), year, source: "QuickBooks Profit & Loss" });
  } catch (e) {
    return json({ error: String(e) });
  }
};
export const config = { path: "/api/qbo-revenue" };
