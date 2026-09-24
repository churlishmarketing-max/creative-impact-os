'use client';
/* ============================================================================
 * CHARLOTTE SPOTLIGHT — the cockpit screen.
 * Board (what needs doing + the pipeline) · Prospects (add, import from their
 * website) · Sequence (who's due a touch) · Contracts (agreements + deposits)
 * · Settings (the offer, the month, the agreement template).
 * Everything talks to /api/spotlight; nothing here writes to the DB directly.
 * ========================================================================== */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const api = async (body) => {
  const r = await fetch('/api/spotlight', body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  try { return await r.json(); } catch { return { ok: false, error: `Unexpected response (${r.status})` }; }
};
const copy = async (text, flash) => {
  try { await navigator.clipboard.writeText(text); flash && flash('COPIED ✓'); } catch { window.prompt('Copy this:', text); }
};
const today = () => new Date().toISOString().slice(0, 10);
const MEMBER_STAGES = ['member', 'filming', 'filmed', 'delivered', 'published'];

const S = {
  lbl: { display: 'block', fontSize: '9px', letterSpacing: '.18em', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: '5px' },
  inp: { background: 'var(--deep)', border: '1px solid var(--line2)', color: 'var(--cream)', fontFamily: 'var(--mono)', fontSize: '12.5px', padding: '9px 11px', width: '100%' },
  sec: { fontSize: '10px', letterSpacing: '.2em', color: 'var(--dim)', textTransform: 'uppercase', margin: '22px 0 10px' },
  panel: { background: 'var(--panel)', border: '1px solid var(--line)', padding: '16px 18px' },
  btn: (on) => ({ background: on ? 'var(--red)' : 'transparent', border: '1px solid ' + (on ? 'var(--red)' : 'var(--line2)'), color: on ? 'var(--golddark)' : 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '10.5px', fontWeight: on ? 700 : 400, letterSpacing: '.1em', padding: '8px 12px', cursor: 'pointer', textTransform: 'uppercase' }),
  gold: { background: 'var(--gold)', border: '1px solid var(--gold)', color: 'var(--golddark)', fontFamily: 'var(--mono)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.1em', padding: '8px 12px', cursor: 'pointer', textTransform: 'uppercase' },
  warn: { background: '#2a1a06', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '11px 13px', fontSize: '12px', lineHeight: 1.6, marginBottom: '14px' },
  note: { fontSize: '11px', color: 'var(--dim)', lineHeight: 1.6 },
};

function Field({ label, children, grow = '1 1 200px' }) {
  return <div style={{ flex: grow, minWidth: 0 }}><label style={S.lbl}>{label}</label>{children}</div>;
}

export default function Spotlight({ flash }) {
  const [d, setD] = useState(null);
  const [view, setView] = useState('board');
  const [openId, setOpenId] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const j = await api();
    if (j.ok) { setD(j); setMsg(j.needsMigration ? j.hint : ''); }
    else setMsg(j.error === 'not_configured' ? 'Spotlight needs the live database (it runs on the deployed OS, not local demo mode).' : (j.error || 'Could not load Spotlight.'));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Read-only ops (previews, a site read) don't reload the board — reloading
  // would re-render the open drawer and throw away unsaved edits.
  const act = async (body, okMsg) => {
    setBusy(body.op + (body.key || body.kind || ''));
    const j = await api(body);
    setBusy('');
    if (!j.ok) { setMsg(j.error || 'That didn’t work.'); return j; }
    setMsg('');
    if (okMsg) flash(okMsg);
    if (!['preview', 'agreement_preview', 'import'].includes(body.op)) await load();
    return j;
  };

  const prospects = d?.prospects || [];
  const cfg = d?.config || {};
  const stages = d?.stages || [];
  const verticals = d?.verticals || {};
  const open = prospects.find((p) => p.id === openId) || null;

  const VIEWS = [['board', 'The Board'], ['prospects', 'Prospects'], ['sequence', 'The Sequence'], ['contracts', 'Contracts'], ['settings', 'Settings']];

  return (
    <div style={{ padding: '28px 26px 96px', maxWidth: '1140px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '.26em', color: 'var(--red)' }}>// CHARLOTTE SPOTLIGHT · {String(cfg.month || '').toUpperCase()}</div>
          <h1 style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '48px', lineHeight: '.92', margin: '6px 0 0' }}>A SLOT, NOT A <span style={{ display: 'inline-block', background: 'var(--red)', color: 'var(--golddark)', padding: '0 12px' }}>PITCH</span></h1>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '9px', maxWidth: '640px', lineHeight: 1.6 }}>Ten Charlotte businesses a month, filmed like Diners, Drive-Ins and Dives. Who's next, what's due, what's signed, and what the members told us before the cameras walked in.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={S.btn(false)} onClick={() => copy((typeof window !== 'undefined' ? window.location.origin : '') + '/go/spotlight', flash)} title="The Spotlight fit-call booking page">Copy booking link</button>
          <button style={S.btn(false)} onClick={load}>Reload</button>
        </div>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(90deg,var(--red),transparent 55%)', margin: '16px 0 18px' }} />

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {VIEWS.map(([k, l]) => <button key={k} style={S.btn(view === k)} onClick={() => setView(k)}>{l}</button>)}
      </div>

      {msg ? <div style={S.warn}>{msg}</div> : null}
      {!d ? (msg ? null : <div style={S.note}>Loading…</div>) : (
        <>
          {view === 'board' && <Board prospects={prospects} stages={stages} cfg={cfg} onOpen={setOpenId} />}
          {view === 'prospects' && <Prospects prospects={prospects} stages={stages} verticals={verticals} act={act} busy={busy} onOpen={setOpenId} flash={flash} />}
          {view === 'sequence' && <Sequence prospects={prospects} templates={d.templates || []} onOpen={setOpenId} />}
          {view === 'contracts' && <Contracts prospects={prospects} cfg={cfg} onOpen={setOpenId} />}
          {view === 'settings' && <Settings cfg={cfg} defaultAgreement={d.defaultAgreement} act={act} busy={busy} />}
        </>
      )}

      {open ? <Detail p={open} d={d} act={act} busy={busy} flash={flash} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

/* ------------------------------ THE BOARD ------------------------------- */
function todoFor(p, cfg) {
  const t = [];
  const isMember = MEMBER_STAGES.includes(p.stage);
  if (p.q_returned_at) {
    const stars = Object.values(p.answers || {}).filter((a) => a && a.star).length;
    if (!['filmed', 'delivered', 'published'].includes(p.stage)) t.push({ tone: 'good', text: `Questions are back${stars ? ` — ${stars} starred for camera` : ''}. Read them before film day.` });
  }
  if (isMember && !p.q_sent_at) t.push({ tone: 'stop', text: 'Member, but the pre-shoot questions haven’t gone out.' });
  if (isMember && p.agreement && p.agreement.status !== 'signed') t.push({ tone: 'watch', text: 'Agreement sent, not signed yet.' });
  if (isMember && !p.agreement) t.push({ tone: 'watch', text: 'No agreement on file.' });
  if (p.stage === 'member' && !p.film_date) t.push({ tone: 'watch', text: 'Lock the film date (two to four days out).' });
  if (p.deposit && p.deposit.status !== 'paid' && !isMember) t.push({ tone: 'watch', text: `Deposit ${p.deposit.number} sent, not paid.` });
  if (['prospect', 'contacted', 'call_booked'].includes(p.stage) && (p.reviews == null || p.years == null)) t.push({ tone: 'watch', text: 'Fill reviews + years — the opener runs on them.' });
  if (p.next_touch && ['prospect', 'contacted'].includes(p.stage) && p.next_touch.due && p.next_touch.due <= today()) t.push({ tone: 'watch', text: `${p.next_touch.label} is due${p.next_touch.due < today() ? ' (overdue)' : ' today'}.` });
  if (p.stage === 'not_now' && p.not_now_month && new RegExp(new Date().toLocaleString('en-US', { month: 'long' }), 'i').test(p.not_now_month)) t.push({ tone: 'watch', text: `They said “${p.not_now_month}” — that’s now. Call.` });
  if (p.balance && p.balance.status !== 'paid' && ['filmed', 'delivered', 'published'].includes(p.stage)) t.push({ tone: 'stop', text: `Balance ${p.balance.number} unpaid after filming.` });
  return t;
}

function Board({ prospects, stages, cfg, onOpen }) {
  const month = cfg.month || '';
  const members = prospects.filter((p) => MEMBER_STAGES.includes(p.stage));
  const claimed = members.filter((p) => (p.slot_month || month) === month).length;
  const perMonth = cfg.perMonth || 10;
  const todos = prospects.flatMap((p) => todoFor(p, cfg).map((t) => ({ ...t, p })));
  const stops = todos.filter((t) => t.tone === 'stop');
  const order = { stop: 0, watch: 1, good: 2 };
  todos.sort((a, b) => order[a.tone] - order[b.tone]);
  const color = { stop: 'var(--red)', watch: 'var(--gold)', good: 'var(--good)' };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '10px', marginBottom: '8px' }}>
        {[
          [`${claimed} / ${perMonth}`, `${month} slots claimed`, 'var(--gold)'],
          [String(prospects.filter((p) => ['prospect', 'contacted'].includes(p.stage)).length), 'in the sequence', 'var(--white)'],
          [String(prospects.filter((p) => p.stage === 'call_booked').length), 'calls booked', 'var(--white)'],
          [String(members.filter((p) => p.q_returned_at).length) + ' / ' + members.length, 'members answered', 'var(--good)'],
        ].map(([v, l, c], i) => (
          <div key={i} style={{ ...S.panel, borderTop: '2px solid ' + c }}>
            <div style={{ fontFamily: 'var(--num)', fontWeight: 700, fontSize: '26px', color: c }}>{v}</div>
            <div style={{ fontSize: '9.5px', letterSpacing: '.16em', color: 'var(--dim)', textTransform: 'uppercase', marginTop: '4px' }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', ...S.sec }}><span>What needs doing</span><span>{stops.length} stop · {todos.length - stops.length} to watch</span></div>
      {todos.length === 0 ? <div style={{ ...S.panel, color: 'var(--muted)', fontSize: '12.5px' }}>Nothing is waiting on you. Everyone is where they should be.</div> : (
        <div style={{ borderTop: '1px solid var(--line)' }}>
          {todos.slice(0, 40).map((t, i) => (
            <div key={i} onClick={() => onOpen(t.p.id)} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color[t.tone], flexShrink: 0 }} />
              <span style={{ fontSize: '12.5px', color: 'var(--cream)', fontWeight: 700, minWidth: '170px' }}>{t.p.business}</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{t.text}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...S.sec }}>The pipeline</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '12px' }}>
        {stages.filter((s) => s.key !== 'no').map((s) => {
          const rows = prospects.filter((p) => p.stage === s.key);
          if (!rows.length) return null;
          return (
            <div key={s.key}>
              <div style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '17px', textTransform: 'uppercase', marginBottom: '6px' }}>{s.label} <span style={{ fontSize: '11px', color: 'var(--dim)', fontFamily: 'var(--mono)' }}>{rows.length}</span></div>
              {rows.map((p) => <Card key={p.id} p={p} onOpen={onOpen} />)}
            </div>
          );
        })}
      </div>
      {!prospects.length ? <div style={{ ...S.note, marginTop: '10px' }}>No one in the pipeline yet. Add the first prospect on the Prospects screen — or share the booking link above.</div> : null}
    </div>
  );
}

