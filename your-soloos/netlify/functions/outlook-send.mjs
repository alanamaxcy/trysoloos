import { getStore } from "@netlify/blobs";
// Sends an email from the connected Outlook mailbox via Microsoft Graph.
// POST { to, subject, html, cc?, bcc? }  ->  { ok:true, from } | { error }
// Requires a prior successful connect (tokens stored under "outlook").
// Env vars: MS_CLIENT_ID, MS_CLIENT_SECRET   (optional MS_TENANT, default "common")

async function refresh(store, tok, clientId, secret, tenant) {
  const tokenUrl = "https://login.microsoftonline.com/" + tenant + "/oauth2/v2.0/token";
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    grant_type: "refresh_token",
    refresh_token: tok.refresh_token,
    scope: "offline_access Mail.Send User.Read",
  });
  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: form.toString(),
  });
  const nt = await r.json();
  if (nt.error) throw new Error(nt.error_description || nt.error);
  const merged = {
    ...tok,
    access_token: nt.access_token,
    refresh_token: nt.refresh_token || tok.refresh_token,
    obtained: Date.now(),
    expires_in: nt.expires_in,
  };
  await store.setJSON("outlook", merged);
  return merged;
}

const toRecips = (s) =>
  String(s || "").split(/[,;]/).map((x) => x.trim()).filter(Boolean).map((a) => ({ emailAddress: { address: a } }));

export default async (req) => {
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const clientId = process.env.MS_CLIENT_ID;
  const secret = process.env.MS_CLIENT_SECRET;
  const tenant = process.env.MS_TENANT || "common";
  if (!clientId || !secret) return json({ error: "Outlook is not configured. Set MS_CLIENT_ID and MS_CLIENT_SECRET in Netlify." }, 400);

  let payload;
  try { payload = await req.json(); } catch { return json({ error: "Bad request body." }, 400); }
  const to = payload.to;
  const subject = payload.subject || "";
  const html = payload.html || "";
  if (!to) return json({ error: "Missing recipient (to)." }, 400);

  const store = getStore("gwops");
  let tok = null;
  try { tok = await store.get("outlook", { type: "json" }); } catch { tok = null; }
  if (!tok || !tok.refresh_token) return json({ error: "Outlook is not connected yet. Connect it in Settings -> Connections." }, 400);

  try {
    // Microsoft access tokens last ~60-90 min; refresh proactively past 50.
    if (!tok.obtained || Date.now() - tok.obtained > 50 * 60 * 1000) tok = await refresh(store, tok, clientId, secret, tenant);
    const message = {
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: toRecips(to),
        ...(payload.cc ? { ccRecipients: toRecips(payload.cc) } : {}),
        ...(payload.bcc ? { bccRecipients: toRecips(payload.bcc) } : {}),
      },
      saveToSentItems: true,
    };
    const doSend = (t) =>
      fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: { authorization: "Bearer " + t.access_token, "content-type": "application/json" },
        body: JSON.stringify(message),
      });
    let r = await doSend(tok);
    if (r.status === 401) { tok = await refresh(store, tok, clientId, secret, tenant); r = await doSend(tok); }
    if (r.status === 202) return json({ ok: true, from: tok.email || null });
    let detail = "";
    try { const e = await r.json(); detail = (e.error && (e.error.message || e.error.code)) || ""; } catch {}
    return json({ error: "Outlook send failed (" + r.status + ")" + (detail ? ": " + detail : "") }, 400);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 400);
  }
};
export const config = { path: "/api/outlook-send" };
