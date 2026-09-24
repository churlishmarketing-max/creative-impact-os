'use client';
/* ============================================================================
 * NATIONWIDE · HARDSCAPE & LANDSCAPE — "Client Acquisition, Reworked" (Sep 19).
 * Plan · Leads · Tracker · Math · Ads · The Call · Form & Build.
 * Content + all the math come from lib/nationwide.ts (the document, structured);
 * this screen only reads and writes through /api/nationwide.
 * ========================================================================== */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LANE, ASSUMPTIONS, ONE_THING, BRIEF, CHANGES, PLAN, FALLBACKS, DECISIONS, PLANNING, SCALING_RULE, MATH_NOTE,
  budgetRow, per100, AD_RULES, WAVES, SCRIPTS, BUILD, GATES, BUILD_NOTE, JUDGMENT, FORM, INSTALL, REVENUE, OWNER,
  ADSPEND, gradeLead, callable, adspendStory, SPEED_INTRO, SPEED_CALL, LADDER, CLOSE_INTRO, CLOSE_STAGES, OBJECTIONS,
  SLIDES, TRACKER, computeWeek, cumulative, actualRates, scalingVerdict, fallbackStatus, mergeLead,
} from '@/lib/nationwide';

const api = async (body) => {
  const r = await fetch('/api/nationwide', body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  try { return await r.json(); } catch { return { ok: false, error: `Unexpected response (${r.status})` }; }
};
const copy = async (text, flash) => { try { await navigator.clipboard.writeText(text); flash && flash('COPIED ✓'); } catch { window.prompt('Copy this:', text); } };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const lastFriday = () => { const d = new Date(); const back = (d.getDay() + 2) % 7; d.setDate(d.getDate() - back); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const label = (list, k) => (list.find(([x]) => x === k) || [])[1] || '—';
const fmt = (t, v) => v == null ? '—' : t === 'pct' ? (v * 100).toFixed(1) + '%' : t === 'money' ? '$' + Math.round(v).toLocaleString() : (Math.round(v * 10) / 10).toString();

const S = {
  lbl: { display: 'block', fontSize: '9px', letterSpacing: '.18em', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: '5px' },
  inp: { background: 'var(--deep)', border: '1px solid var(--line2)', color: 'var(--cream)', fontFamily: 'var(--mono)', fontSize: '12.5px', padding: '8px 10px', width: '100%' },
  sec: { fontSize: '10px', letterSpacing: '.2em', color: 'var(--dim)', textTransform: 'uppercase', margin: '24px 0 10px' },
  panel: { background: 'var(--panel)', border: '1px solid var(--line)', padding: '14px 16px' },
  btn: (on) => ({ background: on ? 'var(--red)' : 'transparent', border: '1px solid ' + (on ? 'var(--red)' : 'var(--line2)'), color: on ? 'var(--golddark)' : 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '10.5px', fontWeight: on ? 700 : 400, letterSpacing: '.1em', padding: '7px 11px', cursor: 'pointer', textTransform: 'uppercase' }),
  gold: { background: 'var(--gold)', border: '1px solid var(--gold)', color: 'var(--golddark)', fontFamily: 'var(--mono)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.1em', padding: '7px 11px', cursor: 'pointer', textTransform: 'uppercase' },
  warn: { background: '#2a1a06', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '11px 13px', fontSize: '12px', lineHeight: 1.6, marginBottom: '14px' },
  note: { fontSize: '11px', color: 'var(--dim)', lineHeight: 1.6 },
  th: { fontSize: '9px', letterSpacing: '.16em', color: 'var(--dim)', textTransform: 'uppercase', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--line)' },
  td: { fontSize: '12px', color: 'var(--muted)', padding: '8px', borderBottom: '1px solid var(--line)', verticalAlign: 'top', lineHeight: 1.5 },
};
const tone = { good: 'var(--good)', watch: 'var(--gold)', stop: 'var(--red)' };

function Field({ label: l, children, grow = '1 1 180px' }) {
  return <div style={{ flex: grow, minWidth: 0 }}><label style={S.lbl}>{l}</label>{children}</div>;
}
// Shows merge fields the OS couldn't fill as gold {braces} so they're obvious.
function Merged({ text }) {
  return <>{String(text).split(/(\{[^}]+\})/g).map((part, i) => /^\{[^}]+\}$/.test(part) ? <span key={i} style={{ color: 'var(--gold)' }}>{part}</span> : <span key={i}>{part}</span>)}</>;
}

export default function Nationwide({ flash }) {
  const [d, setD] = useState(null);
  const [view, setView] = useState('plan');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [openLead, setOpenLead] = useState(null);
  const [callLeadId, setCallLeadId] = useState('');

  const load = useCallback(async () => {
    const j = await api();
    if (j.ok) { setD(j); setMsg(j.needsMigration ? j.hint : ''); }
    else setMsg(j.error === 'not_configured' ? 'This lane needs the live database (it runs on the deployed OS, not local demo mode). Everything below is still readable.' : (j.error || 'Could not load the lane.'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (body, okMsg, reload = true) => {
    setBusy(body.op);
    const j = await api(body);
    setBusy('');
    if (!j.ok) { setMsg(j.error || 'That didn’t work.'); return j; }
    setMsg(d?.needsMigration ? msg : '');
    if (okMsg) flash(okMsg);
    if (j.cfg) setD((x) => ({ ...(x || {}), cfg: j.cfg }));
    else if (reload) await load();
    return j;
  };

  const cfg = d?.cfg || {};
  const leads = d?.leads || [];
  const weeks = cfg.weeks || [];
  const VIEWS = [['plan', 'The Plan'], ['leads', 'Leads'], ['tracker', 'Tracker'], ['math', 'The Math'], ['ads', 'Ads'], ['call', 'The Call'], ['form', 'Form & Build']];
  const callNow = leads.filter((l) => l.stage === 'new' && callable(l.grade)).length;
  const lead = leads.find((l) => l.id === openLead) || null;

  return (
    <div style={{ padding: '28px 26px 96px', maxWidth: '1140px', margin: '0 auto', width: '100%' }}>
      <div style={{ fontSize: '10px', letterSpacing: '.26em', color: 'var(--red)' }}>// {LANE.name.toUpperCase()} · CREATIVE IMPACT × CHURLISH</div>
      <h1 style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '46px', lineHeight: '.92', margin: '6px 0 0' }}>CLIENT ACQUISITION, <span style={{ display: 'inline-block', background: 'var(--red)', color: 'var(--golddark)', padding: '0 12px' }}>REWORKED</span></h1>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '9px', maxWidth: '720px', lineHeight: 1.6 }}>{LANE.offer} Goal: {LANE.goal}. Emmanuel fronts every ad. Ad account {LANE.adAccount}.</div>
      <div style={{ height: '1px', background: 'linear-gradient(90deg,var(--red),transparent 55%)', margin: '16px 0 18px' }} />
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {VIEWS.map(([k, l]) => <button key={k} style={S.btn(view === k)} onClick={() => setView(k)}>{l}{k === 'leads' && callNow ? ` · ${callNow} to call` : ''}</button>)}
      </div>
      {msg ? <div style={S.warn}>{msg}</div> : null}

      {view === 'plan' && <Plan cfg={cfg} weeks={weeks} act={act} />}
      {view === 'leads' && <Leads leads={leads} act={act} busy={busy} onOpen={setOpenLead} disabled={!d || d.needsMigration} />}
      {view === 'tracker' && <Tracker weeks={weeks} act={act} busy={busy} disabled={!d} />}
      {view === 'math' && <MathView weeks={weeks} />}
      {view === 'ads' && <Ads cfg={cfg} act={act} flash={flash} disabled={!d} />}
      {view === 'call' && <Call leads={leads} leadId={callLeadId} setLeadId={setCallLeadId} flash={flash} />}
      {view === 'form' && <FormBuild cfg={cfg} act={act} disabled={!d} />}

      {lead ? <LeadDrawer l={lead} act={act} busy={busy} flash={flash} onClose={() => setOpenLead(null)} onCall={() => { setCallLeadId(lead.id); setOpenLead(null); setView('call'); }} /> : null}
    </div>
  );
}

