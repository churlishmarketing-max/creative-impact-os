"use client";

// Fleet — the Second Brain manifest inside the OS (operator-only).
// fleet_roster = the census (mirrors the second-brain skill's roster.md,
// kept in sync via /api/fleet/roster); fleet_reports = live run telemetry
// (agents POST /api/fleet/ingest at the end of every run). This page merges
// both: every unit, its job and schedule, and what it actually did last.

import React, { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

const C = { bg: "#0a1322", panel: "#101d33", line: "#24385c", line2: "#33455f", cream: "#f4f7fc", muted: "#8ea3c4", dim: "#5c7096", red: "#ffb81c", green: "#2ee06f", gold: "#c8960a", teal: "#3aa8b4" };
const mono = "'Archivo', sans-serif";
const cond = "'Oswald',sans-serif";

const DIVISIONS: { key: string; label: string; accent: string }[] = [
  { key: "command", label: "COMMAND LAYER", accent: C.red },
  { key: "war-rooms", label: "WAR ROOMS", accent: C.gold },
  { key: "fleet", label: "FLEET AGENTS", accent: C.green },
  { key: "production", label: "PRODUCTION ENGINES", accent: C.teal },
  { key: "systems", label: "SYSTEMS & PROTOCOLS", accent: C.muted },
  { key: "clients", label: "CLIENT FILES", accent: C.cream },
];

type Unit = { key: string; name: string; alias: string; division: string; job: string; triggers: string; schedule: string | null; loc: string; sort: number };
type Report = { id: string; agent: string; title: string; summary: string; run_at: string };

const ago = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  const days = Math.floor(d / 86400000);
  if (days > 0) return days + "d ago";
  const hrs = Math.floor(d / 3600000);
  if (hrs > 0) return hrs + "h ago";
  return Math.max(1, Math.floor(d / 60000)) + "m ago";
};
const titleCase = (k: string) => k.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export default function FleetDashboard() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [ready, setReady] = useState(false);
  const [rosterMissing, setRosterMissing] = useState(false);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [openRun, setOpenRun] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    (async () => {
      const sb = getBrowserClient();
      if (!sb) { setReady(true); return; }
      const [r1, r2] = await Promise.all([
        sb.from("fleet_roster").select("key,name,alias,division,job,triggers,schedule,loc,sort").order("sort"),
        sb.from("fleet_reports").select("id,agent,title,summary,run_at").order("run_at", { ascending: false }).limit(200),
      ]);
      if (r1.error) setRosterMissing(true);
      setUnits((r1.data as Unit[]) || []);
      setReports((r2.data as Report[]) || []);
      setReady(true);
    })();
  }, []);

  // live telemetry per agent key
  const latest = new Map<string, { last: Report; count: number }>();
  for (const r of reports) {
    const cur = latest.get(r.agent);
    if (!cur) latest.set(r.agent, { last: r, count: 1 });
    else cur.count++;
  }
  // agents that reported but aren't on the roster
  const rosterKeys = new Set(units.map((u) => u.key));
  const unregistered = [...latest.keys()].filter((k) => !rosterKeys.has(k));
  const feed = filter ? reports.filter((r) => r.agent === filter) : reports;
  const reporting = latest.size;

  const label: React.CSSProperties = { fontSize: 9.5, letterSpacing: ".18em", color: C.dim, textTransform: "uppercase" };
  const panel: React.CSSProperties = { background: C.panel, border: `1px solid ${C.line}` };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream, fontFamily: mono, paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 22px", borderBottom: `1px solid ${C.line}`, flexWrap: "wrap", gap: 8 }}>
        <a href="/" style={{ color: C.muted, fontSize: 11, letterSpacing: ".14em", textDecoration: "none", textTransform: "uppercase" }}>← Creative Impact/OS</a>
        <span style={label}>Second Brain — Fleet Manifest</span>
        <span style={{ fontSize: 10, color: C.dim }}>{units.length} units · {reporting} reporting · {reports.length} runs</span>
      </div>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 26px" }}>
        {!ready ? <div style={{ color: C.dim, fontSize: 13 }}>Loading the manifest…</div> : null}

        {ready && rosterMissing ? (
          <div style={{ ...panel, borderLeft: `3px solid ${C.gold}`, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.cream, marginBottom: 6 }}>Roster not installed yet.</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>Run <b style={{ color: C.cream }}>supabase/19_fleet_roster_marvel.sql</b> in the SQL Editor — it seeds all 44 units of the Creative Impact fleet. Live run reports below still work either way.</div>
          </div>
        ) : null}

        {/* divisions */}
        {DIVISIONS.map((d) => {
          const list = units.filter((u) => u.division === d.key);
          if (!list.length) return null;
          return (
            <div key={d.key} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: cond, fontWeight: 900, fontSize: 16, letterSpacing: ".12em", color: d.accent }}>{d.label}</span>
                <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${d.accent}44, transparent)` }} />
                <span style={{ fontSize: 9.5, color: C.dim }}>{list.length} units</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 8 }}>
                {list.map((u) => {
                  const live = latest.get(u.key);
                  const isOpen = openUnit === u.key;
                  return (
                    <div key={u.key} onClick={() => { setOpenUnit(isOpen ? null : u.key); if (live) setFilter(filter === u.key ? "" : u.key); }}
                      style={{ ...panel, borderLeft: `3px solid ${live ? C.green : C.line2}`, padding: "11px 14px", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontFamily: cond, fontWeight: 900, fontSize: 17, textTransform: "uppercase" }}>{u.name}</span>
                        <span style={{ fontSize: 8.5, color: u.loc === "OS" ? C.red : u.loc === "CC" ? C.teal : C.dim, letterSpacing: ".1em", flexShrink: 0 }}>{u.loc}</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{u.alias}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 7 }}>
                        <span style={{ fontSize: 9.5, color: C.dim, letterSpacing: ".06em" }}>{u.schedule || "on demand"}</span>
                        {live ? <span style={{ fontSize: 9.5, color: C.green, letterSpacing: ".06em" }}>● RAN {ago(live.last.run_at).toUpperCase()} · {live.count}×</span>
                          : <span style={{ fontSize: 9.5, color: C.dim }}>no runs reported</span>}
                      </div>
                      {live && !isOpen ? <div style={{ fontSize: 11, color: C.cream, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{live.last.title || live.last.summary.slice(0, 70)}</div> : null}
                      {isOpen ? (
                        <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
                          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.65 }}>{u.job}</div>
                          {u.triggers ? <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>TRIGGERS: {u.triggers}</div> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* reporters not on the roster — the census flag */}
        {unregistered.length ? (
          <div style={{ ...panel, borderLeft: `3px solid ${C.gold}`, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ ...label, marginBottom: 8, color: C.gold }}>⚠ Reporting but not on the roster</div>
            {unregistered.map((k) => (
              <div key={k} style={{ fontSize: 12, color: C.cream, padding: "3px 0" }}>{titleCase(k)} <span style={{ color: C.dim }}>({k}) — last ran {ago(latest.get(k)!.last.run_at)}. Register it via the Second Brain update protocol.</span></div>
            ))}
          </div>
        ) : null}

        {/* run feed */}
        <div style={{ ...panel, padding: "16px 18px" }}>
          <div style={{ ...label, marginBottom: 12 }}>
            {filter ? `${titleCase(filter)} — RUN HISTORY · click its card to clear` : "LIVE RUN FEED"}
          </div>
          {feed.length === 0 ? (
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.7 }}>No runs reported{filter ? " by this unit" : ""} yet. Scheduled agents report automatically at the end of each run.</div>
          ) : feed.map((r) => {
            const isOpen = openRun === r.id;
            return (
              <div key={r.id} onClick={() => setOpenRun(isOpen ? null : r.id)}
                style={{ background: "#060c17", border: `1px solid ${C.line2}`, borderLeft: `3px solid ${C.green}`, padding: "10px 14px", marginBottom: 8, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>
                    <span style={{ color: C.green }}>{titleCase(r.agent)}</span>
                    <span style={{ color: C.cream }}> · {r.title || "run report"}</span>
                  </span>
                  <span style={{ fontSize: 10, color: C.dim, flexShrink: 0 }}>{new Date(r.run_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.65, whiteSpace: "pre-wrap", marginTop: 6, ...(isOpen ? {} : { maxHeight: 44, overflow: "hidden" }) }}>{r.summary}</div>
                {!isOpen && r.summary.length > 160 ? <div style={{ fontSize: 9.5, color: C.dim, marginTop: 4 }}>tap to expand</div> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
