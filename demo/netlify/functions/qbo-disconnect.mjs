import { getStore } from "@netlify/blobs";
// Clears the stored QuickBooks connection (tokens) for this site.
// Serves two purposes:
//   1. Intuit's app "Disconnect URL" — Intuit calls this when a user disconnects
//      the app from within QuickBooks Online (Apps -> Manage -> Disconnect).
//   2. The in-app "Disconnect" action.
// No secrets required: it only deletes the locally stored "qbo" token blob.
export default async (req) => {
  const store = getStore("gwops");
  try {
    await store.delete("qbo");
  } catch (e) {
    // Already gone or store unavailable — treat as disconnected either way.
  }
  // Intuit expects a simple 200 for its server-to-server disconnect call.
  // A browser hitting this (from the app UI) gets redirected back to Settings.
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    return new Response(null, { status: 302, headers: { location: "/?qbo=disconnected" } });
  }
  return new Response(JSON.stringify({ ok: true, disconnected: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
export const config = { path: "/api/qbo-disconnect" };
