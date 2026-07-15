// Manual trigger for the weekly digest. Open /api/digest in a browser to send
// one immediately (handy for testing). Shares logic with the scheduled
// digest.mjs via ../shared/digestCore.mjs.
import { runDigest } from "../shared/digestCore.mjs";

export default async (req) => {
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  try {
    const res = await runDigest();
    return json(res, res && res.error ? 400 : 200);
  } catch (e) {
    return json({ error: String(e && e.message || e) }, 500);
  }
};

export const config = { path: "/api/digest" };