function Card({ p, onOpen }) {
  const line = [p.vertical ? p.vertical.toUpperCase() : null, p.suburb].filter(Boolean).join(' · ');
  const status = p.q_returned_at ? '★ answers back' : p.q_sent_at ? 'questions sent' : p.agreement?.status === 'signed' ? 'signed' : p.deposit?.status === 'paid' ? 'deposit paid' : p.next_touch ? `next: ${p.next_touch.label.split(' —')[0]}` : '';
  return (
    <div onClick={() => onOpen(p.id)} style={{ ...S.panel, padding: '11px 13px', marginBottom: '8px', cursor: 'pointer', borderLeft: '3px solid ' + (p.q_returned_at ? 'var(--good)' : 'var(--line2)') }}>
      <div style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '15px', textTransform: 'uppercase' }}>{p.business || '(no name)'}</div>
      {line ? <div style={{ fontSize: '10.5px', color: 'var(--dim)', marginTop: '2px' }}>{line}</div> : null}
      {p.reviews != null || p.years != null ? <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '4px' }}>{p.reviews != null ? `${p.reviews} reviews` : '— reviews'} · {p.years != null ? `${p.years} yrs` : '— yrs'}</div> : null}
      {status ? <div style={{ fontSize: '10.5px', color: 'var(--gold)', marginTop: '4px' }}>{status}</div> : null}
    </div>
  );
}