/* -------------------------------- PLAN ---------------------------------- */
function Plan({ cfg, weeks, act }) {
  const done = (t) => (cfg.plan && t.id in cfg.plan) ? !!cfg.plan[t.id] : !!t.carried;
  const fb = fallbackStatus(weeks, today());
  const [dec, setDec] = useState(cfg.decisions || {});
  useEffect(() => setDec(cfg.decisions || {}), [cfg.decisions]);
  const [showBrief, setShowBrief] = useState(false);
  const open = PLAN.filter((t) => !done(t));
  const overdue = open.filter((t) => t.due && t.due < today());
  return (
    <div>
      <div style={{ ...S.panel, borderLeft: '3px solid var(--gold)', marginBottom: '6px' }}>
        <div style={{ ...S.lbl, color: 'var(--gold)' }}>The one thing to do first</div>
        <div style={{ fontSize: '13px', color: 'var(--cream)', lineHeight: 1.6 }}>{ONE_THING}</div>
      </div>
      <div style={{ ...S.sec, display: 'flex', justifyContent: 'space-between' }}><span>The plan</span><span>{PLAN.length - open.length} of {PLAN.length} done{overdue.length ? ` · ${overdue.length} overdue` : ''}</span></div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {PLAN.map((t) => {
          const isDone = done(t);
          const late = !isDone && t.due && t.due < today();
          return (
            <div key={t.id} style={{ display: 'flex', gap: '12px', padding: '12px 4px', borderBottom: '1px solid var(--line)', opacity: isDone ? .55 : 1 }}>
              <input type="checkbox" checked={isDone} onChange={(e) => act({ op: 'toggle', bucket: 'plan', id: t.id, value: e.target.checked }, e.target.checked ? 'DONE ✓' : 'REOPENED')} style={{ marginTop: '3px', cursor: 'pointer' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--cream)', fontWeight: 700, textDecoration: isDone ? 'line-through' : 'none' }}>
                  {t.title} {t.priority ? <span style={{ fontSize: '9px', letterSpacing: '.14em', color: t.priority === 'HIGH' ? 'var(--red)' : 'var(--gold)', marginLeft: '6px' }}>{t.priority}</span> : null}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.6, marginTop: '3px' }}>{t.detail}</div>
                {(t.owner || t.dueLabel || t.doneWhen) ? <div style={{ fontSize: '10.5px', color: late ? 'var(--red)' : 'var(--dim)', marginTop: '4px' }}>{[t.owner && 'Owner: ' + t.owner, t.dueLabel && (t.due ? 'Due: ' : '') + t.dueLabel, t.doneWhen && 'Done when: ' + t.doneWhen].filter(Boolean).join('  ·  ')}{late ? '  ·  OVERDUE' : ''}</div> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div style={S.sec}>Pre-committed fallbacks — decided now, not then</div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {FALLBACKS.map((f) => {
          const s = fb[f.id];
          const c = s.state === 'TRIPPED' ? 'var(--red)' : s.state === 'clear' ? 'var(--good)' : 'var(--dim)';
          return (
            <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '110px 1.1fr 1.4fr', gap: '12px', padding: '10px 4px', borderBottom: '1px solid var(--line)', fontSize: '12px' }}>
              <span style={{ color: c, fontWeight: 700, fontSize: '10.5px', letterSpacing: '.1em' }}>{s.state}<div style={{ fontWeight: 400, color: 'var(--dim)', letterSpacing: 0, marginTop: '2px' }}>{s.why}</div></span>
              <span style={{ color: 'var(--cream)' }}>{f.when}</span>
              <span style={{ color: s.state === 'TRIPPED' ? 'var(--cream)' : 'var(--muted)' }}>{f.then}</span>
            </div>
          );
        })}
      </div>
      <div style={{ ...S.note, marginTop: '6px' }}>Status reads from the Friday tracker rows — log a week and these update.</div>

      <div style={S.sec}>Four decisions only you can make</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '10px' }}>
        {DECISIONS.map((x) => {
          const saved = (cfg.decisions || {})[x.id] || '';
          return (
            <div key={x.id} style={{ ...S.panel, borderTop: '2px solid ' + (saved ? 'var(--good)' : 'var(--gold)') }}>
              <div style={{ fontSize: '12.5px', color: 'var(--cream)', fontWeight: 700 }}>{x.title}</div>
              <div style={{ ...S.note, margin: '4px 0 8px' }}>{x.detail}</div>
              <textarea style={{ ...S.inp, minHeight: '52px' }} value={dec[x.id] || ''} placeholder="Decision, on the record…" onChange={(e) => setDec({ ...dec, [x.id]: e.target.value })} />
              {(dec[x.id] || '') !== saved ? <button style={{ ...S.btn(true), marginTop: '6px' }} onClick={() => act({ op: 'decision', id: x.id, value: dec[x.id] || '' }, 'DECISION RECORDED ✓')}>Record it</button> : saved ? <div style={{ fontSize: '10px', color: 'var(--good)', marginTop: '5px', letterSpacing: '.12em' }}>ON THE RECORD</div> : null}
            </div>
          );
        })}
      </div>

      <div style={S.sec}><span style={{ cursor: 'pointer', color: 'var(--gold)' }} onClick={() => setShowBrief(!showBrief)}>{showBrief ? '▾' : '▸'} The brief, the assumptions, and what changed from the card</span></div>
      {showBrief ? (
        <div>
          {BRIEF.map((p, i) => <p key={i} style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 10px' }}>{p}</p>)}
          <div style={{ ...S.lbl, marginTop: '12px' }}>Built on these assumptions — overrule any and it gets rebuilt clean</div>
          <ul style={{ margin: '0 0 12px', paddingLeft: '18px' }}>{ASSUMPTIONS.map((a, i) => <li key={i} style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '4px' }}>{a}</li>)}</ul>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={S.th}>The card said</th><th style={S.th}>The rework says</th><th style={S.th}>Why</th></tr></thead>
            <tbody>{CHANGES.map((c, i) => <tr key={i}><td style={S.td}>{c.card}</td><td style={{ ...S.td, color: 'var(--cream)' }}>{c.rework}</td><td style={S.td}>{c.why}</td></tr>)}</tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------- LEADS --------------------------------- */
const EMPTY_LEAD = { full_name: '', phone: '', email: '', state: '', company: '', web: '', ad: '', q_install: '', q_revenue: '', q_owner: '', q_adspend: '', lead_at: '' };
const STAGE_LABEL = { new: 'New', attempting: 'Attempting', booked: 'Booked', held: 'Held', closed: 'Signed', lost: 'Lost', closed_out: 'Closed out (ladder done)', filtered: 'Filtered (C/D)' };
const GRADE_COLOR = { A: 'var(--good)', B: 'var(--gold)', C: 'var(--muted)', D: 'var(--dim)' };
const minsSince = (iso) => Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
const ago = (m) => m < 60 ? `${Math.round(m)} min` : m < 1440 ? `${Math.round(m / 60)} hr` : `${Math.round(m / 1440)} d`;

function Leads({ leads, act, busy, onOpen, disabled }) {
  const [f, setF] = useState(EMPTY_LEAD);
  const [csv, setCsv] = useState('');
  const [showFiltered, setShowFiltered] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const g = gradeLead(f);
  const Sel = ({ k, opts }) => <select style={{ ...S.inp, cursor: 'pointer' }} value={f[k]} onChange={(e) => set({ [k]: e.target.value })}><option value="">—</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;

  const toCall = leads.filter((l) => l.stage === 'new' && callable(l.grade));
  const active = leads.filter((l) => ['attempting', 'booked', 'held'].includes(l.stage) || (l.stage === 'new' && !callable(l.grade) && l.grade == null));
  const doneRows = leads.filter((l) => ['closed', 'lost', 'closed_out'].includes(l.stage));
  const filtered = leads.filter((l) => l.stage === 'filtered');

  const Row = ({ l }) => {
    const m = minsSince(l.lead_at);
    const hot = l.stage === 'new' && callable(l.grade);
    return (
      <div onClick={() => onOpen(l.id)} style={{ display: 'grid', gridTemplateColumns: '34px 2fr 1.2fr 1fr 1.2fr', gap: '10px', padding: '10px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer', fontSize: '12px', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '18px', color: GRADE_COLOR[l.grade] || 'var(--red)' }}>{l.grade || '?'}</span>
        <span style={{ color: 'var(--cream)', fontWeight: 700 }}>{l.company || '(no company)'}<span style={{ color: 'var(--dim)', fontWeight: 400 }}>{l.full_name ? ' · ' + l.full_name : ''}{l.state ? ' · ' + l.state : ''}</span></span>
        <span style={{ color: 'var(--muted)' }}>{label(REVENUE, l.q_revenue)}</span>
        <span style={{ color: 'var(--gold)' }}>{STAGE_LABEL[l.stage] || l.stage}</span>
        <span style={{ color: hot ? (m > 5 ? 'var(--red)' : 'var(--good)') : 'var(--dim)', fontWeight: hot ? 700 : 400 }}>{hot ? `${ago(m)} since form${m > 5 ? ' — CALL' : ''}` : l.first_call_at ? `called · ${l.call_attempts}× · ${l.texts_sent} texts` : ''}</span>
      </div>
    );
  };

  return (
    <div>
      <div style={S.warn}>Leads land in Meta Lead Center, not here — the five-minute call happens from the notification on Emmanuel's phone. This log is where they get <b>graded</b> (Section 06, automatically), <b>worked</b> (the ladder), and <b>counted</b> (the Friday tracker fills itself from it). Paste the Lead Center export in once a day, or add a lead by hand right after the call.</div>

      <div style={{ ...S.sec, marginTop: 0 }}>Call inside five minutes ({toCall.length})</div>
      <div style={{ borderTop: '1px solid var(--line)' }}>{toCall.map((l) => <Row key={l.id} l={l} />)}{!toCall.length ? <div style={{ ...S.note, padding: '10px 0' }}>No A or B lead is waiting on a first call.</div> : null}</div>
      <div style={S.sec}>Being worked ({active.length})</div>
      <div style={{ borderTop: '1px solid var(--line)' }}>{active.map((l) => <Row key={l.id} l={l} />)}{!active.length ? <div style={{ ...S.note, padding: '10px 0' }}>Nobody mid-ladder.</div> : null}</div>
      {doneRows.length ? <><div style={S.sec}>Signed · lost · closed out ({doneRows.length})</div><div style={{ borderTop: '1px solid var(--line)' }}>{doneRows.map((l) => <Row key={l.id} l={l} />)}</div></> : null}
      <div style={S.sec}><span style={{ cursor: 'pointer', color: 'var(--gold)' }} onClick={() => setShowFiltered(!showFiltered)}>{showFiltered ? '▾' : '▸'} Filtered at the form — C and D ({filtered.length})</span></div>
      {showFiltered ? <div style={{ borderTop: '1px solid var(--line)' }}>{filtered.map((l) => <Row key={l.id} l={l} />)}<div style={{ ...S.note, padding: '8px 0' }}>{FORM.rule}</div></div> : null}

      <div style={S.sec}>Add a lead</div>
      <div style={S.panel}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="Full name"><input style={S.inp} value={f.full_name} onChange={(e) => set({ full_name: e.target.value })} /></Field>
          <Field label="Phone"><input style={S.inp} value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="Email"><input style={S.inp} value={f.email} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="State" grow="0 1 90px"><input style={S.inp} value={f.state} onChange={(e) => set({ state: e.target.value.toUpperCase().slice(0, 2) })} /></Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="Company"><input style={S.inp} value={f.company} onChange={(e) => set({ company: e.target.value })} /></Field>
          <Field label="Website or Instagram"><input style={S.inp} value={f.web} onChange={(e) => set({ web: e.target.value })} /></Field>
          <Field label="Ad (CI-HL | script | cut | hook)"><input style={S.inp} value={f.ad} placeholder="CI-HL|01|B|main" onChange={(e) => set({ ad: e.target.value })} /></Field>
          <Field label="Form submitted" grow="0 1 200px"><input type="datetime-local" style={S.inp} value={f.lead_at} onChange={(e) => set({ lead_at: e.target.value })} /></Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="1 · Mostly installs"><Sel k="q_install" opts={INSTALL} /></Field>
          <Field label="2 · Revenue, last 12 mo (the gate)"><Sel k="q_revenue" opts={REVENUE} /></Field>
          <Field label="3 · Owner?"><Sel k="q_owner" opts={OWNER} /></Field>
          <Field label="4 · Ad spend now"><Sel k="q_adspend" opts={ADSPEND} /></Field>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={S.btn(true)} disabled={disabled || !!busy} onClick={async () => { const j = await act({ op: 'save_lead', ...f, lead_at: f.lead_at || undefined }, 'LEAD LOGGED ✓'); if (j.ok) setF(EMPTY_LEAD); }}>Log the lead →</button>
          <span style={{ fontSize: '12px', color: g ? GRADE_COLOR[g] : 'var(--dim)' }}>{g ? `Grade ${g} — ${FORM.grades.find((x) => x.g === g).what}` : 'Grade appears once the gate questions are answered.'}</span>
          {f.q_owner === 'marketing' ? <span style={{ fontSize: '11px', color: 'var(--gold)' }}>Runs marketing → the owner joins the call or the call does not happen.</span> : null}
        </div>
      </div>

      <div style={S.sec}>Paste from Lead Center</div>
      <div style={S.panel}>
        <textarea style={{ ...S.inp, minHeight: '90px', fontSize: '11px' }} value={csv} placeholder="Lead Center → Download → open the file, copy everything including the header row, paste here." onChange={(e) => setCsv(e.target.value)} />
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
          <button style={S.gold} disabled={disabled || !csv.trim() || !!busy} onClick={async () => {
            const j = await act({ op: 'import_csv', text: csv });
            if (j.ok) { setCsv(''); window.alert(`Imported ${j.imported} (${j.skipped} already here).\nA ${j.grades.A} · B ${j.grades.B} · C ${j.grades.C} · D ${j.grades.D}${j.grades.ungraded ? ' · ungraded ' + j.grades.ungraded : ''}${j.unmapped && j.unmapped.length ? '\n\nColumns I couldn\'t find: ' + j.unmapped.join(', ') : ''}`); }
          }}>{busy === 'import_csv' ? 'Importing…' : 'Import + grade'}</button>
          <span style={S.note}>Duplicates (same email or phone) are skipped. C and D go straight to Filtered — nobody calls them.</span>
        </div>
      </div>
    </div>
  );
}

function LeadDrawer({ l, act, busy, flash, onClose, onCall }) {
  const [f, setF] = useState(l);
  useEffect(() => setF(l), [l.id, l.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const keys = ['full_name', 'phone', 'email', 'state', 'company', 'web', 'specific_job', 'decision_makers', 'call_day', 'call_time', 'zoom_link', 'notes', 'temperature', 'q_install', 'q_revenue', 'q_owner', 'q_adspend'];
  const dirty = keys.some((k) => String(f[k] ?? '') !== String(l[k] ?? ''));
  const grade = FORM.grades.find((x) => x.g === l.grade);
  const firstCallMin = l.first_call_at ? (new Date(l.first_call_at) - new Date(l.lead_at)) / 60000 : null;
  const Sel = ({ k, opts }) => <select style={{ ...S.inp, cursor: 'pointer' }} value={f[k] || ''} onChange={(e) => set({ [k]: e.target.value })}><option value="">—</option>{opts.map(([v, x]) => <option key={v} value={v}>{x}</option>)}</select>;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(3,6,12,.72)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '760px', maxWidth: '100%', height: '100%', overflowY: 'auto', background: '#0b1526', borderLeft: '1px solid var(--line)', borderTop: '3px solid var(--red)', padding: '22px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '28px', lineHeight: 1, textTransform: 'uppercase' }}>{l.company || l.full_name}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '5px' }}>{[l.full_name, l.state, l.web].filter(Boolean).join(' · ')}</div>
          </div>
          <button style={{ ...S.btn(false), height: 'fit-content' }} onClick={onClose}>✕ Close</button>
        </div>

        <div style={{ ...S.panel, marginTop: '14px', display: 'flex', gap: '16px', alignItems: 'center', borderLeft: '3px solid ' + (GRADE_COLOR[l.grade] || 'var(--red)') }}>
          <div style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '42px', color: GRADE_COLOR[l.grade] || 'var(--red)', lineHeight: 1 }}>{l.grade || '?'}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
            {grade ? <><b style={{ color: 'var(--cream)' }}>{grade.what}</b> {grade.cal}.</> : 'Ungraded — the gate questions aren’t all answered.'}<br />
            {label(INSTALL, l.q_install)} · {label(REVENUE, l.q_revenue)} · owner: {label(OWNER, l.q_owner)} · ads now: {label(ADSPEND, l.q_adspend)}{l.q_adspend ? ` (${adspendStory[l.q_adspend]})` : ''}
            {l.q_owner === 'marketing' ? <><br /><span style={{ color: 'var(--gold)' }}>Runs marketing — the owner joins the call or the call does not happen.</span></> : null}
          </div>
        </div>

        <div style={S.sec}>Where they are</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={{ ...S.inp, width: '220px', cursor: 'pointer' }} value={l.stage} onChange={(e) => act({ op: 'stage', id: l.id, stage: e.target.value }, e.target.value === 'closed' ? 'SIGNED ✓' : 'STAGE UPDATED ✓')} disabled={!!busy}>
            {Object.entries(STAGE_LABEL).map(([k, x]) => <option key={k} value={k}>{x}</option>)}
          </select>
          <button style={S.gold} disabled={!!busy} onClick={async () => { const j = await act({ op: 'log_call', id: l.id }); if (j.ok) flash(j.minutes != null ? `FIRST CALL LOGGED — ${j.minutes} MIN AFTER THE FORM` : 'CALL LOGGED ✓'); }}>Log a call</button>
          <button style={S.btn(false)} disabled={!!busy} onClick={() => act({ op: 'log_text', id: l.id }, 'TEXT LOGGED ✓')}>Log a text</button>
          <span style={S.note}>{l.call_attempts || 0} calls · {l.texts_sent || 0} texts{firstCallMin != null ? ` · first call ${Math.round(firstCallMin * 10) / 10} min after the form` : ''}{(l.call_attempts || 0) >= 6 && (l.texts_sent || 0) >= 3 && l.stage === 'attempting' ? ' · ladder complete → Closed out' : ''}</span>
        </div>

        <div style={S.sec}>For the call</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="The one specific job (from their site / IG)" grow="2 1 300px"><input style={S.inp} value={f.specific_job || ''} onChange={(e) => set({ specific_job: e.target.value })} /></Field>
          <Field label="Other decision maker"><input style={S.inp} value={f.decision_makers || ''} placeholder="partner / spouse — on the call" onChange={(e) => set({ decision_makers: e.target.value })} /></Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="Call day"><input style={S.inp} value={f.call_day || ''} placeholder="Thursday" onChange={(e) => set({ call_day: e.target.value })} /></Field>
          <Field label="Call time"><input style={S.inp} value={f.call_time || ''} placeholder="2:00 PM ET" onChange={(e) => set({ call_time: e.target.value })} /></Field>
          <Field label="Zoom link" grow="2 1 240px"><input style={S.inp} value={f.zoom_link || ''} onChange={(e) => set({ zoom_link: e.target.value })} /></Field>
          <Field label="Temperature (1–10)" grow="0 1 120px"><input style={S.inp} value={f.temperature ?? ''} inputMode="numeric" onChange={(e) => set({ temperature: e.target.value.replace(/\D/g, '').slice(0, 2) })} /></Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="Installs"><Sel k="q_install" opts={INSTALL} /></Field>
          <Field label="Revenue"><Sel k="q_revenue" opts={REVENUE} /></Field>
          <Field label="Owner"><Sel k="q_owner" opts={OWNER} /></Field>
          <Field label="Ad spend"><Sel k="q_adspend" opts={ADSPEND} /></Field>
        </div>
        <Field label="Notes"><textarea style={{ ...S.inp, minHeight: '60px' }} value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button style={S.btn(true)} disabled={!dirty || !!busy} onClick={() => { const p = {}; keys.forEach((k) => { p[k] = f[k] ?? ''; }); act({ op: 'save_lead', id: l.id, ...p }, 'SAVED ✓'); }}>Save</button>
          <button style={S.btn(false)} onClick={onCall}>Open the one-call close for them →</button>
          {Number(f.temperature) && Number(f.temperature) < 8 ? <span style={{ ...S.note, color: 'var(--red)', alignSelf: 'center' }}>Under 8 — do not quote the number.</span> : null}
        </div>

        <div style={S.sec}>The two-minute qualifying call — inside 5 minutes</div>
        <div style={S.panel}>{SPEED_CALL.map(([k, t]) => <div key={k} style={{ marginBottom: '9px' }}><span style={{ fontSize: '9.5px', letterSpacing: '.14em', color: 'var(--red)', marginRight: '8px' }}>{k}</span><span style={{ fontSize: '13px', color: 'var(--cream)', lineHeight: 1.6 }}><Merged text={mergeLead(t, f)} /></span></div>)}</div>

        <div style={S.sec}>The follow-up ladder</div>
        <div style={{ borderTop: '1px solid var(--line)' }}>
          {LADDER.map(([when, t]) => {
            const text = mergeLead(t, f);
            const isText = !/^Two calls a day/.test(t);
            return (
              <div key={when} style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: '10px', padding: '9px 4px', borderBottom: '1px solid var(--line)', alignItems: 'start' }}>
                <span style={{ fontSize: '11px', color: 'var(--gold)' }}>{when}</span>
                <span style={{ fontSize: '12.5px', color: 'var(--cream)', lineHeight: 1.55 }}><Merged text={text} /></span>
                {isText ? <button style={{ ...S.btn(false), padding: '5px 8px' }} onClick={() => copy(text, flash)}>Copy</button> : <span />}
              </div>
            );
          })}
        </div>
        <div style={{ ...S.note, marginTop: '6px' }}>Gold {'{braces}'} are blanks the OS can’t know yet — fill the call day/time/link above and they fill themselves. The OS doesn’t send texts (no SMS line); copy them into your phone.</div>
      </div>
    </div>
  );
}

/* ------------------------------- TRACKER -------------------------------- */
const BLANK_WEEK = { week_of: '', spend: '', impressions: '', views3s: '', frequency: '', leads: '', qualified: '', booked: '', held: '', closed: '', median_call_min: '', note: '' };
function Tracker({ weeks, act, busy, disabled }) {
  const [w, setW] = useState({ ...BLANK_WEEK, week_of: lastFriday() });
  const set = (p) => setW((x) => ({ ...x, ...p }));
  const sorted = [...weeks].sort((a, b) => a.week_of.localeCompare(b.week_of));
  const latest = sorted[sorted.length - 1];
  const heldBefore = (wk) => sorted.filter((x) => x.week_of < wk.week_of).reduce((s, x) => s + (Number(x.held) || 0), 0);
  const res = latest ? computeWeek(latest, heldBefore(latest)) : null;
  const verdict = scalingVerdict(sorted);
  const numIn = (k, ph) => <input style={S.inp} value={w[k]} inputMode="decimal" placeholder={ph} onChange={(e) => set({ [k]: e.target.value.replace(/[^\d.]/g, '') })} />;
  return (
    <div>
      <div style={{ ...S.note, marginBottom: '12px' }}>One row a week, updated Friday. The stage furthest below its line is the constraint. Fix that one thing and leave everything else alone until next Friday. After 30 days, replace these lines with your own medians.</div>
      {res ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '8px' }}>
          <div style={{ ...S.panel, borderLeft: '3px solid ' + (res.constraint ? 'var(--red)' : 'var(--good)') }}>
            <div style={{ ...S.lbl, color: res.constraint ? 'var(--red)' : 'var(--good)' }}>This week’s constraint · week of {latest.week_of}</div>
            {res.constraint ? <>
              <div style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '24px', textTransform: 'uppercase' }}>{res.constraint.label} — {fmt(res.constraint.fmt, res.constraint.value)}</div>
              <div style={{ fontSize: '11px', color: 'var(--dim)', margin: '2px 0 8px' }}>Line: {res.constraint.line}</div>
              <div style={{ fontSize: '13px', color: 'var(--cream)', lineHeight: 1.6 }}><b>Fix this:</b> {res.constraint.fix}</div>
            </> : <div style={{ fontSize: '13px', color: 'var(--cream)' }}>Every stage with data is on or above its line.</div>}
          </div>
          <div style={{ ...S.panel, borderLeft: '3px solid ' + tone[verdict.tone] }}>
            <div style={{ ...S.lbl, color: tone[verdict.tone] }}>The scaling rule says</div>
            <div style={{ fontSize: '13px', color: 'var(--cream)', lineHeight: 1.6 }}>{verdict.text}</div>
          </div>
        </div>
      ) : <div style={{ ...S.panel, color: 'var(--muted)', fontSize: '12.5px', marginBottom: '8px' }}>No weeks logged yet. The first update is due Fri Oct 9.</div>}

      {res ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
          <thead><tr><th style={S.th}>Metric</th><th style={S.th}>How to read it</th><th style={S.th}>This week</th><th style={S.th}>The line</th><th style={S.th}>Below the line? Fix this.</th></tr></thead>
          <tbody>{res.rows.map((r) => (
            <tr key={r.key} style={{ background: res.constraint && res.constraint.key === r.key ? 'rgba(255,48,64,.07)' : 'transparent' }}>
              <td style={{ ...S.td, color: 'var(--cream)', fontWeight: 700 }}>{r.label}</td>
              <td style={S.td}>{r.how}</td>
              <td style={{ ...S.td, color: r.ok == null ? 'var(--dim)' : r.ok ? 'var(--good)' : 'var(--red)', fontWeight: 700 }}>{r.value == null ? (r.key === 'close' ? 'after 10 calls' : '—') : fmt(r.fmt, r.value)}</td>
              <td style={S.td}>{r.line}</td>
              <td style={S.td}>{r.fix}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : null}

      <div style={S.sec}>Log a week</div>
      <div style={S.panel}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'flex-end' }}>
          <Field label="Week ending (Friday)" grow="0 1 170px"><input type="date" style={S.inp} value={w.week_of} onChange={(e) => set({ week_of: e.target.value })} /></Field>
          <Field label="Spend $">{numIn('spend')}</Field>
          <Field label="Impressions">{numIn('impressions')}</Field>
          <Field label="3-second views">{numIn('views3s')}</Field>
          <Field label="Frequency (7-day)" grow="0 1 130px">{numIn('frequency')}</Field>
        </div>
        <div style={{ ...S.note, margin: '-2px 0 8px' }}>Those five come from Ads Manager. The next six can come from the lead log:</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'flex-end' }}>
          <Field label="Leads" grow="1 1 90px">{numIn('leads')}</Field>
          <Field label="$500K+ leads" grow="1 1 90px">{numIn('qualified')}</Field>
          <Field label="Booked" grow="1 1 90px">{numIn('booked')}</Field>
          <Field label="Held" grow="1 1 90px">{numIn('held')}</Field>
          <Field label="Closed" grow="1 1 90px">{numIn('closed')}</Field>
          <Field label="Median min to 1st call" grow="1 1 120px">{numIn('median_call_min')}</Field>
          <button style={S.btn(false)} disabled={disabled || !w.week_of || !!busy} onClick={async () => {
            const j = await act({ op: 'fill_week', week_of: w.week_of }, null, false);
            if (j.ok) { const c = j.counts; set({ leads: String(c.leads), qualified: String(c.qualified), booked: String(c.booked), held: String(c.held), closed: String(c.closed), median_call_min: c.median_call_min != null ? String(c.median_call_min) : '' }); }
          }}>Fill from lead log</button>
        </div>
        <Field label="Note"><input style={S.inp} value={w.note} onChange={(e) => set({ note: e.target.value })} /></Field>
        <button style={{ ...S.btn(true), marginTop: '10px' }} disabled={disabled || !w.week_of || !!busy} onClick={async () => { const j = await act({ op: 'save_week', week: w }, 'WEEK LOGGED ✓'); if (j.ok) setW({ ...BLANK_WEEK, week_of: lastFriday() }); }}>Save the week</button>
      </div>

      {sorted.length ? (
        <>
          <div style={S.sec}>History</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={S.th}>Week</th><th style={S.th}>Spend</th><th style={S.th}>Leads</th><th style={S.th}>$500K+</th><th style={S.th}>Booked</th><th style={S.th}>Held</th><th style={S.th}>Closed</th>{TRACKER.map((t) => <th key={t.key} style={S.th}>{t.label}</th>)}<th style={S.th}>Constraint</th><th style={S.th}></th></tr></thead>
              <tbody>{[...sorted].reverse().map((wk) => {
                const r = computeWeek(wk, heldBefore(wk));
                return (
                  <tr key={wk.week_of}>
                    <td style={{ ...S.td, color: 'var(--cream)' }}>{wk.week_of}</td>
                    <td style={S.td}>{wk.spend != null ? '$' + Math.round(wk.spend) : '—'}</td>
                    <td style={S.td}>{wk.leads ?? '—'}</td><td style={S.td}>{wk.qualified ?? '—'}</td><td style={S.td}>{wk.booked ?? '—'}</td><td style={S.td}>{wk.held ?? '—'}</td><td style={S.td}>{wk.closed ?? '—'}</td>
                    {r.rows.map((x) => <td key={x.key} style={{ ...S.td, color: x.ok == null ? 'var(--dim)' : x.ok ? 'var(--good)' : 'var(--red)' }}>{fmt(x.fmt, x.value)}</td>)}
                    <td style={{ ...S.td, color: 'var(--red)' }}>{r.constraint ? r.constraint.label : '—'}</td>
                    <td style={S.td}><span style={{ cursor: 'pointer', color: 'var(--dim)' }} title="Remove this row (a mistyped week)" onClick={() => { if (window.confirm(`Remove the tracker row for ${wk.week_of}?`)) act({ op: 'remove_week', week_of: wk.week_of }, 'ROW REMOVED'); }}>✕</span></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* --------------------------------- MATH --------------------------------- */
function MathView({ weeks }) {
  const act = actualRates(weeks);
  const hasActual = Object.keys(act).length > 0;
  const mix = { ...PLANNING, ...act };
  const c = cumulative(weeks);
  const plan100 = per100(PLANNING), act100 = per100(mix);
  const pct = (x) => (x * 100).toFixed(0) + '%';
  const rows = [
    ['Leads', `$${PLANNING.cpl} CPL`, act.cpl != null ? `$${Math.round(act.cpl)} CPL` : null, `100 leads for $${plan100.spend.toLocaleString()}`],
    ['Pass the $500K gate', pct(PLANNING.pass), act.pass != null ? pct(act.pass) : null, `${plan100.qualified} qualified`],
    ['Booked', pct(PLANNING.book) + ' of qualified', act.book != null ? pct(act.book) : null, `${plan100.booked} booked`],
    ['Showed', pct(PLANNING.show) + ' of booked', act.show != null ? pct(act.show) : null, `${Math.round(plan100.held)} held calls`],
    ['Closed on the call', pct(PLANNING.close) + ' of held', act.close != null ? pct(act.close) : (c.held ? `(${c.held} of 10 held calls)` : null), `${plan100.closed.toFixed(1)} companies`],
    ['Qualified CPL', 'spend ÷ $500K+ leads', hasActual ? `$${Math.round(act100.qualifiedCpl)}` : null, `$${Math.round(plan100.qualifiedCpl)}`],
    ['Cost to acquire one company', 'spend ÷ closes', hasActual && act100.costPerCompany ? `$${Math.round(act100.costPerCompany).toLocaleString()}` : null, `about $${(Math.round(plan100.costPerCompany / 100) * 100).toLocaleString()}`],
  ];
  return (
    <div>
      <div style={{ ...S.note, marginBottom: '10px' }}>Every rate below is a planning assumption, labeled as one. The “your actual” column fills in from the Friday tracker ({c.spend ? `$${Math.round(c.spend).toLocaleString()} spend, ${c.leads} leads logged so far` : 'nothing logged yet'}). Close rate stays blank until 10 held calls exist.</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={S.th}>Stage</th><th style={S.th}>Planning rate</th><th style={S.th}>Your actual</th><th style={S.th}>Per 100 leads (planning)</th></tr></thead>
        <tbody>{rows.map(([a, b, x, e]) => <tr key={a}><td style={{ ...S.td, color: 'var(--cream)' }}>{a}</td><td style={S.td}>{b}</td><td style={{ ...S.td, color: x ? 'var(--gold)' : 'var(--dim)' }}>{x || '—'}</td><td style={S.td}>{e}</td></tr>)}</tbody>
      </table>
      <div style={S.sec}>What the budget actually buys</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={S.th}>Daily spend</th><th style={S.th}>Leads / month</th><th style={S.th}>Held calls / month</th><th style={S.th}>Closes / month</th><th style={S.th}>Months to 7 companies</th>{hasActual ? <th style={S.th}>…at your actual rates</th> : null}</tr></thead>
        <tbody>{[50, 100, 200].map((dd) => {
          const p = budgetRow(dd, PLANNING); const a = budgetRow(dd, mix);
          return <tr key={dd}><td style={{ ...S.td, color: 'var(--cream)' }}>${dd}</td><td style={S.td}>{Math.round(p.leads)}</td><td style={S.td}>{p.held.toFixed(1)}</td><td style={S.td}>{p.closes.toFixed(2)}</td><td style={S.td}>about {p.months.toFixed(1)}</td>{hasActual ? <td style={{ ...S.td, color: 'var(--gold)' }}>{isFinite(a.months) ? `about ${a.months.toFixed(1)}` : 'no closes yet'}</td> : null}</tr>;
        })}</tbody>
      </table>
      <div style={{ ...S.panel, marginTop: '10px', borderLeft: '3px solid var(--gold)', fontSize: '12.5px', color: 'var(--cream)', lineHeight: 1.6 }}>{MATH_NOTE}</div>
      <div style={S.sec}>The scaling rule</div>
      <ol style={{ margin: 0, paddingLeft: '18px' }}>{SCALING_RULE.map((r, i) => <li key={i} style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.7 }}>{r}</li>)}</ol>
    </div>
  );
}

/* ---------------------------------- ADS --------------------------------- */
const AD_STATUSES = ['not filmed', 'filmed', 'edited', 'live', 'paused', 'killed'];
const statusColor = { 'not filmed': 'var(--dim)', filmed: 'var(--muted)', edited: 'var(--gold)', live: 'var(--good)', paused: 'var(--gold)', killed: 'var(--red)' };
function Ads({ cfg, act, flash, disabled }) {
  const [open, setOpen] = useState('01');
  const st = cfg.ads || {};
  const Beats = ({ beats }) => beats.map(([k, t], i) => <div key={i} style={{ marginBottom: '8px' }}><span style={{ fontSize: '9.5px', letterSpacing: '.14em', color: 'var(--red)', marginRight: '8px' }}>{k}</span><span style={{ fontSize: '12.5px', color: 'var(--cream)', lineHeight: 1.6 }}>{t}</span></div>);
  const Count = ({ n, max }) => <span style={{ color: n > max ? 'var(--red)' : 'var(--dim)', fontSize: '10px', marginLeft: '6px' }}>{n}/{max}</span>;
  return (
    <div>
      <div style={{ ...S.sec, marginTop: 0 }}>Standing rules</div>
      <ul style={{ margin: '0 0 6px', paddingLeft: '18px' }}>{AD_RULES.map((r, i) => <li key={i} style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '3px' }}>{r}</li>)}</ul>
      <div style={S.sec}>Waves</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={S.th}>Wave</th><th style={S.th}>Scripts</th><th style={S.th}>Goes live</th><th style={S.th}>Why this order</th></tr></thead>
        <tbody>{WAVES.map((w) => <tr key={w.wave}><td style={{ ...S.td, color: 'var(--cream)' }}>{w.wave}</td><td style={S.td}>{w.scripts}</td><td style={S.td}>{w.live}</td><td style={S.td}>{w.why}</td></tr>)}</tbody></table>

      <div style={S.sec}>The seven scripts — two cuts each</div>
      {SCRIPTS.map((s) => {
        const isOpen = open === s.n;
        const full = s.primary.join('\n\n');
        return (
          <div key={s.n} style={{ ...S.panel, marginBottom: '8px', padding: 0 }}>
            <div onClick={() => setOpen(isOpen ? '' : s.n)} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '20px', color: 'var(--gold)' }}>{s.n}</span>
              <span style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '17px', textTransform: 'uppercase', flex: 1 }}>{s.title}</span>
              <span style={{ fontSize: '10.5px', color: 'var(--dim)' }}>{s.wave} · live {s.live}</span>
              {['A', 'B'].map((cut) => <span key={cut} style={{ fontSize: '10px', letterSpacing: '.1em', color: statusColor[st[s.n + cut] || 'not filmed'] }}>{cut}: {(st[s.n + cut] || 'not filmed').toUpperCase()}</span>)}
            </div>
            {isOpen ? (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, margin: '10px 0' }}><b style={{ color: 'var(--cream)' }}>The job:</b> {s.job}<br /><b style={{ color: 'var(--cream)' }}>Shoot:</b> {s.shoot}</div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  {[['A', 'Version A — full teach · warm audiences', s.A], ['B', 'Version B — the Perry cut · cold audiences', s.B]].map(([cut, title, beats]) => (
                    <div key={cut} style={{ flex: '1 1 420px', background: 'var(--deep)', border: '1px solid var(--line)', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                        <span style={{ ...S.lbl, margin: 0, color: 'var(--gold)' }}>{title}</span>
                        <span style={{ display: 'flex', gap: '6px' }}>
                          <select disabled={disabled} style={{ ...S.inp, width: '120px', padding: '4px 6px', fontSize: '10.5px', cursor: 'pointer' }} value={st[s.n + cut] || 'not filmed'} onChange={(e) => act({ op: 'ad_status', id: s.n + cut, value: e.target.value }, `${s.n}-${cut} → ${e.target.value.toUpperCase()}`)}>{AD_STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
                          <button style={{ ...S.btn(false), padding: '4px 8px' }} onClick={() => copy(beats.map(([k, t]) => `${k}  ${t}`).join('\n\n'), flash)}>Copy</button>
                        </span>
                      </div>
                      <Beats beats={beats} />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', margin: '10px 0 4px' }}><b style={{ color: 'var(--cream)' }}>Test these hooks:</b> {s.hooks.map(([k, t]) => <span key={k} style={{ display: 'block', marginTop: '3px' }}><span style={{ color: 'var(--gold)' }}>{k}:</span> {t}</span>)}</div>
                <div style={{ fontSize: '11px', color: 'var(--dim)', letterSpacing: '.08em' }}>Burned-in caption emphasis: {s.captions}</div>
                <div style={{ ...S.lbl, margin: '14px 0 6px', color: 'var(--gold)' }}>Meta copy — rides both cuts · button: Apply Now</div>
                <div style={{ background: 'var(--deep)', border: '1px solid var(--line)', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={S.lbl}>Primary text <Count n={s.primary[0].length} max={125} /> first line</span><button style={{ ...S.btn(false), padding: '4px 8px' }} onClick={() => copy(full, flash)}>Copy</button></div>
                  {s.primary.map((p, i) => <p key={i} style={{ fontSize: '12.5px', color: 'var(--cream)', lineHeight: 1.6, margin: '0 0 8px' }}>{p}</p>)}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--cream)' }}><span style={S.lbl}>Headline <Count n={s.headline.length} max={40} /></span>{s.headline} <span style={{ cursor: 'pointer', color: 'var(--gold)', fontSize: '10px' }} onClick={() => copy(s.headline, flash)}>copy</span></span>
                    <span style={{ fontSize: '12.5px', color: 'var(--cream)' }}><span style={S.lbl}>Description <Count n={s.description.length} max={30} /></span>{s.description} <span style={{ cursor: 'pointer', color: 'var(--gold)', fontSize: '10px' }} onClick={() => copy(s.description, flash)}>copy</span></span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      <div style={{ ...S.note, marginTop: '8px' }}>Nothing publishes from here — Ads Manager is manual-build. This is the book, plus a status per cut so the board knows what’s filmed and live.</div>
    </div>
  );
}

/* ------------------------------- THE CALL ------------------------------- */
function Call({ leads, leadId, setLeadId, flash }) {
  const l = leads.find((x) => x.id === leadId) || {};
  const m = (t) => <Merged text={mergeLead(t, l)} />;
  const [stage, setStage] = useState(0);
  const booked = leads.filter((x) => ['booked', 'held', 'attempting', 'new'].includes(x.stage) && callable(x.grade));
  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
        <span style={S.lbl}>Running it for</span>
        <select style={{ ...S.inp, width: '320px', cursor: 'pointer' }} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
          <option value="">— nobody (show the blanks) —</option>
          {booked.map((x) => <option key={x.id} value={x.id}>{x.grade} · {x.company || x.full_name} {x.call_day ? '· ' + x.call_day : ''}</option>)}
        </select>
        {l.id ? <span style={S.note}>{label(REVENUE, l.q_revenue)} · ads now: {label(ADSPEND, l.q_adspend)}{l.q_adspend ? ` (${adspendStory[l.q_adspend]})` : ''}{l.specific_job ? ` · job: ${l.specific_job}` : ''}</span> : null}
      </div>

      <div style={{ ...S.sec, marginTop: 0 }}>The one-call close — 45 minutes on Zoom</div>
      <div style={{ ...S.note, marginBottom: '10px' }}>{CLOSE_INTRO}</div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {CLOSE_STAGES.map((s) => <button key={s.n} style={{ ...S.btn(stage === s.n), padding: '5px 9px' }} onClick={() => setStage(s.n)}>{s.n} · {s.title}</button>)}
      </div>
      {CLOSE_STAGES.filter((s) => s.n === stage).map((s) => (
        <div key={s.n} style={{ ...S.panel, borderLeft: '3px solid var(--red)' }}>
          <div style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '22px', textTransform: 'uppercase' }}>{s.n} · {s.title} <span style={{ fontSize: '12px', color: 'var(--dim)', fontFamily: 'var(--mono)' }}>{s.min}</span></div>
          <div style={{ fontSize: '12px', color: 'var(--gold)', margin: '4px 0 12px' }}>{s.note}</div>
          {s.lines.map((line, i) => <p key={i} style={{ fontSize: '15px', color: 'var(--cream)', lineHeight: 1.65, margin: '0 0 12px' }}>{m(line)}</p>)}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            {s.n > 0 ? <button style={S.btn(false)} onClick={() => setStage(s.n - 1)}>← {CLOSE_STAGES[s.n - 1].title}</button> : null}
            {s.n < CLOSE_STAGES.length - 1 ? <button style={S.btn(true)} onClick={() => setStage(s.n + 1)}>{CLOSE_STAGES[s.n + 1].title} →</button> : null}
          </div>
        </div>
      ))}

      <div style={S.sec}>Five objections — label, then ask, then stop</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={S.th}>They say</th><th style={S.th}>Label it</th><th style={S.th}>Ask this</th><th style={S.th}>Hold this line</th></tr></thead>
        <tbody>{OBJECTIONS.map((o) => <tr key={o.say}><td style={{ ...S.td, color: 'var(--cream)', fontWeight: 700 }}>“{o.say}”</td><td style={S.td}>{o.label}</td><td style={S.td}>{o.ask}</td><td style={S.td}>{o.hold}</td></tr>)}</tbody>
      </table>

      <div style={S.sec}>The seven-slide screen share</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '8px' }}>
        {SLIDES.map((s) => <div key={s.n} style={S.panel}><div style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '15px', textTransform: 'uppercase' }}><span style={{ color: 'var(--gold)' }}>{s.n}</span> · {s.title}</div><div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.55, marginTop: '4px' }}>{s.body}</div></div>)}
      </div>

      <div style={S.sec}>Speed to lead — the two-minute call</div>
      <div style={{ ...S.note, marginBottom: '8px' }}>{SPEED_INTRO}</div>
      <div style={S.panel}>{SPEED_CALL.map(([k, t]) => <div key={k} style={{ marginBottom: '9px' }}><span style={{ fontSize: '9.5px', letterSpacing: '.14em', color: 'var(--red)', marginRight: '8px' }}>{k}</span><span style={{ fontSize: '13px', color: 'var(--cream)', lineHeight: 1.6 }}>{m(t)}</span></div>)}</div>
      <div style={S.sec}>The follow-up ladder</div>
      <div style={{ borderTop: '1px solid var(--line)' }}>{LADDER.map(([when, t]) => <div key={when} style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: '10px', padding: '9px 4px', borderBottom: '1px solid var(--line)' }}><span style={{ fontSize: '11px', color: 'var(--gold)' }}>{when}</span><span style={{ fontSize: '12.5px', color: 'var(--cream)', lineHeight: 1.55 }}>{m(t)}</span>{!/^Two calls a day/.test(t) ? <button style={{ ...S.btn(false), padding: '5px 8px' }} onClick={() => copy(mergeLead(t, l), flash)}>Copy</button> : <span />}</div>)}</div>
    </div>
  );
}

