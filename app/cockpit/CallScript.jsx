'use client';
/* ============================================================================
 * Spotlight → Call Script. The cold-call script (lib/spotlight-script.ts),
 * filled in for the call you're about to make: who's calling, who you're
 * calling (their name, reviews, vertical, the gap line), and the spot you're
 * offering (tier + price from the board). Anything the OS doesn't know stays
 * in [brackets], highlighted, so a blank never gets read out loud.
 * ========================================================================== */
import React, { useMemo, useState } from 'react';
import { SECTIONS, SCRIPT_SOURCE, scriptFields, fillScript, sayText } from '@/lib/spotlight-script';

const MEMBER_STAGES = ['member', 'filming', 'filmed', 'delivered', 'published'];
const CALLABLE = ['prospect', 'contacted', 'call_booked', 'not_now'];
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

const S = {
  lbl: { display: 'block', fontSize: '9px', letterSpacing: '.18em', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: '5px' },
  inp: { background: 'var(--deep)', border: '1px solid var(--line2)', color: 'var(--cream)', fontFamily: 'var(--mono)', fontSize: '12.5px', padding: '8px 10px', width: '100%' },
  panel: { background: 'var(--panel)', border: '1px solid var(--line)', padding: '14px 16px' },
  note: { fontSize: '11px', color: 'var(--dim)', lineHeight: 1.6 },
  chip: (on) => ({ background: on ? 'var(--red)' : 'transparent', border: '1px solid ' + (on ? 'var(--red)' : 'var(--line2)'), color: on ? 'var(--golddark)' : 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '10.5px', fontWeight: on ? 700 : 400, letterSpacing: '.1em', padding: '7px 11px', cursor: 'pointer', textTransform: 'uppercase' }),
};

// [Bracketed] = the OS doesn't know it yet: highlighted, never read out blank.
function Filled({ text }) {
  return String(text).split(/(\[[^\]\n]{1,90}\])/g).map((part, i) => (
    /^\[[^\]]+\]$/.test(part) ? <span key={i} style={{ color: 'var(--gold)', background: 'rgba(212,175,55,.1)', padding: '0 2px' }}>{part}</span> : <React.Fragment key={i}>{part}</React.Fragment>
  ));
}

