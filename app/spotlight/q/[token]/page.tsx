"use client";

import React, { useEffect, useState } from "react";

type Q = { id: string; q: string; why?: string };
type A = Record<string, { a: string; star: boolean }>;

// The member's pre-shoot questions — Diners, Drive-Ins and Dives, for
// businesses. Public page, reached only through the link in their email.
export default function SpotlightQuestions() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "missing" | "done">("loading");
  const [biz, setBiz] = useState("");
  const [first, setFirst] = useState("");
  const [qs, setQs] = useState<Q[]>([]);
  const [ans, setAns] = useState<A>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [returned, setReturned] = useState(false);

  useEffect(() => {
    const tk = window.location.pathname.split("/").filter(Boolean).pop() || "";
    setToken(tk);
    fetch("/api/spotlight/questionnaire?token=" + encodeURIComponent(tk))
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok || !(j.questions || []).length) { setState("missing"); return; }
        setBiz(j.business || ""); setFirst(j.first_name || ""); setQs(j.questions); setReturned(!!j.returned);
        const init: A = {};
        for (const q of j.questions as Q[]) init[q.id] = { a: j.answers?.[q.id]?.a || "", star: !!j.answers?.[q.id]?.star };
        setAns(init); setState("ready");
      })
      .catch(() => setState("missing"));
  }, []);

  const answered = Object.values(ans).filter((v) => v.a.trim()).length;
  const stars = Object.values(ans).filter((v) => v.star).length;

  async function submit() {
    if (!answered) { setErr("Answer at least one — even a sentence helps."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/spotlight/questionnaire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, answers: ans }) });
      const j = await r.json();
      if (j.ok) { setState("done"); window.scrollTo(0, 0); } else setErr("Couldn't save that — try again in a moment.");
    } catch { setErr("Couldn't save that — try again in a moment."); }
    setBusy(false);
  }

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#0a1322", color: "#f4f7fc", display: "flex", justifyContent: "center", padding: "36px 16px 60px", fontFamily: "'Archivo', sans-serif" };
  const card: React.CSSProperties = { width: 680, maxWidth: "100%", background: "#101d33", border: "1px solid #24385c", borderTop: "3px solid #ffb81c", height: "fit-content" };
  const ta: React.CSSProperties = { width: "100%", minHeight: 78, background: "#060c17", border: "1px solid #33455f", color: "#f4f7fc", padding: "10px 12px", fontFamily: "inherit", fontSize: 14, lineHeight: 1.55, resize: "vertical" };

  if (state === "loading") return <div style={wrap}><div style={{ color: "#5c7096", fontSize: 13 }}>Loading…</div></div>;
  if (state === "missing") return <div style={wrap}><div style={{ color: "#8ea3c4", fontSize: 14, textAlign: "center", maxWidth: 420, lineHeight: 1.6 }}>This link isn't active. If you're a Charlotte Spotlight member, reply to your email and we'll send a fresh one.</div></div>;

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #24385c" }}>
          <div style={{ fontSize: 10, letterSpacing: ".26em", color: "#ffb81c", textTransform: "uppercase" }}>Charlotte Spotlight · before we film</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 900, fontSize: 30, lineHeight: 1, marginTop: 8, textTransform: "uppercase" }}>{biz}</div>
        </div>

        {state === "done" ? (
          <div style={{ padding: "26px" }}>
            <div style={{ background: "#0c1f14", border: "1px solid #1d3d2a", color: "#2ee06f", padding: 16, fontSize: 14, lineHeight: 1.6 }}>
              Got it{first ? ", " + first : ""} — thank you. {stars ? `We'll build film day around the ${stars} you starred.` : "We'll use these to plan film day."}
            </div>
            <div style={{ fontSize: 13, color: "#8ea3c4", marginTop: 14, lineHeight: 1.6 }}>You can come back to this link and change anything before we film.</div>
            <button onClick={() => setState("ready")} style={{ marginTop: 16, background: "transparent", border: "1px solid #33455f", color: "#f4f7fc", padding: "10px 14px", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer" }}>Edit my answers</button>
          </div>
        ) : (
          <div style={{ padding: "22px 26px" }}>
            <div style={{ fontSize: 14, color: "#b9c8e0", lineHeight: 1.7, marginBottom: 20 }}>
              {first ? first + " — " : ""}think Diners, Drive-Ins and Dives. Before the cameras walk in, we want the stories worth telling. A sentence or two each is plenty, and you can skip any.
              <br /><span style={{ color: "#ffb81c" }}>★ Star the ones you'd love to talk about on camera</span> — those are the ones we'll ask on film day, so nothing catches you off guard.
              {returned ? <><br /><span style={{ color: "#5c7096", fontSize: 12 }}>You've answered before — anything you change here replaces it.</span></> : null}
            </div>
            {qs.map((q, i) => {
              const v = ans[q.id] || { a: "", star: false };
              return (
                <div key={q.id} style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, color: "#f4f7fc", lineHeight: 1.45, fontWeight: 600 }}><span style={{ color: "#5c7096", marginRight: 8 }}>{i + 1}.</span>{q.q}</div>
                      {q.why ? <div style={{ fontSize: 11.5, color: "#5c7096", marginTop: 3 }}>{q.why}</div> : null}
                    </div>
                    <button aria-label={v.star ? "Unstar" : "Star — ask me this on camera"} title="Star — ask me this on camera"
                      onClick={() => setAns({ ...ans, [q.id]: { ...v, star: !v.star } })}
                      style={{ flexShrink: 0, background: v.star ? "#ffb81c" : "transparent", border: "1px solid " + (v.star ? "#ffb81c" : "#33455f"), color: v.star ? "#1a1608" : "#8ea3c4", width: 38, height: 38, fontSize: 17, cursor: "pointer", lineHeight: 1 }}>★</button>
                  </div>
                  <textarea style={ta} value={v.a} placeholder="In your own words…" onChange={(e) => setAns({ ...ans, [q.id]: { ...v, a: e.target.value } })} />
                </div>
              );
            })}
            {err ? <div style={{ color: "#ffb81c", fontSize: 13, marginBottom: 10 }}>{err}</div> : null}
            <button onClick={submit} disabled={busy} style={{ width: "100%", background: "#ffb81c", color: "#1a1608", border: "none", padding: 14, fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Saving…" : `Send my answers${answered ? ` (${answered} of ${qs.length})` : ""} →`}
            </button>
            <div style={{ fontSize: 11, color: "#5c7096", marginTop: 12, textAlign: "center" }}>Creative Impact · Charlotte</div>
          </div>
        )}
      </div>
    </div>
  );
}
