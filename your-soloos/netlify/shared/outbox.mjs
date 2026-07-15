// Shared logic for the scheduled-email outbox. Used by outlook-schedule (API) and
// outlook-dispatch (cron). Tokens live under the private "outlook" key; the queue
// lives under the private "outbox" key. Neither is exposed by /api/data.

const TENANT = () => process.env.MS_TENANT || "common";

export async function refreshToken(store, tok) {
  const clientId = process.env.MS_CLIENT_ID, secret = process.env.MS_CLIENT_SECRET;
  const url = "https://login.microsoftonline.com/" + TENANT() + "/oauth2/v2.0/token";
  const form = new URLSearchParams({
    client_id: clientId, client_secret: secret, grant_type: "refresh_token",
    refresh_token: tok.refresh_token, scope: "offline_access Mail.Send User.Read",
  });
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body: form.toString() });
  const nt = await r.json();
  if (nt.error) throw new Error(nt.error_description || nt.error);
  const merged = { ...tok, access_token: nt.access_token, refresh_token: nt.refresh_token || tok.refresh_token, obtained: Date.now(), expires_in: nt.expires_in };
  await store.setJSON("outlook", merged);
  return merged;
}

const toRecips = (s) => String(s || "").split(/[,;]/).map((x) => x.trim()).filter(Boolean).map((a) => ({ emailAddress: { address: a } }));

// Sends one message; returns the (possibly refreshed) token so the caller can reuse it.
export async function sendViaGraph(store, tok, msg) {
  if (!tok.obtained || Date.now() - tok.obtained > 50 * 60 * 1000) tok = await refreshToken(store, tok);
  const body = {
    message: {
      subject: msg.subject || "",
      body: { contentType: "HTML", content: msg.html || "" },
      toRecipients: toRecips(msg.to),
      ...(msg.cc ? { ccRecipients: toRecips(msg.cc) } : {}),
    },
    saveToSentItems: true,
  };
  const doSend = (t) => fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST", headers: { authorization: "Bearer " + t.access_token, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  let r = await doSend(tok);
  if (r.status === 401) { tok = await refreshToken(store, tok); r = await doSend(tok); }
  if (r.status === 202) return { ok: true, tok };
  let detail = ""; try { const e = await r.json(); detail = (e.error && (e.error.message || e.error.code)) || ""; } catch {}
  throw new Error("Graph send " + r.status + (detail ? ": " + detail : ""));
}

export async function loadOutbox(store) { try { return (await store.get("outbox", { type: "json" })) || []; } catch { return []; } }
export async function saveOutbox(store, list) { await store.setJSON("outbox", list || []); }

// Sends every "scheduled" item whose sendAt is now or in the past.
export async function dispatchDue(store) {
  const list = await loadOutbox(store);
  const now = Date.now();
  const due = list.filter((x) => x.status === "scheduled" && new Date(x.sendAt).getTime() <= now);
  const pendingCount = () => list.filter((x) => x.status === "scheduled").length;
  if (!due.length) return { sent: 0, failed: 0, pending: pendingCount() };
  let tok = null; try { tok = await store.get("outlook", { type: "json" }); } catch {}
  if (!tok || !tok.refresh_token) return { sent: 0, failed: 0, pending: due.length, error: "Outlook not connected" };
  let sent = 0, failed = 0;
  for (const item of due) {
    try { const res = await sendViaGraph(store, tok, item); tok = res.tok; item.status = "sent"; item.sentAt = new Date().toISOString(); delete item.error; sent++; }
    catch (e) { item.status = "failed"; item.error = String((e && e.message) || e); failed++; }
  }
  await saveOutbox(store, list);
  return { sent, failed, pending: pendingCount() };
}
