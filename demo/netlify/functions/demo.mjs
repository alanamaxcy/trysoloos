import { getStore } from "@netlify/blobs";

// SoloOS demo backend: trial clock, AI cap, lead capture, and login/welcome emails.
//   POST {action:"start",  email, name}  -> creates/returns the 24h trial; emails on first start
//   POST {action:"status", email}        -> remaining time for an email
//   POST {action:"ai", email, ...}       -> capped proxy to Anthropic (per-email + global daily caps)
//   GET  ?admin=KEY                      -> dump captured leads + usage (KEY = DEMO_ADMIN_KEY env)
//
// Env vars (Netlify -> Site configuration -> Environment variables):
//   ANTHROPIC_API_KEY   (required for live AI)
//   DEMO_ADMIN_KEY      (optional) view leads at /api/demo?admin=YOURKEY
//   --- emails (all optional; if RESEND_API_KEY is unset, nothing is sent and nothing breaks) ---
//   RESEND_API_KEY      your Resend key (resend.com) — turns emails on
//   DEMO_FROM_EMAIL     verified sender, e.g.  Alan from SoloOS <alan@dogoodwork.me>
//   DEMO_NOTIFY_EMAIL   where lead alerts go (your inbox), e.g. alan@dogoodwork.me
//   DEMO_HOME_URL       the demo URL (welcome email "open my demo"). default: soloos-demo.netlify.app
//   DEMO_BUY_URL        your landing/checkout (expiry email). default: try-soloos.netlify.app

const TRIAL_MS = 24 * 60 * 60 * 1000;
const PER_EMAIL_AI_PER_DAY = 15;
const GLOBAL_AI_PER_DAY    = 300;
const MAX_TOKENS_CAP       = 2400;

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const today = () => new Date().toISOString().slice(0, 10);
const normEmail = (e) => String(e || "").trim().toLowerCase();
const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const firstName = (n) => (String(n || "").trim().split(/\s+/)[0] || "there");

const HOME = () => process.env.DEMO_HOME_URL || "https://soloos-demo.netlify.app";                 // the demo itself ("open my demo")
const BUY  = () => process.env.DEMO_BUY_URL || "https://doer2.gumroad.com/l/yxujjr"; // your Gumroad checkout

// Resend (resend.com). No-op unless RESEND_API_KEY + DEMO_FROM_EMAIL are set.
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

const emailShell = (inner) => `
  <div style="background:#FBF9F5;padding:28px 0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#17140E">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E8E2D6;border-radius:16px;overflow:hidden">
      <div style="background:#0F6E5E;height:8px"></div>
      <div style="padding:30px 32px">
        <div style="display:inline-block;width:40px;height:40px;border-radius:11px;background:#0F6E5E;color:#fff;text-align:center;line-height:40px;font-weight:800;font-size:20px;font-family:Georgia,serif;margin-bottom:18px">S</div>
        ${inner}
        <div style="margin-top:26px;border-top:1px solid #E8E2D6;padding-top:14px;color:#938B7A;font-size:12.5px">SoloOS &middot; one tool to run your whole practice.</div>
      </div>
    </div>
  </div>`;
const btn = (href, label) => `<a href="${esc(href)}" style="display:inline-block;background:#0F6E5E;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:10px">${esc(label)} &rarr;</a>`;

