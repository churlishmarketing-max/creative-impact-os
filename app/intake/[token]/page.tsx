"use client";

import React, { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

type Field = { id: string; label: string; type: string; options?: string[] };
type Cfg = { title?: string; fields?: Field[] };

export default function IntakePage() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [ans, setAns] = useState<Record<string, string>>({});

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const tk = parts[parts.length - 1] || "";
    setToken(tk);
    (async () => {
      const sb = getBrowserClient();
      if (!sb) { setErr("This form isn't available."); setLoading(false); return; }
      const { data } = await sb.rpc("get_intake", { p_token: tk });
      if (!data) { setErr("This form could not be found."); setLoading(false); return; }
      setCfg(data as Cfg);
      setLoading(false);
    })();
  }, []);

  const fields: Field[] = (cfg?.fields && cfg.fields.length ? cfg.fields : [
    { id: "business", label: "Business name", type: "short" },
    { id: "contact", label: "Your name", type: "short" },
    { id: "email", label: "Email", type: "email" },
  ]);

  async function submit() {
    const business = ans["business"] || "";
    const contact = ans["contact"] || "";
    if (!business.trim() && !contact.trim()) { setErr("Please add your name or business."); return; }
    setBusy(true); setErr("");
    // Compose every answer into the notes so nothing is lost.
    const notes = fields
      .map((f) => (ans[f.id] ? `${f.label}: ${ans[f.id]}` : ""))
      .filter(Boolean)
      .join("\n");
    const sb = getBrowserClient();
    const { data, error } = await sb!.rpc("submit_intake", {
      p_token: token,
      p_name: business,
      p_contact: contact,
      p_email: ans["email"] || "",
      p_phone: ans["phone"] || "",
      p_industry: ans["industry"] || "",
      p_notes: notes,
    });
    setBusy(false);
    if (error || !data?.ok) { setErr("Couldn't submit. Please try again."); return; }
    setDone(true);
  }

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#080809", color: "#ece8e1", display: "flex", justifyContent: "center", padding: "36px 20px", fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
  const card: React.CSSProperties = { width: "580px", maxWidth: "100%", background: "#0e0e11", border: "1px solid #26262c", borderTop: "3px solid #e6322b", height: "fit-content" };
  const inp: React.CSSProperties = { width: "100%", background: "#0a0a0c", border: "1px solid #34343c", color: "#ece8e1", padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 };
  const lbl: React.CSSProperties = { fontSize: 11, letterSpacing: ".08em", color: "#8b867d", marginBottom: 6, display: "block" };

  if (loading) return <div style={wrap}><div style={{ color: "#56524b", fontSize: 13 }}>Loading…</div></div>;
  if (err && !cfg) return <div style={wrap}><div style={{ color: "#8b867d", fontSize: 13, textAlign: "center" }}>{err}</div></div>;

  const set = (id: string, v: string) => setAns({ ...ans, [id]: v });

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #26262c", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 34, height: 34, border: "2px solid #e6322b", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0707", flexShrink: 0 }}>
            <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "10px solid #e6322b", marginLeft: 3 }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 19, lineHeight: 0.86 }}>{cfg?.title || "Tell us about your business"}</div>
            <div style={{ fontSize: 8.5, letterSpacing: ".28em", color: "#56524b", marginTop: 3 }}>CHURLISH/OS · INTAKE</div>
          </div>
        </div>
        <div style={{ padding: "24px 26px" }}>
          {done ? (
            <div style={{ background: "#0c1f14", border: "1px solid #1d3d2a", color: "#3fb97a", padding: 16, fontSize: 13, lineHeight: 1.5 }}>✓ Got it — thank you. We'll be in touch shortly.</div>
          ) : (
            <div>
              {fields.map((f) => (
                <div key={f.id} style={{ marginBottom: 14 }}>
                  <label style={lbl}>{f.label}</label>
                  {f.type === "long" ? (
                    <textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} value={ans[f.id] || ""} onChange={(e) => set(f.id, e.target.value)} />
                  ) : f.type === "choice" ? (
                    <select style={inp} value={ans[f.id] || ""} onChange={(e) => set(f.id, e.target.value)}>
                      <option value="">— select —</option>
                      {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input style={inp} type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : f.type === "date" ? "date" : "text"} value={ans[f.id] || ""} onChange={(e) => set(f.id, e.target.value)} />
                  )}
                </div>
              ))}
              <button onClick={submit} disabled={busy} style={{ width: "100%", background: "#e6322b", color: "#0a0707", border: "none", padding: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, marginTop: 6 }}>{busy ? "Sending…" : "Submit →"}</button>
              {err ? <div style={{ color: "#e6322b", fontSize: 12, marginTop: 12, textAlign: "center" }}>{err}</div> : null}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#56524b", marginTop: 16, textAlign: "center" }}>Churlish Media</div>
        </div>
      </div>
    </div>
  );
}
