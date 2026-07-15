// Reports which integrations are configured, without exposing any secrets.
// Returns booleans based on environment variables, plus QuickBooks connection
// state (whether OAuth tokens exist in the Blobs store).
import { getStore } from "@netlify/blobs";

export default async () => {
  const env = process.env;
  let qboConnected = false, qboRealm = null;
  try {
    const store = getStore("gwops");
    const tok = await store.get("qbo", { type: "json" });
    if (tok && tok.access_token) { qboConnected = true; qboRealm = tok.realmId || null; }
  } catch { /* no tokens yet */ }

  let outlookConnected = false, outlookEmail = null;
  try {
    const store = getStore("gwops");
    const tok = await store.get("outlook", { type: "json" });
    if (tok && tok.refresh_token) { outlookConnected = true; outlookEmail = tok.email || null; }
  } catch { /* no tokens yet */ }

  const body = {
    claude: !!(env.ANTHROPIC_API_KEY && String(env.ANTHROPIC_API_KEY).trim().length > 20),
    slack: !!env.SLACK_WEBHOOK_URL,
    email: !!(env.SENDGRID_API_KEY && env.SENDGRID_FROM),
    sendgridFrom: env.SENDGRID_FROM || null,
    quickbooksConfigured: !!(env.QBO_CLIENT_ID && env.QBO_CLIENT_SECRET && env.QBO_REDIRECT_URI),
    quickbooksConnected: qboConnected,
    quickbooksRealm: qboRealm,
    quickbooksEnv: env.QBO_ENV === "production" ? "production" : "sandbox",
    outlookConfigured: !!(env.MS_CLIENT_ID && env.MS_CLIENT_SECRET && env.MS_REDIRECT_URI),
    outlookConnected,
    outlookEmail,
  };
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
};

export const config = { path: "/api/status" };
