// Fetches a published Outlook/M365 (or any) ICS calendar feed server-side
// (browsers cannot read it directly because of CORS) and returns the events
// as JSON. Read-only. Recurring events get a basic expansion so weekly and
// daily meetings show up; complex recurrence rules are approximated.

function unescapeIcs(v) {
  return String(v || "")
    .replace(/\\n/gi, "\n").replace(/\\,/g, ",")
    .replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseDt(val, params) {
  const isDate = /VALUE=DATE/i.test(params || "") || /^\d{8}$/.test(val);
  if (isDate) {
    const y = +val.slice(0, 4), mo = +val.slice(4, 6), da = +val.slice(6, 8);
    return { allDay: true, iso: `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`, y, mo, da, hh: 0, mm: 0, ss: 0, z: false, ts: Date.UTC(y, mo - 1, da) };
  }
  const m = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
  if (!m) {
    const y = +val.slice(0, 4), mo = +val.slice(4, 6), da = +val.slice(6, 8);
    return { allDay: true, iso: `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`, y, mo, da, hh: 0, mm: 0, ss: 0, z: false, ts: Date.UTC(y, mo - 1, da) };
  }
  const y = +m[1], mo = +m[2], da = +m[3], hh = +m[4], mm = +m[5], ss = +m[6], z = !!m[7];
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${z ? "Z" : ""}`;
  return { allDay: false, iso, y, mo, da, hh, mm, ss, z, ts: Date.UTC(y, mo - 1, da, hh, mm, ss) };
}

function expandRrule(e, base, out, horizon, max) {
  const r = {}; String(e.rrule).split(";").forEach(p => { const [k, v] = p.split("="); if (k) r[k.toUpperCase()] = v; });
  const freq = r.FREQ, interval = Math.max(1, parseInt(r.INTERVAL || "1", 10));
  const count = r.COUNT ? parseInt(r.COUNT, 10) : null;
  let until = null; if (r.UNTIL) { const um = r.UNTIL.match(/^(\d{4})(\d{2})(\d{2})/); if (um) until = Date.UTC(+um[1], +um[2] - 1, +um[3], 23, 59, 59); }
  const s = e.start; const dayMs = 86400000; const pad = n => String(n).padStart(2, "0");
  const mkIso = (y, mo, da) => s.allDay ? `${y}-${pad(mo)}-${pad(da)}` : `${y}-${pad(mo)}-${pad(da)}T${pad(s.hh)}:${pad(s.mm)}:${pad(s.ss)}${s.z ? "Z" : ""}`;
  const push = (y, mo, da) => out.push(Object.assign({}, base, { start: mkIso(y, mo, da) }));
  let made = 0;
  if (freq === "DAILY") {
    for (let i = 0; made < (count || 1e9) && made < max; i++) { const d = new Date(s.ts + i * interval * dayMs); if (d.getTime() > horizon) break; if (until && d.getTime() > until) break; push(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); made++; }
  } else if (freq === "WEEKLY") {
    const dowMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
    let byday = (r.BYDAY || "").split(",").filter(Boolean);
    if (!byday.length) byday = [Object.keys(dowMap).find(k => dowMap[k] === new Date(s.ts).getUTCDay())];
    for (let w = 0; made < (count || 1e9) && made < max; w++) {
      const weekBase = s.ts + w * interval * 7 * dayMs;
      if (weekBase > horizon) break;
      for (const dd of byday) { const t = dowMap[dd]; if (t == null) continue; const wb = new Date(weekBase); const diff = (t - wb.getUTCDay() + 7) % 7; const occ = new Date(weekBase + diff * dayMs); if (occ.getTime() < s.ts) continue; if (occ.getTime() > horizon) continue; if (until && occ.getTime() > until) continue; push(occ.getUTCFullYear(), occ.getUTCMonth() + 1, occ.getUTCDate()); made++; if (count && made >= count) break; }
    }
  } else if (freq === "MONTHLY") {
    for (let i = 0; made < (count || 1e9) && made < max; i++) { const d = new Date(Date.UTC(s.y, (s.mo - 1) + i * interval, s.da, s.hh, s.mm, s.ss)); if (d.getTime() > horizon) break; if (until && d.getTime() > until) break; push(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); made++; }
  } else {
    out.push(base);
  }
}

export function parseIcs(text, opts = {}) {
  const raw = String(text || "").replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const lines = raw.split("\n");
  const events = []; let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const idx = line.indexOf(":"); if (idx < 0) continue;
    const left = line.slice(0, idx), val = line.slice(idx + 1);
    const semi = left.indexOf(";");
    const name = (semi < 0 ? left : left.slice(0, semi)).toUpperCase();
    const params = semi < 0 ? "" : left.slice(semi + 1);
    if (name === "SUMMARY") cur.title = unescapeIcs(val);
    else if (name === "LOCATION") cur.location = unescapeIcs(val);
    else if (name === "UID") cur.uid = val;
    else if (name === "DTSTART") cur.start = parseDt(val, params);
    else if (name === "DTEND") cur.end = parseDt(val, params);
    else if (name === "RRULE") cur.rrule = val;
    else if (name === "STATUS") cur.status = val.toUpperCase();
    else if (name === "TRANSP") cur.transp = val.toUpperCase();
  }
  const out = []; const horizonDays = opts.horizonDays || 210; const max = opts.max || 600;
  const horizon = Date.now() + horizonDays * 86400000;
  for (const e of events) {
    if (!e.start) continue;
    // Duration travels with the event, not an absolute end time — recurring instances
    // reuse `base` with only `start` swapped, so a fixed `end` would be wrong on every repeat.
    let durationMin = 0;
    if (e.end && !e.start.allDay && !e.end.allDay && e.end.ts > e.start.ts) durationMin = Math.round((e.end.ts - e.start.ts) / 60000);
    const base = { title: e.title || "(busy)", location: e.location || "", allDay: e.start.allDay, start: e.start.iso, uid: e.uid || "",
      durationMin, status: e.status || "", transp: e.transp || "" };
    if (e.rrule) expandRrule(e, base, out, horizon, 400);
    else out.push(base);
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}

export default async (req) => {
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  try {
    const u = new URL(req.url);
    const target = u.searchParams.get("url");
    if (!target) return json({ error: "No calendar URL provided." }, 400);
    let parsed; try { parsed = new URL(target.replace(/^webcal:\/\//i, "https://")); } catch { return json({ error: "That does not look like a valid URL." }, 400); }
    if (parsed.protocol !== "https:") return json({ error: "The calendar link must start with https." }, 400);
    const host = parsed.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host) || /^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host))
      return json({ error: "That host is not allowed." }, 400);
    const r = await fetch(parsed.toString(), { headers: { accept: "text/calendar,*/*" } });
    if (!r.ok) return json({ error: "Could not fetch the calendar (" + r.status + "). Check the link is published and public." });
    const text = await r.text();
    if (!/BEGIN:VCALENDAR/i.test(text)) return json({ error: "That link did not return a calendar feed. Make sure you copied the ICS link, not the HTML one." });
    const events = parseIcs(text, { horizonDays: 210, max: 600 });
    return json({ ok: true, count: events.length, events });
  } catch (e) { return json({ error: String((e && e.message) || e) }); }
};

export const config = { path: "/api/ics" };
