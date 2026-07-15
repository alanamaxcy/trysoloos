// Shared logic for the weekly focus digest.
// Imported by both the scheduled function (digest.mjs) and the manual HTTP
// endpoint (digest-now.mjs). Lives outside netlify/functions so Netlify does
// not try to deploy it as its own function.
import { getStore } from "@netlify/blobs";

const daysSince = (dstr) => {
  if (!dstr) return null;
  const d = new Date(dstr + "T00:00:00");
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};
const money = (n) => (n == null ? "" : "$" + Math.round(n).toLocaleString("en-US"));

function buildContext(state) {
  const P = state.pipeline || [];
  const openStages = new Set(
    (state.config && state.config.stages ? state.config.stages : [])
      .filter((s) => (s.kind || "open") === "open")
      .map((s) => s.key)
  );
  const isOpen = (l) => (openStages.size ? openStages.has(l.stage) : !/WON|LOST/i.test(l.stage || ""));
  const stageLabel = (k) => {
    const s = (state.config && state.config.stages || []).find((x) => x.key === k);
    return s ? s.label : k;
  };
  const open = P.filter(isOpen);
  const won = P.filter((l) => /WON/i.test(l.stage || ""));
  const wonRev = won.reduce((s, l) => s + (l.contractValue || 0), 0);
  const goal = (state.meta && state.meta.revenueGoal) || 120000;

  const warm = open
    .filter((l) => /WARM/i.test(l.stage || "") || (daysSince(l.lastContact) != null && daysSince(l.lastContact) <= 10))
    .slice(0, 12)
    .map((l) => "- " + (l.name || "Lead") + " | " + stageLabel(l.stage) + (l.contractValue ? " | " + money(l.contractValue) : "") + " | last contact " + (daysSince(l.lastContact) != null ? daysSince(l.lastContact) + "d ago" : "none"));

  const rocks = (state.rocks || [])
    .filter((r) => r.status !== "done")
    .slice(0, 10)
    .map((r) => {
      const ms = (r.milestones || []);
      const done = ms.filter((m) => m.status === "DONE").length;
      return "- " + (r.title || "Rock") + " | " + (r.status || "") + " | " + done + "/" + ms.length + " milestones done" + (r.due ? " | due " + r.due : "");
    });

  const goals = (state.annualGoals || [])
    .slice(0, 10)
    .map((g) => "- " + (g.title || g.name || "Goal") + (g.target ? " | target " + g.target : "") + (g.progress != null ? " | " + g.progress + "% " : ""));

  let c = "Revenue: " + money(wonRev) + " won of a " + money(goal) + " goal (" + Math.round((wonRev / Math.max(1, goal)) * 100) + "%). " + open.length + " open leads.";
  if (warm.length) c += "\n\nWarm leads:\n" + warm.join("\n");
  if (rocks.length) c += "\n\nRocks (quarterly goals):\n" + rocks.join("\n");
  if (goals.length) c += "\n\nAnnual goals:\n" + goals.join("\n");
  return c;
}

async function makeBrief(context) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const system =
    "You are Alan's assistant at Good Work, a nonprofit consulting practice. Write a short Monday focus brief on his warm leads, Rocks, and annual goals. Be specific, reference real names, and give a few concrete next moves. Warm, plain, direct. Use short section headers and simple dash bullets. No em-dashes. Keep it under 250 words.";
  const ar = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system,
      messages: [{ role: "user", content: "Here is the snapshot for this week:\n\n" + context + "\n\nWrite the focus brief." }],
    }),
  });
  const data = await ar.json();
  if (data.error) throw new Error(data.error.message || "Anthropic error");
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

async function sendEmail(to, subject, text) {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM;
  if (!key || !from) throw new Error("SENDGRID_API_KEY and SENDGRID_FROM must be set.");
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
  if (r.status < 200 || r.status >= 300) {
    const t = await r.text().catch(() => "");
    throw new Error("SendGrid returned " + r.status + " " + t.slice(0, 200));
  }
}

// Runs the whole digest. Returns { ok, sentTo } or { error }.
export async function runDigest() {
  const store = getStore("gwops");
  const state = (await store.get("state", { type: "json" })) || {};
  const to = process.env.DIGEST_TO || (state.connections && state.connections.digestEmail) || "";
  if (!to) return { error: "No recipient. Set DIGEST_TO in Netlify, or a digest email in Settings." };

  const context = buildContext(state);
  let body;
  try {
    body = await makeBrief(context);
  } catch (e) {
    body = null;
  }
  if (!body) body = "Here is your snapshot for the week:\n\n" + context;

  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
  await sendEmail(to, "Your Good Work focus brief, " + date, body + "\n\nLets do good, together.");
  return { ok: true, sentTo: to };
}