/* ----------------------------- PROSPECTS -------------------------------- */
const EMPTY = { business: '', owner_name: '', email: '', phone: '', website: '', vertical: '', suburb: '', reviews: '', years: '', video_situation: '', source: 'cold list', notes: '' };

function Prospects({ prospects, stages, verticals, act, busy, onOpen, flash }) {
  const [f, setF] = useState(EMPTY);
  const [profile, setProfile] = useState(null);
  const [filter, setFilter] = useState('all');
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  const importSite = async () => {
    if (!f.website.trim()) return;
    const j = await act({ op: 'import', url: f.website });
    if (!j.ok) return;
    const pr = j.profile || {};
    setProfile(pr);
    set({
      business: f.business || pr.business_name || '',
      owner_name: f.owner_name || pr.owner_name || '',
      phone: f.phone || pr.phone || '',
      email: f.email || pr.email || '',
      suburb: f.suburb || pr.city_or_suburb || '',
      vertical: f.vertical || (verticals[pr.vertical] ? pr.vertical : ''),
      years: f.years !== '' ? f.years : (pr.years_in_business ?? ''),
    });
    flash('SITE READ ✓ — CHECK THE FIELDS');
  };
  const save = async () => {
    if (!f.business.trim()) return;
    const j = await act({ op: 'save', ...f, profile: profile || undefined }, 'PROSPECT ADDED ✓');
    if (j.ok) { setF(EMPTY); setProfile(null); }
  };

  const rows = prospects.filter((p) => filter === 'all' ? p.stage !== 'no' : p.stage === filter);
  return (
    <div>
      <div style={{ ...S.sec, marginTop: 0 }}>Add a prospect</div>
      <div style={S.panel}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px' }}>
          <Field label="Website — the OS reads it and fills what it can" grow="3 1 320px"><input style={S.inp} value={f.website} placeholder="theirbusiness.com" onChange={(e) => set({ website: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') importSite(); }} /></Field>
          <button style={S.gold} disabled={!!busy || !f.website.trim()} onClick={importSite}>{busy === 'import' ? 'Reading…' : 'Import from website'}</button>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="Business *"><input style={S.inp} value={f.business} onChange={(e) => set({ business: e.target.value })} /></Field>
          <Field label="Owner"><input style={S.inp} value={f.owner_name} onChange={(e) => set({ owner_name: e.target.value })} /></Field>
          <Field label="Email"><input style={S.inp} value={f.email} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Phone"><input style={S.inp} value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="Vertical"><select style={{ ...S.inp, cursor: 'pointer' }} value={f.vertical} onChange={(e) => set({ vertical: e.target.value })}><option value="">—</option>{Object.entries(verticals).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <Field label="Suburb"><input style={S.inp} value={f.suburb} onChange={(e) => set({ suburb: e.target.value })} /></Field>
          <Field label="Google reviews" grow="0 1 120px"><input style={S.inp} value={f.reviews} inputMode="numeric" onChange={(e) => set({ reviews: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Years in business" grow="0 1 120px"><input style={S.inp} value={f.years} inputMode="numeric" onChange={(e) => set({ years: String(e.target.value).replace(/\D/g, '') })} /></Field>
          <Field label="Video today" grow="0 1 130px"><select style={{ ...S.inp, cursor: 'pointer' }} value={f.video_situation} onChange={(e) => set({ video_situation: e.target.value })}><option value="">—</option><option value="none">None</option><option value="minimal">Minimal</option><option value="some">Some</option></select></Field>
          <Field label="Source" grow="0 1 150px"><select style={{ ...S.inp, cursor: 'pointer' }} value={f.source} onChange={(e) => set({ source: e.target.value })}>{['cold list', 'warm', 'referral', 'booking', 'ad', 'walk-in'].map((x) => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <Field label="Notes"><input style={S.inp} value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
        {profile ? <ProfileBox pr={profile} /> : null}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px' }}>
          <button style={S.btn(true)} disabled={!!busy || !f.business.trim()} onClick={save}>Add the prospect →</button>
          <span style={S.note}>Reviews + years are what the opener runs on — the site rarely has the review count, so pull it from Google.</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...S.sec }}>
        <span>Everyone ({rows.length})</span>
        <span style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {[['all', 'All'], ...stages.map((s) => [s.key, s.label])].map(([k, l]) => <button key={k} style={{ ...S.btn(filter === k), padding: '4px 8px', fontSize: '9.5px' }} onClick={() => setFilter(k)}>{l}</button>)}
        </span>
      </div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {rows.map((p) => (
          <div key={p.id} onClick={() => onOpen(p.id)} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.4fr', gap: '10px', padding: '10px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer', fontSize: '12px' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 700 }}>{p.business}<span style={{ color: 'var(--dim)', fontWeight: 400 }}>{p.owner_name ? ' · ' + p.owner_name : ''}</span></span>
            <span style={{ color: 'var(--gold)' }}>{(stages.find((s) => s.key === p.stage) || {}).label}</span>
            <span style={{ color: 'var(--muted)' }}>{p.reviews ?? '—'} rev · {p.years ?? '—'} yrs</span>
            <span style={{ color: 'var(--dim)' }}>{p.next_touch && ['prospect', 'contacted'].includes(p.stage) ? `${p.next_touch.label.split(' —')[0]}${p.next_touch.due ? ' · ' + p.next_touch.due : ''}` : p.q_returned_at ? '★ answers back' : ''}</span>
          </div>
        ))}
        {!rows.length ? <div style={{ ...S.note, padding: '12px 0' }}>Nobody here.</div> : null}
      </div>
    </div>
  );
}

function ProfileBox({ pr }) {
  const list = (a) => (Array.isArray(a) && a.length ? a.join(' · ') : null);
  return (
    <div style={{ marginTop: '12px', borderLeft: '2px solid var(--gold)', padding: '8px 12px', background: 'var(--deep)', fontSize: '12px', lineHeight: 1.6, color: 'var(--muted)' }}>
      <div style={{ fontSize: '9px', letterSpacing: '.18em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '4px' }}>From their website — facts only, check them</div>
      {pr.summary ? <div style={{ color: 'var(--cream)' }}>{pr.summary}</div> : null}
      {list(pr.services) ? <div><b>Services:</b> {list(pr.services)}</div> : null}
      {list(pr.story_hooks) ? <div><b>Story hooks:</b> {list(pr.story_hooks)}</div> : null}
      {list(pr.notable_facts) ? <div><b>Notable:</b> {list(pr.notable_facts)}</div> : null}
      {pr.founded_year ? <div><b>Founded:</b> {pr.founded_year}</div> : null}
      {list(pr.source_urls) ? <div style={{ color: 'var(--dim)', fontSize: '10.5px' }}>Read: {list(pr.source_urls)}</div> : null}
    </div>
  );
}

/* ------------------------------ SEQUENCE -------------------------------- */
function Sequence({ prospects, templates, onOpen }) {
  const live = prospects.filter((p) => ['prospect', 'contacted'].includes(p.stage) && p.next_touch);
  const due = live.filter((p) => !p.next_touch.due || p.next_touch.due <= today());
  const later = live.filter((p) => p.next_touch.due && p.next_touch.due > today());
  const Row = ({ p }) => (
    <div onClick={() => onOpen(p.id)} style={{ display: 'flex', gap: '12px', padding: '10px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer', fontSize: '12px' }}>
      <span style={{ color: 'var(--cream)', fontWeight: 700, minWidth: '190px' }}>{p.business}</span>
      <span style={{ color: 'var(--gold)' }}>{p.next_touch.label}</span>
      <span style={{ color: 'var(--dim)', marginLeft: 'auto' }}>{p.next_touch.due ? (p.next_touch.due < today() ? 'overdue · ' : '') + p.next_touch.due : 'ready to start'}</span>
    </div>
  );
  return (
    <div>
      <div style={S.warn}>
        Cold touches never send on their own. Each one opens as a draft with their details filled in — anything the OS can’t fill (like their LTV number or the date you release the slot) stays in [brackets] and blocks the send until you fill it. <b>For volume, copy them into a dedicated outreach sender</b> (Smartlead / Instantly on a warmed domain) rather than sending from hello@ — that address now carries every booking confirmation, and cold volume from it risks your deliverability for all of them.
      </div>
      <div style={{ ...S.sec, marginTop: 0 }}>Due now ({due.length})</div>
      <div style={{ borderTop: '1px solid var(--line)' }}>{due.map((p) => <Row key={p.id} p={p} />)}{!due.length ? <div style={{ ...S.note, padding: '10px 0' }}>No touches due.</div> : null}</div>
      <div style={S.sec}>Coming up ({later.length})</div>
      <div style={{ borderTop: '1px solid var(--line)' }}>{later.map((p) => <Row key={p.id} p={p} />)}{!later.length ? <div style={{ ...S.note, padding: '10px 0' }}>Nothing scheduled.</div> : null}</div>
      <div style={S.sec}>The emails</div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {templates.map((t) => (
          <div key={t.key} style={{ display: 'flex', gap: '12px', padding: '9px 4px', borderBottom: '1px solid var(--line)', fontSize: '12px' }}>
            <span style={{ color: 'var(--cream)', minWidth: '280px' }}>{t.label}</span>
            <span style={{ color: 'var(--dim)' }}>{t.when}</span>
            <span style={{ marginLeft: 'auto', color: t.kind === 'cold' ? 'var(--muted)' : 'var(--good)', fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase' }}>{t.kind === 'member' ? 'member' : t.kind}</span>
          </div>
        ))}
      </div>
      <div style={{ ...S.note, marginTop: '10px' }}>Open any prospect to preview, edit, copy, or send a specific email. Reply lanes (script §10): interested → Call booked · not now → Not now + the month · no → No (never re-add).</div>
    </div>
  );
}

/* ------------------------------ CONTRACTS ------------------------------- */
function Contracts({ prospects, cfg, onOpen }) {
  const rows = prospects.filter((p) => p.agreement || p.deposit || p.balance || MEMBER_STAGES.includes(p.stage) || p.stage === 'call_booked');
  const pill = (x, paidWord) => !x ? <span style={{ color: 'var(--dim)' }}>—</span> : <span style={{ color: x.status === 'paid' || x.status === 'signed' ? 'var(--good)' : 'var(--gold)' }}>{x.number} · {x.status === 'paid' || x.status === 'signed' ? paidWord : x.status}</span>;
  return (
    <div>
      {!cfg.attorneyReviewed ? <div style={S.warn}><b>Agreements are locked.</b> Your agreement template says it’s <b>required before first use</b> that a North Carolina attorney reviews it — and the template (Aug 21) still describes the tiered, paid-in-full offer, not the $997 / $250-deposit offer the call script (Sep 19) sells. Update it in Settings, get the attorney pass, then tick “attorney reviewed” to unlock. Deposits work now.</div> : null}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.3fr 1.3fr 1.3fr', gap: '10px', padding: '6px 4px', fontSize: '9.5px', letterSpacing: '.16em', color: 'var(--dim)', textTransform: 'uppercase', borderBottom: '1px solid var(--line)' }}>
        <span>Business</span><span>Stage</span><span>Agreement</span><span>Deposit</span><span>Balance</span>
      </div>
      {rows.map((p) => (
        <div key={p.id} onClick={() => onOpen(p.id)} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.3fr 1.3fr 1.3fr', gap: '10px', padding: '10px 4px', borderBottom: '1px solid var(--line)', fontSize: '12px', cursor: 'pointer' }}>
          <span style={{ color: 'var(--cream)', fontWeight: 700 }}>{p.business}</span>
          <span style={{ color: 'var(--muted)' }}>{p.stage.replace('_', ' ')}</span>
          {pill(p.agreement, 'signed')}{pill(p.deposit, 'paid')}{pill(p.balance, 'paid')}
        </div>
      ))}
      {!rows.length ? <div style={{ ...S.note, padding: '12px 0' }}>Nothing to paper yet — contracts appear once someone books a call or becomes a member.</div> : null}
      <div style={{ ...S.note, marginTop: '12px' }}>A paid deposit makes them a member automatically — which sends their pre-shoot questions. Agreements are signed on the same e-sign page as your proposals; a signature adds a Signed deal to the pipeline.</div>
    </div>
  );
}

/* ------------------------------ SETTINGS -------------------------------- */
function Settings({ cfg, defaultAgreement, act, busy }) {
  const [c, setC] = useState(cfg);
  useEffect(() => setC(cfg), [cfg]);
  const set = (patch) => setC((x) => ({ ...x, ...patch }));
  const dirty = JSON.stringify(c) !== JSON.stringify(cfg);
  return (
    <div>
      <div style={S.warn}>
        <b>Your documents disagree on the offer.</b> The Canonical Kit, Agreement, and Invoice templates (Aug 21) sell ten spots in two tiers — $1,750 down to $750 — paid in full, one season locking Oct 10. The Call Script (Sep 19, newest) sells a flat <b>$997, $250 deposit + $747 at filming</b>, ten businesses a month. These settings default to the Sep 19 script. The agreement template below is still the Aug 21 text, so it can’t be sent until it matches what’s being sold.
      </div>
      <div style={S.panel}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <Field label="Slot price ($)" grow="0 1 130px"><input style={S.inp} value={c.price ?? ''} inputMode="numeric" onChange={(e) => set({ price: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
          <Field label="Deposit ($)" grow="0 1 130px"><input style={S.inp} value={c.deposit ?? ''} inputMode="numeric" onChange={(e) => set({ deposit: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
          <Field label="Balance at filming ($)" grow="0 1 150px"><input style={S.inp} value={c.balance ?? ''} inputMode="numeric" onChange={(e) => set({ balance: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
          <Field label="Slots per month" grow="0 1 120px"><input style={S.inp} value={c.perMonth ?? ''} inputMode="numeric" onChange={(e) => set({ perMonth: e.target.value.replace(/\D/g, '') })} /></Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <Field label="Month being sold"><input style={S.inp} value={c.month || ''} placeholder="October" onChange={(e) => set({ month: e.target.value })} /></Field>
          <Field label="Episode date (as spoken)"><input style={S.inp} value={c.episodeDate || ''} placeholder="October 1" onChange={(e) => set({ episodeDate: e.target.value })} /></Field>
          <Field label="Episode link (once live)"><input style={S.inp} value={c.episodeUrl || ''} onChange={(e) => set({ episodeUrl: e.target.value })} /></Field>
          <Field label="Crew reel link"><input style={S.inp} value={c.crewReelUrl || ''} onChange={(e) => set({ crewReelUrl: e.target.value })} /></Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <Field label="Emails signed by"><input style={S.inp} value={c.caller || ''} onChange={(e) => set({ caller: e.target.value })} /></Field>
          <Field label="Caller phone"><input style={S.inp} value={c.callerPhone || ''} onChange={(e) => set({ callerPhone: e.target.value })} /></Field>
        </div>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--cream)', marginBottom: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!c.autoSendQuestions} onChange={(e) => set({ autoSendQuestions: e.target.checked })} />
          Send the pre-shoot questions automatically the moment someone becomes a member
        </label>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: c.attorneyReviewed ? 'var(--good)' : 'var(--gold)', marginBottom: '14px', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!c.attorneyReviewed} onChange={(e) => { if (e.target.checked && !window.confirm('Confirm: a North Carolina attorney has reviewed THIS agreement text, and it matches the offer you are selling?')) return; set({ attorneyReviewed: e.target.checked }); }} />
          The agreement below has had its North Carolina attorney review (unlocks sending agreements)
        </label>
        <Field label="Agreement template — {{business}} {{contact}} {{emailPhone}} {{fee}} {{filmDate}} {{month}} {{deposit}} {{balance}} fill in automatically">
          <textarea style={{ ...S.inp, minHeight: '320px', lineHeight: 1.55, fontFamily: 'var(--mono)', fontSize: '11.5px' }} value={c.agreementTemplate || ''} onChange={(e) => set({ agreementTemplate: e.target.value, attorneyReviewed: false })} />
        </Field>
        <div style={{ ...S.note, marginTop: '6px' }}>Editing the text un-ticks attorney review — changed terms need a fresh look. Any {'{{token}}'} not listed above (the Aug 21 text has {'{{spot}}'} and {'{{tier}}'}) stays blank and blocks the agreement until you remove or replace it.</div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
          <button style={S.btn(true)} disabled={!dirty || !!busy} onClick={() => act({ op: 'save_config', patch: c }, 'SPOTLIGHT SETTINGS SAVED ✓')}>Save settings</button>
          <button style={S.btn(false)} onClick={() => { if (window.confirm('Reset the agreement text to the Aug 21 template?')) set({ agreementTemplate: defaultAgreement, attorneyReviewed: false }); }}>Reset agreement text</button>
          {dirty ? <span style={{ ...S.note, color: 'var(--gold)', alignSelf: 'center' }}>Unsaved changes</span> : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- ONE BUSINESS (drawer) ------------------------ */
function Detail({ p, d, act, busy, flash, onClose }) {
  const stages = d.stages || [];
  const verticals = d.verticals || {};
  const cfg = d.config || {};
  const v = verticals[p.vertical] || null;
  const [f, setF] = useState(p);
  const [qs, setQs] = useState(p.questions || []);
  const [draft, setDraft] = useState(null); // {key, subject, body, kind, unresolved}
  const [agree, setAgree] = useState(null);
  const [nnMonth, setNnMonth] = useState(p.not_now_month || '');
  // Reset local edits only when this row actually changed on the server (a save),
  // not on every board reload.
  useEffect(() => { setF(p); setQs(p.questions || []); }, [p.id, p.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const pick = ['business', 'owner_name', 'email', 'phone', 'website', 'vertical', 'suburb', 'reviews', 'years', 'video_situation', 'source', 'slot_month', 'film_date', 'quote_mentioned', 'season_named', 'notes'];
  const dirty = pick.some((k) => String(f[k] ?? '') !== String(p[k] ?? ''));
  const qDirty = JSON.stringify(qs) !== JSON.stringify(p.questions || []);

  const moveStage = async (stage) => {
    if (stage === 'no' && !window.confirm(`Mark ${p.business} as a clean No? They drop off the board and should never be re-added.`)) return;
    if (stage === 'member' && !window.confirm(`Make ${p.business} a member?${cfg.autoSendQuestions && p.email && !p.q_sent_at ? ' Their pre-shoot questions will be emailed now.' : ''}`)) return;
    const j = await act({ op: 'stage', id: p.id, stage, not_now_month: nnMonth }, 'STAGE UPDATED ✓');
    if (j.ok && j.questions) flash(j.questions.ok ? 'MEMBER ✓ — QUESTIONS SENT' : 'MEMBER ✓ — QUESTIONS NOT SENT: ' + j.questions.error);
  };
  const preview = async (key) => {
    const j = await act({ op: 'preview', id: p.id, key });
    if (j.ok) setDraft({ key, subject: j.subject, body: j.body, kind: j.kind, label: j.label });
  };
  const unresolvedNow = draft ? Array.from(new Set(((draft.subject + '\n' + draft.body).match(/\[[^\]\n]{1,90}\]/g) || []))) : [];
  const send = async () => {
    if (!draft) return;
    if (draft.kind === 'cold' && !window.confirm(`Send "${draft.label}" to ${p.email} from ${cfg.caller} at hello@? (Cold volume belongs in a dedicated outreach sender — this is for one-off sends.)`)) return;
    const j = await act({ op: 'send', id: p.id, key: draft.key, subject: draft.subject, body: draft.body }, 'EMAIL SENT ✓');
    if (j.ok) setDraft(null);
  };

  const cold = (d.templates || []).filter((t) => t.kind === 'cold');
  const coldIndex = (k) => cold.findIndex((t) => t.key === k);
  const answers = p.answers || {};
  const orderedQs = [...(p.questions || [])].sort((a, b) => Number(!!(answers[b.id] || {}).star) - Number(!!(answers[a.id] || {}).star));

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(3,6,12,.72)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '780px', maxWidth: '100%', height: '100%', overflowY: 'auto', background: '#0b1526', borderLeft: '1px solid var(--line)', borderTop: '3px solid var(--red)', padding: '24px 26px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '30px', lineHeight: 1, textTransform: 'uppercase' }}>{p.business}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>{[p.owner_name, v ? v.label : p.vertical, p.suburb].filter(Boolean).join(' · ')}</div>
            {p.source ? <span style={{ display: 'inline-block', marginTop: '8px', border: '1px solid var(--line2)', color: 'var(--dim)', fontSize: '9.5px', padding: '2px 7px', letterSpacing: '.12em', textTransform: 'uppercase' }}>{p.source}</span> : null}
          </div>
          <button style={{ ...S.btn(false), height: 'fit-content' }} onClick={onClose}>✕ Close</button>
        </div>

        <div style={S.sec}>Where they are</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select style={{ ...S.inp, width: '220px', cursor: 'pointer' }} value={p.stage} onChange={(e) => moveStage(e.target.value)} disabled={!!busy}>
            {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <span style={S.note}>{(stages.find((s) => s.key === p.stage) || {}).hint}</span>
        </div>
        {p.stage === 'not_now' || p.not_now_month ? (
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
            <input style={{ ...S.inp, width: '200px' }} value={nnMonth} placeholder="The month they named" onChange={(e) => setNnMonth(e.target.value)} />
            <button style={S.btn(false)} onClick={() => act({ op: 'stage', id: p.id, stage: 'not_now', not_now_month: nnMonth }, 'SAVED ✓')}>Save month</button>
          </div>
        ) : null}

        <div style={S.sec}>Before you dial — the three numbers</div>
        <div style={{ ...S.panel, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
          {[['Reviews', p.reviews], ['Years', p.years], ['Video today', p.video_situation]].map(([l, x]) => (
            <div key={l}><div style={{ fontFamily: 'var(--num)', fontSize: '22px', fontWeight: 700, color: x == null || x === '' ? 'var(--red)' : 'var(--cream)' }}>{x == null || x === '' ? '—' : x}</div><div style={S.lbl}>{l}</div></div>
          ))}
          {v ? <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, borderTop: '1px solid var(--line)', paddingTop: '8px' }}><b style={{ color: 'var(--gold)' }}>The gap line:</b> {v.gap}<br /><b style={{ color: 'var(--gold)' }}>Season:</b> {v.season}</div> : null}
        </div>

        <div style={S.sec}>Details</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="Business"><input style={S.inp} value={f.business || ''} onChange={(e) => set({ business: e.target.value })} /></Field>
          <Field label="Owner"><input style={S.inp} value={f.owner_name || ''} onChange={(e) => set({ owner_name: e.target.value })} /></Field>
          <Field label="Email"><input style={S.inp} value={f.email || ''} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Phone"><input style={S.inp} value={f.phone || ''} onChange={(e) => set({ phone: e.target.value })} /></Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="Vertical"><select style={{ ...S.inp, cursor: 'pointer' }} value={f.vertical || ''} onChange={(e) => set({ vertical: e.target.value })}><option value="">—</option>{Object.entries(verticals).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}</select></Field>
          <Field label="Suburb"><input style={S.inp} value={f.suburb || ''} onChange={(e) => set({ suburb: e.target.value })} /></Field>
          <Field label="Reviews" grow="0 1 100px"><input style={S.inp} value={f.reviews ?? ''} onChange={(e) => set({ reviews: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Years" grow="0 1 100px"><input style={S.inp} value={f.years ?? ''} onChange={(e) => set({ years: String(e.target.value).replace(/\D/g, '') })} /></Field>
          <Field label="Video today" grow="0 1 120px"><select style={{ ...S.inp, cursor: 'pointer' }} value={f.video_situation || ''} onChange={(e) => set({ video_situation: e.target.value })}><option value="">—</option><option value="none">None</option><option value="minimal">Minimal</option><option value="some">Some</option></select></Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="Slot month"><input style={S.inp} value={f.slot_month || ''} placeholder={cfg.month} onChange={(e) => set({ slot_month: e.target.value })} /></Field>
          <Field label="Film date"><input type="date" style={S.inp} value={f.film_date || ''} onChange={(e) => set({ film_date: e.target.value })} /></Field>
          <Field label="Quote they mentioned"><input style={S.inp} value={f.quote_mentioned || ''} placeholder="$4,000" onChange={(e) => set({ quote_mentioned: e.target.value })} /></Field>
          <Field label="Season they named"><input style={S.inp} value={f.season_named || ''} placeholder="spring" onChange={(e) => set({ season_named: e.target.value })} /></Field>
        </div>
        <Field label="Notes"><textarea style={{ ...S.inp, minHeight: '60px' }} value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button style={S.btn(true)} disabled={!dirty || !!busy} onClick={() => { const patch = {}; pick.forEach((k) => { patch[k] = f[k] ?? ''; }); act({ op: 'save', id: p.id, ...patch }, 'SAVED ✓'); }}>Save details</button>
          {dirty ? <span style={{ ...S.note, color: 'var(--gold)', alignSelf: 'center' }}>Unsaved</span> : null}
        </div>

        <div style={S.sec}>Their website</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <Field label="URL" grow="1 1 300px"><input style={S.inp} value={f.website || ''} onChange={(e) => set({ website: e.target.value })} /></Field>
          <button style={S.gold} disabled={!!busy || !(f.website || '').trim()} onClick={async () => { const j = await act({ op: 'import_to', id: p.id, url: f.website }); if (j.ok) flash(j.filled && j.filled.length ? 'SITE READ ✓ — FILLED ' + j.filled.join(', ').toUpperCase() : 'SITE READ ✓'); }}>{busy === 'import_to' ? 'Reading…' : 'Import from website'}</button>
        </div>
        {p.profile && Object.keys(p.profile).length ? <ProfileBox pr={p.profile} /> : <div style={{ ...S.note, marginTop: '6px' }}>Import fills only empty fields — nothing you typed gets overwritten. It also feeds the tailored questions.</div>}

        <div style={S.sec}>Money</div>
        <div style={{ ...S.panel, display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
          {[['deposit', p.deposit, cfg.deposit], ['balance', p.balance, cfg.balance]].map(([kind, x, amt]) => (
            <div key={kind} style={{ flex: '1 1 260px' }}>
              <div style={S.lbl}>{kind === 'deposit' ? 'Deposit — holds the slot' : 'Balance — due at filming'} · ${amt}</div>
              {x ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12.5px', color: x.status === 'paid' ? 'var(--good)' : 'var(--gold)' }}>{x.number} · {x.status}</span>
                  {x.status !== 'paid' ? <button style={S.btn(false)} onClick={() => copy(x.link, flash)}>Copy pay link</button> : null}
                </div>
              ) : <button style={S.btn(false)} disabled={!!busy} onClick={() => act({ op: 'invoice', id: p.id, kind }, kind.toUpperCase() + ' INVOICE CREATED ✓')}>Create {kind} invoice</button>}
            </div>
          ))}
          <div style={{ ...S.note, flexBasis: '100%' }}>Text the pay link while they’re on the phone (script §4, move 3). When the deposit clears they become a member automatically. Pay links need Stripe set up in Vercel.</div>
        </div>

        <div style={S.sec}>The agreement</div>
        <div style={S.panel}>
          {p.agreement ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12.5px', color: p.agreement.status === 'signed' ? 'var(--good)' : 'var(--gold)' }}>{p.agreement.number} · {p.agreement.status}{p.agreement.signer ? ' by ' + p.agreement.signer : ''}</span>
              {p.agreement.status !== 'signed' ? <button style={S.btn(false)} onClick={() => copy(p.agreement.link, flash)}>Copy signing link</button> : null}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button style={S.btn(false)} onClick={async () => { const j = await act({ op: 'agreement_preview', id: p.id }); if (j.ok) setAgree(j); }}>Preview filled agreement</button>
                <button style={S.btn(!!cfg.attorneyReviewed)} disabled={!!busy || !cfg.attorneyReviewed} title={cfg.attorneyReviewed ? '' : 'Locked until the template is marked attorney-reviewed in Settings'} onClick={() => act({ op: 'agreement', id: p.id }, 'AGREEMENT CREATED ✓')}>Create agreement for signature</button>
              </div>
              {!cfg.attorneyReviewed ? <div style={{ ...S.note, marginTop: '8px', color: 'var(--gold)' }}>Locked: the template hasn’t been marked attorney-reviewed, and it still describes the Aug 21 offer. See Settings.</div> : null}
              {agree ? (
                <div style={{ marginTop: '10px' }}>
                  {agree.unresolved && agree.unresolved.length ? <div style={{ ...S.note, color: 'var(--red)', marginBottom: '6px' }}>Can’t fill: {agree.unresolved.join(', ')}</div> : null}
                  <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--deep)', border: '1px solid var(--line)', padding: '12px', fontSize: '11px', lineHeight: 1.55, color: 'var(--muted)', maxHeight: '320px', overflowY: 'auto' }}>{agree.text}</pre>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div style={S.sec}>Pre-shoot questions {p.q_sent_at ? `· sent ${String(p.q_sent_at).slice(0, 10)}` : ''} {p.q_returned_at ? `· answered ${String(p.q_returned_at).slice(0, 10)}` : ''}</div>
        {p.q_returned_at ? (
          <div style={{ ...S.panel, marginBottom: '10px' }}>
            <div style={{ ...S.lbl, color: 'var(--good)' }}>What they told us — starred = ask on camera</div>
            {orderedQs.filter((q) => (answers[q.id] || {}).a).map((q) => (
              <div key={q.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontSize: '11.5px', color: answers[q.id].star ? 'var(--gold)' : 'var(--dim)' }}>{answers[q.id].star ? '★ ' : ''}{q.q}</div>
                <div style={{ fontSize: '13px', color: 'var(--cream)', marginTop: '4px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{answers[q.id].a}</div>
              </div>
            ))}
          </div>
        ) : null}
        <div style={S.panel}>
          {qs.length ? qs.map((q, i) => (
            <div key={q.id || i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', color: q.core ? 'var(--dim)' : 'var(--gold)', paddingTop: '10px', minWidth: '22px' }}>{i + 1}.</span>
              <div style={{ flex: 1 }}>
                <textarea style={{ ...S.inp, minHeight: '42px' }} value={q.q} onChange={(e) => setQs(qs.map((x, k) => k === i ? { ...x, q: e.target.value } : x))} />
                {q.why ? <div style={{ fontSize: '10.5px', color: 'var(--dim)', marginTop: '2px' }}>{q.core ? '' : 'Tailored · '}{q.why}</div> : null}
              </div>
              <button style={{ ...S.btn(false), padding: '6px 9px' }} title="Remove" onClick={() => setQs(qs.filter((_, k) => k !== i))}>✕</button>
            </div>
          )) : <div style={{ ...S.note, marginBottom: '8px' }}>No questions drafted yet. They draft automatically when this business becomes a member — or draft them now.</div>}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
            <button style={S.btn(false)} disabled={!!busy} onClick={async () => { if (qs.length && !window.confirm('Redraft? This replaces the current questions.')) return; const j = await act({ op: 'draft_questions', id: p.id }, 'QUESTIONS DRAFTED ✓'); if (j.ok) setQs(j.questions); }}>{busy === 'draft_questions' ? 'Drafting…' : qs.length ? 'Redraft' : 'Draft questions'}</button>
            <button style={S.btn(false)} onClick={() => setQs([...qs, { id: 'm' + Date.now(), q: '', why: 'Added by hand.' }])}>+ Add a question</button>
            <button style={S.btn(qDirty)} disabled={!qDirty || !!busy} onClick={() => act({ op: 'save_questions', id: p.id, questions: qs }, 'QUESTIONS SAVED ✓')}>Save questions</button>
            <button style={S.gold} disabled={!!busy || !qs.length || qDirty} title={qDirty ? 'Save your edits first' : ''} onClick={() => preview('questions')}>{p.q_sent_at ? 'Resend questions email' : 'Send questions email'}</button>
          </div>
          <div style={{ ...S.note, marginTop: '8px' }}>The questions page reads live, so edits here show up even after the email has gone out. Their link: <a href={p.q_link} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>open</a> · <span style={{ cursor: 'pointer', color: 'var(--gold)' }} onClick={() => copy(p.q_link, flash)}>copy</span></div>
        </div>

        <div style={S.sec}>Emails {p.seq_step ? `· ${p.seq_step} cold touch${p.seq_step > 1 ? 'es' : ''} sent` : ''}</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(d.templates || []).filter((t) => t.key !== 'questions').map((t) => {
            const sent = t.kind === 'cold' && coldIndex(t.key) > -1 && coldIndex(t.key) < p.seq_step;
            return <button key={t.key} style={{ ...S.btn(draft && draft.key === t.key), color: sent ? 'var(--good)' : undefined }} onClick={() => preview(t.key)}>{sent ? '✓ ' : ''}{t.label.split(' — ')[0]}</button>;
          })}
        </div>
        {draft ? (
          <div style={{ ...S.panel, marginTop: '10px' }}>
            <div style={{ ...S.lbl, color: 'var(--gold)' }}>{draft.label} · to {p.email || '(no email on file)'} · from {cfg.caller}</div>
            <input style={{ ...S.inp, marginBottom: '8px', fontWeight: 700 }} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            <textarea style={{ ...S.inp, minHeight: '240px', lineHeight: 1.6, fontFamily: 'var(--sans)', fontSize: '13px' }} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            {unresolvedNow.length ? <div style={{ ...S.note, color: 'var(--red)', marginTop: '6px' }}>Fill before sending: {unresolvedNow.join(' · ')}</div> : null}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button style={S.btn(false)} onClick={() => copy(`Subject: ${draft.subject}\n\n${draft.body}`, flash)}>Copy</button>
              <button style={S.btn(true)} disabled={!!busy || !p.email || unresolvedNow.length > 0} onClick={send}>{busy === 'send' + draft.key ? 'Sending…' : 'Send'}</button>
              <button style={S.btn(false)} onClick={() => setDraft(null)}>Close</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
