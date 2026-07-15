// Claude AI proxy. Keeps your API key server-side.
// Set ANTHROPIC_API_KEY in Netlify: Site settings -> Environment variables.
export default async (req) => {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: "ANTHROPIC_API_KEY is not set in this Netlify environment." });

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const system = typeof body.system === "string" ? body.system : "";
  const model = body.model || "claude-sonnet-4-6";
  const tools = Array.isArray(body.tools) ? body.tools : null;
  const max_tokens = Math.min(16384, Math.max(256, body.max_tokens || 1024));
  if (!messages.length) return json({ error: "No messages provided." }, 400);

  try {
    const payload = { model, max_tokens, system, messages, stream: true };
    if (tools) payload.tools = tools;
    const ar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
    if (!ar.ok) {
      let t = ""; try { t = await ar.text(); } catch {}
      let msg = "Anthropic error " + ar.status;
      try { const j = JSON.parse(t); msg = (j.error && j.error.message) || msg; } catch { if (t) msg += ": " + t.slice(0, 200); }
      return json({ error: msg });
    }
    return new Response(ar.body, { status: 200, headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
  } catch (e) {
    return json({ error: "Request to Anthropic failed: " + String(e) });
  }
};

export const config = { path: "/api/claude", maxDuration: 26 };
