"use client";

import React, { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

type Color = { name?: string; hex?: string; usage?: string };
type Font = { role?: string; family?: string; weight?: number; source?: string };
type Kit = { logo_url?: string | null; colors?: Color[]; fonts?: Font[]; voice_notes?: string | null; do_not?: string[]; assets?: { label?: string; url?: string }[] } | null;
type Work = { id: string; title: string; status: string; type: string; due_date?: string | null; external_link?: string | null };
type Stage = { id: string; name: string; sort_order: number };
type Ev = { id: string; kind: string; message: string; created_at: string };
type Client = { id: string; name: string; contact_name?: string; email?: string; industry?: string; status?: string; ladder?: string; pipeline_stage_id?: string | null; offer_id?: string | null; notes?: string; portal_token?: string | null };
type Doc = { id: string; title: string; updated_at: string };

const C = { bg: "#080809", panel: "#0e0e11", line: "#26262c", line2: "#34343c", cream: "#ece8e1", muted: "#8b867d", dim: "#56524b", red: "#e6322b", red2: "#b81f1a", green: "#3fb97a" };
const mono = "'JetBrains Mono', ui-monospace, monospace";
const cond = "'Barlow Condensed','Arial Narrow',sans-serif";

const ACTIVE_STATES = ["backlog", "in_progress", "in_review"];
const TYPE_ICON: Record<string, string> = { video: "▶", ad: "◎", doc: "▤", web: "◫", social: "✦", strategy: "★", other: "•" };

export default function ClientDashboard() {
  const [client, setClient] = useState<Client | null>(null);
  const [kit, setKit] = useState<Kit>(null);
  const [work, setWork] = useState<Work[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [offerName, setOfferName] = useState("");
  const [offers, setOffers] = useState<{ id: string; name: string }[]>([]);
  const [obRun, setObRun] = useState<{ status: string; sent_at: string; magic_token: string } | null>(null);
  const [comms, setComms] = useState<{ id: string; kind: string; subject: string; body: string; status: string; created_at: string }[]>([]);
  const [answers, setAnswers] = useState<{ form: string; items: { q: string; a: string }[] }[]>([]);
  const [referral, setReferral] = useState<{ code: string; clicks: number } | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [commBusy, setCommBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [newWork, setNewWork] = useState("");
  const [toast, setToast] = useState("");

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const cid = () => { const p = window.location.pathname.split("/").filter(Boolean); return p[p.length - 1]; };

  async function loadAll() {
    const sb = getBrowserClient();
    if (!sb) { setErr("Not configured."); setLoading(false); return; }
    const id = cid();
    const { data: c, error } = await sb.from("clients").select("*").eq("id", id).maybeSingle();
    if (error || !c) { setErr("Client not found — check the link, or run 09_client_dashboard.sql."); setLoading(false); return; }
    setClient(c as Client);
    const [kitR, workR, evR, obR, commsR] = await Promise.all([
      sb.from("brand_kits").select("*").eq("client_id", id).maybeSingle(),
      sb.from("work_items").select("*").eq("client_id", id).order("sort_order"),
      sb.from("client_events").select("*").eq("client_id", id).order("created_at", { ascending: false }).limit(30),
      sb.from("onboarding_runs").select("status,sent_at,magic_token").eq("client_id", id).order("sent_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("email_log").select("id,kind,subject,body,status,created_at").eq("client_id", id).order("created_at", { ascending: false }).limit(20),
    ]);
    const { data: refR } = await sb.from("referral_codes").select("code,clicks").eq("client_id", id).maybeSingle();
    setReferral((refR as never) || null);
    const { data: docsR } = await sb.from("client_docs").select("id,title,updated_at").eq("client_id", id).order("updated_at", { ascending: false });
    setDocs((docsR as Doc[]) || []);
    setKit((kitR.data as Kit) || null);
    setWork((workR.data as Work[]) || []);
    setEvents((evR.data as Ev[]) || []);
    setObRun((obR.data as never) || null);
    setComms((commsR.data as never) || []);

    // Client answers: every processed onboarding run, labeled by its template's questions
    type RunRow = { responses: Record<string, string>; template_id: string; submitted_at?: string };
    const { data: doneRunsRaw } = await sb.from("onboarding_runs").select("responses,template_id,submitted_at").eq("client_id", id).eq("status", "processed").order("submitted_at");
    const doneRuns = (doneRunsRaw as RunRow[] | null) || [];
    if (doneRuns.length) {
      const tplIds = [...new Set(doneRuns.map((r) => r.template_id))];
      type TplRow = { id: string; name: string; sections: { fields?: { key: string; label: string }[] }[] };
      const { data: tpls } = await sb.from("onboarding_templates").select("id,name,sections").in("id", tplIds);
      const byId: Record<string, TplRow> = {};
      ((tpls as TplRow[] | null) || []).forEach((t) => { byId[t.id] = t; });
      setAnswers(doneRuns.map((r) => {
        const tpl = byId[r.template_id];
        const items: { q: string; a: string }[] = [];
        (tpl?.sections || []).forEach((s) => (s.fields || []).forEach((f) => {
          const a = (r.responses || {})[f.key];
          if (a) items.push({ q: f.label, a: String(a) });
        }));
        return { form: tpl?.name || "Onboarding form", items };
      }).filter((x) => x.items.length));
    } else setAnswers([]);
    const { data: offR } = await sb.from("offers").select("id,name").order("name");
    setOffers((offR as never) || []);
    setOfferName(c.offer_id ? ((offR || []).find((o: { id: string }) => o.id === c.offer_id)?.name || "") : "");
    // stages: the template this client's stage belongs to, else the default template
    let tpl: string | null = null;
    if (c.pipeline_stage_id) {
      const { data: st } = await sb.from("pipeline_stages").select("template_id").eq("id", c.pipeline_stage_id).maybeSingle();
      tpl = st?.template_id || null;
    }
    if (!tpl) {
      const { data: t } = await sb.from("pipeline_templates").select("id").eq("name", "Creative Impact Default").maybeSingle();
      tpl = t?.id || null;
    }
    if (tpl) {
      const { data: ss } = await sb.from("pipeline_stages").select("id,name,sort_order").eq("template_id", tpl).order("sort_order");
      setStages((ss as Stage[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  // Load the client's Google fonts dynamically
  useEffect(() => {
    const fonts = (kit?.fonts || []).filter((f) => f.source === "google" && f.family);
    if (!fonts.length) return;
    const fam = fonts.map((f) => `family=${encodeURIComponent(f.family!)}:wght@${f.weight || 400}`).join("&");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${fam}&display=swap`;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [kit]);

  const primary = (kit?.colors || []).find((c) => (c.usage || "").includes("primary"))?.hex || null;
  const headlineFont = (kit?.fonts || []).find((f) => (f.role || "").includes("head"))?.family;
  const curIdx = stages.findIndex((s) => s.id === client?.pipeline_stage_id);
  const nextStage = curIdx >= 0 && curIdx < stages.length - 1 ? stages[curIdx + 1] : null;

  async function logEvent(kind: string, message: string) {
    const sb = getBrowserClient();
    await sb!.from("client_events").insert({ client_id: client!.id, kind, message });
  }
  async function advanceStage() {
    if (!nextStage || !client) return;
    const sb = getBrowserClient();
    const { error } = await sb!.from("clients").update({ pipeline_stage_id: nextStage.id, stage_entered_at: new Date().toISOString() }).eq("id", client.id);
    if (error) { flash("STAGE MOVE FAILED"); return; }
    await logEvent("stage", "Advanced to " + nextStage.name);
    flash("STAGE → " + nextStage.name.toUpperCase());
    // stage-entered automations: Pennyworth queues the stage email / referral kickoff
    fetch("/api/automations/stage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: client.id }) })
      .then(() => loadAll()).catch(() => {});
    loadAll();
  }
  async function addWork() {
    const t = newWork.trim(); if (!t || !client) return;
    const sb = getBrowserClient();
    const { error } = await sb!.from("work_items").insert({ client_id: client.id, title: t, status: "in_progress" });
    if (error) { flash("ADD FAILED"); return; }
    setNewWork("");
    loadAll();
  }
  async function bumpWork(w: Work) {
    const sb = getBrowserClient();
    let patch: Record<string, unknown>; let msg: string;
    if (ACTIVE_STATES.includes(w.status)) { patch = { status: "delivered", delivered_at: new Date().toISOString() }; msg = "Delivered: " + w.title; }
    else if (w.status === "delivered") { patch = { status: "completed", completed_at: new Date().toISOString() }; msg = "Completed: " + w.title; }
    else return;
    const { error } = await sb!.from("work_items").update(patch).eq("id", w.id);
    if (error) { flash("UPDATE FAILED"); return; }
    await logEvent("work", msg);
    loadAll();
  }
  function copyHex(hex: string) { navigator.clipboard?.writeText(hex).then(() => flash(hex + " COPIED")); }
  function copyStatusLink() {
    if (!client?.portal_token) { flash("RUN 15_status_docs.sql FIRST"); return; }
    const link = window.location.origin + "/status/" + client.portal_token;
    navigator.clipboard?.writeText(link).then(() => flash("STATUS LINK COPIED ✓"));
  }
  async function newDoc(title?: string, content?: unknown[]) {
    if (!client) return;
    const sb = getBrowserClient();
    const { data: d, error } = await sb!.from("client_docs")
      .insert({ client_id: client.id, title: title || "Untitled", content: content || [] })
      .select("id").single();
    if (error || !d) { flash(error?.message?.includes("client_docs") ? "RUN 09 SQL FIRST" : "DOC CREATE FAILED"); return; }
    window.location.href = `/clients/${client.id}/docs/${d.id}`;
  }
  function generateAvatarBible() {
    // Turn every processed onboarding answer into a structured doc: the raw
    // material of the avatar bible, ready to edit.
    if (!answers.length) { flash("NO PROCESSED ANSWERS YET"); return; }
    const bid = () => Math.random().toString(36).slice(2, 10);
    const blocks: { id: string; type: string; text: string }[] = [
      { id: bid(), type: "h1", text: `Avatar Bible — ${client?.name || ""}` },
      { id: bid(), type: "quote", text: "Generated from onboarding answers. Edit ruthlessly — keep what's true, sharpen what's vague." },
    ];
    answers.forEach((run) => {
      blocks.push({ id: bid(), type: "divider", text: "" });
      blocks.push({ id: bid(), type: "h1", text: run.form });
      run.items.forEach((it) => {
        blocks.push({ id: bid(), type: "h2", text: it.q });
        blocks.push({ id: bid(), type: "p", text: it.a });
      });
    });
    newDoc(`Avatar Bible — ${client?.name || "Client"}`, blocks);
  }
  async function assignOffer(offerId: string) {
    if (!client) return;
    const sb = getBrowserClient();
    const { error } = await sb!.from("clients").update({ offer_id: offerId || null }).eq("id", client.id);
    if (error) { flash("OFFER ASSIGN FAILED"); return; }
    const name = offers.find((o) => o.id === offerId)?.name || "";
    if (name) { await logEvent("system", "Offer assigned: " + name); flash("OFFER → " + name.toUpperCase()); }
    loadAll();
  }
  async function commAction(id: string, action: "approve" | "reject") {
    setCommBusy(id);
    try {
      const res = await fetch("/api/agent/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logId: id, action }) });
      const j = await res.json();
      if (j.ok) flash(action === "approve" ? "SENT ✓" : "REJECTED");
      else flash(j.error === "email_not_configured" ? "EMAIL NOT CONFIGURED" : "ACTION FAILED");
    } catch { flash("ACTION FAILED"); }
    setCommBusy("");
    loadAll();
  }
  async function sendOnboarding() {
    if (!client) return;
    const sb = getBrowserClient();
    if (obRun && obRun.status !== "processed") {
      // an open run exists — just re-copy its link
      const link = window.location.origin + "/onboard/" + obRun.magic_token;
      navigator.clipboard?.writeText(link);
      flash("ONBOARDING LINK COPIED ✓");
      return;
    }
    if (!client.offer_id) { flash("ASSIGN AN OFFER FIRST (edit client)"); return; }
    const { data: tpl } = await sb!.from("onboarding_templates").select("id,name").eq("offer_id", client.offer_id).limit(1).maybeSingle();
    if (!tpl) { flash("NO ONBOARDING TEMPLATE FOR THIS OFFER"); return; }
    const { data: run, error } = await sb!.from("onboarding_runs").insert({ client_id: client.id, template_id: tpl.id }).select("magic_token").single();
    if (error || !run) { flash("COULD NOT CREATE FORM"); return; }
    await logEvent("onboarding", "Onboarding form created (" + tpl.name + ")");
    const link = window.location.origin + "/onboard/" + run.magic_token;
    navigator.clipboard?.writeText(link);
    flash("FORM CREATED · LINK COPIED ✓");
    // Pennyworth drafts the welcome email (queues in Comms for approval)
    fetch("/api/agent/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: client.id, kind: "onboarding_welcome", context: { link, offer: offerName } }) })
      .then(() => loadAll()).catch(() => {});
    loadAll();
  }

  const wrap: React.CSSProperties = { minHeight: "100vh", background: C.bg, color: C.cream, fontFamily: mono, paddingBottom: 80 };
  const panel: React.CSSProperties = { background: C.panel, border: `1px solid ${C.line}`, padding: "18px 20px" };
  const label: React.CSSProperties = { fontSize: 9.5, letterSpacing: ".18em", color: C.dim, textTransform: "uppercase" };
  const h2: React.CSSProperties = { fontFamily: cond, fontWeight: 800, fontSize: 18, letterSpacing: ".02em", marginBottom: 12 };

  if (loading) return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.dim, fontSize: 13 }}>Loading client…</div></div>;
  if (err || !client) return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.muted, fontSize: 13 }}>{err || "Not found."}</div></div>;

  const active = work.filter((w) => ACTIVE_STATES.includes(w.status));
  const done = work.filter((w) => !ACTIVE_STATES.includes(w.status));

  return (
    <div style={wrap}>
      {/* top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 22px", borderBottom: `1px solid ${C.line}` }}>
        <a href="/" style={{ color: C.muted, fontSize: 11, letterSpacing: ".14em", textDecoration: "none", textTransform: "uppercase" }}>← CI/OS</a>
        <span style={{ ...label }}>Client dashboard</span>
      </div>

      {/* hero — themed with the CLIENT'S brand */}
      <div style={{ background: primary || "#141418", borderBottom: `1px solid ${C.line}`, padding: "34px 26px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          {kit?.logo_url ? (
            <img src={kit.logo_url} alt="logo" style={{ height: 64, maxWidth: 200, objectFit: "contain", background: "rgba(0,0,0,.25)", padding: 8 }} />
          ) : (
            <div style={{ width: 64, height: 64, border: `2px solid rgba(255,255,255,.5)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: cond, fontWeight: 900, fontSize: 26, color: "#fff" }}>{client.name.slice(0, 2).toUpperCase()}</div>
          )}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontFamily: headlineFont ? `'${headlineFont}', ${cond}` : cond, fontWeight: 900, fontSize: 44, lineHeight: 0.95, color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,.4)" }}>{client.name}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.75)", marginTop: 6 }}>{client.contact_name || "—"}{client.email ? " · " + client.email : ""}{client.industry ? " · " + client.industry : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {curIdx >= 0 ? <span style={{ background: "rgba(0,0,0,.45)", color: "#fff", padding: "7px 13px", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase" }}>◉ {stages[curIdx].name}</span> : null}
            <button onClick={copyStatusLink} title="Copy the client's read-only status page link"
              style={{ background: "rgba(0,0,0,.45)", color: "#fff", border: "1px solid rgba(255,255,255,.25)", padding: "7px 12px", fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: mono, cursor: "pointer" }}>
              ⧉ Status link
            </button>
            <select value={client.offer_id || ""} onChange={(e) => assignOffer(e.target.value)} title="Assigned offer — drives which onboarding form is sent"
              style={{ background: "rgba(0,0,0,.45)", color: "#fff", border: client.offer_id ? "1px solid transparent" : `1px solid ${C.red}`, padding: "7px 10px", fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: mono, cursor: "pointer" }}>
              <option value="">— assign offer —</option>
              {offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 26px" }}>
        {/* pipeline strip */}
        {stages.length ? (
          <div style={{ ...panel, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={h2}>PIPELINE</div>
              {nextStage ? (
                <button onClick={advanceStage} style={{ background: C.red, border: "none", color: "#0a0707", fontFamily: mono, fontWeight: 700, fontSize: 10, letterSpacing: ".12em", padding: "8px 14px", cursor: "pointer", textTransform: "uppercase" }}>Advance → {nextStage.name}</button>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
              {stages.map((s, i) => {
                const isCur = i === curIdx, isPast = curIdx >= 0 && i < curIdx;
                return (
                  <div key={s.id} style={{ flex: 1, minWidth: 92, textAlign: "center", padding: "9px 6px", background: isCur ? C.red : isPast ? "#1a2e22" : "#0a0a0c", border: `1px solid ${isCur ? C.red : C.line2}`, color: isCur ? "#0a0707" : isPast ? C.green : C.dim, fontFamily: cond, fontWeight: 800, fontSize: 12.5, letterSpacing: ".04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {isPast ? "✓ " : ""}{s.name}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18, alignItems: "start" }}>
          {/* left column: work board */}
          <div>
            <div style={{ ...panel, marginBottom: 18 }}>
              <div style={h2}>WORK BOARD</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ ...label, marginBottom: 8 }}>Active · {active.length}</div>
                  {active.map((w) => (
                    <div key={w.id} style={{ background: "#0a0a0c", border: `1px solid ${C.line2}`, padding: "10px 12px", marginBottom: 8 }}>
                      <div style={{ fontSize: 12.5, color: C.cream, fontWeight: 600 }}>{TYPE_ICON[w.type] || "•"} {w.title}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                        <span style={{ fontSize: 9.5, color: w.status === "in_review" ? C.cream : C.dim, letterSpacing: ".1em", textTransform: "uppercase" }}>{w.status.replace("_", " ")}{w.due_date ? " · due " + w.due_date : ""}</span>
                        <button onClick={() => bumpWork(w)} style={{ background: "transparent", border: `1px solid ${C.line2}`, color: C.muted, fontFamily: mono, fontSize: 8.5, letterSpacing: ".08em", padding: "4px 8px", cursor: "pointer", textTransform: "uppercase" }}>Deliver ✓</button>
                      </div>
                      {w.external_link ? <a href={w.external_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.red, textDecoration: "none" }}>open link ↗</a> : null}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={newWork} onChange={(e) => setNewWork(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addWork(); }} placeholder="+ add work item"
                      style={{ flex: 1, background: "#0a0a0c", border: `1px dashed ${C.line2}`, color: C.cream, fontFamily: mono, fontSize: 11.5, padding: "8px 10px" }} />
                    <button onClick={addWork} style={{ background: "transparent", border: `1px solid ${C.line2}`, color: C.muted, fontFamily: mono, fontSize: 10, padding: "8px 11px", cursor: "pointer" }}>ADD</button>
                  </div>
                </div>
                <div>
                  <div style={{ ...label, marginBottom: 8 }}>Delivered / Completed · {done.length}</div>
                  {done.map((w) => (
                    <div key={w.id} style={{ background: "#0a0a0c", border: `1px solid ${C.line}`, padding: "10px 12px", marginBottom: 8, opacity: w.status === "completed" ? 0.65 : 1 }}>
                      <div style={{ fontSize: 12.5, color: C.cream }}>{TYPE_ICON[w.type] || "•"} {w.title}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                        <span style={{ fontSize: 9.5, color: w.status === "completed" ? C.dim : C.green, letterSpacing: ".1em", textTransform: "uppercase" }}>{w.status}</span>
                        {w.status === "delivered" ? <button onClick={() => bumpWork(w)} style={{ background: "transparent", border: `1px solid ${C.line2}`, color: C.muted, fontFamily: mono, fontSize: 8.5, letterSpacing: ".08em", padding: "4px 8px", cursor: "pointer", textTransform: "uppercase" }}>Complete ✓</button> : null}
                      </div>
                      {w.external_link ? <a href={w.external_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.red, textDecoration: "none" }}>open link ↗</a> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* comms / approval inbox */}
            <div style={{ ...panel, marginBottom: 18 }}>
              <div style={h2}>COMMS <span style={{ color: C.dim, fontSize: 11, fontFamily: mono, letterSpacing: ".1em" }}>· PENNYWORTH DRAFTS WAIT FOR YOUR TAP</span></div>
              {comms.length === 0 ? <div style={{ color: C.dim, fontSize: 12 }}>No agent emails yet — sending an onboarding form queues the welcome draft here.</div> : comms.map((m) => {
                const pending = m.status === "draft_pending_approval";
                return (
                  <div key={m.id} style={{ border: `1px solid ${pending ? "#5a4a20" : C.line}`, borderLeft: `3px solid ${pending ? "#c8960a" : m.status === "sent" ? C.green : m.status === "rejected" ? C.line2 : C.red}`, padding: "10px 13px", marginBottom: 9, background: "#0a0a0c" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                      <div style={{ fontSize: 12.5, color: C.cream, fontWeight: 600 }}>{m.subject}</div>
                      <span style={{ fontSize: 8.5, letterSpacing: ".12em", color: pending ? "#c8960a" : m.status === "sent" ? C.green : C.dim, textTransform: "uppercase", flexShrink: 0 }}>{pending ? "awaiting approval" : m.status}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: "7px 0", maxHeight: 130, overflowY: "auto" }}>{m.body}</div>
                    {pending ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button disabled={commBusy === m.id} onClick={() => commAction(m.id, "approve")} style={{ background: C.red, border: "none", color: "#0a0707", fontFamily: mono, fontWeight: 700, fontSize: 9.5, letterSpacing: ".1em", padding: "7px 14px", cursor: "pointer", textTransform: "uppercase", opacity: commBusy === m.id ? 0.5 : 1 }}>Approve & send</button>
                        <button disabled={commBusy === m.id} onClick={() => commAction(m.id, "reject")} style={{ background: "transparent", border: `1px solid ${C.line2}`, color: C.muted, fontFamily: mono, fontSize: 9.5, letterSpacing: ".1em", padding: "7px 12px", cursor: "pointer", textTransform: "uppercase" }}>Reject</button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* activity feed */}
            <div style={panel}>
              <div style={h2}>ACTIVITY</div>
              {events.length === 0 ? <div style={{ color: C.dim, fontSize: 12 }}>Nothing yet.</div> : events.map((e) => (
                <div key={e.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid #1a1a1f`, fontSize: 12 }}>
                  <span style={{ color: e.kind === "stage" ? C.red : e.kind === "work" ? C.green : e.kind === "email" ? C.cream : C.dim, width: 84, flexShrink: 0, fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", paddingTop: 2 }}>{e.kind}</span>
                  <span style={{ color: C.muted, flex: 1 }}>{e.message}</span>
                  <span style={{ color: C.dim, fontSize: 10, flexShrink: 0 }}>{new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              ))}
            </div>
          </div>

          {/* right column: brand kit + client answers */}
          <div>
          <div style={{ ...panel, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={h2}>BRAND KIT</div>
              <button onClick={sendOnboarding} style={{ background: "transparent", border: `1px solid ${C.line2}`, color: C.cream, fontFamily: mono, fontSize: 9, letterSpacing: ".1em", padding: "6px 10px", cursor: "pointer", textTransform: "uppercase" }}>
                {obRun && obRun.status !== "processed" ? "Copy form link" : "Send onboarding"}
              </button>
            </div>
            {obRun ? (
              <div style={{ fontSize: 10, color: obRun.status === "processed" ? C.green : C.muted, marginBottom: 12, letterSpacing: ".06em" }}>
                Form {obRun.status.replace("_", " ")} · sent {new Date(obRun.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            ) : null}
            {!kit ? (
              <div style={{ color: C.dim, fontSize: 12.5, lineHeight: 1.7 }}>
                Awaiting onboarding — no brand kit yet.<br />
                <span style={{ color: C.muted }}>Hit <b style={{ color: C.cream }}>Send onboarding</b> — the client's answers fill this automatically.</span>
              </div>
            ) : (
              <div>
                <div style={{ ...label, marginBottom: 8 }}>Colors · click to copy</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {(kit.colors || []).map((c, i) => (
                    <button key={i} onClick={() => copyHex(c.hex || "")} title={c.name} style={{ background: "transparent", border: `1px solid ${C.line2}`, padding: 6, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ width: 54, height: 34, background: c.hex }} />
                      <div style={{ fontSize: 8.5, color: C.muted, marginTop: 4, fontFamily: mono }}>{c.hex}</div>
                      <div style={{ fontSize: 8, color: C.dim }}>{c.name}</div>
                    </button>
                  ))}
                </div>
                <div style={{ ...label, marginBottom: 8 }}>Fonts</div>
                {(kit.fonts || []).map((f, i) => (
                  <div key={i} style={{ borderLeft: `3px solid ${C.line2}`, paddingLeft: 10, marginBottom: 10 }}>
                    <div style={{ fontFamily: `'${f.family}', sans-serif`, fontWeight: (f.weight as number) || 400, fontSize: f.role === "headline" ? 24 : 15, color: C.cream }}>{f.family}</div>
                    <div style={{ fontSize: 9, color: C.dim, letterSpacing: ".1em", textTransform: "uppercase" }}>{f.role} · {f.weight}</div>
                  </div>
                ))}
                {kit.voice_notes ? (<><div style={{ ...label, margin: "14px 0 6px" }}>Voice</div><div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{kit.voice_notes}</div></>) : null}
                {(kit.do_not || []).length ? (<><div style={{ ...label, margin: "14px 0 6px" }}>Do not</div>{(kit.do_not || []).map((d, i) => (<div key={i} style={{ fontSize: 11.5, color: C.red, marginBottom: 3 }}>✕ <span style={{ color: C.muted }}>{d}</span></div>))}</>) : null}
                {(kit.assets || []).length ? (<><div style={{ ...label, margin: "14px 0 6px" }}>Assets</div>{(kit.assets || []).map((a, i) => (<a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 11.5, color: C.cream, textDecoration: "none", marginBottom: 4 }}>▤ {a.label} <span style={{ color: C.dim }}>↗</span></a>))}</>) : null}
              </div>
            )}
          </div>

          {/* docs — living documents attached to this client */}
          <div style={{ ...panel, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={h2}>DOCS</div>
              <div style={{ display: "flex", gap: 6 }}>
                {answers.length ? (
                  <button onClick={generateAvatarBible} title="Build an editable avatar bible from their onboarding answers"
                    style={{ background: "transparent", border: `1px solid ${C.line2}`, color: C.cream, fontFamily: mono, fontSize: 9, letterSpacing: ".08em", padding: "6px 9px", cursor: "pointer", textTransform: "uppercase" }}>
                    ★ Avatar bible
                  </button>
                ) : null}
                <button onClick={() => newDoc()}
                  style={{ background: "transparent", border: `1px solid ${C.line2}`, color: C.cream, fontFamily: mono, fontSize: 9, letterSpacing: ".08em", padding: "6px 9px", cursor: "pointer", textTransform: "uppercase" }}>
                  + New doc
                </button>
              </div>
            </div>
            {docs.length === 0 ? (
              <div style={{ color: C.dim, fontSize: 12, lineHeight: 1.7 }}>No docs yet — strategy briefs, meeting notes, and the avatar bible live here.</div>
            ) : docs.map((d) => (
              <a key={d.id} href={`/clients/${client.id}/docs/${d.id}`}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "9px 11px", marginBottom: 6, background: "#0a0a0c", border: `1px solid ${C.line2}`, textDecoration: "none" }}>
                <span style={{ fontSize: 12.5, color: C.cream, fontWeight: 600 }}>▤ {d.title || "Untitled"}</span>
                <span style={{ fontSize: 9.5, color: C.dim, flexShrink: 0 }}>{new Date(d.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </a>
            ))}
          </div>

          {/* client answers — everything they wrote on onboarding forms */}
          {answers.length ? (
            <div style={panel}>
              <div style={h2}>CLIENT ANSWERS</div>
              {answers.map((run, ri) => (
                <details key={ri} open={ri === answers.length - 1} style={{ marginBottom: 10 }}>
                  <summary style={{ cursor: "pointer", fontFamily: cond, fontWeight: 800, fontSize: 14, letterSpacing: ".03em", color: C.cream, textTransform: "uppercase", padding: "4px 0" }}>{run.form} <span style={{ color: C.dim, fontSize: 10 }}>· {run.items.length} answers</span></summary>
                  <div style={{ paddingTop: 8 }}>
                    {run.items.map((it, i) => (
                      <div key={i} style={{ marginBottom: 10, borderLeft: `2px solid ${C.line2}`, paddingLeft: 10 }}>
                        <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.45, marginBottom: 2 }}>{it.q}</div>
                        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{it.a}</div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ) : null}

          {/* referral link — appears once the advocacy sequence has started */}
          {referral ? (
            <div style={{ ...panel, marginTop: 18 }}>
              <div style={h2}>REFERRAL</div>
              <div style={{ ...label, marginBottom: 6 }}>Tracked link · click to copy</div>
              <button onClick={() => { const l = window.location.origin + "/r/" + referral.code; navigator.clipboard?.writeText(l).then(() => flash("REFERRAL LINK COPIED")); }}
                style={{ background: "#0a0a0c", border: `1px solid ${C.line2}`, color: C.cream, fontFamily: mono, fontSize: 11.5, padding: "9px 12px", cursor: "pointer", width: "100%", textAlign: "left", wordBreak: "break-all" }}>
                /r/{referral.code}
              </button>
              <div style={{ fontSize: 11, color: referral.clicks ? C.green : C.dim, marginTop: 8, letterSpacing: ".06em" }}>
                {referral.clicks} click{referral.clicks === 1 ? "" : "s"} so far
              </div>
            </div>
          ) : null}
          </div>
        </div>
      </div>

      {toast ? <div style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", background: "#141418", border: `1px solid ${C.red}`, color: C.cream, fontFamily: mono, fontSize: 11, letterSpacing: ".1em", padding: "10px 18px", zIndex: 99 }}>{toast}</div> : null}
    </div>
  );
}
