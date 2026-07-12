"use client";

// Authority Diagnostic — public offer page (SPEC.md §3.1).
// The price is on the page. $750. No call required to find out the price.
// One CTA. Pre-checkout collects name/email/business so the OS owns the
// record before payment, then hands off to Stripe.

import React, { useState } from "react";

const T = { cream: "#f2f5fa", ink: "#0c1522", teal: "#1c3d6b", red: "#C41E3A", gold: "#C8960A", muted: "#5c7096" };
const cond = "'Oswald',sans-serif";
const sans = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export default function DiagnosticOffer() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function checkout() {
    if (!email.trim() || !business.trim()) { setErr("Business name and email are required."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/diagnostic/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, business }) });
      const j = await r.json();
      if (j.url) { window.location.href = j.url; return; }
      setErr(j.error === "not_configured" ? "Checkout isn't configured yet." : "Something went wrong — try again or email hello@creativeimpactmedia.co.");
    } catch { setErr("Something went wrong — try again."); }
    setBusy(false);
  }

  const label: React.CSSProperties = { fontFamily: cond, fontWeight: 900, fontSize: 13, letterSpacing: ".22em", color: T.teal, textTransform: "uppercase" };

  return (
    <div style={{ minHeight: "100vh", background: T.cream, color: T.ink, fontFamily: sans }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={label}>CREATIVE IMPACT MEDIA — THE AUTHORITY DIAGNOSTIC</div>
        <h1 style={{ fontFamily: cond, fontWeight: 900, fontSize: "clamp(38px, 7vw, 64px)", lineHeight: 0.95, textTransform: "uppercase", margin: "14px 0 0" }}>
          Your ads have a leak.<br />We put the read in writing.
        </h1>
        <div style={{ height: 1, background: T.gold, margin: "26px 0" }} />

        <p style={{ fontSize: 17, lineHeight: 1.65, margin: "0 0 16px" }}>
          You send us your real ad account numbers — spend, plays, clicks, leads — plus the ad copy you&apos;re running.
          We read every metric against benchmark, locate where the money is actually leaking, tear into the positioning
          behind the creative, and hand you the fixes ranked by impact per dollar. In writing.
        </p>
        <p style={{ fontSize: 17, lineHeight: 1.65, margin: "0 0 16px" }}>
          No discovery call. No pitch meeting. The report is the deliverable — plenty of people take it, run the
          fixes themselves, and never talk to us again. That&apos;s the deal.
        </p>

        <div style={{ background: "#fff", border: `1px solid #d5deed`, borderTop: `4px solid ${T.teal}`, padding: "22px 24px", margin: "28px 0" }}>
          <div style={label}>WHAT YOU GET</div>
          <ul style={{ margin: "12px 0 0", padding: "0 0 0 20px", fontSize: 15.5, lineHeight: 1.9 }}>
            <li>Your Authority Score (0–100) — five factors, each scored against evidence from your own copy</li>
            <li>Every ad metric read against benchmark, with the leak located — not guessed</li>
            <li>3–5 fixes in priority order, concrete enough to hand to whoever runs your ads</li>
            <li>Your opening line rewritten — before and after, using your own proof</li>
            <li>The math on what fixing it is worth, conservative, assumptions stated</li>
          </ul>
        </div>

        <p style={{ fontFamily: cond, fontWeight: 900, fontSize: 30, textTransform: "uppercase", margin: "26px 0 4px" }}>
          $750. <span style={{ color: T.muted, fontSize: 22 }}>This is the price — no call required to find it out.</span>
        </p>
        <p style={{ fontSize: 14.5, color: T.muted, margin: "0 0 24px" }}>
          Report in your hands within 5 business days of your intake. If you later move to a retainer, the $750
          credits toward your first month. <a href="/diagnostic-sample.pdf" target="_blank" style={{ color: T.teal }}>Read a sample report first →</a>
        </p>

        {!open ? (
          <button onClick={() => setOpen(true)}
            style={{ background: T.red, color: "#fff", border: "none", fontFamily: cond, fontWeight: 900, fontSize: 20, letterSpacing: ".04em", textTransform: "uppercase", padding: "16px 26px", cursor: "pointer" }}>
            Get the read on your ad account — $750, report in 5 business days
          </button>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #d5deed", padding: "22px 24px", maxWidth: 460 }}>
            <div style={{ ...label, marginBottom: 12 }}>BEFORE CHECKOUT — 20 SECONDS</div>
            {[
              { v: business, set: setBusiness, ph: "Business name *" },
              { v: name, set: setName, ph: "Your name" },
              { v: email, set: setEmail, ph: "Email — your report goes here *" },
            ].map((f, i) => (
              <input key={i} value={f.v} onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #c6d2e4", background: T.cream, padding: "12px 13px", fontSize: 15, fontFamily: sans, marginBottom: 10 }} />
            ))}
            {err ? <div style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{err}</div> : null}
            <button onClick={checkout} disabled={busy}
              style={{ width: "100%", background: T.red, color: "#fff", border: "none", fontFamily: cond, fontWeight: 900, fontSize: 18, letterSpacing: ".04em", textTransform: "uppercase", padding: "14px", cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Opening secure checkout…" : "Continue to payment — $750"}
            </button>
          </div>
        )}

        <div style={{ height: 1, background: T.gold, margin: "40px 0 18px" }} />
        <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.7 }}>
          <b style={{ color: T.ink }}>We tell you what&apos;s wrong before we sell you the fix.</b> That&apos;s the whole model.
          Questions first? hello@creativeimpactmedia.co
        </p>
      </div>
    </div>
  );
}