export default function CallScript({ prospects, cfg, verticals, initialId, onOpen }) {
  const [caller, setCaller] = useState(cfg.caller || 'Emmanuel');
  const [other, setOther] = useState('');
  const [pid, setPid] = useState(initialId || '');
  const [spot, setSpot] = useState('');

  const callerName = caller === 'other' ? (other.trim() || '[your name]') : caller;
  const p = prospects.find((x) => x.id === pid) || null;
  const prices = (cfg.prices || []).map(Number);
  const fs = Number(cfg.featureSpots) || 0;
  const claimed = new Set(prospects.filter((x) => MEMBER_STAGES.includes(x.stage) && x.spot_number).map((x) => Number(x.spot_number)));
  const spotNo = Number(spot) || Number(p && p.spot_number) || 0;
  const f = useMemo(() => scriptFields({
    prospect: p, caller: callerName, spot: spotNo || null,
    offer: { prices, featureSpots: fs, floorDate: cfg.floorDate || '', episodeDate: cfg.episodeDate || '', crewReelUrl: cfg.crewReelUrl || '', callerPhone: cfg.callerPhone || '' },
    verticals: verticals || {},
  }), [p, callerName, spotNo, cfg, verticals]); // eslint-disable-line react-hooks/exhaustive-deps
  const fill = (t) => fillScript(t, f);

  // Phone-only businesses first — email can't reach them, so the phone has to.
  const callable = prospects.filter((x) => CALLABLE.includes(x.stage));
  const phoneOnly = callable.filter((x) => x.phone && !x.email);
  const rest = callable.filter((x) => !(x.phone && !x.email));
  const v = p && p.vertical ? verticals[p.vertical] : null;

  return (
    <div>
      <div style={{ ...S.panel, display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '0 1 auto' }}>
          <label style={S.lbl}>Calling as</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['Emmanuel', 'Brandon', 'other'].map((c) => <button key={c} style={S.chip(caller === c)} onClick={() => setCaller(c)}>{c === 'other' ? 'Someone else' : c}</button>)}
            {caller === 'other' ? <input style={{ ...S.inp, width: '140px' }} value={other} placeholder="Their first name" onChange={(e) => setOther(e.target.value)} /> : null}
          </div>
        </div>
        <div style={{ flex: '2 1 260px' }}>
          <label style={S.lbl}>Who you’re calling</label>
          <select style={{ ...S.inp, cursor: 'pointer' }} value={pid} onChange={(e) => setPid(e.target.value)}>
            <option value="">— nobody picked: the script shows [brackets] —</option>
            {phoneOnly.length ? <optgroup label={`Call list — phone only, EDITH can’t email them (${phoneOnly.length})`}>{phoneOnly.map((x) => <option key={x.id} value={x.id}>{x.business}{x.phone ? ' · ' + x.phone : ''}</option>)}</optgroup> : null}
            {rest.length ? <optgroup label={`Everyone else in the pipeline (${rest.length})`}>{rest.map((x) => <option key={x.id} value={x.id}>{x.business}{x.phone ? ' · ' + x.phone : ' · no phone'}</option>)}</optgroup> : null}
          </select>
        </div>
        <div style={{ flex: '1 1 220px' }}>
          <label style={S.lbl}>The spot you’ll offer</label>
          <select style={{ ...S.inp, cursor: 'pointer' }} value={spot || (p && p.spot_number) || ''} onChange={(e) => setSpot(e.target.value)}>
            <option value="">— pick a spot on the board —</option>
            {prices.map((x, i) => {
              const n = i + 1;
              return <option key={n} value={n} disabled={claimed.has(n)}>{`Spot ${n} · ${n <= fs ? 'Feature' : 'Community'} · ${money(x)}${claimed.has(n) ? ' · taken' : ''}`}</option>;
            })}
          </select>
        </div>
      </div>

      {p ? (
        <div style={{ ...S.panel, marginTop: '10px', borderLeft: '3px solid var(--gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '22px', textTransform: 'uppercase' }}>{p.business}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                {[p.owner_name, v ? v.label : null, p.suburb].filter(Boolean).join(' · ') || 'No owner, vertical, or area on file yet'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {p.phone ? <a href={'tel:' + String(p.phone).replace(/[^\d+]/g, '')} style={{ fontFamily: 'var(--num)', fontSize: '20px', fontWeight: 700, color: 'var(--cream)', textDecoration: 'none' }}>{p.phone}</a> : <div style={{ color: 'var(--red)', fontSize: '12px' }}>No phone on file</div>}
              <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>{p.email || 'no email — the phone is the only way in'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '10px', alignItems: 'center' }}>
            {[['Reviews', p.reviews], ['Years', p.years], ['Video today', p.video_situation]].map(([l, x]) => (
              <div key={l}><span style={{ fontFamily: 'var(--num)', fontSize: '18px', fontWeight: 700, color: x == null || x === '' ? 'var(--red)' : 'var(--cream)' }}>{x == null || x === '' ? '—' : x}</span> <span style={{ ...S.lbl, display: 'inline' }}>{l}</span></div>
            ))}
            {onOpen ? <button style={{ ...S.chip(false), marginLeft: 'auto' }} onClick={() => onOpen(p.id)}>Open their card</button> : null}
          </div>
          {v ? <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, marginTop: '8px' }}><b style={{ color: 'var(--gold)' }}>The gap line:</b> {v.gap} <b style={{ color: 'var(--gold)' }}>Season:</b> {v.season}</div> : null}
          {p.reviews == null ? <div style={{ fontSize: '11.5px', color: 'var(--red)', marginTop: '6px' }}>Pull their Google review count before you dial — Step 3 runs on it.</div> : null}
          {p.notes ? <div style={{ ...S.note, marginTop: '6px' }}>{p.notes}</div> : null}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '14px 0 4px' }}>
        {SECTIONS.map((s) => <a key={s.id} href={'#cs-' + s.id} style={{ ...S.chip(false), padding: '4px 8px', fontSize: '9.5px', textDecoration: 'none' }}>{s.title.split(' — ')[0]}</a>)}
      </div>
      <div style={{ ...S.note, marginBottom: '6px' }}>{SCRIPT_SOURCE}. Gold [brackets] = not on file yet.</div>

      {SECTIONS.map((s) => (
        <div key={s.id} id={'cs-' + s.id} style={{ marginTop: '22px', scrollMarginTop: '80px' }}>
          <div style={{ fontFamily: 'var(--cond)', fontWeight: 900, fontSize: '22px', textTransform: 'uppercase', borderBottom: '1px solid var(--line)', paddingBottom: '6px', marginBottom: '10px' }}>{s.title}</div>
          {s.blocks.map((b, i) => <BlockView key={i} b={b} fill={fill} caller={callerName} cfg={cfg} claimed={claimed} verticals={verticals} current={p && p.vertical} spotNo={spotNo} />)}
        </div>
      ))}
    </div>
  );
}

