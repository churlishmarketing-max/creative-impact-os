"use client";

// Authority Diagnostic — operator pipeline board (behind login via proxy).
// Kanban-lite by status, detail view with the intake, computed metrics vs
// benchmark, the report editor, and the HITL Approve -> Deliver gate.

import React, { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

const C = { bg: "#0a1322", panel: "#101d33", line: "#24385c", line2: "#33455f", cream: "#f4f7fc", muted: "#8ea3c4", dim: "#5c7096", red: "#ffb81c", green: "#2ee06f", gold: "#c8960a", teal: "#3aa8b4" };
const mono = "'Archivo', sans-serif";
const cond = "'Oswald',sans-serif";

const STAGES: { key: string; label: string }[] = [
  { key: "created", label: "UNPAID" },
  { key: "intake_sent", label: "INTAKE SENT" },
  { key: "intake_in_progress", label: "INTAKE OPEN" },
  { key: "intake_complete", label: "READY TO RUN" },
  { key: "analyzing", label: "ANALYZING" },
  { key: "draft_ready", label: "DRAFT READY" },
  { key: "in_review", label: "IN REVIEW" },
  { key: "approved", label: "APPROVED" },
  { key: "delivered", label: "DELIVERED" },
  { key: "converted", label: "CONVERTED" },
  { key: "closed", label: "CLOSED" },
];

type Dx = { id: string; status: string; client_id: string; is_comp: boolean; amount_cents: number; created_at: string; credit_deadline?: string | null; intake_token: string; report_token: string; benchmark_key: string; clarity_session_id?: string | null };
type Rep = { id: string; version: number; report: Record<string, never>; internal_notes?: string; confidence: { path: string; note: string }[]; is_approved: boolean; delivered_at?: string | null };
type Ev = { actor: string; event: string; from_status?: string; to_status?: string; payload: Record<string, unknown>; created_at: string };

export default function DiagnosticsBoard() {
  const [rows, setRows] = useState<Dx[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<Dx | null>(null);
  const [intake, setIntake] = useState<Record<string, unknown> | null>(null);
  const [metrics, setMetrics] = useState<Record<string, never> | null>(null);
  const [report, setReport] = useState<Rep | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [compOpen, setCompOpen] = useState(false);
  const [comp, setComp] = useState({ business: "", name: "", email: "" });

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  async function loadAll() {
    const sb = getBrowserClient(); if (!sb) return;
    const { data: dxs } = await sb.from("diagnostics").select("*").order("created_at", { ascending: false });
    setRows((dxs as Dx[]) || []);
    const ids = [...new Set(((dxs as Dx[]) || []).map((d) => d.client_id))];
    if (ids.length) {
      const { data: cs } = await sb.from("clients").select("id,name").in("id", ids);
      const map: Record<string, string> = {}; ((cs as { id: string; name: string }[]) || []).forEach((c) => { map[c.id] = c.name; });
      setClients(map);
    }
  }
  useEffect(() => { loadAll(); }, []);

  async function open(d: Dx) {
    setSel(d); setEdits({}); setIntake(null); setMetrics(null); setReport(null); setEvents([]);
    const sb = getBrowserClient(); if (!sb) return;
    const [i, m, r, e] = await Promise.all([
      sb.from("diagnostic_intakes").select("*").eq("diagnostic_id", d.id).maybeSingle(),
      sb.from("diagnostic_metrics").select("*").eq("diagnostic_id", d.id).maybeSingle(),
      sb.from("diagnostic_reports").select("*").eq("diagnostic_id", d.id).order("version", { ascending: false }).limit(1).maybeSingle(),
      sb.from("diagnostic_events").select("actor,event,from_status,to_status,payload,created_at").eq("diagnostic_id", d.id).order("created_at", { ascending: false }).limit(30),
    ]);
    setIntake((i.data as never) || null);
    setMetrics((m.data as never) || null);
    setReport((r.data as Rep) || null);
    setEvents((e.data as Ev[]) || []);
  }

  async function act(action: string, extra: Record<string, unknown> = {}, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(action);
    try {
      const r = await fetch("/api/diagnostic/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id: sel?.id, ...extra }) });
      const j = await r.json();
      if (j.ok) flash(action.replace(/_/g, " ").toUpperCase() + " ✓");
      else if (j.violations) flash("VOICE LAW: " + j.violations.map((v: { match: string }) => v.match).join(", "));
      else flash((j.error || "FAILED").toUpperCase());
      await loadAll();
      if (sel) { const fresh = (await getBrowserClient()!.from("diagnostics").select("*").eq("id", sel.id).maybeSingle()).data as Dx; if (fresh) await open(fresh); }
    } catch { flash("FAILED"); }
    setBusy("");
  }

  // report editor: shallow paths over the report JSON
  const rep = report?.report as Record<string, never> | undefined;
  function editable(path: string, value: string, rows = 3) {
    const cur = edits[path] ?? value ?? "";
    return <textarea key={path} value={cur} rows={rows} disabled={report?.is_approved}
      onChange={(e) => setEdits((x) => ({ ...x, [path]: e.target.value }))}
      style={{ width: "100%", boxSizing: "border-box", background: "#060c17", border: `1px solid ${edits[path] != null ? C.gold : C.line2}`, color: C.cream, fontFamily: mono, fontSize: 12, lineHeight: 1.6, padding: "8px 10px", resize: "vertical" }} />;
  }
  function buildEdits(): Record<string, unknown> | null {
    if (!rep || !Object.keys(edits).length) return null;
    const clone = JSON.parse(JSON.stringify(rep));
    for (const [path, v] of Object.entries(edits)) {
      const keys = path.split(".");
      let o = clone;
      for (let i = 0; i < keys.length - 1; i++) { const k = /^\d+$/.test(keys[i]) ? Number(keys[i]) : keys[i]; o = o[k]; if (!o) break; }
      if (o) o[/^\d+$/.test(keys[keys.length - 1]) ? Number(keys[keys.length - 1]) : keys[keys.length - 1]] = v;
    }
    return clone;
  }

  const label: React.CSSProperties = { fontSize: 9.5, letterSpacing: ".18em", color: C.dim, textTransform: "uppercase" };
  const panel: React.CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, padding: "16px 18px" };
  const btn = (bg: string, fg = "#1a1608"): React.CSSProperties => ({ background: bg, border: "none", color: fg, fontFamily: mono, fontWeight: 700, fontSize: 9.5, letterSpacing: ".1em", padding: "9px 13px", cursor: "pointer", textTransform: "uppercase" });
  const ghost: React.CSSProperties = { background: "transparent", border: `1px solid ${C.line2}`, color: C.muted, fontFamily: mono, fontSize: 9.5, letterSpacing: ".08em", padding: "9px 12px", cursor: "pointer", textTransform: "uppercase" };
  const money = (cents: number) => "$" + Math.round(cents / 100).toLocaleString();

  const copyLink = (path: string, what: string) => { navigator.clipboard?.writeText(window.location.origin + path).then(() => flash(what + " LINK COPIED ✓")); };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream, fontFamily: mono, paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 22px", borderBottom: `1px solid ${C.line}` }}>
        <a href="/" style={{ color: C.muted, fontSize: 11, letterSpacing: ".14em", textDecoration: "none", textTransform: "uppercase" }}>← Creative Impact/OS</a>
        <span style={label}>Authority Diagnostic — pipeline</span>
        <button onClick={() => setCompOpen(!compOpen)} style={{ ...ghost, borderColor: C.gold, color: C.gold }}>+ Comp diagnostic (free)</button>
      </div>

      {compOpen ? (
        <div style={{ ...panel, maxWidth: 520, margin: "18px 22px" }}>
          <div style={{ ...label, marginBottom: 10 }}>Create a comped diagnostic — no payment, same pipeline, intake email fires immediately</div>
          {(["business", "name", "email"] as const).map((k) => (
            <input key={k} value={comp[k]} onChange={(e) => setComp({ ...comp, [k]: e.target.value })} placeholder={k === "business" ? "Business name *" : k === "email" ? "Their email *" : "Contact name"}
              style={{ width: "100%", boxSizing: "border-box", background: "#060c17", border: `1px solid ${C.line2}`, color: C.cream, fontFamily: mono, fontSize: 12.5, padding: "10px 12px", marginBottom: 8 }} />
          ))}
          <button disabled={busy === "comp_create"} onClick={async () => { await act("comp_create", comp); setCompOpen(false); setComp({ business: "", name: "", email: "" }); }} style={btn(C.gold)}>Create + send intake link</button>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: sel ? "340px 1fr" : "1fr", gap: 18, padding: "18px 22px", alignItems: "start" }}>
        {/* pipeline list */}
        <div>
          {STAGES.map((st) => {
            const list = rows.filter((d) => d.status === st.key || (st.key === "intake_sent" && d.status === "paid"));
            if (!list.length) return null;
            return (
              <div key={st.key} style={{ marginBottom: 16 }}>
                <div style={{ ...label, marginBottom: 6 }}>{st.label} · {list.length}</div>
                {list.map((d) => (
                  <div key={d.id} onClick={() => open(d)}
                    style={{ background: sel?.id === d.id ? "#16263f" : C.panel, border: `1px solid ${sel?.id === d.id ? C.red : C.line}`, borderLeft: `3px solid ${d.status === "draft_ready" ? C.gold : d.status === "delivered" ? C.green : C.line2}`, padding: "10px 13px", marginBottom: 6, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{clients[d.client_id] || "…"}</span>
                      <span style={{ fontSize: 10, color: d.is_comp ? C.gold : C.green }}>{d.is_comp ? "COMP" : money(d.amount_cents)}</span>
                    </div>
                    <div style={{ fontSize: 9.5, color: C.dim, marginTop: 4 }}>
                      {Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000)}d in pipeline{d.clarity_session_id ? " · CLARITY ✓" : ""}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {!rows.length ? <div style={{ color: C.dim, fontSize: 12, padding: 20 }}>No diagnostics yet. Comp your first three from the button above, or share os.creativeimpactmedia.co/diagnostic.</div> : null}
        </div>

        {/* detail */}
        {sel ? (
          <div>
            <div style={{ ...panel, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 24, textTransform: "uppercase" }}>{clients[sel.client_id]} <span style={{ color: C.dim, fontSize: 13, fontFamily: mono }}>· {sel.status.replace(/_/g, " ")}{sel.credit_deadline ? ` · credit thru ${sel.credit_deadline}` : ""}</span></div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button style={ghost} onClick={() => copyLink(`/diagnostic/intake/${sel.intake_token}`, "INTAKE")}>⧉ intake link</button>
                  <button style={ghost} onClick={() => copyLink(`/diagnostic/report/${sel.report_token}`, "REPORT")}>⧉ report link</button>
                  {["intake_sent", "intake_in_progress"].includes(sel.status) ? <button style={ghost} disabled={!!busy} onClick={() => act("resend_intake")}>resend intake email</button> : null}
                  {["intake_complete", "analyzing"].includes(sel.status) ? <button style={btn(C.red)} disabled={!!busy} onClick={() => act("rerun")}>{busy === "rerun" ? "RUNNING…" : "▶ Run analysis"}</button> : null}
                  {["draft_ready", "in_review"].includes(sel.status) && report ? <button style={btn(C.gold)} disabled={!!busy} onClick={async () => { const e = buildEdits(); if (e) { await act("save_edits", { edits: e }); } await act("approve", {}, "Approve this report? It locks the content."); }}>✓ Approve{Object.keys(edits).length ? " (with edits)" : ""}</button> : null}
                  {sel.status === "approved" ? <button style={btn(C.green)} disabled={!!busy} onClick={() => act("deliver", {}, "Deliver now? Sends the report email and starts the 90-day credit clock.")}>⚑ Deliver to client</button> : null}
                  {sel.status === "delivered" ? <button style={btn(C.green)} disabled={!!busy} onClick={() => act("mark_converted", {}, "Mark converted? Reminder: −$750 credit line on their first retainer invoice.")}>★ Mark converted</button> : null}
                  {!["closed", "converted"].includes(sel.status) ? <button style={{ ...ghost, color: C.dim }} disabled={!!busy} onClick={() => act("close", {}, "Close this diagnostic?")}>close</button> : null}
                  <button style={{ ...ghost, borderColor: "#4a2320", color: C.red }} disabled={!!busy}
                    onClick={async () => { const name = clients[sel.client_id] || "this diagnostic"; if (!window.confirm(`DELETE the diagnostic for ${name}? This permanently removes its intake, metrics, report, and event trail. The client record stays.`)) return; await act("delete"); setSel(null); }}>
                    ✕ delete
                  </button>
                </div>
              </div>
            </div>

            {/* computed metrics */}
            {metrics ? (
              <div style={{ ...panel, marginBottom: 14 }}>
                <div style={{ ...label, marginBottom: 10 }}>Computed vs benchmark ({sel.benchmark_key}) · verdict <span style={{ color: C.red, fontWeight: 700 }}>{String((metrics as { action?: string }).action || "").toUpperCase()}</span>{(metrics as { freq_override?: boolean }).freq_override ? " · FREQ OVERRIDE" : ""}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(((metrics as { computed?: Record<string, number | null> }).computed) || {}).map(([k, v]) => {
                    const rating = (((metrics as { ratings?: Record<string, string | null> }).ratings) || {})[k];
                    const good = ["excellent", "good", "sweet", "exceptional", "optimal"].includes(rating || "");
                    const bad = ["poor", "bad", "fatigue", "high_risk"].includes(rating || "");
                    return (
                      <div key={k} style={{ background: "#060c17", border: `1px solid ${C.line2}`, padding: "7px 10px", minWidth: 108 }}>
                        <div style={{ fontSize: 8.5, letterSpacing: ".1em", color: C.dim, textTransform: "uppercase" }}>{k.replace(/_/g, " ")}</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{v == null ? "—" : k === "cpl" || k.startsWith("cpc") || k === "cpm" ? "$" + Number(v).toFixed(2) : k === "frequency" ? Number(v).toFixed(1) : (Number(v) * 100).toFixed(1) + "%"}</div>
                        <div style={{ fontSize: 8.5, color: good ? C.green : bad ? C.red : C.muted, textTransform: "uppercase" }}>{rating || "no data"}</div>
                      </div>
                    );
                  })}
                </div>
                {((intake as { anomalies?: string[] } | null)?.anomalies || []).length ? <div style={{ fontSize: 11, color: C.gold, marginTop: 10 }}>⚠ intake anomalies: {((intake as { anomalies?: string[] }).anomalies || []).join(" · ")}</div> : null}
              </div>
            ) : null}

            {/* report editor */}
            {rep ? (
              <div style={{ ...panel, marginBottom: 14 }}>
                <div style={{ ...label, marginBottom: 4 }}>Report v{report!.version} {report!.is_approved ? "· APPROVED (locked)" : "· editable — edited fields glow gold"}</div>
                {report!.internal_notes ? (
                  <div style={{ background: "#191410", border: `1px solid ${C.gold}`, padding: "10px 13px", margin: "10px 0", fontSize: 12, lineHeight: 1.65, color: "#d8c9a0" }}>
                    <b>AGENT&apos;S ADVERSARY PASS (you only):</b> {report!.internal_notes}
                  </div>
                ) : null}
                {(report!.confidence || []).length ? <div style={{ fontSize: 11, color: C.gold, marginBottom: 10 }}>soft spots: {(report!.confidence || []).map((c) => `${c.path} (${c.note})`).join(" · ")}</div> : null}

                <div style={{ ...label, margin: "12px 0 4px" }}>Verdict line (the red line)</div>
                {editable("snapshot.verdict_line", (rep as { snapshot?: { verdict_line?: string } }).snapshot?.verdict_line || "", 2)}
                <div style={{ ...label, margin: "12px 0 4px" }}>Verdict paragraph</div>
                {editable("snapshot.verdict_paragraph", (rep as { snapshot?: { verdict_paragraph?: string } }).snapshot?.verdict_paragraph || "", 3)}
                <div style={{ ...label, margin: "12px 0 4px" }}>The diagnosis (§02)</div>
                {editable("numbers.diagnosis", (rep as { numbers?: { diagnosis?: string } }).numbers?.diagnosis || "", 5)}
                {(((rep as { gap?: { items?: { header: string; body: string }[] } }).gap?.items) || []).map((g, i) => (
                  <div key={i}>
                    <div style={{ ...label, margin: "12px 0 4px" }}>Gap {i + 1} — header / body</div>
                    {editable(`gap.items.${i}.header`, g.header, 1)}
                    {editable(`gap.items.${i}.body`, g.body, 3)}
                  </div>
                ))}
                {(((rep as { fix?: { items?: { title: string; body: string; rank: number }[] } }).fix?.items) || []).map((f, i) => (
                  <div key={i}>
                    <div style={{ ...label, margin: "12px 0 4px" }}>Fix {f.rank} — title / body</div>
                    {editable(`fix.items.${i}.title`, f.title, 1)}
                    {editable(`fix.items.${i}.body`, f.body, 2)}
                  </div>
                ))}
                <div style={{ ...label, margin: "12px 0 4px" }}>The rewrite (after)</div>
                {editable("fix.rewrite.after", (rep as { fix?: { rewrite?: { after?: string } } }).fix?.rewrite?.after || "", 3)}
                <div style={{ ...label, margin: "12px 0 4px" }}>Point of the $750</div>
                {editable("math.point_of_750", (rep as { math?: { point_of_750?: string } }).math?.point_of_750 || "", 2)}
                <div style={{ ...label, margin: "12px 0 4px" }}>Closing CTA</div>
                {editable("next.cta", (rep as { next?: { cta?: string } }).next?.cta || "", 2)}
                {!report!.is_approved && Object.keys(edits).length ? (
                  <button style={{ ...btn(C.cream), marginTop: 12 }} disabled={!!busy} onClick={() => { const e = buildEdits(); if (e) act("save_edits", { edits: e }); setEdits({}); }}>Save edits</button>
                ) : null}
              </div>
            ) : null}

            {/* intake readable */}
            {intake ? (
              <div style={{ ...panel, marginBottom: 14 }}>
                <div style={{ ...label, marginBottom: 10 }}>Intake{(intake as { submitted_at?: string }).submitted_at ? ` · submitted ${new Date(String((intake as { submitted_at?: string }).submitted_at)).toLocaleDateString()}` : " · not submitted yet"}</div>
                {Object.entries(((intake as { payload?: Record<string, string> }).payload) || {}).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 12, padding: "5px 0", borderBottom: "1px solid #16263f", fontSize: 12 }}>
                    <span style={{ color: C.dim, width: 130, flexShrink: 0 }}>{k.replace(/_/g, " ")}</span>
                    <span style={{ color: C.muted, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{v === "__none__" ? "— doesn't have it —" : String(v)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* audit trail */}
            <div style={panel}>
              <div style={{ ...label, marginBottom: 8 }}>Event trail</div>
              {events.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid #16263f", fontSize: 11 }}>
                  <span style={{ color: C.dim, width: 100, flexShrink: 0 }}>{new Date(e.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  <span style={{ color: e.actor === "brandon" ? C.red : e.actor === "agent" ? C.gold : C.muted, width: 64, flexShrink: 0, textTransform: "uppercase", fontSize: 9.5 }}>{e.actor}</span>
                  <span style={{ color: C.muted }}>{e.event}{e.to_status ? ` → ${e.to_status}` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {toast ? <div style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", background: "#16263f", border: `1px solid ${C.red}`, color: C.cream, fontFamily: mono, fontSize: 11, letterSpacing: ".1em", padding: "10px 18px", zIndex: 99 }}>{toast}</div> : null}
    </div>
  );
}
