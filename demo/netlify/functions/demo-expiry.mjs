import { getStore } from "@netlify/blobs";

// Scheduled: emails each visitor once when their 24-hour SoloOS demo has ended.
// Runs hourly. Uses the same blob store the /api/demo function writes to.
// Emails only send if RESEND_API_KEY + DEMO_FROM_EMAIL are set (otherwise it's a quiet no-op).

const TRIAL_MS = 24 * 60 * 60 * 1000;
const DAY = 86400000;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const firstName = (n) => (String(n || "").trim().split(/\s+/)[0] || "there");
const LANDING = () => process.env.DEMO_LANDING_URL || "https://trysoloos.com";
const BUY     = () => process.env.DEMO_BUY_URL || "https://doer2.gumroad.com/l/yxujjr";

async function sendEmail({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.DEMO_FROM_EMAIL;
  if (!key || !from || !to) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    return r.ok;
  } catch (e) { return false; }
}

const btn = (href, label) => `<a href="${esc(href)}" style="display:inline-block;background:#0F6E5E;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:10px">${esc(label)} &rarr;</a>`;
function expiryHtml(name) {
  return `
  <div style="background:#FBF9F5;padding:28px 0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#17140E">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E8E2D6;border-radius:16px;overflow:hidden">
      <div style="background:#0F6E5E;height:8px"></div>
      <div style="padding:30px 32px">
        <div style="display:inline-block;width:40px;height:40px;border-radius:11px;background:#0F6E5E;color:#fff;text-align:center;line-height:40px;font-weight:800;font-size:20px;font-family:Georgia,serif;margin-bottom:18px">S</div>
        <h1 style="font-family:Georgia,serif;font-size:23px;margin:0 0 12px;color:#17140E">That's a wrap, ${esc(firstName(name))}.</h1>
        <p style="font-size:15px;line-height:1.6;color:#3a352b;margin:0 0 14px">Your 24 hours with SoloOS are up. I hope it gave you a real feel for running your pipeline, proposals, projects, and AI drafting in one place &mdash; instead of stitching five tools together.</p>
        <p style="font-size:15px;line-height:1.6;color:#3a352b;margin:0 0 20px">If it fit how you work, you can own SoloOS outright for a one-time <b>$299</b> &mdash; the code is yours to keep, rebrand, and run forever on your own AI key. Prefer not to set it up yourself? There's an optional done-for-you setup for $150 and I'll hand you a working site.</p>
        <p style="margin:0 0 22px">${btn(BUY(), "Own SoloOS — $299")}</p>
        <p style="font-size:14.5px;line-height:1.6;color:#3a352b;margin:0">Questions before you decide? Just reply to this email &mdash; it comes straight to me.</p>
        <p style="font-size:14.5px;line-height:1.6;color:#3a352b;margin:16px 0 0">&mdash; Alan</p>
        <div style="margin-top:26px;border-top:1px solid #E8E2D6;padding-top:14px;color:#938B7A;font-size:12.5px">SoloOS &middot; one tool to run your whole practice.</div>
      </div>
    </div>
  </div>`;
}

export default async () => {
  const store = getStore({ name: "soloos-demo", consistency: "strong" });
  const trials = (await store.get("trials", { type: "json" })) || {};
  const now = Date.now();
  let changed = false, sent = 0;
  for (const [email, rec] of Object.entries(trials)) {
    if (!rec || !rec.startedAt) continue;
    const elapsed = now - rec.startedAt;
    // expired, not yet emailed, and within a 7-day window (so a first deploy doesn't blast old testers)
    if (elapsed >= TRIAL_MS && !rec.expiryEmailed && elapsed < TRIAL_MS + 7 * DAY) {
      const ok = await sendEmail({ to: email, subject: "Your SoloOS demo has wrapped up", html: expiryHtml(rec.name), replyTo: process.env.DEMO_NOTIFY_EMAIL });
      if (ok) { rec.expiryEmailed = true; changed = true; sent++; }
    }
  }
  if (changed) { try { await store.setJSON("trials", trials); } catch (e) {} }
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { "content-type": "application/json" } });
};

export const config = { schedule: "@hourly" };
