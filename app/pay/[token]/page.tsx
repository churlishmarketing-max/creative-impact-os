"use client";

import React, { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

type Item = { desc: string; qty: number; unit_cents: number };
type Invoice = {
  number: string;
  title: string;
  items: Item[];
  amount_cents: number;
  currency: string;
  status: string;
  due_date: string | null;
  notes: string | null;
  client: string;
};

const money = (cents: number) => "$" + (Math.round(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 });

export default function PayPage() {
  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const tk = parts[parts.length - 1] || "";
    setToken(tk);
    const params = new URLSearchParams(window.location.search);
    const justPaid = params.get("paid") === "1";
    const sessionId = params.get("session_id");

    async function load() {
      const sb = getBrowserClient();
      if (!sb) { setErr("This invoice isn't available."); setLoading(false); return; }
      if (justPaid && sessionId) {
        try {
          await fetch("/api/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tk, session_id: sessionId }) });
        } catch {}
        // clean the URL
        window.history.replaceState({}, "", "/pay/" + tk);
      }
      const { data } = await sb.rpc("get_invoice_by_token", { p_token: tk });
      if (!data) { setErr("This invoice could not be found."); setLoading(false); return; }
      setInv(data as Invoice);
      setLoading(false);
    }
    load();
  }, []);

  async function pay() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const j = await res.json();
      if (j.url) { window.location.assign(j.url); return; }
      if (j.error === "payments_not_configured") setErr("Online payment isn't set up yet — please contact us to pay.");
      else if (j.error === "already_paid") { setErr(""); window.location.reload(); }
      else setErr("Couldn't start checkout. Please try again or contact us.");
    } catch {
      setErr("Couldn't start checkout. Please try again or contact us.");
    }
    setBusy(false);
  }

  const wrap: React.CSSProperties = {
    minHeight: "100vh", background: "#080809", color: "#ece8e1",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  };
  const card: React.CSSProperties = { width: "520px", maxWidth: "100%", background: "#0e0e11", border: "1px solid #26262c", borderTop: "3px solid #e6322b" };

  if (loading) return <div style={wrap}><div style={{ color: "#56524b", fontSize: 13 }}>Loading invoice…</div></div>;
  if (err && !inv) return <div style={wrap}><div style={{ color: "#8b867d", fontSize: 13, textAlign: "center" }}>{err}</div></div>;
  if (!inv) return <div style={wrap}><div style={{ color: "#8b867d" }}>Not found.</div></div>;

  const paid = inv.status === "paid";

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #26262c", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 34, height: 34, border: "2px solid #e6322b", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0707", flexShrink: 0 }}>
            <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "10px solid #e6322b", marginLeft: 3 }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 19, lineHeight: 0.86 }}>CHURLISH<span style={{ color: "#e6322b" }}>/</span>OS</div>
            <div style={{ fontSize: 8.5, letterSpacing: ".28em", color: "#56524b", marginTop: 3 }}>INVOICE {inv.number}</div>
          </div>
        </div>

        <div style={{ padding: "24px 26px" }}>
          {inv.client ? <div style={{ fontSize: 11, letterSpacing: ".14em", color: "#56524b", textTransform: "uppercase", marginBottom: 4 }}>Billed to {inv.client}</div> : null}
          {inv.title ? <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26 }}>{inv.title}</div> : null}

          <div style={{ margin: "18px 0", border: "1px solid #34343c" }}>
            {(inv.items || []).map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 13px", borderBottom: i < inv.items.length - 1 ? "1px solid #1a1a1f" : "none", fontSize: 13 }}>
                <div style={{ color: "#ece8e1" }}>{it.desc || "Item"}<span style={{ color: "#56524b" }}>{it.qty > 1 ? "  ×" + it.qty : ""}</span></div>
                <div style={{ color: "#8b867d" }}>{money(it.qty * it.unit_cents)}</div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 13px", background: "#0a0a0c" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: ".02em" }}>TOTAL</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, color: "#e6322b" }}>{money(inv.amount_cents)}</div>
            </div>
          </div>

          {inv.notes ? <div style={{ fontSize: 12, color: "#8b867d", lineHeight: 1.5, marginBottom: 18 }}>{inv.notes}</div> : null}
          {inv.due_date && !paid ? <div style={{ fontSize: 11, color: "#56524b", marginBottom: 14 }}>Due {inv.due_date}</div> : null}

          {paid ? (
            <div style={{ background: "#0c1f14", border: "1px solid #1d3d2a", color: "#3fb97a", textAlign: "center", padding: "14px", fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase" }}>✓ Paid — thank you</div>
          ) : (
            <button onClick={pay} disabled={busy} style={{ width: "100%", background: "#e6322b", color: "#0a0707", border: "none", padding: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Starting checkout…" : "Pay " + money(inv.amount_cents) + " →"}
            </button>
          )}
          {err ? <div style={{ color: "#e6322b", fontSize: 12, marginTop: 12, textAlign: "center", lineHeight: 1.4 }}>{err}</div> : null}
          <div style={{ fontSize: 10, color: "#56524b", marginTop: 16, textAlign: "center" }}>Secured by Stripe · Churlish Media</div>
        </div>
      </div>
    </div>
  );
}
