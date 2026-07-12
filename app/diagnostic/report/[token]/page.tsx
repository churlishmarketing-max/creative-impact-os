"use client";

// Authority Diagnostic — client report view (report-blueprint.md §6V tokens).
// Token page: 404s until Brandon has approved AND delivered (HITL). One JSON,
// two renders: this screen + the print stylesheet (Download PDF = print).

import React, { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

const T = { cream: "#f2f5fa", ink: "#0c1522", teal: "#1c3d6b", red: "#C41E3A", gold: "#C8960A", muted: "#5c7096", line: "#d5deed" };
const cond = "'Oswald',sans-serif";
const sans = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

type Card = { metric: string; value: string; target: string; read: string };
type Factor = { name: string; score: number; evidence: string };
type Row = { metric: string; value: string; healthy: string; read: string; rating: string };
type GapItem = { header: string; body: string; evidence_quote: string };
type FixItem = { rank: number; biggest_lever: boolean; title: string; body: string };
type Report = {
  snapshot: { authority_score: { value: number; band: string; factors: Factor[]; read: string }; cards: Card[]; verdict_line: string; verdict_paragraph: string };
  numbers: { rows: Row[]; diagnosis: string; data_gaps: { metric: string; why_it_matters: string }[] };
  gap: { framing: string; items: GapItem[] };
  fix: { items: FixItem[]; rewrite: { before: string; after: string } };
  math: { rows: { label: string; value: string }[]; assumptions: string; point_of_750: string; skipped: boolean };
  next: { cta: string };
};
type Data = { business: string; report: Report; delivered_at: string; credit_deadline: string | null };

const METRIC_LABEL: Record<string, string> = { cpm: "CPM", hook_rate: "Video Hook Rate", hold_rate: "Hold Rate", link_ctr: "Link CTR", ctr_all: "CTR (All)", frequency: "Frequency", optin: "Opt-in Rate", cpl: "Cost Per Lead", efficiency: "Hook-to-Lead Efficiency", cpc_link: "CPC (Link)", cpc_all: "CPC (All)", authority_score: "Authority Score" };
const lbl = (m: string) => METRIC_LABEL[m] || m.replace(/_/g, " ").toUpperCase();

export default function DiagnosticReport() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const token = parts[parts.length - 1] || "";
    (async () => {
      const sb = getBrowserClient();
      if (!sb) { setLoading(false); return; }
      const { data: d } = await sb.rpc("get_diagnostic_report", { p_token: token });
      setData((d as Data) || null);
      setLoading(false);
    })();
  }, []);

  const secLabel = (n: string, t: string) => (
    <div style={{ margin: "44px 0 6px" }}>
      <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 13, letterSpacing: ".26em", color: T.teal, textTransform: "uppercase" }}>{n}</div>
      <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 30, textTransform: "uppercase", lineHeight: 1 }}>{t}</div>
      <div style={{ height: 1, background: T.gold, marginTop: 10 }} />
    </div>
  );

  if (loading) return <div style={{ minHeight: "100vh", background: T.cream, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, color: T.muted }}>Loading…</div>;
  if (!data?.report) return <div style={{ minHeight: "100vh", background: T.cream, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, color: T.muted, padding: 24, textAlign: "center" }}>This report isn&apos;t available. If you&apos;re expecting one, it may still be in review — you&apos;ll get an email the moment it ships.</div>;

  const r = data.report;
  const score = r.snapshot.authority_score;
  const deadline = data.credit_deadline ? new Date(data.credit_deadline + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;

  return (
    <div style={{ minHeight: "100vh", background: T.cream, color: T.ink, fontFamily: sans }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: ${T.cream}; } .page { max-width: 100% !important; padding: 0 !important; } }`}</style>
      <div className="page" style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px 60px" }}>

        {/* masthead */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 13, letterSpacing: ".26em", color: T.teal, textTransform: "uppercase" }}>CREATIVE IMPACT MEDIA — THE AUTHORITY DIAGNOSTIC</div>
            <h1 style={{ fontFamily: cond, fontWeight: 900, fontSize: "clamp(34px,6vw,52px)", textTransform: "uppercase", lineHeight: 0.95, margin: "10px 0 4px" }}>{data.business}</h1>
            <div style={{ fontSize: 13, color: T.muted }}>Delivered {new Date(data.delivered_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
          </div>
          <button className="no-print" onClick={() => window.print()}
            style={{ background: T.teal, color: "#fff", border: "none", fontFamily: cond, fontWeight: 900, fontSize: 15, letterSpacing: ".06em", textTransform: "uppercase", padding: "12px 18px", cursor: "pointer" }}>
            Download PDF
          </button>
        </div>

        {/* 01 SNAPSHOT */}
        {secLabel("01 / SNAPSHOT", "Where You Stand Today")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, margin: "18px 0" }}>
          <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderTop: `4px solid ${T.teal}`, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, letterSpacing: ".14em", color: T.muted, textTransform: "uppercase" }}>Authority Score</div>
            <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 44, lineHeight: 1 }}>{score.value}<span style={{ fontSize: 20, color: T.muted }}>/100</span></div>
            <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 15, color: T.teal, textTransform: "uppercase" }}>{score.band.replace(/_/g, " ")}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{score.read}</div>
          </div>
          {r.snapshot.cards.map((c, i) => (
            <div key={i} style={{ background: "#fff", border: `1px solid ${T.line}`, borderTop: `4px solid ${T.teal}`, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, letterSpacing: ".14em", color: T.muted, textTransform: "uppercase" }}>{lbl(c.metric)}</div>
              <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 44, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 12, color: T.muted }}>target {c.target}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{c.read}</div>
            </div>
          ))}
        </div>
        {/* the one-line verdict — red's single use on the page */}
        <div style={{ borderLeft: `5px solid ${T.red}`, background: "#fff", padding: "16px 20px", margin: "18px 0" }}>
          <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 24, lineHeight: 1.1, color: T.red }}>{r.snapshot.verdict_line}</div>
        </div>
        <p style={{ fontSize: 15.5, lineHeight: 1.7 }}>{r.snapshot.verdict_paragraph}</p>

        {/* 02 THE NUMBERS */}
        {secLabel("02 / THE NUMBERS", "Your Ad Account, Read Against Benchmark")}
        <div style={{ overflowX: "auto", margin: "16px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 520 }}>
            <thead><tr style={{ background: T.teal, color: "#fff" }}>
              {["Metric", "Your number", "Healthy range", "The read"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontFamily: cond, fontWeight: 900, fontSize: 14, letterSpacing: ".06em", textTransform: "uppercase" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {r.numbers.rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 ? "#faf8f3" : "#fff", borderBottom: `1px solid ${T.line}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{lbl(row.metric)}</td>
                  <td style={{ padding: "10px 12px" }}>{row.value}</td>
                  <td style={{ padding: "10px 12px", color: T.muted }}>{row.healthy}</td>
                  <td style={{ padding: "10px 12px", fontStyle: "italic" }}>{row.read}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${T.line}`, padding: "16px 20px" }}>
          <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 16, letterSpacing: ".1em", color: T.teal, textTransform: "uppercase", marginBottom: 8 }}>The Diagnosis</div>
          <p style={{ fontSize: 15, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{r.numbers.diagnosis}</p>
        </div>
        {r.numbers.data_gaps?.length ? (
          <div style={{ fontSize: 13, color: T.muted, marginTop: 12, lineHeight: 1.7 }}>
            {r.numbers.data_gaps.map((g, i) => <div key={i}>You didn&apos;t have <b>{lbl(g.metric)}</b> handy — {g.why_it_matters}</div>)}
          </div>
        ) : null}

        {/* 03 THE GAP */}
        {secLabel("03 / THE GAP", "Why The Creative Falls Flat")}
        <p style={{ fontSize: 15.5, fontStyle: "italic", color: T.muted, margin: "14px 0 18px" }}>{r.gap.framing}</p>
        {r.gap.items.map((g, i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${T.line}`, padding: "16px 20px", marginBottom: 12 }}>
            <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 20, textTransform: "uppercase", lineHeight: 1.1, marginBottom: 8 }}>{g.header}</div>
            {g.evidence_quote ? <div style={{ borderLeft: `3px solid ${T.gold}`, paddingLeft: 12, fontSize: 13.5, fontStyle: "italic", color: T.muted, margin: "0 0 10px" }}>&ldquo;{g.evidence_quote}&rdquo;</div> : null}
            <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>{g.body}</p>
          </div>
        ))}

        {/* 04 THE FIX */}
        {secLabel("04 / THE FIX", "What To Change, In Order")}
        {r.fix.items.sort((a, b) => a.rank - b.rank).map((f) => (
          <div key={f.rank} style={{ display: "flex", gap: 16, background: "#fff", border: `1px solid ${T.line}`, borderLeft: f.biggest_lever ? `5px solid ${T.teal}` : `1px solid ${T.line}`, padding: "16px 20px", marginBottom: 10 }}>
            <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 30, color: f.biggest_lever ? T.teal : T.muted, lineHeight: 1 }}>{String(f.rank).padStart(2, "0")}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 19, textTransform: "uppercase" }}>{f.title} {f.biggest_lever ? <span style={{ fontSize: 12, background: T.teal, color: "#fff", padding: "3px 8px", letterSpacing: ".1em", verticalAlign: "middle" }}>BIGGEST LEVER</span> : null}</div>
              <p style={{ fontSize: 14.5, lineHeight: 1.65, margin: "6px 0 0" }}>{f.body}</p>
            </div>
          </div>
        ))}
        <div style={{ margin: "20px 0" }}>
          <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 16, letterSpacing: ".1em", color: T.teal, textTransform: "uppercase", marginBottom: 10 }}>The Rewrite — Before &amp; After</div>
          <div style={{ background: "#e9e5db", border: `1px solid ${T.line}`, padding: "14px 18px", marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, letterSpacing: ".18em", color: T.muted, textTransform: "uppercase", marginBottom: 6 }}>Before — your current opener</div>
            <div style={{ fontSize: 15, fontStyle: "italic", color: T.muted }}>&ldquo;{r.fix.rewrite.before}&rdquo;</div>
          </div>
          <div style={{ background: "#fff", border: `2px solid ${T.teal}`, padding: "14px 18px" }}>
            <div style={{ fontSize: 10.5, letterSpacing: ".18em", color: T.teal, textTransform: "uppercase", marginBottom: 6 }}>After — problem-first, proof-loaded</div>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>&ldquo;{r.fix.rewrite.after}&rdquo;</div>
          </div>
        </div>

        {/* 05 THE MATH */}
        {secLabel("05 / THE MATH", "What The Fix Is Worth")}
        {r.math.skipped ? (
          <p style={{ fontSize: 15, lineHeight: 1.7 }}>{r.math.assumptions}</p>
        ) : (
          <>
            <div style={{ overflowX: "auto", margin: "16px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 380 }}>
                <tbody>
                  {r.math.rows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 ? "#faf8f3" : "#fff", borderBottom: `1px solid ${T.line}` }}>
                      <td style={{ padding: "10px 12px", color: T.muted }}>{row.label}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 14 }}>{r.math.assumptions}</div>
          </>
        )}
        <div style={{ background: "#fff", border: `1px solid ${T.gold}`, padding: "16px 20px" }}>
          <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 16, letterSpacing: ".1em", color: T.gold, textTransform: "uppercase", marginBottom: 6 }}>The Point of the $750</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>{r.math.point_of_750}</p>
        </div>

        {/* 06 NEXT */}
        {secLabel("06 / NEXT", "Two Ways Forward")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, margin: "16px 0" }}>
          <div style={{ background: "#fff", border: `1px solid ${T.line}`, padding: "18px 20px" }}>
            <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 20, textTransform: "uppercase", marginBottom: 8 }}>Do It Yourself</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>Everything above is yours. Hand Fix 01 to whoever runs your ads this week and work down the list in order. Plenty of people take the report and never call us again. That&apos;s fine. The report was the deal.</p>
          </div>
          <div style={{ background: "#fff", border: `2px solid ${T.teal}`, padding: "18px 20px" }}>
            <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 20, textTransform: "uppercase", marginBottom: 8, color: T.teal }}>Hand It To Us</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: "0 0 10px" }}>
              The <b>Authority Engine</b> ($3,500/mo, 3-month min) or <b>Market Domination</b> ($6,000/mo) builds
              everything in this report — the positioning, the creative bench, the rotation. Your $750 credits toward
              your first month{deadline ? <> if you move by <b>{deadline}</b></> : null}.
            </p>
            <p style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>{r.next.cta}</p>
          </div>
        </div>
        <div style={{ background: "#fff", borderTop: `1px solid ${T.gold}`, borderBottom: `1px solid ${T.gold}`, padding: "18px 20px", margin: "20px 0" }}>
          <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 16, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 6 }}>The Creative Impact Promise</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>We tell you what&apos;s wrong before we sell you the fix. Everything in this report stands on its own — the numbers are yours, the fixes are yours, and the proof of whether we know what we&apos;re doing is on every page you just read.</p>
        </div>

        <div style={{ fontSize: 11, letterSpacing: ".14em", color: T.muted, textTransform: "uppercase", textAlign: "center", marginTop: 30 }}>
          CREATIVE IMPACT — THE AUTHORITY DIAGNOSTIC · CREATIVEIMPACTMEDIA.CO · HELLO@CREATIVEIMPACTMEDIA.CO
        </div>
      </div>
    </div>
  );
}
