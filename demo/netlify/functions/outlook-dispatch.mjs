import { getStore } from "@netlify/blobs";
import { dispatchDue } from "../shared/outbox.mjs";

// Netlify Scheduled Function: runs every 5 minutes and sends any queued emails
// whose time has come. Because it runs on a timer, a scheduled email goes out at
// the first run at or after its target time (so up to ~5 minutes later).
export default async () => {
  try {
    const store = getStore("gwops");
    const r = await dispatchDue(store);
    return new Response(JSON.stringify({ ok: true, ...r }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
};
export const config = { schedule: "*/5 * * * *" };
