// Optional email-based password reset. Off by default (the workspace uses the
// light-lock open reset unless config.resetMode === "email").
//   Requires SENDGRID_API_KEY and SENDGRID_FROM (a verified sender) and an
//   email address on the user record. The code is generated and checked here,
//   server-side, and stored in Netlify Blobs (never sent to the client).
//
//   POST /api/reset  { action:"request", user:"<key>" }
//     -> emails a 6-digit code to that user's address. Returns {ok, sent, reason}.
//   POST /api/reset  { action:"confirm", user:"<key>", code:"123456", password:"..." }
//     -> verifies the code and sets the new password. Returns {ok} or {error}.
import { getStore } from "@netlify/blobs";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

  const action = body.action;
  const userKey = String(body.user || "");
  if (!userKey) return json({ error: "Missing user." }, 400);

  const store = getStore({ name: "gwops", consistency: "strong" });
  const codeKey = "reset_" + userKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);

  let state = null;
  try { state = await store.get("state", { type: "json" }); } catch { state = null; }
  const users = (state && state.config && Array.isArray(state.config.users)) ? state.config.users : [];
  const user = users.find((u) => u && u.key === userKey);

  if (action === "request") {
    const key = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM;
    // Generic-but-useful: tell the client whether a mail could actually be sent,
    // without confirming account existence beyond what the picker already shows.
    if (!key || !from) return json({ ok: true, sent: false, reason: "email_not_configured" });
    if (!user || !user.email) return json({ ok: true, sent: false, reason: "no_email_on_file" });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const rec = { code, exp: Date.now() + 15 * 60 * 1000, attempts: 0 };
    try { await store.setJSON(codeKey, rec); } catch (e) { return json({ ok: false, error: "Could not store the reset code." }); }

    const brand = (state && state.config && state.config.branding && state.config.branding.name) || "your workspace";
    const text =
      "Here is your password reset code for " + brand + ":\n\n  " + code +
      "\n\nIt expires in 15 minutes. If you did not request this, you can ignore this email.";
    try {
      const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { authorization: "Bearer " + key, "content-type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: user.email }] }],
          from: { email: from },
          subject: "Your password reset code",
          content: [{ type: "text/plain", value: text }],
        }),
      });
      if (r.status >= 200 && r.status < 300) return json({ ok: true, sent: true });
      const t = await r.text().catch(() => "");
      return json({ ok: false, error: "Email provider returned " + r.status + " " + t.slice(0, 160) });
    } catch (e) { return json({ ok: false, error: String(e) }); }
  }

  if (action === "confirm") {
    const code = String(body.code || "").trim();
    const password = String(body.password || "");
    if (password.length < 4) return json({ error: "Password must be at least 4 characters." }, 400);

    let rec = null;
    try { rec = await store.get(codeKey, { type: "json" }); } catch { rec = null; }
    if (!rec) return json({ error: "No reset in progress. Request a new code." }, 400);
    if (Date.now() > rec.exp) { try { await store.delete(codeKey); } catch {} return json({ error: "That code has expired. Request a new one." }, 400); }
    if ((rec.attempts || 0) >= 5) { try { await store.delete(codeKey); } catch {} return json({ error: "Too many attempts. Request a new code." }, 400); }
    if (code !== rec.code) {
      rec.attempts = (rec.attempts || 0) + 1;
      try { await store.setJSON(codeKey, rec); } catch {}
      return json({ error: "Incorrect code. " + Math.max(0, 5 - rec.attempts) + " attempts left." }, 400);
    }

    if (!user) return json({ error: "That user no longer exists." }, 400);
    user.pass = password;
    try { await store.setJSON("state", state); } catch (e) { return json({ ok: false, error: "Could not save the new password." }); }
    try { await store.delete(codeKey); } catch {}
    return json({ ok: true });
  }

  return json({ error: "Unknown action." }, 400);
};

export const config = { path: "/api/reset" };
