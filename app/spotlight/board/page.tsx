"use client";

import React, { useEffect, useRef, useState } from "react";

// The public Charlotte Spotlight board — the page EDITH's emails call "the
// board" (2-1, 3-1): prices, how many spots are open, the proof, the fit-call
// link, and the interest form. Prices live here and nowhere in ads (playbook).
// Copy is the Sep 19 script's and EDITH's, not new claims: no filming-speed
// promise (that line is closing-room only), no projections — receipts only.
type Board = { month: string; episodeDate: string; price: number; deposit: number; balance: number; perMonth: number; open: number; booking_link: string; episode_link: string };

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
  const col: React.CSSProperties = { width: 760, maxWidth: "100%", margin: "0 auto" };
  const card: React.CSSProperties = { background: "#101d33", border: "1px solid #24385c", padding: "22px 24px", marginTop: 18 };
  const h2: React.CSSProperties = { fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", color: "#8ea3c4", margin: "0 0 12px", fontWeight: 700 };
  const p: React.CSSProperties = { color: "#c9d6ea", fontSize: 15, lineHeight: 1.65, margin: "0 0 10px" };
  const inp: React.CSSProperties = { width: "100%", background: "#060c17", border: "1px solid #33455f", color: "#f4f7fc", padding: "11px 12px", fontSize: 15, fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "#8ea3c4", margin: "12px 0 5px" };
  const cta: React.CSSProperties = { display: "inline-block", background: gold, color: "#101d33", fontWeight: 800, fontSize: 16, padding: "14px 22px", textDecoration: "none", border: 0, cursor: "pointer" };

  if (err) return <div style={wrap}><div style={{ ...col, color: "#8ea3c4" }}>{err}</div></div>;
  if (!b) return <div style={wrap}><div style={{ ...col, color: "#5c7096" }}>Loading the board…</div></div>;
  const claimed = Math.max(0, b.perMonth - b.open);

  return (
    <div style={wrap}>
      <div style={col}>
        <div style={{ fontSize: 12, letterSpacing: ".22em", color: gold, textTransform: "uppercase" }}>Creative Impact · The Charlotte Spotlight</div>
        <h1 style={{ fontSize: "clamp(34px, 7vw, 56px)", lineHeight: 1, margin: "12px 0 14px", fontWeight: 900 }}>The {b.month} board</h1>
        <p style={{ ...p, fontSize: 17 }}>Think Diners, Drive-Ins and Dives — but for businesses. Every month we film up to ten Charlotte businesses for a series of short films about the people behind them, and put the episode in front of the city.</p>

        <div style={card}>
          <div style={h2}>{b.open} of {b.perMonth} spots open</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {Array.from({ length: b.perMonth }, (_, i) => (
              <div key={i} style={{ border: `1px solid ${i < claimed ? "#33455f" : gold}`, background: i < claimed ? "#1a2640" : "transparent", color: i < claimed ? "#5c7096" : gold, textAlign: "center", padding: "12px 0", fontWeight: 800, fontSize: 13 }}>
                {i < claimed ? "CLAIMED" : `SPOT ${i + 1}`}
              </div>
            ))}
          </div>
          <p style={{ ...p, marginTop: 14, marginBottom: 0 }}>Spots assign the moment a deposit clears. Nobody holds one.</p>
        </div>

        <div style={card}>
          <div style={h2}>What a spot is</div>
          <ul style={{ ...p, paddingLeft: 20 }}>
            <li>Your own short film, shot at your business — you sit down and talk about it; nothing to memorize.</li>
            <li>A produced commercial you own and run anywhere: your page, your ads, your website.</li>
            <li>Your place in the episode, published on YouTube and as a blog post.</li>
            <li>The episode run as a Facebook ad for a month, so the city actually sees it.</li>
            <li>Your numbers afterward — what the promotion actually reached, walked through with Emmanuel.</li>
          </ul>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: gold }}>{money(b.price)}</div>
            <div style={{ ...p, margin: 0 }}>a spot. A {money(b.deposit)} deposit claims it; the {money(b.balance)} balance is due on film day.</div>
          </div>
          <p style={{ ...p, marginTop: 12, marginBottom: 0 }}>The safety line: if the episode doesn’t reach its filming floor, you choose — roll to the next episode at the same spot and price, or every dollar back. It’s in the agreement.</p>
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
            <p style={{ ...p, margin: 0 }}>Got it — thanks. You’ll get a note from us shortly, and Emmanuel may just call you.  If a Charlotte number rings, that’s him.</p>
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
