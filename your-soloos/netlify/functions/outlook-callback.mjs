import { getStore } from "@netlify/blobs";
// Handles the Microsoft OAuth redirect: exchanges the code for tokens and stores them
// under the private "outlook" key (never exposed by /api/data).
// Env vars: MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI   (optional MS_TENANT, default "common")
export default async (req) => {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const authErr = u.searchParams.get("error_description") || u.searchParams.get("error");
  const clientId = process.env.MS_CLIENT_ID;
  const secret = process.env.MS_CLIENT_SECRET;
  const redirect = process.env.MS_REDIRECT_URI;
  const tenant = process.env.MS_TENANT || "common";
  if (authErr) return new Response("Outlook authorization failed: " + authErr, { status: 400 });
  if (!clientId || !secret || !redirect) return new Response("Outlook environment variables are missing.", { status: 500 });
  if (!code) return new Response("Missing authorization code from Microsoft.", { status: 400 });
  try {
    const tokenUrl = "https://login.microsoftonline.com/" + tenant + "/oauth2/v2.0/token";
    const form = new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirect,
      scope: "offline_access Mail.Send User.Read",
    });
    const r = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: form.toString(),
    });
    const tok = await r.json();
    if (tok.error) return new Response("Token exchange failed: " + (tok.error_description || tok.error), { status: 400 });
    // Best-effort: read the mailbox identity so the UI can show which account is connected.
    let email = null, name = null;
    try {
      const me = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { authorization: "Bearer " + tok.access_token, accept: "application/json" },
      });
      if (me.ok) { const j = await me.json(); email = j.mail || j.userPrincipalName || null; name = j.displayName || null; }
    } catch { /* identity is best-effort */ }
    const store = getStore("gwops");
    await store.setJSON("outlook", {
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      obtained: Date.now(),
      expires_in: tok.expires_in,
      email,
      name,
    });
    return new Response(null, { status: 302, headers: { location: "/?outlook=connected" } });
  } catch (e) {
    return new Response("Outlook callback error: " + String(e), { status: 500 });
  }
};
export const config = { path: "/api/outlook-callback" };
