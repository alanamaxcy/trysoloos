// Scheduled weekly focus digest. Runs on a cron schedule only.
// Scheduled functions must NOT set config.path, so the manual test endpoint
// lives in digest-now.mjs instead. Shared logic is in ../shared/digestCore.mjs.
//
// Env vars: ANTHROPIC_API_KEY, SENDGRID_API_KEY, SENDGRID_FROM, and DIGEST_TO
// (or a digest email saved in Settings).
import { runDigest } from "../shared/digestCore.mjs";

export default async () => {
  try {
    const res = await runDigest();
    return new Response(JSON.stringify(res), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e && e.message || e) }), { headers: { "content-type": "application/json" } });
  }
};

// Monday 13:00 UTC (about 8-9am US Eastern depending on daylight time).
export const config = { schedule: "0 13 * * 1" };