function BlockView({ b, fill, caller, cfg, claimed, verticals, current, spotNo }) {
  if (b.t === 'p') return <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 10px' }}><Filled text={fill(b.text)} /></p>;
  if (b.t === 'h') return <div style={{ fontSize: '11px', letterSpacing: '.16em', color: 'var(--gold)', textTransform: 'uppercase', margin: '16px 0 8px' }}>{b.text}</div>;
  if (b.t === 'say') return (
    <div style={{ background: 'var(--panel)', borderLeft: '3px solid var(--red)', padding: '10px 14px', margin: '0 0 8px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '.18em', color: 'var(--red)', marginBottom: '4px' }}>{(b.label || caller).toUpperCase()}</div>
      <div style={{ fontSize: '14px', color: 'var(--cream)', lineHeight: 1.65 }}><Filled text={fill(sayText(b, caller))} /></div>
    </div>
  );
  if (b.t === 'note') return <div style={{ fontSize: '12px', color: 'var(--dim)', lineHeight: 1.6, margin: '0 0 12px', paddingLeft: '14px' }}>▸ <Filled text={fill(b.text)} /></div>;
  if (b.t === 'list') return <ul style={{ margin: '0 0 10px', paddingLeft: '20px' }}>{b.items.map((x, i) => <li key={i} style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.65, marginBottom: '4px' }}><Filled text={fill(x)} /></li>)}</ul>;
  if (b.t === 'box') return (
    <div style={{ border: '1px solid var(--gold)', background: '#2a1a06', padding: '10px 14px', margin: '0 0 12px' }}>
      <div style={{ fontSize: '10px', letterSpacing: '.16em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '4px' }}>{b.title}</div>
      <div style={{ fontSize: '12.5px', color: 'var(--cream)', lineHeight: 1.65 }}><Filled text={fill(b.text)} /></div>
    </div>
  );
  if (b.t === 'table') return (
    <div style={{ overflowX: 'auto', margin: '0 0 12px' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
        <thead><tr>{b.head.map((x) => <th key={x} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--dim)', fontWeight: 400, borderBottom: '1px solid var(--line2)', fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase' }}>{x}</th>)}</tr></thead>
        <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: '7px 8px', borderBottom: '1px solid var(--line)', color: j === 0 ? 'var(--cream)' : 'var(--muted)', verticalAlign: 'top', lineHeight: 1.55 }}><Filled text={fill(c)} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
  if (b.t === 'board') {
    const fs = Number(cfg.featureSpots) || 0;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: '6px', margin: '0 0 10px' }}>
        {(cfg.prices || []).map((x, i) => {
          const n = i + 1; const taken = claimed.has(n); const mine = n === spotNo;
          return (
            <div key={n} style={{ border: '1px solid ' + (mine ? 'var(--red)' : n <= fs ? 'var(--gold)' : 'var(--line2)'), padding: '7px 9px', opacity: taken ? 0.45 : 1, background: mine ? 'rgba(200,40,40,.12)' : 'transparent' }}>
              <div style={{ fontSize: '9px', letterSpacing: '.14em', color: n <= fs ? 'var(--gold)' : 'var(--dim)', textTransform: 'uppercase' }}>Spot {n} · {n <= fs ? 'Feature' : 'Community'}</div>
              <div style={{ fontFamily: 'var(--num)', fontSize: '17px', fontWeight: 700, color: 'var(--cream)', textDecoration: taken ? 'line-through' : 'none' }}>{money(x)}</div>
              {taken ? <div style={{ fontSize: '9.5px', color: 'var(--dim)' }}>taken</div> : null}
            </div>
          );
        })}
      </div>
    );
  }
  if (b.t === 'gaps') return (
    <div style={{ overflowX: 'auto', margin: '0 0 12px' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
        <thead><tr>{['Vertical', 'The gap line', 'Season to reference'].map((x) => <th key={x} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--dim)', fontWeight: 400, borderBottom: '1px solid var(--line2)', fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase' }}>{x}</th>)}</tr></thead>
        <tbody>{Object.entries(verticals || {}).filter(([k]) => k !== 'other').map(([k, v]) => (
          <tr key={k} style={{ background: k === current ? 'rgba(212,175,55,.1)' : 'transparent' }}>
            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--line)', color: k === current ? 'var(--gold)' : 'var(--cream)', verticalAlign: 'top' }}>{v.label}{k === current ? ' ←' : ''}</td>
            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--line)', color: 'var(--muted)', lineHeight: 1.55 }}>"{v.gap}"</td>
            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--line)', color: 'var(--dim)' }}>{v.season}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
  return null;
}
