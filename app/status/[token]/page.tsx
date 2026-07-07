"use client";

// Client-facing read-only status page (magic link, no login). Shows their
// pipeline position, work board, and recent milestones — themed with THEIR
// brand kit. Nothing internal: no money, no notes, no emails.

import React, { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

type Stage = { id: string; name: string };
type Work = { id: string; title: string; status: string; type: string; due?: string | null; link?: string | null };
type Ev = { kind: string; message: string; at: string };
type Kit = { logo?: string | null; colors?: { name?: string; hex?: string; usage?: string }[]; fonts?: { role?: string; family?: string; weight?: number; source?: string }[] } | null;
type Data = { client: { name: string; contact: string }; stage_id: string | null; stages: Stage[]; work: Work[]; kit: Kit; events: Ev[] };

const C = { bg: "#080809", panel: "#0e0e11", line: "#26262c", line2: "#34343c", cream: "#ece8e1", muted: "#8b867d", dim: "#56524b", red: "#e6322b", green: "#3fb97a" };
const mono = "'JetBrains Mono', ui-monospace, monospace";
const cond = "'Barlow Condensed','Arial Narrow',sans-serif";

const ACTIVE = ["backlog", "in_progress", "in_review"];
const TYPE_ICON: Record<string, string> = { video: "▶", ad: "◎", doc: "▤", web: "◫", social: "✦", strategy: "★", other: "•" };
const STATUS_LABEL: Record<string, string> = { backlog: "queued", in_progress: "in production", in_review: "in review", delivered: "delivered", completed: "completed" };

export default function StatusPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const token = parts[parts.length - 1] || "";
    (async () => {
      const sb = getBrowserClient();
      if (!sb) { setErr("This page isn't available."); setLoading(false); return; }
      const { data: d } = await sb.rpc("get_client_status", { p_token: token });
      if (!d) { setErr("This page could not be found — check the link."); setLoading(false); return; }
      setData(d as Data);
      setLoading(false);
    })();
  }, []);

  // Load the client's Google fonts so the page wears their brand
  useEffect(() => {
    const fonts = (data?.kit?.fonts || []).filter((f) => f.source === "google" && f.family);
    if (!fonts.length) return;
    const fam = fonts.map((f) => `family=${encodeURIComponent(f.family!)}:wght@${f.weight || 400}`).join("&");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${fam}&display=swap`;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [data]);

  const wrap: React.CSSProperties = { minHeight: "100vh", background: C.bg, color: C.cream, fontFamily: mono, paddingBottom: 60 };
  const panel: React.CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, padding: "18px 20px" };
  const label: React.CSSProperties = { fontSize: 9.5, letterSpacing: ".18em", color: C.dim, textTransform: "uppercase" };
  const h2: React.CSSProperties = { fontFamily: cond, fontWeight: 800, fontSize: 18, letterSpacing: ".02em", marginBottom: 12 };

  if (loading) return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.dim, fontSize: 13 }}>Loading…</div></div>;
  if (err || !data) return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.muted, fontSize: 13 }}>{err || "Not found."}</div></div>;

  const primary = (data.kit?.colors || []).find((c) => (c.usage || "").includes("primary"))?.hex || null;
  const headlineFont = (data.kit?.fonts || []).find((f) => (f.role || "").includes("head"))?.family;
  const curIdx = data.stages.findIndex((s) => s.id === data.stage_id);
  const active = data.work.filter((w) => ACTIVE.includes(w.status));
  const done = data.work.filter((w) => !ACTIVE.includes(w.status));

  return (
    <div style={wrap}>
      {/* brand hero */}
      <div style={{ background: primary || "#141418", borderBottom: `1px solid ${C.line}`, padding: "38px 26px" }}>
        <div style={{ maxWidth: 940, margin: "0 auto", display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          {data.kit?.logo ? (
            <img src={data.kit.logo} alt="logo" style={{ height: 60, maxWidth: 190, objectFit: "contain", background: "rgba(0,0,0,.25)", padding: 8 }} />
          ) : (
            <div style={{ width: 60, height: 60, border: "2px solid rgba(255,255,255,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: cond, fontWeight: 900, fontSize: 24, color: "#fff" }}>{data.client.name.slice(0, 2).toUpperCase()}</div>
          )}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 10, letterSpacing: ".2em", color: "rgba(255,255,255,.7)", textTransform: "uppercase", marginBottom: 6 }}>Project status</div>
            <div style={{ fontFamily: headlineFont ? `'${headlineFont}', ${cond}` : cond, fontWeight: 900, fontSize: 40, lineHeight: 0.95, color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,.4)" }}>{data.client.name}</div>
          </div>
          {curIdx >= 0 ? <span style={{ background: "rgba(0,0,0,.45)", color: "#fff", padding: "8px 14px", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase" }}>◉ {data.stages[curIdx].name}</span> : null}
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "22px 26px" }}>
        {/* pipeline strip */}
        {data.stages.length ? (
          <div style={{ ...panel, marginBottom: 18 }}>
            <div style={h2}>WHERE YOUR PROJECT IS</div>
            <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
              {data.stages.map((s, i) => {
                const isCur = i === curIdx, isPast = curIdx >= 0 && i < curIdx;
                return (
                  <div key={s.id} style={{ flex: 1, minWidth: 88, textAlign: "center", padding: "9px 6px", background: isCur ? C.red : isPast ? "#1a2e22" : "#0a0a0c", border: `1px solid ${isCur ? C.red : C.line2}`, color: isCur ? "#0a0707" : isPast ? C.green : C.dim, fontFamily: cond, fontWeight: 800, fontSize: 12.5, letterSpacing: ".04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {isPast ? "✓ " : ""}{s.name}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
          {/* in production */}
          <div style={panel}>
            <div style={h2}>IN PRODUCTION <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>· {active.length}</span></div>
            {active.length === 0 ? <div style={{ color: C.dim, fontSize: 12 }}>Nothing in flight right now.</div> : active.map((w) => (
              <div key={w.id} style={{ background: "#0a0a0c", border: `1px solid ${C.line2}`, padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ fontSize: 12.5, color: C.cream, fontWeight: 600 }}>{TYPE_ICON[w.type] || "•"} {w.title}</div>
                <div style={{ fontSize: 9.5, color: w.status === "in_review" ? C.cream : C.dim, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 6 }}>{STATUS_LABEL[w.status] || w.status}{w.due ? " · due " + w.due : ""}</div>
                {w.link ? <a href={w.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.red, textDecoration: "none" }}>view ↗</a> : null}
              </div>
            ))}
          </div>

          {/* delivered */}
          <div style={panel}>
            <div style={h2}>DELIVERED <span style={{ color: C.dim, fontSize: 11, fontFamily: mono }}>· {done.length}</span></div>
            {done.length === 0 ? <div style={{ color: C.dim, fontSize: 12 }}>First deliveries land here.</div> : done.map((w) => (
              <div key={w.id} style={{ background: "#0a0a0c", border: `1px solid ${C.line}`, padding: "10px 12px", marginBottom: 8, opacity: w.status === "completed" ? 0.7 : 1 }}>
                <div style={{ fontSize: 12.5, color: C.cream }}>{TYPE_ICON[w.type] || "•"} {w.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 9.5, color: w.status === "completed" ? C.dim : C.green, letterSpacing: ".1em", textTransform: "uppercase" }}>{STATUS_LABEL[w.status] || w.status}</span>
                  {w.link ? <a href={w.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.red, textDecoration: "none" }}>view ↗</a> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* recent milestones */}
        <div style={{ ...panel, marginTop: 18 }}>
          <div style={h2}>RECENT MILESTONES</div>
          {data.events.length === 0 ? <div style={{ color: C.dim, fontSize: 12 }}>Nothing yet.</div> : data.events.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #1a1a1f", fontSize: 12 }}>
              <span style={{ color: e.kind === "stage" ? C.red : e.kind === "work" ? C.green : C.dim, width: 90, flexShrink: 0, fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", paddingTop: 2 }}>{e.kind}</span>
              <span style={{ color: C.muted, flex: 1 }}>{e.message}</span>
              <span style={{ color: C.dim, fontSize: 10, flexShrink: 0 }}>{new Date(e.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          ))}
        </div>

        <div style={{ ...label, textAlign: "center", marginTop: 26 }}>
          Churlish Media · questions? just reply to any email from us
        </div>
      </div>
    </div>
  );
}
