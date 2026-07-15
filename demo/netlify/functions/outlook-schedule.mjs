import { getStore } from "@netlify/blobs";
import { loadOutbox, saveOutbox, dispatchDue } from "../shared/outbox.mjs";

// Manages the scheduled-email queue.
//   GET  /api/outlook-schedule              -> { ok, items }
//   POST { to, subject, html, sendAt, ... } -> { ok, id }      (queue a send)
//   POST { cancel: id }                     -> { ok }          (cancel a pending one)
//   POST { action: "dispatch" }             -> { ok, sent, failed, pending }  (send due now)

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export default async (req) => {
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  const store = getStore("gwops");

  if (req.method === "GET") {
    const list = await loadOutbox(store);
    return json({ ok: true, items: list });
  }

  if (req.method === "POST") {
    let b; try { b = await req.json(); } catch { return json({ error: "Bad request body." }, 400); }

    if (b.action === "dispatch") { const r = await dispatchDue(store); return json({ ok: true, ...r }); }

    if (b.cancel) {
      const list = await loadOutbox(store);
      const it = list.find((x) => x.id === b.cancel);
      if (it && it.status === "scheduled") { it.status = "canceled"; await saveOutbox(store, list); }
      return json({ ok: true });
    }

    if (!b.to || !b.sendAt) return json({ error: "to and sendAt are required." }, 400);
    const list = await loadOutbox(store);
    const item = {
      id: uid(),
      to: b.to,
      subject: b.subject || "",
      html: b.html || "",
      cc: b.cc || "",
      sendAt: b.sendAt,
      status: "scheduled",
      createdAt: new Date().toISOString(),
      leadId: b.leadId || null,
      purpose: b.purpose || "",
    };
    list.push(item);
    // Keep the queue bounded; drop oldest finished items beyond 200.
    await saveOutbox(store, list.slice(-200));
    return json({ ok: true, id: item.id });
  }

  return json({ error: "Method not allowed" }, 405);
};
export const config = { path: "/api/outlook-schedule" };