function welcomeHtml(name) {
  return emailShell(`
    <h1 style="font-family:Georgia,serif;font-size:23px;margin:0 0 12px;color:#17140E">You're in, ${esc(firstName(name))}.</h1>
    <p style="font-size:15px;line-height:1.6;color:#3a352b;margin:0 0 14px">Your SoloOS demo is open and the 24-hour clock just started. It's a fully loaded sample practice &mdash; a live pipeline, proposals, projects, goals, a social planner, and Solo, the built-in AI that already knows all of it.</p>
    <p style="font-size:15px;line-height:1.6;color:#3a352b;margin:0 0 20px">A few things worth trying: ask Solo to draft a follow-up to a quiet lead, have it write a week of social posts, or open Reports to watch the numbers update. Your space is here whenever you want to jump back in:</p>
    <p style="margin:0 0 22px">${btn(HOME(), "Open my demo")}</p>
    <p style="font-size:14.5px;line-height:1.6;color:#3a352b;margin:0">When the 24 hours wrap, you can own the whole thing once &mdash; no subscription. I'll send a quick note then. Until then, enjoy poking around.</p>
    <p style="font-size:14.5px;line-height:1.6;color:#3a352b;margin:16px 0 0">&mdash; Alan</p>`);
}
function expiryHtml(name) {
  return emailShell(`
    <h1 style="font-family:Georgia,serif;font-size:23px;margin:0 0 12px;color:#17140E">That's a wrap, ${esc(firstName(name))}.</h1>
    <p style="font-size:15px;line-height:1.6;color:#3a352b;margin:0 0 14px">Your 24 hours with SoloOS are up. I hope it gave you a real feel for running your pipeline, proposals, projects, and AI drafting in one place &mdash; instead of stitching five tools together.</p>
    <p style="font-size:15px;line-height:1.6;color:#3a352b;margin:0 0 20px">If it fit how you work, you can own SoloOS outright for a one-time <b>$299</b> &mdash; the code is yours to keep, rebrand, and run forever on your own AI key. Prefer not to set it up yourself? There's an optional done-for-you setup for $150 and I'll hand you a working site.</p>
    <p style="margin:0 0 22px">${btn(BUY(), "Own SoloOS — $299")}</p>
    <p style="font-size:14.5px;line-height:1.6;color:#3a352b;margin:0">Questions before you decide? Just reply to this email &mdash; it comes straight to me.</p>
    <p style="font-size:14.5px;line-height:1.6;color:#3a352b;margin:16px 0 0">&mdash; Alan</p>`);
}
function notifyHtml(name, email) {
  return emailShell(`
    <h1 style="font-family:Georgia,serif;font-size:21px;margin:0 0 12px;color:#17140E">New SoloOS demo started</h1>
    <p style="font-size:15px;line-height:1.7;color:#3a352b;margin:0">
      <b>Name:</b> ${esc(name || "—")}<br>
      <b>Email:</b> ${esc(email)}<br>
      <b>Started:</b> ${esc(new Date().toLocaleString("en-US"))}
    </p>`);
}

