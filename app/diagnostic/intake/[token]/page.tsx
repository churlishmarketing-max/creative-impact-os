"use client";

// Authority Diagnostic — client intake (intake-form.md). Token-gated, no
// login. Raw numbers only — the OS computes every ratio. Autosaves on every
// change. "I don't have this" = null, never zero. Mobile-first.

import React, { useEffect, useRef, useState } from "react";

const T = { cream: "#f2f5fa", ink: "#0c1522", teal: "#1c3d6b", red: "#C41E3A", gold: "#C8960A", muted: "#5c7096", line: "#d5deed" };
const cond = "'Oswald',sans-serif";
const sans = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

type P = Record<string, string>;
type Field = { k: string; label: string; type?: "text" | "textarea" | "select" | "number" | "currency" | "url"; req?: boolean; help?: string; options?: string[]; optional_marker?: boolean; videoOnly?: boolean; dep?: { k: string; anyOf: string[] } };

// Branching: fields with `dep` only show (and only validate) when the
// controlling answer matches. Three tracks through Step 2:
// running ads -> raw numbers · organic only -> content questions ·
// nothing running -> go-to-market questions.
export const ADS_YES = "Yes — ads are running now";
export const ADS_RECENT = "Not currently, but I have ad data from the last 90 days";
export const ADS_NO = "No ads — nothing to pull numbers from";
const IF_ADS = { k: "running_ads", anyOf: [ADS_YES, ADS_RECENT] };
const IF_NO_ADS = { k: "running_ads", anyOf: [ADS_NO] };
const IF_ORGANIC = { k: "posting_organic", anyOf: ["Yes — I post content"] };
const IF_NOTHING = { k: "posting_organic", anyOf: ["No — nothing consistent"] };

export function fieldVisible(f: Field, p: Record<string, string>): boolean {
  if (!f.dep) return true;
  if (!f.dep.anyOf.includes(p[f.dep.k] || "")) return false;
  // nested branch: organic/nothing questions also require the no-ads answer
  if ((f.dep.k === "posting_organic") && (p.running_ads || "") !== ADS_NO) return false;
  return true;
}

