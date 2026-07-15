// Starts the Microsoft (Outlook) OAuth flow for sending mail via Microsoft Graph.
// Env vars: MS_CLIENT_ID, MS_REDIRECT_URI   (optional MS_TENANT, default "common")
//   MS_REDIRECT_URI must exactly match a Web redirect URI in your Azure app registration,
//   e.g. https://YOURSITE.netlify.app/api/outlook-callback
export default async (req) => {
  const clientId = process.env.MS_CLIENT_ID;
  const redirect = process.env.MS_REDIRECT_URI;
  const tenant = process.env.MS_TENANT || "common";
  if (!clientId || !redirect) {
    return new Response(
      "Outlook is not configured yet.\n\nSet MS_CLIENT_ID, MS_CLIENT_SECRET, and MS_REDIRECT_URI in your Netlify environment variables (Site settings -> Environment variables), then try Connect again.\n\nSee the README section 'Outlook setup' for the full steps.",
      { status: 200, headers: { "content-type": "text/plain" } }
    );
  }
  const state = Math.random().toString(36).slice(2);
  const scope = "offline_access Mail.Send User.Read";
  const auth =
    "https://login.microsoftonline.com/" + encodeURIComponent(tenant) + "/oauth2/v2.0/authorize" +
    "?client_id=" + encodeURIComponent(clientId) +
    "&response_type=code" +
    "&redirect_uri=" + encodeURIComponent(redirect) +
    "&response_mode=query" +
    "&scope=" + encodeURIComponent(scope) +
    "&state=" + state;
  return new Response(null, { status: 302, headers: { location: auth } });
};
export const config = { path: "/api/outlook-connect" };
