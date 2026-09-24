"use client";

import React, { useEffect, useState } from "react";

// Public unsubscribe page — the link in the footer of EDITH's cold (SEQ1) and
// episode (SEQ7) emails. One button; a GET alone never unsubscribes, so mail
// scanners that prefetch links can't opt anyone out by accident.
export default function Unsubscribe() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<"ready" | "busy" | "done" | "error">("ready");

  useEffect(() => { setToken(window.location.pathname.split("/").filter(Boolean).pop() || ""); }, []);

  async function go() {
    setState("busy");
    try {
      const r = await fetch("/api/edith/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      setState(r.ok ? "done" : "error");
    } catch { setState("error"); }
  }

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#0a1322", color: "#f4f7fc", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "72px 16px", fontFamily: "'Archivo', Arial, sans-serif" };
  const card: React.CSSProperties = { width: 460, maxWidth: "100%", background: "#101d33", border: "1px solid #24385c", borderTop: "3px solid #ffb81c", padding: "26px 26px 28px" };
  const btn: React.CSSProperties = { background: "#ffb81c", color: "#101d33", border: 0, padding: "12px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 18 };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#8ea3c4" }}>Creative Impact · Charlotte Spotlight</div>
        {state === "done" ? (
          <>
            <h1 style={{ fontSize: 24, margin: "10px 0 8px" }}>You’re unsubscribed.</h1>
            <p style={{ color: "#b9c8e0", fontSize: 14, lineHeight: 1.6, margin: 0 }}>You won’t get any more emails from us. Sorry for the bother — and if you ever want to talk, reply to any of our old emails and a human will answer.</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 24, margin: "10px 0 8px" }}>Stop these emails?</h1>
            <p style={{ color: "#b9c8e0", fontSize: 14, lineHeight: 1.6, margin: 0 }}>One click and we’ll take you off the list for good.</p>
            <button style={btn} disabled={state === "busy" || !token} onClick={go}>{state === "busy" ? "One sec…" : "Unsubscribe me"}</button>
            {state === "error" ? <p style={{ color: "#ff8a7a", fontSize: 13, marginTop: 12 }}>That link didn’t work. Reply to the email with “stop” and a human will take you off.</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