/* ----------------------------- FORM & BUILD ----------------------------- */
function FormBuild({ cfg, act, disabled }) {
  const gates = cfg.gates || {};
  const allGates = GATES.every((g) => gates[g.id]);
  return (
    <div>
      <div style={{ ...S.sec, marginTop: 0 }}>Three gates before publish — {allGates ? <span style={{ color: 'var(--good)' }}>ALL CLEAR</span> : <span style={{ color: 'var(--red)' }}>NO DOLLAR MOVES YET</span>}</div>
      <div style={S.panel}>
        {GATES.map((g) => <label key={g.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', color: 'var(--cream)', marginBottom: '8px', cursor: 'pointer' }}><input type="checkbox" disabled={disabled} checked={!!gates[g.id]} onChange={(e) => act({ op: 'toggle', bucket: 'gates', id: g.id, value: e.target.checked }, e.target.checked ? 'GATE CLEARED ✓' : 'GATE REOPENED')} style={{ marginTop: '3px' }} />{g.text}</label>)}
        <div style={S.note}>“$765.50 already went into a funnel with a dead form once. The gate is permanent.”</div>
      </div>

      <div style={S.sec}>The form — {FORM.name}</div>
      <div style={{ ...S.note, marginBottom: '8px' }}>Type: {FORM.type}. Intro: {FORM.intro.join(' ')}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={S.th}>#</th><th style={S.th}>Question</th><th style={S.th}>Answers</th><th style={S.th}>What it is for</th></tr></thead>
        <tbody>{FORM.questions.map((q) => <tr key={q.n}><td style={S.td}>{q.n}</td><td style={{ ...S.td, color: 'var(--cream)' }}>{q.q}</td><td style={S.td}>{q.answers}</td><td style={S.td}>{q.for}</td></tr>)}</tbody>
      </table>
      <div style={{ ...S.note, marginTop: '6px' }}>{FORM.footer}</div>
      <div style={S.sec}>Three endings</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={S.th}>Who</th><th style={S.th}>Ending headline</th><th style={S.th}>Build note</th></tr></thead>
        <tbody>{FORM.endings.map((e) => <tr key={e.who}><td style={S.td}>{e.who}</td><td style={{ ...S.td, color: 'var(--cream)' }}>{e.headline}</td><td style={S.td}>{e.note}</td></tr>)}</tbody></table>
      <div style={S.sec}>Lead grades — the OS applies these automatically</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={S.th}>Grade</th><th style={S.th}>Who</th><th style={S.th}>What happens</th><th style={S.th}>Calendar</th></tr></thead>
        <tbody>{FORM.grades.map((g) => <tr key={g.g}><td style={{ ...S.td, fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '18px', color: GRADE_COLOR[g.g] }}>{g.g}</td><td style={S.td}>{g.who}</td><td style={S.td}>{g.what}</td><td style={S.td}>{g.cal}</td></tr>)}</tbody></table>
      <div style={{ ...S.panel, marginTop: '8px', borderLeft: '3px solid var(--red)', fontSize: '12.5px', color: 'var(--cream)', lineHeight: 1.6 }}>{FORM.rule}</div>

      <div style={S.sec}>The build sheet</div>
      <div style={{ ...S.note, marginBottom: '8px' }}>{BUILD_NOTE}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={S.th}>Level</th><th style={S.th}>Setting</th><th style={S.th}>Value</th></tr></thead>
        <tbody>{BUILD.map(([a, b, c], i) => <tr key={i}><td style={{ ...S.td, color: 'var(--cream)' }}>{a}</td><td style={S.td}>{b}</td><td style={{ ...S.td, color: 'var(--cream)' }}>{c}</td></tr>)}</tbody></table>
      <div style={{ ...S.panel, marginTop: '8px', fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.6 }}>{JUDGMENT}</div>
    </div>
  );
}
