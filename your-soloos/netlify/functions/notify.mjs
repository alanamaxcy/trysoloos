// Outbound notifications: Slack incoming webhook + SendGrid email.
// Env vars:
//   Slack  -> SLACK_WEBHOOK_URL
//   Email  -> SENDGRID_API_KEY and SENDGRID_FROM (a verified sender address)
export default async (req) => {
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const channel = body.channel || "slack";

  try {
    if (channel === "slack") {
      const url = process.env.SLACK_WEBHOOK_URL;
      if (!url) return json({ error: "SLACK_WEBHOOK_URL is not set in this Netlify environment." });
      const text = String(body.text || "").slice(0, 3000);
      if (!text) return json({ error: "No text to send." }, 400);
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) return json({ error: "Slack returned " + r.status });
      return json({ ok: true });
    }

    if (channel === "email") {
      const key = process.env.SENDGRID_API_KEY;
      const from = process.env.SENDGRID_FROM;
      if (!key || !from) return json({ error: "SENDGRID_API_KEY and SENDGRID_FROM must be set in this Netlify environment." });
      const to = body.to;
      const subject = String(body.subject || "(no subject)").slice(0, 200);
      const text = String(body.text || "").slice(0, 10000);
      if (!to) return json({ error: "No recipient (to)." }, 400);
      const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { authorization: "Bearer " + key, "content-type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: from },
          subject,
          content: [{ type: "text/plain", value: text }],
        }),
      });
      if (r.status >= 200 && r.status < 300) return json({ ok: true });
      const t = await r.text().catch(() => "");
      return json({ error: "SendGrid returned " + r.status + " " + t.slice(0, 200) });
    }

    return json({ error: "Unknown channel: " + channel }, 400);
  } catch (e) {
    return json({ error: String(e) });
  }
};
export const config = { path: "/api/notify" };
