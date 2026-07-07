"use client";

import React, { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

type Item = { desc: string; qty: number; unit_cents: number };
type Proposal = {
  number: string;
  title: string;
  intro: string | null;
  items: Item[];
  amount_cents: number;
  terms: string | null;
  status: string;
  signer_name: string | null;
  accepted_at: string | null;
  client: string;
};

const money = (cents: number) => "$" + (Math.round(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 });

export default function ProposalPage() {
  const [p, setP] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [token, setToken] = useState("");
  const [signer, setSigner] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function refetch(tk: string) {
    const sb = getBrowserClient();
    if (!sb) { setErr("This proposal isn't available."); setLoading(false); return; }
    const { data } = await sb.rpc("get_proposal_by_token", { p_token: tk });
    if (!data) { setErr("This proposal could not be found."); setLoading(false); return; }
    setP(data as Proposal);
    if ((data as Proposal).status === "accepted") setAccepted(true);
    setLoading(false);
  }

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const tk = parts[parts.length - 1] || "";
    setToken(tk);
    refetch(tk);
  }, []);

  async function accept() {
    if (!signer.trim() || !agree) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, signer }) });
      const j = await res.json();
      if (j.ok) { setAccepted(true); await refetch(token); }
      else setErr("Couldn't record your acceptance. Please try again or contact us.");
    } catch {
      setErr("Couldn't record your acceptance. Please try again or contact us.");
    }
    setBusy(false);
  }

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#080809", color: "#ece8e1", display: "flex", justifyContent: "center", padding: "36px 20px", fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
  const card: React.CSSProperties = { width: "640px", maxWidth: "100%", background: "#0e0e11", border: "1px solid #26262c", borderTop: "3px solid #e6322b", height: "fit-content" };

  if (loading) return <div style={wrap}><div style={{ color: "#56524b", fontSize: 13 }}>Loading proposal…</div></div>;
  if (err && !p) return <div style={wrap}><div style={{ color: "#8b867d", fontSize: 13, textAlign: "center" }}>{err}</div></div>;
  if (!p) return <div style={wrap}><div style={{ color: "#8b867d" }}>Not found.</div></div>;

  const isAccepted = accepted || p.status === "accepted";
  const filledTerms = (p.terms || "")
    .replace(/\{\{\s*client\s*\}\}/gi, p.client || "________")
    .replace(/\{\{\s*business\s*\}\}/gi, p.client || "________")
    .replace(/\{\{\s*title\s*\}\}/gi, p.title || "")
    .replace(/\{\{\s*total\s*\}\}/gi, money(p.amount_cents))
    .replace(/\{\{\s*date\s*\}\}/gi, (p.accepted_at ? new Date(p.accepted_at) : new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))
    .replace(/\{\{\s*signer\s*\}\}/gi, p.signer_name || "________");

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ padding: "22px 28px", borderBottom: "1px solid #26262c", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 34, height: 34, border: "2px solid #e6322b", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0707", flexShrink: 0 }}>
            <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "10px solid #e6322b", marginLeft: 3 }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 19, lineHeight: 0.86 }}>CHURLISH<span style={{ color: "#e6322b" }}>/</span>OS</div>
            <div style={{ fontSize: 8.5, letterSpacing: ".28em", color: "#56524b", marginTop: 3 }}>PROPOSAL {p.number}</div>
          </div>
        </div>

        <div style={{ padding: "26px 28px" }}>
          {p.client ? <div style={{ fontSize: 11, letterSpacing: ".14em", color: "#56524b", textTransform: "uppercase", marginBottom: 4 }}>Prepared for {p.client}</div> : null}
          {p.title ? <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 34, lineHeight: 1, marginBottom: 10 }}>{p.title}</div> : null}
          {p.intro ? <div style={{ fontSize: 13.5, color: "#c9c4bb", lineHeight: 1.65, marginBottom: 20, whiteSpace: "pre-wrap" }}>{p.intro}</div> : null}

          <div style={{ border: "1px solid #34343c", marginBottom: 20 }}>
            {(p.items || []).map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderBottom: i < p.items.length - 1 ? "1px solid #1a1a1f" : "none", fontSize: 13.5 }}>
                <div style={{ color: "#ece8e1" }}>{it.desc || "Item"}<span style={{ color: "#56524b" }}>{it.qty > 1 ? "  ×" + it.qty : ""}</span></div>
                <div style={{ color: "#8b867d" }}>{money(it.qty * it.unit_cents)}</div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 14px", background: "#0a0a0c" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 19, letterSpacing: ".02em" }}>TOTAL</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: "#e6322b" }}>{money(p.amount_cents)}</div>
            </div>
          </div>

          {p.terms ? (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, letterSpacing: ".2em", color: "#56524b", textTransform: "uppercase", marginBottom: 6 }}>Agreement</div>
              <div style={{ fontSize: 12, color: "#8b867d", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{filledTerms}</div>
            </div>
          ) : null}

          {isAccepted ? (
            <div style={{ background: "#0c1f14", border: "1px solid #1d3d2a", color: "#3fb97a", padding: "16px", fontSize: 13, lineHeight: 1.5 }}>
              ✓ Accepted &amp; signed{p.signer_name ? " by " + p.signer_name : ""}{p.accepted_at ? " · " + new Date(p.accepted_at).toLocaleDateString() : ""}. Thank you — we'll be in touch with next steps.
            </div>
          ) : (
            <div style={{ borderTop: "1px solid #26262c", paddingTop: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: ".2em", color: "#56524b", textTransform: "uppercase", marginBottom: 10 }}>Accept &amp; sign</div>
              <input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Type your full name"
                style={{ width: "100%", background: "#0a0a0c", border: "1px solid #34343c", color: "#ece8e1", padding: "11px 13px", fontFamily: "'JetBrains Mono', monospace", fontSize: 14, marginBottom: 12 }} />
              <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12, color: "#8b867d", cursor: "pointer", marginBottom: 16, lineHeight: 1.5 }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2 }} />
                <span>I agree to the scope and terms above, and understand typing my name is my electronic signature.</span>
              </label>
              <button onClick={accept} disabled={busy || !signer.trim() || !agree}
                style={{ width: "100%", background: "#e6322b", color: "#0a0707", border: "none", padding: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", cursor: (busy || !signer.trim() || !agree) ? "default" : "pointer", opacity: (busy || !signer.trim() || !agree) ? 0.5 : 1 }}>
                {busy ? "Recording…" : "Accept & Sign →"}
              </button>
              {err ? <div style={{ color: "#e6322b", fontSize: 12, marginTop: 12, textAlign: "center" }}>{err}</div> : null}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#56524b", marginTop: 18, textAlign: "center" }}>Churlish Media</div>
        </div>
      </div>
    </div>
  );
}
