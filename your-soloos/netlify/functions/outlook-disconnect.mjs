import { getStore } from "@netlify/blobs";
// Clears the stored Outlook tokens so the mailbox is no longer connected.
export default async () => {
  try { const store = getStore("gwops"); await store.delete("outlook"); } catch { /* nothing to clear */ }
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
export const config = { path: "/api/outlook-disconnect" };
