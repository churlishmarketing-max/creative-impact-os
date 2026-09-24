'use client';
/* ============================================================================
 * EDITH — the Charlotte Spotlight email assistant, in the cockpit.
 *   EdithDesk  — Spotlight → EDITH: the on/off switch, what needs a human,
 *                the queue, the send log, episodes, settings, the copy.
 *   EdithPanel — the EDITH section of a prospect's drawer: the fields her
 *                emails merge, and the buttons that log what really happened
 *                (call outcome, no-show, a reply, a delivered cut).
 * Everything talks to /api/edith. Copy is read-only here: it lives in
 * automations/edith/ and changes by editing those files.
 * ========================================================================== */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const api = async (body, qs = '') => {
  const r = await fetch('/api/edith' + qs, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  try { return await r.json(); } catch { return { ok: false, error: `Unexpected response (${r.status})` }; }
};
const et = (iso, day = true) => (iso ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', ...(day ? { weekday: 'short', month: 'short', day: 'numeric' } : {}), hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) + ' ET' : '—');
const ago = (iso) => { if (!iso) return 'never'; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

const S = {
  lbl: { display: 'block', fontSize: '9px', letterSpacing: '.18em', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: '5px' },
  inp: { background: 'var(--deep)', border: '1px solid var(--line2)', color: 'var(--cream)', fontFamily: 'var(--mono)', fontSize: '12.5px', padding: '9px 11px', width: '100%' },
  sec: { fontSize: '10px', letterSpacing: '.2em', color: 'var(--dim)', textTransform: 'uppercase', margin: '22px 0 10px' },
  panel: { background: 'var(--panel)', border: '1px solid var(--line)', padding: '14px 16px' },
  btn: (on) => ({ background: on ? 'var(--red)' : 'transparent', border: '1px solid ' + (on ? 'var(--red)' : 'var(--line2)'), color: on ? 'var(--golddark)' : 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '10.5px', fontWeight: on ? 700 : 400, letterSpacing: '.1em', padding: '7px 11px', cursor: 'pointer', textTransform: 'uppercase' }),
  gold: { background: 'var(--gold)', border: '1px solid var(--gold)', color: 'var(--golddark)', fontFamily: 'var(--mono)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.1em', padding: '7px 11px', cursor: 'pointer', textTransform: 'uppercase' },
  warn: { background: '#2a1a06', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '11px 13px', fontSize: '12px', lineHeight: 1.6, marginBottom: '14px' },
  note: { fontSize: '11px', color: 'var(--dim)', lineHeight: 1.6 },
  row: { display: 'flex', gap: '10px', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: '12.5px', flexWrap: 'wrap' },
};
const STATUS = {
  scheduled: ['scheduled', 'var(--cream)'], waiting: ['waiting on an event', 'var(--dim)'], held: ['HELD', 'var(--red)'], sending: ['sending', 'var(--gold)'],
  sent: ['sent', 'var(--good)'], logged: ['logged · EDITH off', 'var(--gold)'], done: ['done', 'var(--muted)'], skipped: ['skipped', 'var(--dim)'],
  cancelled: ['cancelled', 'var(--dim)'], failed: ['FAILED', 'var(--red)'],
};
const Pill = ({ s }) => { const [l, c] = STATUS[s] || [s, 'var(--muted)']; return <span style={{ color: c, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{l}</span>; };
function Field({ label, children, grow = '1 1 200px' }) {
  return <div style={{ flex: grow, minWidth: 0 }}><label style={S.lbl}>{label}</label>{children}</div>;
}

// What this email would say right now (merge fields filled from today's data).
function Preview({ pv, onClose }) {
  if (!pv) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(3,6,12,.75)', zIndex: 80, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '640px', maxWidth: '100%', background: '#0b1526', border: '1px solid var(--line)', borderTop: '3px solid var(--gold)', padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <div style={S.lbl}>{pv.template_id} · to {pv.to || '—'}</div>
          <button style={S.btn(false)} onClick={onClose}>✕</button>
        </div>
        {pv.missing && pv.missing.length ? <div style={{ ...S.warn, marginTop: '8px' }}>Would HOLD right now — missing: {pv.missing.join('; ')}</div> : null}
        <div style={{ fontSize: '15px', color: 'var(--cream)', fontWeight: 700, margin: '8px 0 2px' }}>{pv.subject}</div>
        <div style={{ ...S.note, marginBottom: '10px' }}>Preview text: {pv.preview}</div>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', fontSize: '12px', lineHeight: 1.6, color: 'var(--muted)', background: 'var(--deep)', border: '1px solid var(--line)', padding: '12px', margin: 0 }}>{pv.text}</pre>
        {pv.variantNote ? <div style={{ ...S.note, marginTop: '8px' }}>{pv.variantNote}</div> : null}
      </div>
    </div>
  );
}

/* ================================ THE DESK ================================ */
export function EdithDesk({ flash, onOpen }) {
  const [d, setD] = useState(null);
  const [view, setView] = useState('today');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [pv, setPv] = useState(null);

  const load = useCallback(async () => {
    const j = await api();
    if (j.ok) { setD(j); setMsg(j.needsMigration ? j.hint : ''); } else setMsg(j.error === 'not_configured' ? 'EDITH runs on the deployed OS (live database), not local demo mode.' : (j.error || 'Could not load EDITH.'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (body, ok) => {
    setBusy(body.op + (body.action || '') + (body.id || ''));
    const j = await api(body);
    setBusy('');
    if (!j.ok) { setMsg(j.error || 'That didn’t work.'); return j; }
    setMsg(d && d.needsMigration ? msg : '');
    if (ok) flash(ok);
    if (body.op !== 'preview') await load();
    return j;
  };
  const preview = async (id) => { const j = await act({ op: 'preview', id }); if (j.ok) setPv(j); };

  const names = useMemo(() => Object.fromEntries(((d && d.contacts) || []).map((c) => [c.id, c.business || c.email])), [d]);
  if (!d) return <div>{msg ? <div style={S.warn}>{msg}</div> : <div style={S.note}>Loading EDITH…</div>}</div>;
  const cfg = d.config || {};
  const queue = d.queue || [];
  const held = queue.filter((s) => s.status === 'held');
  const next48 = queue.filter((s) => s.status === 'scheduled' && s.due_at && new Date(s.due_at).getTime() < Date.now() + 48 * 3600e3);
  const who = (id) => <button onClick={() => onOpen && onOpen(id)} style={{ background: 'none', border: 0, padding: 0, color: 'var(--cream)', fontFamily: 'var(--mono)', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>{names[id] || '—'}</button>;

  const missing = [
    !cfg.physical_address && 'Mailing address — required in the cold (SEQ1) footer; cold emails HOLD without it.',
    !cfg.board_link && 'Board link — 2-1 and 3-1 point to the public board with prices; they HOLD without it.',
    !cfg.call_link && 'Call link — 3-1/3-2/3-3 say “Join here”. A standing Zoom/Meet link, or set one per contact.',
    !cfg.debrief_link && 'Debrief link — 6-8 asks clients to book the 20-minute debrief.',
    !cfg.next_board_date && 'Next board date — only used when the board is full (2-4-full).',
  ].filter(Boolean);

  const goLive = async () => {
    const t = window.prompt(`EDITH will start sending real email as\n${cfg.from}\nreplies going to ${cfg.reply_to}.\n\nOnly do this after reading her log.\n\nType EDITH LIVE to confirm:`);
    if (t === null) return;
    if (t.trim() !== 'EDITH LIVE') { setMsg('Not turned on — the confirmation has to be exactly EDITH LIVE.'); return; }
    await act({ op: 'save_config', patch: { edith_live: true }, confirm: 'EDITH LIVE' }, 'EDITH IS LIVE');
  };
  const goOff = async () => { if (window.confirm('Turn EDITH off? She keeps running and logging; nothing sends.')) await act({ op: 'save_config', patch: { edith_live: false } }, 'EDITH OFF — LOGGING ONLY'); };

  const VIEWS = [['today', 'Needs a human'], ['queue', `Queue (${queue.length})`], ['log', 'Send log'], ['episodes', 'Episodes'], ['form', 'Log a form'], ['settings', 'Settings'], ['copy', 'The copy']];

  return (
    <div>
      {msg ? <div style={S.warn}>{msg}</div> : null}
      <div style={{ ...S.panel, display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center', borderLeft: `3px solid ${cfg.edith_live ? 'var(--red)' : 'var(--gold)'}` }}>
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '26px', lineHeight: 1 }}>EDITH IS {cfg.edith_live ? <span style={{ color: 'var(--red)' }}>LIVE</span> : <span style={{ color: 'var(--gold)' }}>OFF</span>}</div>
          <div style={{ ...S.note, marginTop: '6px' }}>{cfg.edith_live ? `Sending as ${cfg.from}. Replies go to ${cfg.reply_to}.` : 'She runs every sequence and writes each email to the log — nothing is sent. Read the log, then turn her on.'}</div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7 }}>
          <div>Clock: {d.clock && d.clock.runtime_row ? <>last ran {ago(d.clock.last_tick_at)}</> : <span style={{ color: 'var(--red)' }}>not set up</span>}</div>
          <div>Board: {d.spots_remaining ?? '—'} spots open</div>
          <div>Holds: <span style={{ color: held.length ? 'var(--red)' : 'var(--muted)' }}>{held.length}</span> · Tasks: {(d.tasks || []).length}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {cfg.edith_live ? <button style={S.btn(true)} onClick={goOff}>Turn EDITH off</button> : <button style={S.gold} onClick={goLive} disabled={!!d.needsMigration}>Turn EDITH on…</button>}
          <button style={S.btn(false)} disabled={!!busy || d.needsMigration} onClick={() => act({ op: 'run_now' }, 'RAN WHAT WAS DUE ✓')}>Run due now</button>
          <button style={S.btn(false)} disabled={!!busy || d.needsMigration} onClick={async () => { const j = await act({ op: 'digest_now' }); if (j.ok) flash(j.skipped ? 'DIGEST: NOTHING TO REPORT' : 'DIGEST SENT ✓'); }}>Send digest now</button>
          <button style={S.btn(false)} onClick={load}>Reload</button>
        </div>
      </div>
      {!d.needsMigration && missing.length ? (
        <div style={{ ...S.panel, marginTop: '10px' }}>
          <div style={S.lbl}>Before EDITH can send everything — Settings</div>
          {missing.map((m) => <div key={m} style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7 }}>· {m}</div>)}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '16px 0 4px' }}>
        {VIEWS.map(([k, l]) => <button key={k} style={S.btn(view === k)} onClick={() => setView(k)}>{l}</button>)}
      </div>

      {view === 'today' && (
        <div>
          <div style={S.sec}>Tasks for humans · EDITH never does these</div>
          {(d.tasks || []).length ? d.tasks.map((t) => (
            <div key={t.id} style={S.row}>
              <span style={{ flex: '1 1 380px', color: 'var(--cream)' }}>{t.title}{t.prospect_id ? <> — {who(t.prospect_id)}</> : null}</span>
              {t.due_at ? <span style={{ ...S.note, color: new Date(t.due_at) < new Date() ? 'var(--red)' : 'var(--dim)' }}>due {et(t.due_at)}</span> : null}
              <button style={S.btn(false)} disabled={!!busy} onClick={() => act({ op: 'task_done', id: t.id }, 'DONE ✓')}>Done</button>
            </div>
          )) : <div style={S.note}>Nothing waiting on a human.</div>}
          <div style={S.sec}>Held — EDITH won’t send these until a field is filled</div>
          {held.length ? held.map((s) => (
            <div key={s.id} style={S.row}>
              {who(s.prospect_id)}<span style={S.note}>{s.seq} · {s.template_id}</span>
              <span style={{ flex: '1 1 300px', color: 'var(--red)', fontSize: '12px' }}>{s.hold_reason}</span>
              <button style={S.btn(false)} onClick={() => preview(s.id)}>Preview</button>
              <button style={S.btn(false)} disabled={!!busy} onClick={() => act({ op: 'step_retry', id: s.id }, 'RETRIED')}>Retry</button>
              <button style={S.btn(false)} disabled={!!busy} onClick={() => window.confirm('Skip this email for good?') && act({ op: 'step_skip', id: s.id }, 'SKIPPED')}>Skip</button>
            </div>
          )) : <div style={S.note}>Nothing held.</div>}
          <div style={S.sec}>Going out in the next 48 hours</div>
          {next48.length ? next48.map((s) => (
            <div key={s.id} style={S.row}>
              <span style={{ ...S.note, minWidth: '150px' }}>{et(s.due_at)}</span>{who(s.prospect_id)}<span style={S.note}>{s.seq} · {s.template_id}</span>
              <span style={{ flex: 1 }} />
              <button style={S.btn(false)} onClick={() => preview(s.id)}>Preview</button>
            </div>
          )) : <div style={S.note}>Nothing scheduled in the next 48 hours.</div>}
        </div>
      )}

      {view === 'queue' && (
        <div>
          <div style={S.sec}>Every pending email · times are Eastern</div>
          {queue.length ? queue.map((s) => (
            <div key={s.id} style={S.row}>
              <span style={{ ...S.note, minWidth: '150px' }}>{s.due_at ? et(s.due_at) : (s.anchor || '').replace(/^on:/, 'on ')}</span>
              {who(s.prospect_id)}<span style={S.note}>{s.seq} · {s.kind === 'internal' ? s.step : s.template_id}</span><Pill s={s.status} />
              <span style={{ flex: '1 1 200px', ...S.note }}>{s.hold_reason || ''}</span>
              {s.kind === 'email' ? <button style={S.btn(false)} onClick={() => preview(s.id)}>Preview</button> : null}
              {['scheduled', 'waiting', 'held'].includes(s.status) && s.kind === 'email' ? <button style={S.btn(false)} disabled={!!busy} onClick={() => window.confirm(`Skip ${s.template_id} for ${names[s.prospect_id] || 'this contact'}?`) && act({ op: 'step_skip', id: s.id }, 'SKIPPED')}>Skip</button> : null}
            </div>
          )) : <div style={S.note}>The queue is empty. Contacts enter a sequence when something happens: a booking, a logged call, a deposit, or a cold prospect with a specific detail written.</div>}
        </div>
      )}

      {view === 'log' && <SendLog log={d.log || []} who={who} />}
      {view === 'episodes' && <Episodes d={d} act={act} busy={busy} />}
      {view === 'form' && <InboundForm act={act} busy={busy} />}
      {view === 'settings' && <Settings cfg={cfg} sequences={d.sequences || []} act={act} busy={busy} />}
      {view === 'copy' && <Copy d={d} />}
      <Preview pv={pv} onClose={() => setPv(null)} />
    </div>
  );
}

function SendLog({ log, who }) {
  const [open, setOpen] = useState(null);
  return (
    <div>
      <div style={S.sec}>What EDITH sent, logged, skipped, or couldn’t send · newest first</div>
      {log.length ? log.map((s) => (
        <div key={s.id}>
          <div style={{ ...S.row, cursor: s.body ? 'pointer' : 'default' }} onClick={() => s.body && setOpen(open === s.id ? null : s.id)}>
            <span style={{ ...S.note, minWidth: '150px' }}>{et(s.sent_at || s.updated_at)}</span>{who(s.prospect_id)}<span style={S.note}>{s.seq} · {s.template_id || s.step}</span><Pill s={s.status} />
            <span style={{ flex: '1 1 260px', color: s.subject ? 'var(--cream)' : 'var(--dim)', fontSize: '12px' }}>{s.subject || s.error || s.hold_reason || ''}</span>
          </div>
          {open === s.id ? <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', fontSize: '11.5px', lineHeight: 1.6, color: 'var(--muted)', background: 'var(--deep)', border: '1px solid var(--line)', padding: '12px', margin: '6px 0 10px' }}>{`To: ${s.to_email}\nSubject: ${s.subject}\n\n${s.body}`}</pre> : null}
        </div>
      )) : <div style={S.note}>Nothing yet.</div>}
    </div>
  );
}

function Episodes({ d, act, busy }) {
  const cfg = d.config || {};
  const [n, setN] = useState(String(cfg.current_episode || 1));
  const ep = (cfg.episodes || {})[n] || {};
  const members = (d.contacts || []).filter((c) => String(c.episode_number || '') === n && c.member_at);
  const [link, setLink] = useState(''); const [count, setCount] = useState(''); const [end, setEnd] = useState('');
  const [reach, setReach] = useState(''); const [shot, setShot] = useState('');
  useEffect(() => { setLink(ep.link || ''); setCount(ep.featured_count ? String(ep.featured_count) : ''); setEnd(ep.promo_end_date || ''); setReach(ep.reach_number || ''); setShot(ep.reach_screenshot || ''); }, [n, cfg.episodes]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = (label, done, body) => (
    <div style={{ ...S.panel, marginBottom: '10px', borderLeft: `3px solid ${done ? 'var(--good)' : 'var(--line2)'}` }}>
      <div style={{ ...S.lbl, color: done ? 'var(--good)' : 'var(--dim)' }}>{label}{done ? ` · ${typeof done === 'string' ? et(done) : 'done'}` : ''}</div>{body}
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', margin: '14px 0' }}>
        <Field label="Episode" grow="0 0 110px"><input style={S.inp} value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, '') || '1')} /></Field>
        <div style={S.note}>{members.length} member{members.length === 1 ? '' : 's'} assigned to Episode {n}: {members.map((m) => m.business).join(', ') || '—'}. New deposits join Episode {cfg.current_episode || 1} (Settings).</div>
      </div>
      {step('1 · Published — sends 6-6 to its members and 7-1 to the episode list', ep.published_at, (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="Episode link"><input style={S.inp} value={link} placeholder="https://youtube.com/…" onChange={(e) => setLink(e.target.value)} /></Field>
          <Field label="Businesses featured" grow="0 0 150px"><input style={S.inp} value={count} placeholder={String(members.length || '')} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} /></Field>
          <button style={S.gold} disabled={!!busy || !!ep.published_at} onClick={() => window.confirm(`Publish Episode ${n}? EDITH emails its members (6-6) and everyone on the episode list (7-1).`) && act({ op: 'episode', action: 'published', episode_number: n, link, featured_count: count }, `EPISODE ${n} PUBLISHED`)}>Mark published</button>
        </div>
      ))}
      {step('2 · Promotion started — 6-7 goes out 15 days later', ep.promo_started_at, (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="Promotion ends (optional)" grow="0 0 200px"><input type="date" style={S.inp} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          <button style={S.gold} disabled={!!busy || !!ep.promo_started_at || !ep.published_at} onClick={() => act({ op: 'episode', action: 'promo_started', episode_number: n, promo_end_date: end }, 'PROMOTION STARTED')}>Promotion started</button>
        </div>
      ))}
      {step('3 · Friday receipt pull — what 6-7 quotes (it holds until both are in)', ep.reach_number && ep.reach_screenshot, (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="Reach so far" grow="0 0 160px"><input style={S.inp} value={reach} placeholder="31,400" onChange={(e) => setReach(e.target.value)} /></Field>
          <Field label="Screenshot link"><input style={S.inp} value={shot} placeholder="https://…" onChange={(e) => setShot(e.target.value)} /></Field>
          <button style={S.btn(true)} disabled={!!busy} onClick={() => act({ op: 'episode', action: 'reach', episode_number: n, reach_number: reach, reach_screenshot: shot }, 'RECEIPT SAVED')}>Save receipt</button>
        </div>
      ))}
      {step('4 · Promotion ended — sends the debrief invite (6-8); one reminder after 5 days if not booked', ep.promo_ended_at, (
        <button style={S.gold} disabled={!!busy || !!ep.promo_ended_at || !ep.promo_started_at} onClick={() => window.confirm(`End Episode ${n}'s promotion? EDITH sends each member the debrief invite.`) && act({ op: 'episode', action: 'promo_ended', episode_number: n }, 'PROMOTION ENDED')}>Promotion ended</button>
      ))}
      <div style={S.note}>Numbers are receipts, never projections: 6-7 only goes out with a real reach number and its screenshot.</div>
    </div>
  );
}

function InboundForm({ act, busy }) {
  const EMPTY = { business: '', owner_name: '', email: '', phone: '', neighborhood: '', years: '', q5_answer: '' };
  const [f, setF] = useState(EMPTY);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div>
      <div style={S.sec}>A Spotlight interest form arrived — log it</div>
      <div style={{ ...S.note, marginBottom: '10px' }}>This starts SEQ2 (the inbound sequence) and a “call within the hour” task. The public Spotlight form isn’t built yet, so forms that land elsewhere get logged here. If they already booked a call in the last 10 minutes, SEQ2 won’t start.</div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <Field label="Business"><input style={S.inp} value={f.business} onChange={set('business')} /></Field>
        <Field label="Owner"><input style={S.inp} value={f.owner_name} onChange={set('owner_name')} /></Field>
        <Field label="Email *"><input style={S.inp} value={f.email} onChange={set('email')} /></Field>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <Field label="Phone"><input style={S.inp} value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Neighborhood"><input style={S.inp} value={f.neighborhood} onChange={set('neighborhood')} /></Field>
        <Field label="Years in business" grow="0 1 130px"><input style={S.inp} value={f.years} onChange={(e) => setF((x) => ({ ...x, years: e.target.value.replace(/\D/g, '') }))} /></Field>
      </div>
      <Field label="Q5 — “What would you want Charlotte to finally understand about your business?” (2-1 quotes it word for word)"><textarea style={{ ...S.inp, minHeight: '60px' }} value={f.q5_answer} onChange={set('q5_answer')} /></Field>
      <button style={{ ...S.gold, marginTop: '10px' }} disabled={!!busy || !/@/.test(f.email)} onClick={async () => { const j = await act({ op: 'inbound_form', ...f }, 'FORM LOGGED — SEQ2 STARTED'); if (j.ok) setF(EMPTY); }}>Log the form</button>
    </div>
  );
}

function Settings({ cfg, sequences, act, busy }) {
  const KEYS = ['from', 'reply_to', 'digest_to', 'physical_address', 'booking_link', 'board_link', 'call_link', 'debrief_link', 'episode_link', 'next_board_date', 'current_episode'];
  const [f, setF] = useState({});
  const [paused, setPaused] = useState({});
  const [digest, setDigest] = useState(true);
  useEffect(() => { const x = {}; KEYS.forEach((k) => { x[k] = cfg[k] == null ? '' : String(cfg[k]); }); setF(x); setPaused(cfg.paused || {}); setDigest(cfg.digest !== false); }, [cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  const inp = (k, label, ph, grow) => <Field label={label} grow={grow}><input style={S.inp} value={f[k] || ''} placeholder={ph || ''} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} /></Field>;
  const dirty = KEYS.some((k) => String(f[k] ?? '') !== String(cfg[k] ?? '')) || JSON.stringify(paused) !== JSON.stringify(cfg.paused || {}) || digest !== (cfg.digest !== false);
  return (
    <div>
      <div style={S.sec}>Sender</div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
        {inp('from', 'From (must be on the Resend-verified domain)')}
        {inp('reply_to', 'Reply-to — every reply lands here')}
        {inp('digest_to', 'Daily digest (7:30 AM ET) goes to')}
      </div>
      <div style={{ ...S.note, marginBottom: '6px' }}>The manifest says “confirm actual inbox” for the reply-to. If that mailbox doesn’t exist, replies bounce and never stop a sequence.</div>
      <label style={{ ...S.note, display: 'flex', gap: '8px', alignItems: 'center' }}><input type="checkbox" checked={digest} onChange={(e) => setDigest(e.target.checked)} /> Send the daily digest</label>
      <div style={S.sec}>Links + compliance</div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {inp('physical_address', 'Mailing address (CAN-SPAM, cold footer)', 'Street, City, State ZIP', '1 1 100%')}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {inp('booking_link', 'Booking link (fit call)')}
        {inp('board_link', 'Board link (public board with prices)')}
        {inp('call_link', 'Call link (standing Zoom / Meet)')}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {inp('debrief_link', 'Debrief booking link')}
        {inp('episode_link', 'Showcase episode (2-3) — Omaha until Charlotte Ep 1')}
        {inp('next_board_date', 'Next board opens', 'November 2', '0 1 160px')}
        {inp('current_episode', 'New deposits join episode', '1', '0 1 120px')}
      </div>
      <div style={S.sec}>Pause a sequence (its emails hold until un-paused)</div>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        {sequences.map((s) => (
          <label key={s.id} style={{ ...S.note, display: 'flex', gap: '6px', alignItems: 'center', color: paused[s.id] ? 'var(--red)' : 'var(--muted)' }}>
            <input type="checkbox" checked={!!paused[s.id]} onChange={(e) => setPaused((x) => ({ ...x, [s.id]: e.target.checked }))} /> {s.id} · {s.name}
          </label>
        ))}
      </div>
      <button style={{ ...S.btn(true), marginTop: '14px' }} disabled={!dirty || !!busy} onClick={() => act({ op: 'save_config', patch: { ...f, paused, digest } }, 'EDITH SETTINGS SAVED ✓')}>Save settings</button>
    </div>
  );
}

function Copy({ d }) {
  const [open, setOpen] = useState(null);
  const byId = Object.fromEntries((d.templates || []).map((t) => [t.id, t]));
  const t = open ? byId[open] : null;
  return (
    <div>
      <div style={{ ...S.note, margin: '14px 0' }}>Read-only. The copy and the sequence logic live in <b>automations/edith/</b> (source {d.source_hash}); change those files and run <b>npm run edith:build</b>. EDITH signs every email and says she’s an AI; a human reads every reply.</div>
      {(d.sequences || []).map((s) => {
        // Step templates plus their variants / reminders (2-4-full, 6-3-paid, 6-8-reminder).
        const ids = (d.templates || []).map((x) => x.id).filter((id) => s.steps.some((x) => id === x.template_id || id.startsWith(x.template_id + '-')));
        const when = Object.fromEntries(s.steps.map((x) => [x.template_id, x.when]));
        return (
        <div key={s.id} style={{ ...S.panel, marginBottom: '8px' }}>
          <div style={{ fontSize: '12.5px', color: 'var(--cream)', fontWeight: 700 }}>{s.id} · {s.name} <span style={{ ...S.note, fontWeight: 400 }}>— starts on {s.enroll_on}{s.exit_on.length ? `; stops on ${s.exit_on.join(', ')}` : ''}</span></div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            {ids.map((id) => <button key={id} style={S.btn(open === id)} onClick={() => setOpen(open === id ? null : id)} title={when[id] || 'variant'}>{id}</button>)}
          </div>
          {t && ids.includes(open) ? (
            <div style={{ marginTop: '10px' }}>
              <div style={S.lbl}>{t.id} · {t.title} · {t.trigger}</div>
              <div style={{ fontSize: '14px', color: 'var(--cream)', fontWeight: 700 }}>{t.subject}</div>
              <div style={{ ...S.note, marginBottom: '8px' }}>Preview: {t.preview}</div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', fontSize: '11.5px', lineHeight: 1.6, color: 'var(--muted)', background: 'var(--deep)', border: '1px solid var(--line)', padding: '12px', margin: 0 }}>{t.body}</pre>
              <div style={{ ...S.note, marginTop: '6px' }}>CTA: {t.cta}{t.note ? ` · Note: ${t.note}` : ''}</div>
            </div>
          ) : null}
        </div>
        );
      })}
      {(d.warnings || []).length ? (
        <div style={{ ...S.panel, marginTop: '12px' }}>
          <div style={S.lbl}>Quality-gate notes from the build (reported, not changed — copy is locked)</div>
          {d.warnings.map((w) => <div key={w} style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7 }}>· {w}</div>)}
        </div>
      ) : null}
    </div>
  );
}

/* =========================== THE DRAWER PANEL ============================= */
export function EdithPanel({ p, flash, onChanged }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState('');
  const [pv, setPv] = useState(null);
  const [f, setF] = useState({});
  const [oc, setOc] = useState({ outcome: 'undecided', spot_number: '', not_fit_reason: '', what_would_change: '' });
  const [rp, setRp] = useState({ keyword: 'other', text: '' });
  const [cut, setCut] = useState('');

  const load = useCallback(async () => { const j = await api(null, '?prospect=' + encodeURIComponent(p.id)); if (j.ok) { setD(j); setErr(''); } else setErr(j.error || 'Could not load EDITH.'); }, [p.id]);
  useEffect(() => { load(); }, [load, p.updated_at]);
  useEffect(() => {
    setF({ specific_detail: p.specific_detail || '', q5_answer: p.q5_answer || '', first_name: p.first_name || '', call_link: p.call_link || '', spot_number: p.spot_number ?? '', episode_number: p.episode_number ?? '' });
    setOc((x) => ({ ...x, spot_number: p.spot_number ?? '' }));
  }, [p.id, p.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (body, ok) => {
    setBusy(body.op + (body.type || '')); setErr('');
    const j = await api({ id: p.id, ...body });
    setBusy('');
    if (!j.ok) { setErr(j.error || 'That didn’t work.'); return j; }
    if (ok) flash(ok);
    setForm('');
    await load();
    if (body.op !== 'preview' && onChanged) onChanged();
    return j;
  };

  if (!d) return <div style={S.note}>{err || 'Loading EDITH…'}</div>;
  if (d.needsMigration) return <div style={S.warn}>{d.hint}</div>;
  const tags = p.tags || [];
  const cold = tags.includes('cold_prospect');
  const active = (d.enrollments || []).filter((e) => e.status === 'active');
  const seqName = Object.fromEntries((d.sequences || []).map((s) => [s.id, s.name]));
  const steps = [...(d.queue || []), ...(d.log || [])].filter((s) => s.kind !== 'internal').sort((a, b) => new Date(a.due_at || a.sent_at || a.updated_at) - new Date(b.due_at || b.sent_at || b.updated_at));
  const dirty = ['specific_detail', 'q5_answer', 'first_name', 'call_link', 'spot_number', 'episode_number'].some((k) => String(f[k] ?? '') !== String(p[k] ?? ''));
  const cfg = d.config || {};

  return (
    <div>
      {err ? <div style={S.warn}>{err}</div> : null}
      <div style={{ ...S.panel, marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: cfg.edith_live ? 'var(--red)' : 'var(--gold)', letterSpacing: '.12em' }}>EDITH {cfg.edith_live ? 'LIVE' : 'OFF (logging only)'}</span>
          {p.do_not_contact ? <span style={{ fontSize: '10px', color: 'var(--red)', border: '1px solid var(--red)', padding: '1px 6px' }}>DO NOT CONTACT</span> : null}
          {tags.filter((t) => t !== 'cold_prospect').map((t) => <span key={t} style={{ fontSize: '10px', color: 'var(--dim)', border: '1px solid var(--line2)', padding: '1px 6px' }}>{t}</span>)}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.7 }}>
          {active.length ? active.map((e) => <div key={e.id}>In <b style={{ color: 'var(--cream)' }}>{e.seq}</b> · {seqName[e.seq]} since {et(e.enrolled_at)}</div>) : <div>Not in a sequence right now.</div>}
        </div>
      </div>

      <label style={{ ...S.note, display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', color: cold ? 'var(--cream)' : 'var(--dim)' }}>
        <input type="checkbox" checked={cold} disabled={!!busy || p.do_not_contact} onChange={(e) => act({ op: 'contact', cold_prospect: e.target.checked }, e.target.checked ? 'TAGGED COLD PROSPECT' : 'UNTAGGED')} />
        Cold prospect — EDITH may send the cold sequence (SEQ1) once the specific detail is written. Only tag people it’s okay to cold-email.
      </label>
      <Field label="Specific detail — one sentence a human writes after looking at them (1-1 opens with it; SEQ1 won’t start without it)"><textarea style={{ ...S.inp, minHeight: '52px' }} value={f.specific_detail || ''} placeholder="Three hundred Google reviews and half of them mention the Saturday cupping." onChange={(e) => setF((x) => ({ ...x, specific_detail: e.target.value }))} /></Field>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '10px 0' }}>
        <Field label="Form answer (Q5)"><input style={S.inp} value={f.q5_answer || ''} onChange={(e) => setF((x) => ({ ...x, q5_answer: e.target.value }))} /></Field>
        <Field label="First name (if not the owner’s)" grow="0 1 160px"><input style={S.inp} value={f.first_name || ''} placeholder={(p.owner_name || '').split(' ')[0]} onChange={(e) => setF((x) => ({ ...x, first_name: e.target.value }))} /></Field>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <Field label="Call link (overrides the standing one)"><input style={S.inp} value={f.call_link || ''} placeholder={cfg.call_link || 'https://…'} onChange={(e) => setF((x) => ({ ...x, call_link: e.target.value }))} /></Field>
        <Field label="Spot #" grow="0 1 90px"><input style={S.inp} value={f.spot_number ?? ''} onChange={(e) => setF((x) => ({ ...x, spot_number: e.target.value.replace(/\D/g, '') }))} /></Field>
        <Field label="Episode #" grow="0 1 90px"><input style={S.inp} value={f.episode_number ?? ''} placeholder={String(cfg.current_episode || 1)} onChange={(e) => setF((x) => ({ ...x, episode_number: e.target.value.replace(/\D/g, '') }))} /></Field>
      </div>
      <button style={S.btn(true)} disabled={!dirty || !!busy} onClick={() => act({ op: 'contact', fields: f }, 'SAVED — EDITH RECHECKED')}>Save EDITH fields</button>

      <div style={{ ...S.lbl, marginTop: '16px' }}>Log what happened — EDITH can’t see these on her own</div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[['outcome', 'Call outcome'], ['reply', 'They replied'], ['cut', 'Cut delivered']].map(([k, l]) => <button key={k} style={S.btn(form === k)} onClick={() => setForm(form === k ? '' : k)}>{l}</button>)}
        <button style={S.btn(false)} disabled={!!busy} onClick={() => window.confirm(`Mark ${p.business} a no-show? EDITH starts the no-show sequence (SEQ4).`) && act({ op: 'event', type: 'call.no_show' }, 'NO-SHOW LOGGED')}>No-show</button>
        <button style={S.btn(false)} disabled={!!busy} onClick={() => window.confirm('Log that the call was cancelled? EDITH stops the call reminders.') && act({ op: 'event', type: 'call.cancelled' }, 'CANCELLATION LOGGED')}>Call cancelled</button>
        <button style={S.btn(false)} disabled={!!busy} onClick={() => act({ op: 'event', type: 'debrief.booked' }, 'DEBRIEF LOGGED')}>Debrief booked</button>
        {!p.do_not_contact ? <button style={S.btn(false)} disabled={!!busy} onClick={() => window.confirm(`Do not contact ${p.business}? EDITH stops every sequence and never emails them again. This can’t be undone from here.`) && act({ op: 'contact', do_not_contact: true }, 'DO NOT CONTACT')}>Do not contact</button> : null}
      </div>
      {form === 'outcome' ? (
        <div style={{ ...S.panel, marginTop: '8px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="Outcome" grow="0 1 200px">
              <select style={{ ...S.inp, cursor: 'pointer' }} value={oc.outcome} onChange={(e) => setOc((x) => ({ ...x, outcome: e.target.value }))}>
                <option value="undecided">Undecided — thinking about it (SEQ5)</option>
                <option value="not_fit">Not a fit (5b-1)</option>
                <option value="closed">Closed — they’re paying</option>
              </select>
            </Field>
            {oc.outcome !== 'not_fit' ? <Field label="Spot # Emmanuel recommended" grow="0 1 170px"><input style={S.inp} value={oc.spot_number} onChange={(e) => setOc((x) => ({ ...x, spot_number: e.target.value.replace(/\D/g, '') }))} /></Field> : null}
          </div>
          {oc.outcome === 'not_fit' ? (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
              <Field label="The reason (quoted in 5b-1)"><textarea style={{ ...S.inp, minHeight: '48px' }} value={oc.not_fit_reason} onChange={(e) => setOc((x) => ({ ...x, not_fit_reason: e.target.value }))} /></Field>
              <Field label="What would change it (quoted too)"><textarea style={{ ...S.inp, minHeight: '48px' }} value={oc.what_would_change} onChange={(e) => setOc((x) => ({ ...x, what_would_change: e.target.value }))} /></Field>
            </div>
          ) : null}
          {oc.outcome === 'undecided' && !p.deposit ? <div style={{ ...S.note, color: 'var(--gold)', marginTop: '6px' }}>5-1 quotes the deposit link — create the deposit invoice (Money, above) or it will hold.</div> : null}
          <button style={{ ...S.gold, marginTop: '10px' }} disabled={!!busy} onClick={() => act({ op: 'event', type: 'call.completed', payload: oc }, 'CALL LOGGED')}>Log the call</button>
        </div>
      ) : null}
      {form === 'reply' ? (
        <div style={{ ...S.panel, marginTop: '8px' }}>
          <div style={{ ...S.note, marginBottom: '8px' }}>A reply stops their prospect sequences and becomes a task. Replies to the reply-to inbox are only seen by the OS automatically once Resend inbound is set up — until then, log them here.</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="What they said" grow="0 1 220px">
              <select style={{ ...S.inp, cursor: 'pointer' }} value={rp.keyword} onChange={(e) => setRp((x) => ({ ...x, keyword: e.target.value }))}>
                <option value="other">Anything else — Emmanuel answers</option>
                <option value="later">“Later” — add to the episode list</option>
                <option value="yes">“Yes” (close my file / I’ve given up)</option>
                <option value="stop">“Stop” — unsubscribe them</option>
              </select>
            </Field>
            <Field label="Their words (optional)"><input style={S.inp} value={rp.text} onChange={(e) => setRp((x) => ({ ...x, text: e.target.value }))} /></Field>
          </div>
          <button style={{ ...S.gold, marginTop: '10px' }} disabled={!!busy} onClick={() => act({ op: 'event', type: 'email.replied', payload: rp }, 'REPLY LOGGED')}>Log the reply</button>
        </div>
      ) : null}
      {form === 'cut' ? (
        <div style={{ ...S.panel, marginTop: '8px', display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Field label="Cut link — 6-4 sends it with a 5-day tweak window (silence = approved)"><input style={S.inp} value={cut} placeholder="https://…" onChange={(e) => setCut(e.target.value)} /></Field>
          <button style={S.gold} disabled={!!busy || !/^https?:\/\//.test(cut)} onClick={() => act({ op: 'event', type: 'cut.delivered', payload: { cut_link: cut } }, 'CUT DELIVERED')}>Deliver the cut</button>
        </div>
      ) : null}

      <div style={{ ...S.lbl, marginTop: '16px' }}>Their EDITH emails</div>
      {steps.length ? steps.map((s) => (
        <div key={s.id} style={{ ...S.row, fontSize: '12px' }}>
          <span style={{ ...S.note, minWidth: '140px' }}>{s.due_at || s.sent_at ? et(s.sent_at || s.due_at) : (s.anchor || '').replace(/^on:/, 'on ')}</span>
          <span style={S.note}>{s.seq} · {s.template_id}</span><Pill s={s.status} />
          <span style={{ flex: '1 1 180px', color: s.status === 'held' ? 'var(--red)' : 'var(--muted)' }}>{s.subject || s.hold_reason || ''}</span>
          {['scheduled', 'waiting', 'held'].includes(s.status) ? <button style={S.btn(false)} onClick={async () => { const j = await act({ op: 'preview', id: s.id }); if (j.ok) setPv(j); }}>Preview</button> : null}
        </div>
      )) : <div style={S.note}>None yet.</div>}
      {(d.tasks || []).length ? <div style={{ ...S.note, marginTop: '8px', color: 'var(--gold)' }}>Open for a human: {d.tasks.map((t) => t.title).join(' · ')}</div> : null}
      <Preview pv={pv} onClose={() => setPv(null)} />
    </div>
  );
}
