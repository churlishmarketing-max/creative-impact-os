"use client";

// Post-payment landing for Stripe Payment Link buyers. Exchanges the session
// id for the intake token and forwards them straight into their intake —
// falling back to "check your email" (E1 carries the same link).

import React, { useEffect, useState } from "react";

const T = { cream: "#f2f5fa", ink: "#0c1522", teal: "#1c3d6b", muted: "#5c7096", line: "#d5deed" };
const cond = "'Oswald',sans-serif";
const sans = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export default function DiagnosticThanks() {
  const [state, setState] = useState<"working" | "emailed" | "problem">("working");

  useEffect(() => {
    const session_id = new URLSearchParams(window.location.search).get("session_id") || "";
    if (!session_id) { setState("problem"); return; }
    (async () => {
      // the webhook may still be in flight — try a few times before falling back
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch("/api/diagnostic/from-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id }) });
          const j = await r.json();
          if (j.ok && j.intake_token) { window.location.replace(`/diagnostic/intake/${j.intake_token}`); return; }
          if (r.status === 400 && j.error === "not_paid") { await new Promise((res) => setTimeout(res, 2000)); continue; }
          break;
        } catch { await new Promise((res) => setTimeout(res, 2000)); }
      }
      setState("emailed");
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.cream, color: T.ink, fontFamily: sans, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 500, background: "#fff", borderTop: `4px solid ${T.teal}`, border: `1px solid ${T.line}`, padding: "34px 32px" }}>
        {state === "working" ? (
          <>
            <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 32, textTransform: "uppercase", lineHeight: 1 }}>Payment received.</div>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: T.muted, margin: "14px 0 0" }}>Setting up your intake — one second…</p>
          </>
        ) : state === "emailed" ? (
          <>
            <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 32, textTransform: "uppercase", lineHeight: 1 }}>Payment received. Check your inbox.</div>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: T.muted, margin: "14px 0 0" }}>
              Your intake link is in your email (subject: <b style={{ color: T.ink }}>&ldquo;Your Diagnostic is paid. Here&rsquo;s step one.&rdquo;</b>).
              The form takes about 12 minutes with your Ads Manager open, and the 5-day clock on your report starts the moment you submit.
              Nothing there in a couple of minutes? Email hello@creativeimpactmedia.co and we&rsquo;ll sort it fast.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontFamily: cond, fontWeight: 900, fontSize: 32, textTransform: "uppercase", lineHeight: 1 }}>Almost there.</div>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: T.muted, margin: "14px 0 0" }}>
              We couldn&rsquo;t find your payment session on this visit. If you just paid, your intake link is on its way to your email.
              Anything off, email hello@creativeimpactmedia.co.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