export default async (req) => {
  const store = getStore({ name: "soloos-demo", consistency: "strong" });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const k = url.searchParams.get("admin");
    if (k && process.env.DEMO_ADMIN_KEY && k === process.env.DEMO_ADMIN_KEY) {
      // ?admin=KEY&forget=EMAIL  -> wipe one email's trial so it can start fresh
      // ?admin=KEY&forget=all    -> wipe every trial
      const forget = url.searchParams.get("forget");
      if (forget) {
        const trials = (await store.get("trials", { type: "json" })) || {};
        if (forget === "all") {
          const n = Object.keys(trials).length;
          try { await store.setJSON("trials", {}); } catch (e) {}
          return json({ ok: true, cleared: n });
        }
        const e = normEmail(forget);
        const existed = !!trials[e];
        if (existed) { delete trials[e]; try { await store.setJSON("trials", trials); } catch (e2) {} }
        return json({ ok: true, forgot: e, existed, note: "This email can now start a fresh 24-hour demo." });
      }
      const trials = (await store.get("trials", { type: "json" })) || {};
      const usage = (await store.get("aiusage", { type: "json" })) || {};
      const leads = Object.entries(trials)
        .map(([email, v]) => ({ email, name: v.name || "", startedAt: v.startedAt, firstSeen: v.firstSeen, welcomeEmailed: !!v.welcomeEmailed, expiryEmailed: !!v.expiryEmailed }))
        .sort((a, b) => b.firstSeen - a.firstSeen);
      return json({ count: leads.length, leads, usage });
    }
    return json({ ok: true });
  }

  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON." }, 400); }
  const action = body.action || "";
  const email = normEmail(body.email);

  if (action === "start") {
    if (!validEmail(email)) return json({ error: "Enter a valid email." }, 400);
    const trials = (await store.get("trials", { type: "json" })) || {};
    const now = Date.now();
    let rec = trials[email];
    const isNew = !rec;
    if (!rec) {
      rec = { startedAt: now, firstSeen: now, name: String(body.name || "").slice(0, 80) };
      trials[email] = rec;
      try { await store.setJSON("trials", trials); } catch (e) {}
    } else if (!rec.name && body.name) {
      rec.name = String(body.name).slice(0, 80);
      try { await store.setJSON("trials", trials); } catch (e) {}
    }
    if (isNew) {
      try {
        const ok = await sendEmail({ to: email, subject: "Your SoloOS demo is live — 24 hours, full access", html: welcomeHtml(rec.name), replyTo: process.env.DEMO_NOTIFY_EMAIL });
        if (ok) { rec.welcomeEmailed = true; try { await store.setJSON("trials", trials); } catch (e) {} }
        if (process.env.DEMO_NOTIFY_EMAIL) {
          await sendEmail({ to: process.env.DEMO_NOTIFY_EMAIL, subject: "New SoloOS demo — " + (rec.name || email), html: notifyHtml(rec.name, email) });
        }
      } catch (e) {}
    }
    const msLeft = Math.max(0, TRIAL_MS - (now - rec.startedAt));
    return json({ ok: true, startedAt: rec.startedAt, msLeft, expired: msLeft <= 0 });
  }

  if (action === "status") {
    if (!validEmail(email)) return json({ error: "Bad email." }, 400);
    const trials = (await store.get("trials", { type: "json" })) || {};
    const rec = trials[email];
    if (!rec) return json({ ok: true, startedAt: 0, msLeft: 0, expired: true, unknown: true });
    const msLeft = Math.max(0, TRIAL_MS - (Date.now() - rec.startedAt));
    return json({ ok: true, startedAt: rec.startedAt, msLeft, expired: msLeft <= 0 });
  }

  if (action === "ai") {
    if (!validEmail(email)) return json({ error: "Your demo session needs an email." });
    const trials = (await store.get("trials", { type: "json" })) || {};
    const rec = trials[email];
    if (!rec || Date.now() - rec.startedAt >= TRIAL_MS)
      return json({ error: "Your 24-hour demo has ended. Own SoloOS to keep going." });

    let usage = (await store.get("aiusage", { type: "json" })) || {};
    if (usage.day !== today()) usage = { day: today(), global: 0, byEmail: {} };
    const used = usage.byEmail[email] || 0;
    if ((usage.global || 0) >= GLOBAL_AI_PER_DAY)
      return json({ error: "The demo's AI is resting for today. The full version runs on your own key with no cap." });
    if (used >= PER_EMAIL_AI_PER_DAY)
      return json({ error: "You've used today's demo AI runs. The full version runs on your own key with no cap." });

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return json({ error: "AI isn't configured for this demo yet." });

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const system = typeof body.system === "string" ? body.system : "";
    const model = body.model || "claude-sonnet-4-6";
    const tools = Array.isArray(body.tools) ? body.tools : null;
    const max_tokens = Math.min(MAX_TOKENS_CAP, Math.max(256, body.max_tokens || 1024));
    if (!messages.length) return json({ error: "No messages." }, 400);

    try {
      const payload = { model, max_tokens, system, messages, stream: true };
      if (tools) payload.tools = tools;
      const ar = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(payload),
      });
      if (!ar.ok) {
        let t = ""; try { t = await ar.text(); } catch {}
        let msg = "AI error " + ar.status;
        try { const j = JSON.parse(t); msg = (j.error && j.error.message) || msg; } catch {}
        return json({ error: msg });
      }
      usage.byEmail[email] = used + 1;
      usage.global = (usage.global || 0) + 1;
      try { await store.setJSON("aiusage", usage); } catch (e) {}
      return new Response(ar.body, { status: 200, headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
    } catch (e) {
      return json({ error: "AI request failed." });
    }
  }

  return json({ error: "Unknown action." }, 400);
};

export const config = { path: "/api/demo", maxDuration: 26 };