const STEPS: { title: string; time: string; intro?: string; fields: Field[] }[] = [
  {
    title: "The business", time: "2 min",
    fields: [
      { k: "business", label: "Business name", req: true },
      { k: "industry", label: "Industry", type: "select", req: true, options: ["HVAC", "Roofing / exteriors", "Med spa / aesthetics", "Fitness", "Legal", "Dental", "Home services", "Coaching / consulting", "Other"] },
      { k: "market", label: "Market / metro — where do your customers actually live?", req: true },
      { k: "website", label: "Website", type: "url", req: true },
      { k: "landing", label: "Ad landing page — the page your ads send people to. If it's just your homepage, say so.", type: "url" },
      { k: "customer_value", label: "What's one new customer worth to you, first year? Ballpark is fine.", type: "currency", req: true },
      { k: "offer", label: "What are you selling — the offer your marketing pushes (or would push) — in one or two sentences.", type: "textarea", req: true },
    ],
  },
  {
    title: "Your marketing today", time: "5 min",
    intro: "If you're running ads: open Ads Manager, set the date range to the last 30 days (or the life of your main campaign if it's younger), and copy the numbers straight across — don't calculate anything, that's our job. Not running ads? Answer the first question honestly and we'll take a different road.",
    fields: [
      { k: "running_ads", label: "Are you running paid ads right now?", type: "select", req: true, options: [ADS_YES, ADS_RECENT, ADS_NO] },
      // ---- ads track: the raw numbers -------------------------------------
      { k: "platforms", label: "Platform(s) running", type: "select", req: true, options: ["Meta", "Meta + YouTube", "Meta + TikTok", "Meta + Google", "YouTube", "TikTok", "Google", "Several / other"], dep: IF_ADS },
      { k: "date_range", label: "Date range used (e.g. Jun 7 – Jul 7)", req: true, dep: IF_ADS },
      { k: "spend", label: "Amount spent", type: "currency", req: true, help: "Ads Manager → Amount spent column", dep: IF_ADS },
      { k: "impressions", label: "Impressions", type: "number", req: true, help: "Columns → Performance → Impressions", dep: IF_ADS },
      { k: "reach", label: "Reach", type: "number", req: true, help: "Columns → Performance → Reach", dep: IF_ADS },
      { k: "plays_3s", label: "3-second video plays", type: "number", videoOnly: true, optional_marker: true, help: "Columns → Video engagement → 3-second video plays. Video ads only.", dep: IF_ADS },
      { k: "views_50", label: "50%+ video views (ThruPlay / 50% watched)", type: "number", optional_marker: true, help: "Columns → Video engagement", dep: IF_ADS },
      { k: "link_clicks", label: "Link clicks", type: "number", req: true, help: "Columns → Performance and clicks → Link clicks", dep: IF_ADS },
      { k: "clicks_all", label: "Clicks (all)", type: "number", optional_marker: true, dep: IF_ADS },
      { k: "leads", label: "Leads — form fills / calls / bookings from ads", type: "number", req: true, dep: IF_ADS },
      { k: "budget", label: "Monthly ad budget going forward", type: "currency", req: true, dep: IF_ADS },
      { k: "retargeting", label: "Is this a retargeting campaign?", type: "select", req: true, options: ["no", "yes", "mixed"], dep: IF_ADS },
      // ---- no-ads fork: organic or nothing? --------------------------------
      { k: "posting_organic", label: "Are you posting content anywhere — social, YouTube, email, anything?", type: "select", req: true, options: ["Yes — I post content", "No — nothing consistent"], dep: IF_NO_ADS },
      // organic track
      { k: "platforms_organic", label: "Where do you post? (Instagram, Facebook, YouTube, TikTok, LinkedIn, email list…)", req: true, dep: IF_ORGANIC },
      { k: "post_frequency", label: "How often do you actually post?", type: "select", req: true, options: ["Daily", "A few times a week", "About weekly", "A few times a month", "Rarely / in bursts"], dep: IF_ORGANIC },
      { k: "audience_size", label: "Followers / subscribers, ballpark — across everything. 'No idea' is a fine answer.", dep: IF_ORGANIC },
      { k: "best_post", label: "Your best-performing post or video ever — what was it about, and any numbers you remember (views, comments, jobs it brought in)?", type: "textarea", req: true, dep: IF_ORGANIC },
      { k: "best_post_opening", label: "The first line of that post, word for word (or as close as you can get).", type: "textarea", req: true, dep: IF_ORGANIC },
      { k: "organic_leads", label: "In a normal month, how many actual customers come from your content?", dep: IF_ORGANIC },
      { k: "organic_destination", label: "Where does your content send people — website, DMs, phone, nowhere?", dep: IF_ORGANIC },
      // nothing-running track
      { k: "found_today", label: "How do new customers actually find you today? Be specific — referrals, Google, truck signage, word of mouth.", type: "textarea", req: true, dep: IF_NOTHING },
      { k: "tried_before", label: "Have you tried ads or posting before? What happened?", type: "textarea", dep: IF_NOTHING },
      { k: "why_not", label: "What's the biggest reason you haven't started?", type: "textarea", req: true, dep: IF_NOTHING },
      { k: "capacity", label: "How many new customers a month could you actually handle right now?", dep: IF_NOTHING },
      // budget question for BOTH no-ads tracks
      { k: "budget_ready", label: "If the math made sense, what could you commit to marketing monthly?", type: "select", req: true, options: ["Under $500/mo", "$500–$1,500/mo", "$1,500–$5,000/mo", "$5,000+/mo"], dep: IF_NO_ADS },
    ],
  },
  {
    title: "The creative", time: "3 min",
    fields: [
      { k: "opening_line", label: "Type the first sentence of your main ad, word for word. This matters more than anything else on this form.", type: "textarea", req: true, dep: IF_ADS },
      { k: "ad_copy", label: "Full ad copy / script", type: "textarea", req: true, dep: IF_ADS },
      { k: "creative_links", label: "Links to your ad videos / creatives (Drive, Dropbox, FB library — one per line)", type: "textarea", dep: IF_ADS },
      { k: "creatives_live", label: "How many creatives are live right now", type: "number", req: true, dep: IF_ADS },
      { k: "creative_age", label: "Age of the oldest live creative", type: "select", req: true, options: ["Under 2 weeks", "2–4 weeks", "1–2 months", "2+ months"], dep: IF_ADS },
      { k: "cta", label: "Your current CTA, word for word", req: true, dep: IF_ADS },
    ],
  },
  {
    title: "Positioning & proof", time: "3 min",
    fields: [
      { k: "why_us", label: "Finish this: people should pick us over the other guys because…", type: "textarea", req: true },
      { k: "proof", label: "Proof you can put a number on — jobs completed, years of same-day callbacks, customers in a named neighborhood. Anything specific and true. If you don't have one, say 'none yet.' Honest beats impressive here.", type: "textarea", req: true },
      { k: "best_review", label: "Best review or client result, verbatim", type: "textarea" },
      { k: "ideal_customer", label: "Who's the customer you most want more of?", type: "textarea", req: true },
      { k: "objection", label: "Biggest objection you hear before people buy", type: "textarea", req: true },
    ],
  },
];

