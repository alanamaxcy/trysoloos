import { getStore } from "@netlify/blobs";
// Handles the QuickBooks OAuth redirect: exchanges the code for tokens and stores them.
// Env vars: QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_REDIRECT_URI
export default async (req) => {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const realmId = u.searchParams.get("realmId");
  const clientId = process.env.QBO_CLIENT_ID;
  const secret = process.env.QBO_CLIENT_SECRET;
  const redirect = process.env.QBO_REDIRECT_URI;
  if (!clientId || !secret || !redirect) return new Response("QuickBooks environment variables are missing.", { status: 500 });
  if (!code || !realmId) return new Response("Missing code or realmId from QuickBooks.", { status: 400 });
  try {
    const basic = Buffer.from(clientId + ":" + secret).toString("base64");
    const r = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        authorization: "Basic " + basic,
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body:
        "grant_type=authorization_code&code=" + encodeURIComponent(code) +
        "&redirect_uri=" + encodeURIComponent(redirect),
    });
    const tok = await r.json();
    if (tok.error) return new Response("Token exchange failed: " + (tok.error_description || tok.error), { status: 400 });
    const store = getStore("gwops");
    await store.setJSON("qbo", {
      realmId,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      obtained: Date.now(),
      expires_in: tok.expires_in,
    });
    return new Response(null, { status: 302, headers: { location: "/?qbo=connected" } });
  } catch (e) {
    return new Response("QuickBooks callback error: " + String(e), { status: 500 });
  }
};
export const config = { path: "/api/qbo-callback" };
