"use client";

import React, { useEffect, useRef, useState } from "react";

// The public Charlotte Spotlight board — the page EDITH's emails call "the
// board" (2-1, 3-1): the price board (ten positions, two tiers, paid in full at
// booking), which positions are claimed, what each tier includes, the proof,
// the fit-call link, and the interest form. Prices live here and nowhere in ads
// (playbook). Every line comes from the Aug 21 kit / invoice template or
// EDITH's copy: no filming-speed promise, no projections — receipts only.
type Spot = { n: number; tier: "Feature" | "Community"; price: number; claimed: boolean };
type Board = {
  spots: Spot[]; open: number; total: number; featureSpots: number;
  scope: { Feature: string[]; Community: string[] }; floorDate: string; floor: { Feature: string; Community: string };
  booking_link: string; episode_link: string;
};

const money = (n: number) => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

export default function SpotlightBoard() {
  const [b, setB] = useState<Board | null>(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ name: "", business: "", email: "", phone: "", neighborhood: "", years: "", q5: "", company_website: "" });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [formErr, setFormErr] = useState("");
  const opened = useRef(Date.now());

  useEffect(() => {
    fetch("/api/spotlight/board").then((r) => r.json()).then((j) => (j.ok ? setB(j) : setErr("The board isn't available right now."))).catch(() => setErr("The board isn't available right now."));
  }, []);

  async function send() {
    setFormErr("");
    if (!f.name.trim() || !f.business.trim() || !/@/.test(f.email) || !f.q5.trim()) { setFormErr("Your name, business, email, and the last question, please."); return; }
    setState("busy");
    try {
      const r = await fetch("/api/spotlight/board", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, elapsed_ms: Date.now() - opened.current }) });
      const j = await r.json();
      if (j.ok) setState("done"); else { setFormErr(j.error || "That didn't go through — try again, or book a call."); setState("idle"); }
    } catch { setFormErr("That didn't go through — try again, or book a call."); setState("idle"); }
  }

  const gold = "#ffb81c";
  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#0a1322", color: "#f4f7fc", fontFamily: "'Archivo', Arial, sans-serif", padding: "40px 16px 72px" };
  const col: React.CSSProperties = { width: 820, maxWidth: "100%", margin: "0 auto" };
  const card: React.CSSProperties = { background: "#101d33", border: "1px solid #24385c", padding: "22px 24px", marginTop: 18 };
  const h2: React.CSSProperties = { fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", color: "#8ea3c4", margin: "0 0 12px", fontWeight: 700 };
  const p: React.CSSProperties = { color: "#c9d6ea", fontSize: 15, lineHeight: 1.65, margin: "0 0 10px" };
  const inp: React.CSSProperties = { width: "100%", background: "#060c17", border: "1px solid #33455f", color: "#f4f7fc", padding: "11px 12px", fontSize: 15, fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#8ea3c4", margin: "12px 0 5px" };
  const cta: React.CSSProperties = { display: "inline-block", background: gold, color: "#101d33", fontWeight: 800, fontSize: 16, padding: "14px 22px", textDecoration: "none", border: 0, cursor: "pointer" };

  if (err) return <div style={wrap}><div style={{ ...col, color: "#8ea3c4" }}>{err}</div></div>;
  if (!b) return <div style={wrap}><div style={{ ...col, color: "#5c7096" }}>Loading the board…</div></div>;

  const tierBlock = (tier: "Feature" | "Community") => {
    const spots = b.spots.filter((s) => s.tier === tier);
    if (!spots.length) return null;
    const first = spots[0].n, last = spots[spots.length - 1].n;
    return (
      <div style={card}>
        <div style={h2}>{tier} spots · {first === last ? first : `${first}–${last}`}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 8 }}>
          {spots.map((s) => (
            <div key={s.n} style={{ border: `1px solid ${s.claimed ? "#33455f" : gold}`, background: s.claimed ? "#1a2640" : "transparent", padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 11, letterSpacing: ".14em", color: s.claimed ? "#5c7096" : "#8ea3c4", fontWeight: 700 }}>SPOT {s.n}{s.n === 1 ? " · LEAD" : ""}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.claimed ? "#5c7096" : gold, marginTop: 4, textDecoration: s.claimed ? "line-through" : "none" }}>{money(s.price)}</div>
              <div style={{ fontSize: 11, color: s.claimed ? "#5c7096" : "#c9d6ea", marginTop: 2 }}>{s.claimed ? "CLAIMED" : "open"}</div>
            </div>
          ))}
        </div>
        <ul style={{ ...p, paddingLeft: 20, marginTop: 16 }}>
          {b.scope[tier].map((x) => <li key={x}>{x.replace(/ — included$/, "")}</li>)}
        </ul>
      </div>
    );
  };

  return (
    <div style={wrap}>
      <div style={col}>
        <div style={{ fontSize: 12, letterSpacing: ".22em", color: gold, textTransform: "uppercase" }}>Creative Impact · The Charlotte Spotlight</div>
        <h1 style={{ fontSize: "clamp(34px, 7vw, 56px)", lineHeight: 1, margin: "12px 0 14px", fontWeight: 900 }}>The founding season board</h1>
        <p style={{ ...p, fontSize: 17 }}>One season, up to ten Charlotte businesses, one episode the city sees — short films about the people behind everyday businesses. Think Diners, Drive-Ins and Dives, but for businesses.</p>
        <p style={{ ...p, marginTop: 6 }}><b style={{ color: "#f4f7fc" }}>{b.open} of {b.total} spots open.</b> Every spot is paid in full at booking, and it’s assigned — off the board with your name on it — the moment payment clears. Nobody holds one.</p>

        {tierBlock("Feature")}
        {tierBlock("Community")}

        <div style={card}>
          <div style={h2}>The floor</div>
          <p style={{ ...p, marginBottom: 0 }}>If fewer than three businesses are filmed by {b.floorDate}, the season episode won’t assemble, and the agreement’s rollover-or-refund terms apply — your money is never stranded against an undelivered season.</p>
        </div>

        <div style={card}>
          <div style={h2}>The receipt</div>
          <p style={p}>The Omaha Spotlight reached more than 22,000 locals on its first $77 of promotion. Not a projection — a screenshot Emmanuel will show you. Charlotte is the second city.</p>
          {b.episode_link ? <a href={b.episode_link} target="_blank" rel="noreferrer" style={{ color: gold, fontWeight: 700 }}>Watch the episode →</a> : null}
        </div>

        <div style={{ ...card, borderTop: `3px solid ${gold}` }}>
          <div style={h2}>Fifteen minutes with Emmanuel</div>
          <p style={p}>He asks about your business, walks the board with you, and tells you straight which spot fits — or that none does.</p>
          <a href={b.booking_link} style={cta}>Book the 15-minute fit call</a>
        </div>

        <div style={card}>
          <div style={h2}>Rather start with a few questions?</div>
          {state === "done" ? (
            <p style={{ ...p, margin: 0 }}>Got it — thanks. You’ll get a note from us shortly, and Emmanuel may just call you. If a Charlotte number rings, that’s him.</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", columnGap: 12 }}>
                {([["name", "Your name *"], ["business", "Business *"], ["email", "Email *"], ["phone", "Phone"], ["neighborhood", "Neighborhood"], ["years", "Years in business"]] as const).map(([k, l]) => (
                  <div key={k}><label style={lbl}>{l}</label><input style={inp} value={f[k]} inputMode={k === "years" ? "numeric" : k === "phone" ? "tel" : undefined} type={k === "email" ? "email" : "text"} onChange={(e) => setF((x) => ({ ...x, [k]: k === "years" ? e.target.value.replace(/\D/g, "").slice(0, 3) : e.target.value }))} /></div>
                ))}
              </div>
              <label style={lbl}>What would you want Charlotte to finally understand about your business? *</label>
              <textarea style={{ ...inp, minHeight: 90, resize: "vertical" }} value={f.q5} onChange={(e) => setF((x) => ({ ...x, q5: e.target.value }))} />
              <div style={{ position: "absolute", left: -9999, top: -9999 }} aria-hidden="true">
                <label>Company website<input tabIndex={-1} autoComplete="off" value={f.company_website} onChange={(e) => setF((x) => ({ ...x, company_website: e.target.value }))} /></label>
              </div>
              {formErr ? <p style={{ color: "#ff8a7a", fontSize: 14, margin: "12px 0 0" }}>{formErr}</p> : null}
              <button style={{ ...cta, marginTop: 16 }} disabled={state === "busy"} onClick={send}>{state === "busy" ? "Sending…" : "Send it"}</button>
              <p style={{ fontSize: 12, color: "#5c7096", marginTop: 12 }}>We’ll email you about the Spotlight. Reply “stop” any time and we will. A human reads every reply.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
