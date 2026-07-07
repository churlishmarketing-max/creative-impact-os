"use client";

import React, { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

type Field = { key: string; label: string; type?: string; required?: boolean; options?: string[]; maps_to?: string };
type Section = { title?: string; intro?: string; fields?: Field[] };
type Data = { status: string; client: string; responses: Record<string, string>; template: { name: string; intro_copy?: string; sections: Section[] } };

export default function OnboardPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [token, setToken] = useState("");
  const [ans, setAns] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [saveState, setSaveState] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const tk = parts[parts.length - 1] || "";
    setToken(tk);
    (async () => {
      const sb = getBrowserClient();
      if (!sb) { setErr("This form isn't available."); setLoading(false); return; }
      const { data: d } = await sb.rpc("get_onboarding", { p_token: tk });
      if (!d) { setErr("This form could not be found — check the link."); setLoading(false); return; }
      setData(d as Data);
      setAns((d as Data).responses || {});
      if ((d as Data).status === "processed" || (d as Data).status === "submitted") setDone(true);
      setLoading(false);
    })();
  }, []);

  function set(key: string, v: string) {
    const next = { ...ans, [key]: v };
    setAns(next);
    setSaveState("saving…");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const sb = getBrowserClient();
      const { data: r } = await sb!.rpc("save_onboarding", { p_token: token, p_responses: next });
      setSaveState(r?.ok ? "saved ✓" : "");
    }, 800);
  }

  async function submit() {
    if (!data) return;
    const req: string[] = [];
    data.template.sections.forEach((s) => (s.fields || []).forEach((f) => { if (f.required && !(ans[f.key] || "").trim()) req.push(f.key); }));
    setMissing(req);
    if (req.length) { setErr("A few required fields are still blank — they're marked below."); return; }
    setBusy(true); setErr("");
    try {
      const sb = getBrowserClient();
      await sb!.rpc("save_onboarding", { p_token: token, p_responses: ans });
      const res = await fetch("/api/onboard/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const j = await res.json();
      if (j.ok) setDone(true);
      else setErr("Couldn't submit — please try again.");
    } catch { setErr("Couldn't submit — please try again."); }
    setBusy(false);
  }

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#080809", color: "#ece8e1", display: "flex", justifyContent: "center", padding: "36px 20px", fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
  const card: React.CSSProperties = { width: "640px", maxWidth: "100%", background: "#0e0e11", border: "1px solid #26262c", borderTop: "3px solid #e6322b", height: "fit-content" };
  const inp: React.CSSProperties = { width: "100%", background: "#0a0a0c", border: "1px solid #34343c", color: "#ece8e1", padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 };
  const lbl: React.CSSProperties = { fontSize: 11, letterSpacing: ".06em", color: "#8b867d", marginBottom: 6, display: "block" };

  if (loading) return <div style={wrap}><div style={{ color: "#56524b", fontSize: 13 }}>Loading…</div></div>;
  if (err && !data) return <div style={wrap}><div style={{ color: "#8b867d", fontSize: 13, textAlign: "center" }}>{err}</div></div>;
  if (!data) return null;

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #26262c", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 34, height: 34, border: "2px solid #e6322b", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0707", flexShrink: 0 }}>
            <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "10px solid #e6322b", marginLeft: 3 }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 19, lineHeight: 0.86 }}>{data.template.name}</div>
            <div style={{ fontSize: 8.5, letterSpacing: ".28em", color: "#56524b", marginTop: 3 }}>CREATIVE IMPACT · ONBOARDING{data.client ? " · " + data.client.toUpperCase() : ""}</div>
          </div>
        </div>

        <div style={{ padding: "24px 26px" }}>
          {done ? (
            <div style={{ background: "#0c1f14", border: "1px solid #1d3d2a", color: "#3fb97a", padding: 16, fontSize: 13, lineHeight: 1.6 }}>
              ✓ Got everything — thank you. We're already moving; you'll hear from us with next steps shortly.
            </div>
          ) : (
            <div>
              {data.template.intro_copy ? <div style={{ fontSize: 13, color: "#c9c4bb", lineHeight: 1.7, marginBottom: 22 }}>{data.template.intro_copy}</div> : null}

              {data.template.sections.map((s, si) => (
                <div key={si} style={{ marginBottom: 26 }}>
                  {s.title ? <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: ".02em", marginBottom: s.intro ? 8 : 12, paddingBottom: 6, borderBottom: "1px solid #26262c" }}>{s.title.toUpperCase()}</div> : null}
                  {s.intro ? <div style={{ fontSize: 12, color: "#8b867d", lineHeight: 1.65, marginBottom: 14 }}>{s.intro}</div> : null}
                  {(s.fields || []).map((f) => {
                    const isMissing = missing.includes(f.key);
                    const border = isMissing ? "1px solid #e6322b" : "1px solid #34343c";
                    return (
                      <div key={f.key} style={{ marginBottom: 14 }}>
                        <label style={{ ...lbl, color: isMissing ? "#e6322b" : "#8b867d" }}>{f.label}{f.required ? " *" : ""}</label>
                        {f.type === "textarea" ? (
                          <textarea style={{ ...inp, border, minHeight: 72, resize: "vertical" }} value={ans[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
                        ) : f.type === "select" ? (
                          <select style={{ ...inp, border }} value={ans[f.key] || ""} onChange={(e) => set(f.key, e.target.value)}>
                            <option value="">— select —</option>
                            {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : f.type === "multiselect" ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {(f.options || []).map((o) => {
                              const cur = (ans[f.key] || "").split(",").map((x) => x.trim()).filter(Boolean);
                              const on = cur.includes(o);
                              return (
                                <label key={o} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: on ? "#ece8e1" : "#8b867d", cursor: "pointer", border: "1px solid " + (on ? "#e6322b" : "#34343c"), padding: "7px 11px" }}>
                                  <input type="checkbox" checked={on} onChange={() => set(f.key, (on ? cur.filter((x) => x !== o) : [...cur, o]).join(", "))} style={{ display: "none" }} />
                                  {on ? "✓ " : ""}{o}
                                </label>
                              );
                            })}
                          </div>
                        ) : f.type === "color" ? (
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <input type="color" value={ans[f.key] || "#e6322b"} onChange={(e) => set(f.key, e.target.value)} style={{ width: 46, height: 38, background: "#0a0a0c", border, cursor: "pointer", padding: 2 }} />
                            <input style={{ ...inp, border, width: 130 }} value={ans[f.key] || ""} placeholder="#1E4D2B" onChange={(e) => set(f.key, e.target.value)} />
                          </div>
                        ) : (
                          <input style={{ ...inp, border }} type={f.type === "date" ? "date" : f.type === "url" ? "url" : "text"} placeholder={f.type === "url" ? "https://…" : ""} value={ans[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {err ? <div style={{ color: "#e6322b", fontSize: 12, marginBottom: 12 }}>{err}</div> : null}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#56524b" }}>{saveState || "answers save as you type"}</span>
                <button onClick={submit} disabled={busy} style={{ background: "#e6322b", color: "#0a0707", border: "none", padding: "13px 26px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Submitting…" : "Submit →"}</button>
              </div>
            </div>
          )}
          <div style={{ fontSize: 10, color: "#56524b", marginTop: 18, textAlign: "center" }}>Creative Impact</div>
        </div>
      </div>
    </div>
  );
}
