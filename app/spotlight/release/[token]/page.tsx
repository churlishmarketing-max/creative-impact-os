"use client";

import React, { useEffect, useRef, useState } from "react";

// A Charlotte Spotlight business's release form. Everyone who appears on
// camera — owner, team, customers — signs here: name, email, a tick, Save.
// Works as a link sent ahead of film day, and in person on film day (the crew
// opens it with ?in=person and hands over the phone; "Next person" clears it).
export default function SpotlightRelease() {
  const [token, setToken] = useState("");
  const [inPerson, setInPerson] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "done">("loading");
  const [biz, setBiz] = useState("");
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", consent: false, company_website: "" });
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const opened = useRef(Date.now());

  useEffect(() => {
    const tk = window.location.pathname.split("/").filter(Boolean).pop() || "";
    setToken(tk);
    setInPerson(new URLSearchParams(window.location.search).get("in") === "person");
    fetch("/api/spotlight/release?t=" + encodeURIComponent(tk))
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) { setState("missing"); if (j.error) setErr(j.error); return; }
        setBiz(j.business || ""); setText(j.text || ""); setLabel(j.consent_label || "I agree."); setState("ready");
      })
      .catch(() => setState("missing"));
  }, []);

  async function save() {
    if (!f.first_name.trim() || !f.last_name.trim()) { setErr("Please enter your first and last name."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.email.trim())) { setErr("Please enter a valid email address."); return; }
    if (!f.consent) { setErr("Please tick the box to agree to the release."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/spotlight/release", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, ...f, in_person: inPerson, elapsed_ms: Date.now() - opened.current }) });
      const j = await r.json();
      if (j.ok) { setSigned(f.first_name.trim()); setState("done"); window.scrollTo(0, 0); }
      else setErr(j.error || "Couldn't save that — please try again.");
    } catch { setErr("Couldn't save that — please try again."); }
    setBusy(false);
  }
  const next = () => { setF({ first_name: "", last_name: "", email: "", consent: false, company_website: "" }); setSigned(""); setErr(""); opened.current = Date.now(); setState("ready"); window.scrollTo(0, 0); };

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#0a1322", color: "#f4f7fc", display: "flex", justifyContent: "center", padding: "28px 16px 60px", fontFamily: "'Archivo', sans-serif" };
  const card: React.CSSProperties = { width: 640, maxWidth: "100%", background: "#101d33", border: "1px solid #24385c", borderTop: "3px solid #ffb81c", height: "fit-content" };
  const inp: React.CSSProperties = { width: "100%", background: "#060c17", border: "1px solid #33455f", color: "#f4f7fc", padding: "12px", fontFamily: "inherit", fontSize: 16, boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, letterSpacing: ".18em", color: "#8ea3c4", textTransform: "uppercase", marginBottom: 6 };

  if (state === "loading") return <div style={wrap}><div style={{ color: "#5c7096", fontSize: 13 }}>Loading…</div></div>;
  if (state === "missing") return <div style={wrap}><div style={{ color: "#8ea3c4", fontSize: 14, textAlign: "center", maxWidth: 420, lineHeight: 1.6 }}>{err || "This release link isn't active. Ask the Creative Impact crew for the right one."}</div></div>;

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ padding: "22px 24px", borderBottom: "1px solid #24385c" }}>
          <div style={{ fontSize: 10, letterSpacing: ".26em", color: "#ffb81c", textTransform: "uppercase" }}>Charlotte Spotlight · appearance release</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 900, fontSize: 28, lineHeight: 1.05, marginTop: 8, textTransform: "uppercase" }}>{biz}</div>
          {inPerson ? <div style={{ fontSize: 11, color: "#5c7096", marginTop: 6 }}>Signing in person with the crew</div> : null}
        </div>

        {state === "done" ? (
          <div style={{ padding: 24 }}>
            <div style={{ background: "#0c1f14", border: "1px solid #1d3d2a", color: "#2ee06f", padding: 16, fontSize: 15, lineHeight: 1.6 }}>
              Thanks, {signed} — you're on file. Enjoy being on camera.
            </div>
            <button onClick={next} style={{ marginTop: 16, width: "100%", background: "#ffb81c", color: "#1a1608", border: "none", padding: 14, fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer" }}>
              {inPerson ? "Next person →" : "Sign for someone else →"}
            </button>
          </div>
        ) : (
          <div style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: 13.5, color: "#b9c8e0", lineHeight: 1.65, whiteSpace: "pre-wrap", background: "#0b1628", border: "1px solid #24385c", padding: "14px 16px", maxHeight: 360, overflowY: "auto" }}>{text}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}><label style={lbl}>First name</label><input style={inp} autoComplete="given-name" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></div>
              <div style={{ flex: "1 1 200px" }}><label style={lbl}>Last name</label><input style={inp} autoComplete="family-name" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></div>
            </div>
            <div style={{ marginTop: 12 }}><label style={lbl}>Email address</label><input style={inp} type="email" autoComplete="email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={f.company_website} onChange={(e) => setF({ ...f, company_website: e.target.value })} /></div>
            <label style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 16, fontSize: 14.5, lineHeight: 1.5, color: "#f4f7fc", cursor: "pointer" }}>
              <input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} style={{ width: 22, height: 22, marginTop: 1, flexShrink: 0, accentColor: "#ffb81c" }} />
              <span>{label}</span>
            </label>
            {err ? <div style={{ color: "#ffb81c", fontSize: 13, marginTop: 12 }}>{err}</div> : null}
            <button onClick={save} disabled={busy} style={{ marginTop: 16, width: "100%", background: "#ffb81c", color: "#1a1608", border: "none", padding: 15, fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Saving…" : "Save →"}
            </button>
            <div style={{ fontSize: 11, color: "#5c7096", marginTop: 12, textAlign: "center" }}>Creative Impact · Charlotte · hello@creativeimpactmedia.co</div>
          </div>
        )}
      </div>
    </div>
  );
}
