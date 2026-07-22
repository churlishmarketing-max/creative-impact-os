"use client";

import React, { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { icsDataUri, googleCalUrl } from "@/lib/ics";

// Coerce an operator-entered timezone into a valid IANA zone. The Scheduling
// field is free text, so "America/New York" (space instead of underscore) or a
// stray typo can otherwise throw a RangeError inside Intl and crash the whole
// page. Spaces become underscores; anything Intl still rejects falls back to
// Eastern (the Charlotte default) so the booker always renders.
function safeTz(tz: unknown): string {
  const cleaned = String(tz || "").trim().replace(/\s+/g, "_");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: cleaned });
    return cleaned;
  } catch {
    return "America/New_York";
  }
}

// The visitor's own IANA timezone, e.g. "America/Chicago" for an operator in Omaha.
function visitorTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; }
}

// The same instant rendered in the visitor's local timezone — only worth showing
// when it differs from the business timezone the slots are displayed in.
function localHint(utc: number, businessTz: string): string {
  const vt = visitorTz();
  if (!vt || vt === businessTz) return "";
  const local = new Date(utc).toLocaleString("en-US", { timeZone: vt, weekday: "short", hour: "numeric", minute: "2-digit" });
  const abbr = vt.split("/").pop()?.replace(/_/g, " ") || vt;
  return `${local} your time (${abbr})`;
}

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
  const [form, setForm] = useState({ name: "", email: "", phone: "", business: "", website: "", socials: "", reason: "", notes: "" });
  const [offers, setOffers] = useState<string[]>([]);
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
      setOffers(((data.offers as string[]) || []).filter(Boolean));
      const t = new Set<number>((data.taken || []).map((iso: string) => new Date(iso).getTime()));
      setTaken(t);
      setLoading(false);
    })();
  }, []);

  const tz = safeTz(cfg?.tz);
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
    if (!picked || !form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.business.trim()) {
      setErr("Name, email, phone, and business name are required.");
      return;
    }
    setBusy(true); setErr("");
    const start = new Date(picked.utc).toISOString();
    const end = new Date(picked.utc + slotMins * 60000).toISOString();
    const whenText = new Date(picked.utc).toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " (" + tz + ")";
    let data: any = null;
    try {
      const res = await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name: form.name, email: form.email, phone: form.phone, notes: form.notes, details: { business: form.business, website: form.website, socials: form.socials, reason: form.reason }, start, end, whenText, title: cfg?.title }) });
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

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#0a1322", color: "#f4f7fc", display: "flex", justifyContent: "center", padding: "36px 20px", fontFamily: "'Archivo', sans-serif" };
  const card: React.CSSProperties = { width: "560px", maxWidth: "100%", background: "#101d33", border: "1px solid #24385c", borderTop: "3px solid #ffb81c", height: "fit-content" };
  const inp: React.CSSProperties = { width: "100%", background: "#060c17", border: "1px solid #33455f", color: "#f4f7fc", padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginBottom: 10 };

  if (loading) return <div style={wrap}><div style={{ color: "#5c7096", fontSize: 13 }}>Loading…</div></div>;
  if (err && !cfg) return <div style={wrap}><div style={{ color: "#8ea3c4", fontSize: 13, textAlign: "center" }}>{err}</div></div>;

  const days = buildDays();

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #24385c", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 34, height: 34, border: "2px solid #ffb81c", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1608", flexShrink: 0 }}>
            <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "10px solid #ffb81c", marginLeft: 3 }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 900, fontSize: 19, lineHeight: 0.86 }}>{cfg?.title || "Book a call"}</div>
            <div style={{ fontSize: 8.5, letterSpacing: ".28em", color: "#5c7096", marginTop: 3 }}>CI/OS · {slotMins} MIN · {tz}</div>
          </div>
        </div>

        <div style={{ padding: "24px 26px" }}>
          {done ? (
            <div>
              <div style={{ background: "#0c1f14", border: "1px solid #1d3d2a", color: "#2ee06f", padding: 16, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
                ✓ Booked{picked ? " for " + new Date(picked.utc).toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}. Talk soon.
                {picked && localHint(picked.utc, tz) ? <div style={{ color: "#8ea3c4", fontSize: 11, marginTop: 6 }}>That's {localHint(picked.utc, tz)}.</div> : null}
              </div>
              {picked ? (() => {
                const title = cfg?.title || "Call with Creative Impact";
                const ev = {
                  start: picked.utc,
                  end: picked.utc + slotMins * 60000,
                  title,
                  description: form.notes || undefined,
                  uid: picked.utc + "@creativeimpactos",
                  alarmMinutes: 60,
                };
                const btn: React.CSSProperties = { flex: 1, textAlign: "center", background: "transparent", border: "1px solid #33455f", color: "#f4f7fc", padding: "10px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none" };
                return (
                  <div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <a href={googleCalUrl(ev)} target="_blank" rel="noopener noreferrer" style={btn}>+ Google Calendar</a>
                      <a href={icsDataUri(ev)} download="creative-impact-call.ics" style={btn}>+ Apple / Phone</a>
                    </div>
                    <div style={{ fontSize: 10, color: "#5c7096", marginTop: 8, textAlign: "center" }}>Saves to your calendar in your own local time.</div>
                  </div>
                );
              })() : null}
            </div>
          ) : picked ? (
            <div>
              <div style={{ fontSize: 12, color: "#8ea3c4", marginBottom: 14 }}>You picked <span style={{ color: "#ffb81c" }}>{new Date(picked.utc).toLocaleString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span> ({tz}).{localHint(picked.utc, tz) ? <span style={{ display: "block", marginTop: 4, color: "#5c7096" }}>{localHint(picked.utc, tz)}</span> : null}</div>
              <input style={inp} placeholder="Your name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input style={inp} placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input style={inp} placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input style={inp} placeholder="Business name *" value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} />
              <input style={inp} placeholder="Website (if you have one)" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              <input style={inp} placeholder="Socials — IG / Facebook / YouTube handles" value={form.socials} onChange={(e) => setForm({ ...form, socials: e.target.value })} />
              <select style={{ ...inp, cursor: "pointer" }} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                <option value="">What are you reaching out for?</option>
                {offers.map((o) => <option key={o} value={o}>{o}</option>)}
                <option value="Not sure yet — need direction">Not sure yet — need direction</option>
                <option value="Something else">Something else</option>
              </select>
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} placeholder="Anything else we should know before the call?" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setPicked(null)} style={{ flex: "0 0 auto", background: "transparent", border: "1px solid #33455f", color: "#8ea3c4", padding: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer" }}>Back</button>
                <button onClick={confirm} disabled={busy || !form.name.trim() || !form.email.trim()} style={{ flex: 1, background: "#ffb81c", color: "#1a1608", border: "none", padding: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", cursor: (busy || !form.name.trim() || !form.email.trim()) ? "default" : "pointer", opacity: (busy || !form.name.trim() || !form.email.trim()) ? 0.5 : 1 }}>{busy ? "Booking…" : "Confirm →"}</button>
              </div>
              {err ? <div style={{ color: "#ffb81c", fontSize: 12, marginTop: 10, textAlign: "center" }}>{err}</div> : null}
            </div>
          ) : days.length === 0 ? (
            <div style={{ color: "#8ea3c4", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No open times right now. Please check back soon.</div>
          ) : (
            <div>
              {days.map((d) => (
                <div key={d.key} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, letterSpacing: ".16em", color: "#5c7096", textTransform: "uppercase", marginBottom: 8 }}>{d.label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {d.slots.map((s) => (
                      <button key={s.utc} onClick={() => setPicked(s)} style={{ background: "transparent", border: "1px solid #33455f", color: "#f4f7fc", padding: "9px 13px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, cursor: "pointer" }}>{s.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#5c7096", marginTop: 16, textAlign: "center" }}>Times shown in {tz} · Creative Impact</div>
        </div>
      </div>
    </div>
  );
}