export default function DiagnosticIntake() {
  const [token, setToken] = useState("");
  const [p, setP] = useState<P>({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [prefill, setPrefill] = useState<{ date: string; fields: P } | null>(null);
  const [shots, setShots] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const tk = parts[parts.length - 1] || "";
    setToken(tk);
    (async () => {
      // Stripe redirect lands here — confirm payment first (webhook fallback)
      const paidSession = new URLSearchParams(window.location.search).get("paid_session");
      if (paidSession) {
        try { await fetch("/api/diagnostic/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tk, session_id: paidSession }) }); } catch { }
        window.history.replaceState({}, "", window.location.pathname);
      }
      try {
        const r = await fetch(`/api/diagnostic/intake?token=${encodeURIComponent(tk)}`);
        const j = await r.json();
        if (!r.ok) { setErr(j.error === "not_found" ? "This intake link isn't valid — check the email we sent you." : "Something went wrong loading your intake."); setLoading(false); return; }
        setStatus(j.status);
        setP({ business: j.business || "", ...(j.payload || {}) });
        if (j.submitted || ["intake_complete", "analyzing", "draft_ready", "in_review", "approved", "delivered", "follow_up", "converted", "closed"].includes(j.status)) setDone(true);
        if (j.status === "created") setErr("This diagnostic isn't paid yet. If you just checked out, give it a few seconds and refresh.");
        if (j.prefill) { setPrefill(j.prefill); fetch("/api/diagnostic/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tk, payload: {}, prefillEvent: "clarity_prefill_offered" }) }).catch(() => { }); }
      } catch { setErr("Something went wrong loading your intake."); }
      setLoading(false);
    })();
  }, []);

  function save(next: P) {
    setSaveState("saving…");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const r = await fetch("/api/diagnostic/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, payload: next }) });
        setSaveState((await r.json()).ok ? "saved ✓" : "save failed — check connection");
      } catch { setSaveState("save failed — check connection"); }
    }, 700);
  }
  const set = (k: string, v: string) => { const next = { ...p, [k]: v }; setP(next); save(next); };

  function acceptPrefill() {
    if (!prefill) return;
    const mapped: P = {};
    Object.entries(prefill.fields).forEach(([k, v]) => { if (!p[k]) mapped[k] = v; });
    const next = { ...p, ...mapped };
    setP(next); save(next);
    fetch("/api/diagnostic/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, payload: mapped, prefillEvent: "clarity_prefill_accepted" }) }).catch(() => { });
    setPrefill(null);
  }

  async function uploadShot(file: File) {
    if (file.size > 3.8 * 1024 * 1024) { alert("That screenshot is over 4MB — crop it or screenshot a smaller area."); return; }
    const dataUrl: string = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(file); });
    const r = await fetch("/api/diagnostic/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name: file.name, dataUrl }) });
    const j = await r.json();
    if (j.ok) setShots(j.count);
  }

  async function submit() {
    const req: string[] = [];
    STEPS.forEach((s) => s.fields.forEach((f) => { if (f.req && fieldVisible(f, p) && !(p[f.k] || "").trim()) req.push(f.k); }));
    setMissing(req);
    if (req.length) { setErr("A few required answers are still blank — they're marked in red. Jump back with the step dots."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/diagnostic/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const j = await r.json();
      if (j.ok) setDone(true);
      else if (j.missing) { setMissing(j.missing); setErr("A few required answers are still blank."); }
      else setErr("Couldn't submit — try again, or email hello@creativeimpactmedia.co.");
    } catch { setErr("Couldn't submit — try again."); }
    setBusy(false);
  }

  const label: React.CSSProperties = { display: "block", fontSize: 14.5, fontWeight: 600, color: T.ink, lineHeight: 1.5, marginBottom: 7 };
  const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: `1px solid #c6d2e4`, background: "#fff", padding: "12px 13px", fontSize: 16, fontFamily: sans };
  const wrap: React.CSSProperties = { minHeight: "100vh", background: T.cream, color: T.ink, fontFamily: sans };

  if (loading) return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: T.muted }}>Loading your intake…</div></div>;
  if (err && !status) return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}><div style={{ color: T.muted, textAlign: "center", maxWidth: 420 }}>{err}</div></div>;

  if (done) return (
    <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 480, background: "#fff", borderTop: `4px solid ${T.teal}`, border: `1px solid ${T.line}`, padding: "34px 32px" }}>
        <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 34, textTransform: "uppercase", lineHeight: 1 }}>Got it. The read is underway.</div>
        <p style={{ fontSize: 15.5, lineHeight: 1.7, color: T.muted, margin: "16px 0 0" }}>
          Your report lands within 5 business days. You&apos;ll get an email the moment it&apos;s ready. No call, no pitch
          meeting — the report is the deliverable. Questions in the meantime: hello@creativeimpactmedia.co.
        </p>
      </div>
    </div>
  );

  const isConfirm = step === STEPS.length;
  const s = STEPS[Math.min(step, STEPS.length - 1)];
  const pct = Math.round(((step) / STEPS.length) * 100);

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 90px" }}>
        <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 12, letterSpacing: ".22em", color: T.teal, textTransform: "uppercase" }}>THE AUTHORITY DIAGNOSTIC — INTAKE</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontFamily: cond, fontWeight: 900, fontSize: 34, textTransform: "uppercase", lineHeight: 1, margin: "10px 0 4px" }}>
            {isConfirm ? "Confirm & submit" : `${step + 1}. ${s.title}`}
          </h1>
          <span style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>{saveState || (isConfirm ? "" : `~${s.time}`)}</span>
        </div>
        {/* progress */}
        <div style={{ height: 6, background: "#d5deed", margin: "10px 0 6px" }}><div style={{ height: 6, width: `${isConfirm ? 100 : pct}%`, background: T.teal, transition: "width .3s" }} /></div>
        <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
          {[...STEPS.map((x, i) => i), STEPS.length].map((i) => (
            <button key={i} onClick={() => setStep(i)} style={{ width: 26, height: 26, borderRadius: 13, border: `1px solid ${i === step ? T.teal : "#c6d2e4"}`, background: i === step ? T.teal : "#fff", color: i === step ? "#fff" : T.muted, fontSize: 12, cursor: "pointer" }}>{i === STEPS.length ? "✓" : i + 1}</button>
          ))}
        </div>

        {/* clarity prefill offer — opt-in, never silent */}
        {prefill ? (
          <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderLeft: `4px solid ${T.gold}`, padding: "14px 16px", marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>We found your Clarity Engine answers from {prefill.date} — prefill what still applies?</div>
            <div style={{ fontSize: 12.5, color: T.muted, margin: "4px 0 10px" }}>Only empty fields get filled, your ad-account numbers never do, and you can edit anything that&apos;s changed.</div>
            <button onClick={acceptPrefill} style={{ background: T.teal, color: "#fff", border: "none", padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginRight: 8 }}>Prefill</button>
            <button onClick={() => setPrefill(null)} style={{ background: "transparent", color: T.muted, border: `1px solid #c6d2e4`, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}>Start fresh</button>
          </div>
        ) : null}

        {!isConfirm ? (
          <>
            {s.intro ? <p style={{ fontSize: 14.5, lineHeight: 1.65, color: T.muted, background: "#fff", border: `1px solid ${T.line}`, padding: "12px 14px", margin: "0 0 20px" }}><b style={{ color: T.ink }}>Before you start:</b> {s.intro}</p> : null}
            {s.fields.filter((f) => fieldVisible(f, p)).length === 0 ? (
              <div style={{ background: "#fff", border: `1px solid ${T.line}`, padding: "16px 18px", fontSize: 14.5, color: T.muted, lineHeight: 1.6 }}>
                Nothing needed here for your situation — your answers in the last step covered it. Hit next.
              </div>
            ) : null}
            {s.fields.filter((f) => fieldVisible(f, p)).map((f) => {
              const none = p[f.k] === "__none__";
              const miss = missing.includes(f.k);
              return (
                <div key={f.k} style={{ marginBottom: 20 }}>
                  <label style={{ ...label, color: miss ? T.red : T.ink }}>{f.label}{f.req ? " *" : ""}</label>
                  {f.type === "textarea" ? (
                    <textarea value={none ? "" : p[f.k] || ""} onChange={(e) => set(f.k, e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} />
                  ) : f.type === "select" ? (
                    <select value={p[f.k] || ""} onChange={(e) => set(f.k, e.target.value)} style={{ ...inp, background: "#fff" }}>
                      <option value="">— choose —</option>
                      {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={none ? "" : p[f.k] || ""} onChange={(e) => set(f.k, e.target.value)} disabled={none}
                      inputMode={f.type === "number" || f.type === "currency" ? "decimal" : undefined}
                      placeholder={f.type === "currency" ? "$" : ""}
                      style={{ ...inp, opacity: none ? 0.4 : 1 }} />
                  )}
                  {f.help ? <div style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>Where to find it: {f.help}</div> : null}
                  {f.optional_marker ? (
                    <label style={{ fontSize: 12.5, color: T.muted, display: "inline-flex", gap: 6, marginTop: 6, cursor: "pointer" }}>
                      <input type="checkbox" checked={none} onChange={(e) => set(f.k, e.target.checked ? "__none__" : "")} />
                      I don&apos;t have this{f.videoOnly ? " / not running video" : ""}
                    </label>
                  ) : null}
                </div>
              );
            })}
            {step === 1 && [ADS_YES, ADS_RECENT].includes(p.running_ads || "") ? (
              <div style={{ background: "#fff", border: `1px dashed #c6d2e4`, padding: "14px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Screenshots beat memory.</div>
                <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 10 }}>Drop your Ads Manager view here and we read against the real thing. {shots ? `${shots} uploaded ✓` : ""}</div>
                <input type="file" accept="image/*" multiple onChange={(e) => Array.from(e.target.files || []).forEach(uploadShot)} style={{ fontSize: 13 }} />
              </div>
            ) : null}
          </>
        ) : (
          <div>
            <p style={{ fontSize: 14.5, color: T.muted, lineHeight: 1.65 }}>One last look. Anything blank that shouldn&apos;t be shows in red — tap a step dot to fix it. Hit submit and the 5-day clock starts.</p>
            {STEPS.map((st, si) => (
              <div key={si} style={{ background: "#fff", border: `1px solid ${T.line}`, padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 16, textTransform: "uppercase", color: T.teal, marginBottom: 8 }}>{si + 1}. {st.title}</div>
                {st.fields.filter((f) => fieldVisible(f, p)).map((f) => (
                  <div key={f.k} style={{ display: "flex", gap: 10, fontSize: 13, padding: "4px 0", borderBottom: "1px solid #f0ece3" }}>
                    <span style={{ color: T.muted, flex: 1 }}>{f.label.split("—")[0].split(".")[0]}</span>
                    <span style={{ color: f.req && !(p[f.k] || "").trim() ? T.red : T.ink, fontWeight: 600, maxWidth: "55%", textAlign: "right", overflowWrap: "anywhere" }}>
                      {p[f.k] === "__none__" ? "don't have it" : (p[f.k] || "").trim() ? String(p[f.k]).slice(0, 80) : f.req ? "MISSING" : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {err ? <div style={{ color: T.red, fontSize: 13.5, margin: "10px 0" }}>{err}</div> : null}
            <button onClick={submit} disabled={busy}
              style={{ width: "100%", background: T.red, color: "#fff", border: "none", fontFamily: cond, fontWeight: 900, fontSize: 19, letterSpacing: ".04em", textTransform: "uppercase", padding: "16px", cursor: "pointer", opacity: busy ? 0.6 : 1, marginTop: 8 }}>
              {busy ? "Submitting…" : "Submit — start the read"}
            </button>
          </div>
        )}

        {/* step nav */}
        {!isConfirm ? (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
              style={{ background: "transparent", border: `1px solid #c6d2e4`, color: T.muted, padding: "11px 18px", fontSize: 14, cursor: "pointer", opacity: step === 0 ? 0.4 : 1 }}>← Back</button>
            <button onClick={() => setStep(step + 1)}
              style={{ background: T.teal, border: "none", color: "#fff", padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {step === STEPS.length - 1 ? "Review & submit →" : "Next →"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
