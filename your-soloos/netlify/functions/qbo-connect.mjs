// Starts the QuickBooks Online OAuth flow.
// Env vars: QBO_CLIENT_ID, QBO_REDIRECT_URI
//   QBO_REDIRECT_URI must exactly match the redirect URI in your Intuit app,
//   e.g. https://YOURSITE.netlify.app/api/qbo-callback
export default async (req) => {
  const clientId = process.env.QBO_CLIENT_ID;
  const redirect = process.env.QBO_REDIRECT_URI;
  if (!clientId || !redirect) {
    return new Response(
      "QuickBooks is not configured yet.\n\nSet QBO_CLIENT_ID, QBO_CLIENT_SECRET, and QBO_REDIRECT_URI in your Netlify environment variables (Site settings -> Environment variables), then try Connect again.\n\nSee the README section 'QuickBooks setup' for the full steps.",
      { status: 200, headers: { "content-type": "text/plain" } }
    );
  }
  // CSRF protection: generate a random state, send it to Intuit, and also stash
  // it in a short-lived HttpOnly cookie. qbo-callback verifies the two match, so
  // a forged callback (one this app didn't initiate) is rejected.
  const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const auth =
    "https://appcenter.intuit.com/connect/oauth2" +
    "?client_id=" + encodeURIComponent(clientId) +
    "&response_type=code" +
    "&scope=" + encodeURIComponent("com.intuit.quickbooks.accounting") +
    "&redirect_uri=" + encodeURIComponent(redirect) +
    "&state=" + state;
  const cookie = "qbo_state=" + state + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600";
  return new Response(null, { status: 302, headers: { location: auth, "set-cookie": cookie } });
};
export const config = { path: "/api/qbo-connect" };
