"use client";

// Client doc editor (operator-only, behind login). Notion-lite: typed blocks
// (headings, text, bullets, quotes, dividers) stored as jsonb in client_docs.
// Autosaves as you type.

import React, { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

export type Block = { id: string; type: "h1" | "h2" | "p" | "bullet" | "quote" | "divider"; text: string };

const C = { bg: "#080809", panel: "#0e0e11", line: "#26262c", line2: "#34343c", cream: "#ece8e1", muted: "#8b867d", dim: "#56524b", red: "#e6322b", green: "#3fb97a" };
const mono = "'JetBrains Mono', ui-monospace, monospace";
const cond = "'Barlow Condensed','Arial Narrow',sans-serif";

const TYPES: { v: Block["type"]; label: string }[] = [
  { v: "h1", label: "Heading" },
  { v: "h2", label: "Subhead" },
  { v: "p", label: "Text" },
  { v: "bullet", label: "Bullet" },
  { v: "quote", label: "Quote" },
  { v: "divider", label: "Divider" },
];

const bid = () => Math.random().toString(36).slice(2, 10);

export default function DocEditor() {
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [clientId, setClientId] = useState("");
  const [docId, setDocId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saveState, setSaveState] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean); // clients/<id>/docs/<docId>
    const cid = parts[1] || "";
    const did = parts[3] || "";
    setClientId(cid); setDocId(did);
    (async () => {
      const sb = getBrowserClient();
      if (!sb) { setErr("Not configured."); setLoading(false); return; }
      const { data: d, error } = await sb.from("client_docs").select("title,content").eq("id", did).maybeSingle();
      if (error || !d) { setErr("Doc not found."); setLoading(false); return; }
      setTitle(d.title || "Untitled");
      const c = Array.isArray(d.content) ? (d.content as Block[]) : [];
      setBlocks(c.length ? c : [{ id: bid(), type: "p", text: "" }]);
      setLoading(false);
    })();
  }, []);

  function queueSave(nextTitle: string, nextBlocks: Block[]) {
    setSaveState("saving…");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const sb = getBrowserClient();
      const { error } = await sb!.from("client_docs").update({ title: nextTitle, content: nextBlocks }).eq("id", docId);
      setSaveState(error ? "SAVE FAILED" : "saved ✓");
    }, 700);
  }
  const apply = (t: string, b: Block[]) => { setTitle(t); setBlocks(b); queueSave(t, b); };

  const setBlock = (i: number, patch: Partial<Block>) => apply(title, blocks.map((b, x) => (x === i ? { ...b, ...patch } : b)));
  const addAfter = (i: number) => { const b = [...blocks]; b.splice(i + 1, 0, { id: bid(), type: "p", text: "" }); apply(title, b); };
  const remove = (i: number) => apply(title, blocks.length > 1 ? blocks.filter((_, x) => x !== i) : [{ id: bid(), type: "p", text: "" }]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= blocks.length) return;
    const b = [...blocks]; [b[i], b[j]] = [b[j], b[i]]; apply(title, b);
  };

  const wrap: React.CSSProperties = { minHeight: "100vh", background: C.bg, color: C.cream, fontFamily: mono, paddingBottom: 100 };
  const btn: React.CSSProperties = { background: "transparent", border: `1px solid ${C.line2}`, color: C.muted, fontFamily: mono, fontSize: 9, letterSpacing: ".06em", padding: "3px 7px", cursor: "pointer" };

  if (loading) return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.dim, fontSize: 13 }}>Loading doc…</div></div>;
  if (err) return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.muted, fontSize: 13 }}>{err}</div></div>;

  function blockStyle(t: Block["type"]): React.CSSProperties {
    const base: React.CSSProperties = { width: "100%", background: "transparent", border: "none", outline: "none", color: C.cream, resize: "none", fontFamily: mono, fontSize: 13, lineHeight: 1.7, padding: 0 };
    if (t === "h1") return { ...base, fontFamily: cond, fontWeight: 900, fontSize: 30, lineHeight: 1.15, textTransform: "uppercase", letterSpacing: ".02em" };
    if (t === "h2") return { ...base, fontFamily: cond, fontWeight: 800, fontSize: 19, lineHeight: 1.2, letterSpacing: ".02em" };
    if (t === "quote") return { ...base, color: C.muted, fontStyle: "italic" };
    return base;
  }

  return (
    <div style={wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 22px", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, background: C.bg, zIndex: 5 }}>
        <a href={`/clients/${clientId}`} style={{ color: C.muted, fontSize: 11, letterSpacing: ".14em", textDecoration: "none", textTransform: "uppercase" }}>← Back to client</a>
        <span style={{ fontSize: 10, letterSpacing: ".1em", color: saveState === "SAVE FAILED" ? C.red : saveState === "saved ✓" ? C.green : C.dim, textTransform: "uppercase" }}>{saveState || "autosaves"}</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "34px 26px" }}>
        <input value={title} onChange={(e) => apply(e.target.value, blocks)} placeholder="Untitled"
          style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: C.cream, fontFamily: cond, fontWeight: 900, fontSize: 40, textTransform: "uppercase", letterSpacing: ".01em", marginBottom: 22 }} />

        {blocks.map((b, i) => (
          <div key={b.id} className="blk" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "3px 0", borderLeft: b.type === "quote" ? `3px solid ${C.line2}` : "3px solid transparent", paddingLeft: b.type === "quote" ? 12 : b.type === "bullet" ? 0 : 0 }}>
            {b.type === "bullet" ? <span style={{ color: C.red, paddingTop: 3, flexShrink: 0 }}>•</span> : null}
            <div style={{ flex: 1 }}>
              {b.type === "divider" ? (
                <div style={{ borderTop: `1px solid ${C.line2}`, margin: "12px 0" }} />
              ) : (
                <textarea
                  value={b.text}
                  onChange={(e) => { setBlock(i, { text: e.target.value }); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                  ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                  rows={1}
                  placeholder={b.type === "h1" ? "Heading" : b.type === "h2" ? "Subhead" : "Write…"}
                  style={blockStyle(b.type)}
                />
              )}
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0, opacity: 0.55 }}>
              <select value={b.type} onChange={(e) => setBlock(i, { type: e.target.value as Block["type"] })}
                style={{ ...btn, padding: "3px 4px", background: C.bg }}>
                {TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
              <button style={btn} title="Move up" onClick={() => move(i, -1)}>↑</button>
              <button style={btn} title="Move down" onClick={() => move(i, 1)}>↓</button>
              <button style={btn} title="Add block below" onClick={() => addAfter(i)}>+</button>
              <button style={{ ...btn, color: C.red }} title="Delete block" onClick={() => remove(i)}>✕</button>
            </div>
          </div>
        ))}

        <button onClick={() => addAfter(blocks.length - 1)}
          style={{ marginTop: 16, background: "transparent", border: `1px dashed ${C.line2}`, color: C.dim, fontFamily: mono, fontSize: 11, letterSpacing: ".08em", padding: "9px 16px", cursor: "pointer", width: "100%" }}>
          + ADD BLOCK
        </button>
      </div>
    </div>
  );
}
