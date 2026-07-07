"use client";

import React, { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

type DayCfg = { on?: boolean; start?: string; end?: string };
type Config = { title?: string; tz?: string; slotMins?: number; horizonDays?: number; leadHours?: number; days?: Record<string, DayCfg> };
type Slot = { utc: number; label: string };
type DayGroup = { key: string; label: string; slots: Slot[] };

// Offset (ms) of `tz` at instant `ts`: wall-clock = ts + offset. Uses formatToParts,
// so it's independent of the visitor's own timezone.
function tzOffset(ts: number, tz: string): number {
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    .formatToParts(new Date(ts))
    .forEach((x) => { p[x.type] = x.value; });
  const wallAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, p.hour === "24" ? 0 : +p.hour, +p.minute, +p.second);
  return wallAsUtc - ts;
}

// UTC instant whose wall-clock in `tz` is the given local date/time.
// Two passes so it converges correctly across DST boundaries.
function zonedToUtc(y: number, m0: number, d: number, hh: number, mm: number, tz: string): number {
  const wall = Date.UTC(y, m0, d, hh, mm);
  let ts = wall - tzOffset(wall, tz);
  ts = wall - tzOffset(ts, tz);
  return ts;
}

export default function BookPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [taken, setTaken] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [token, setToken] = useState("");
  const [picked, setPicked] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const tk = parts[parts.length - 1] || "";
    setToken(tk);
    (async () => {
      const sb = getBrowserClient();
      if (!sb) { setErr("Booking isn't available."); setLoading(false); return; }
      const { data } = await sb.rpc("get_booking", { p_token: tk });
      if (!data || !data.config) { setErr("This booking page could not be found."); setLoading(false); return; }
      setCfg(data.config as Config);
      const t = new Set<number>((data.taken || []).map((iso: string) => new Date(iso).getTime()));
      setTaken(t);
      setLoading(false);
    })();
  }, []);

  const tz = cfg?.tz || "America/Chicago";
  const slotMins = cfg?.slotMins || 30;

  function buildDays(): DayGroup[] {
    if (!cfg) return [];
    const horizon = cfg.horizonDays || 14;
    const leadMs = (cfg.leadHours || 0) * 3600000;
    const minTime = Date.now() + leadMs;
    const out: DayGroup[] = [];
    const now = new Date();
    for (let i = 0; i < horizon; i++) {
      const dObj = new Date(now.getTime() + i * 86400000);
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(dObj);
      const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
      const y = +get("year"), mo = +get("month"), d = +get("day");
      const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      // Strip any locale punctuation (e.g. "Sun.") so the lookup can't silently
      // fall through and treat every day as Sunday.
      const wd = get("weekday").replace(/\./g, "").slice(0, 3);
      const dow = wdMap[wd] ?? new Date(dObj).getDay();
      const day = cfg.days?.[dow] || cfg.days?.[String(dow)];
      if (!day || !day.on) continue;
      const [sh, sm] = (day.start || "09:00").split(":").map(Number);
      const [eh, em] = (day.end || "17:00").split(":").map(Number);
      const startMin = sh * 60 + sm, endMin = eh * 60 + em;
      const slots: Slot[] = [];
      for (let t = startMin; t + slotMins <= endMin; t += slotMins) {
        const utc = zonedToUtc(y, mo - 1, d, Math.floor(t / 60), t % 60, tz);
        if (utc < minTime) continue;
        if (taken.has(utc)) continue;
        slots.push({ utc, label: new Date(utc).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }) });
      }
      if (slots.length) {
        out.push({ key: `${y}-${mo}-${d}`, label: new Date(zonedToUtc(y, mo - 1, d, 12, 0, tz)).toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric" }), slots });
      }
    }
    return out;
  }

  async function confirm() {
    if (!picked || !form.name.trim() || !form.email.trim()) return;
    setBusy(true); setErr("");
    const start = new Date(picked.utc).toISOString();
    const end = new Date(picked.utc + slotMins * 60000).toISOString();
    const whenText = new Date(picked.utc).toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " (" + tz + ")";
    let data: any = null;
    try {
      const res = await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name: form.name, email: form.email, phone: form.phone, notes: form.notes, start, end, whenText, title: cfg?.title }) });
      data = await res.json();
    } catch {}
    setBusy(false);
    if (!data?.ok) {
      if (data?.error === "taken") { setErr("That slot was just taken — pick another."); setPicked(null); setTaken(new Set([...taken, picked.utc])); }
      else setErr("Couldn't book that. Please try again.");
      return;
    }
    setDone(true);
  }

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#080809", color: "#ece8e1", display: "flex", justifyContent: "center", padding: "36px 20px", fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
  const card: React.CSSProperties = { width: "560px", maxWidth: "100%", background: "#0e0e11", border: "1px solid #26262c", borderTop: "3px solid #e6322b", height: "fit-content" };
  const inp: React.CSSProperties = { width: "100%", background: "#0a0a0c", border: "1px solid #34343c", color: "#ece8e1", padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginBottom: 10 };

  if (loading) return <div style={wrap}><div style={{ color: "#56524b", fontSize: 13 }}>Loading…</div></div>;
  if (err && !cfg) return <div style={wrap}><div style={{ color: "#8b867d", fontSize: 13, textAlign: "center" }}>{err}</div></div>;

  const days = buildDays();

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #26262c", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 34, height: 34, border: "2px solid #e6322b", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0707", flexShrink: 0 }}>
            <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "10px solid #e6322b", marginLeft: 3 }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 19, lineHeight: 0.86 }}>{cfg?.title || "Book a call"}</div>
            <div style={{ fontSize: 8.5, letterSpacing: ".28em", color: "#56524b", marginTop: 3 }}>CHURLISH/OS · {slotMins} MIN · {tz}</div>
          </div>
        </div>

        <div style={{ padding: "24px 26px" }}>
          {done ? (
            <div>
              <div style={{ background: "#0c1f14", border: "1px solid #1d3d2a", color: "#3fb97a", padding: 16, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
                ✓ Booked{picked ? " for " + new Date(picked.utc).toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}. Talk soon.
              </div>
              {picked ? (() => {
                const fmt = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
                const title = cfg?.title || "Call with Churlish Media";
                const endMs = picked.utc + slotMins * 60000;
                const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(picked.utc)}/${fmt(endMs)}`;
                const ics = "data:text/calendar;charset=utf-8," + encodeURIComponent(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Churlish//OS//EN", "BEGIN:VEVENT", "UID:" + picked.utc + "@churlishos", "DTSTART:" + fmt(picked.utc), "DTEND:" + fmt(endMs), "SUMMARY:" + title, "END:VEVENT", "END:VCALENDAR"].join("\r\n"));
                const btn: React.CSSProperties = { flex: 1, textAlign: "center", background: "transparent", border: "1px solid #34343c", color: "#ece8e1", padding: "10px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none" };
                return (
                  <div style={{ display: "flex", gap: 10 }}>
                    <a href={gcal} target="_blank" rel="noopener noreferrer" style={btn}>+ Google Calendar</a>
                    <a href={ics} download="churlish-call.ics" style={btn}>Download .ics</a>
                  </div>
                );
              })() : null}
            </div>
          ) : picked ? (
            <div>
              <div style={{ fontSize: 12, color: "#8b867d", marginBottom: 14 }}>You picked <span style={{ color: "#e6322b" }}>{new Date(picked.utc).toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span> ({tz}).</div>
              <input style={inp} placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input style={inp} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input style={inp} placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} placeholder="What do you want to cover? (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setPicked(null)} style={{ flex: "0 0 auto", background: "transparent", border: "1px solid #34343c", color: "#8b867d", padding: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer" }}>Back</button>
                <button onClick={confirm} disabled={busy || !form.name.trim() || !form.email.trim()} style={{ flex: 1, background: "#e6322b", color: "#0a0707", border: "none", padding: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", cursor: (busy || !form.name.trim() || !form.email.trim()) ? "default" : "pointer", opacity: (busy || !form.name.trim() || !form.email.trim()) ? 0.5 : 1 }}>{busy ? "Booking…" : "Confirm →"}</button>
              </div>
              {err ? <div style={{ color: "#e6322b", fontSize: 12, marginTop: 10, textAlign: "center" }}>{err}</div> : null}
            </div>
          ) : days.length === 0 ? (
            <div style={{ color: "#8b867d", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No open times right now. Please check back soon.</div>
          ) : (
            <div>
              {days.map((d) => (
                <div key={d.key} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, letterSpacing: ".16em", color: "#56524b", textTransform: "uppercase", marginBottom: 8 }}>{d.label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {d.slots.map((s) => (
                      <button key={s.utc} onClick={() => setPicked(s)} style={{ background: "transparent", border: "1px solid #34343c", color: "#ece8e1", padding: "9px 13px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, cursor: "pointer" }}>{s.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#56524b", marginTop: 16, textAlign: "center" }}>Times shown in {tz} · Churlish Media</div>
        </div>
      </div>
    </div>
  );
}
