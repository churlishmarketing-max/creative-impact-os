'use client';
/* ============================================================================
 * Spotlight → Close a Spot. The screen for right after a yes:
 *   1. who (someone in the pipeline, or a new business)
 *   2. the spot — the price and what's included fill in from the board
 *   3. their details
 *   4. send: one invoice + an email that explains it, with a Stripe pay button
 * When they pay, they become a member on their own (Stripe webhook) and EDITH's
 * welcome goes out: book the pre-production call, the prep questions, the
 * release form. Below: invoices still out, and who's paid.
 * ========================================================================== */
import React, { useEffect, useMemo, useState } from 'react';
import { SCOPE, spotTier } from '@/lib/spotlight-offer';

const MEMBER_STAGES = ['member', 'filming', 'filmed', 'delivered', 'published'];
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const copy = async (text, flash) => { try { await navigator.clipboard.writeText(text); flash && flash('COPIED ✓'); } catch { window.prompt('Copy this:', text); } };

const S = {
  lbl: { display: 'block', fontSize: '9px', letterSpacing: '.18em', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: '5px' },
  inp: { background: 'var(--deep)', border: '1px solid var(--line2)', color: 'var(--cream)', fontFamily: 'var(--mono)', fontSize: '12.5px', padding: '9px 11px', width: '100%' },
  panel: { background: 'var(--panel)', border: '1px solid var(--line)', padding: '16px 18px' },
  sec: { fontSize: '10px', letterSpacing: '.2em', color: 'var(--dim)', textTransform: 'uppercase', margin: '22px 0 10px' },
  note: { fontSize: '11px', color: 'var(--dim)', lineHeight: 1.6 },
  warn: { background: '#2a1a06', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '10px 12px', fontSize: '12px', lineHeight: 1.6, marginBottom: '12px' },
  btn: (on) => ({ background: on ? 'var(--red)' : 'transparent', border: '1px solid ' + (on ? 'var(--red)' : 'var(--line2)'), color: on ? 'var(--golddark)' : 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '10.5px', fontWeight: on ? 700 : 400, letterSpacing: '.1em', padding: '9px 13px', cursor: 'pointer', textTransform: 'uppercase' }),
  gold: { background: 'var(--gold)', border: '1px solid var(--gold)', color: 'var(--golddark)', fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 800, letterSpacing: '.1em', padding: '11px 16px', cursor: 'pointer', textTransform: 'uppercase' },
};
const EMPTY = { business: '', first_name: '', last_name: '', email: '', phone: '', film_date: '' };

function Field({ label, children, grow = '1 1 200px' }) {
  return <div style={{ flex: grow, minWidth: 0 }}><label style={S.lbl}>{label}</label>{children}</div>;
}

export default function CloseSpot({ prospects, cfg, stripe, act, busy, flash, initialId, onOpen }) {
  const [pid, setPid] = useState(initialId || '');
  const [f, setF] = useState(EMPTY);
  const [spot, setSpot] = useState(0);
  const [pv, setPv] = useState(null);
  const [done, setDone] = useState(null);
  const set = (patch) => { setF((x) => ({ ...x, ...patch })); setPv(null); };

  const p = prospects.find((x) => x.id === pid) || null;
  useEffect(() => {
    setDone(null); setPv(null);
    if (!p) { setF(EMPTY); setSpot(0); return; }
    const parts = String(p.owner_name || '').trim().split(/\s+/);
    setF({ business: p.business || '', first_name: p.first_name || parts[0] || '', last_name: parts.slice(1).join(' '), email: p.email || '', phone: p.phone || '', film_date: p.film_date || '' });
    setSpot(Number(p.spot_number) || 0);
  }, [pid]); // eslint-disable-line react-hooks/exhaustive-deps

  const prices = (cfg.prices || []).map(Number);
  const fs = Number(cfg.featureSpots) || 0;
  // Each spot: taken (a member holds it), out (an unpaid invoice to someone else), or open.
  const spots = useMemo(() => prices.map((price, i) => {
    const n = i + 1;
    const holder = prospects.find((x) => Number(x.spot_number) === n && x.member_at && x.stage !== 'no');
    const out = prospects.find((x) => x.id !== pid && Number(x.spot_number) === n && !x.member_at && x.deposit && !['paid', 'void'].includes(x.deposit.status) && x.stage !== 'no');
    return { n, price, tier: spotTier(n, fs), holder, out };
  }), [prospects, prices, fs, pid]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = spots.find((s) => s.n === spot) || null;
  const callable = prospects.filter((x) => !x.member_at && x.stage !== 'no').sort((a, b) => String(a.business).localeCompare(String(b.business)));
  const ready = chosen && !chosen.holder && !chosen.out && f.business.trim() && f.first_name.trim() && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.email.trim());

  const preview = async () => {
    const j = await act({ op: 'close_preview', spot, business: f.business, first_name: f.first_name });
    if (j.ok) setPv(j);
  };
  const submit = async (send) => {
    if (!ready) return;
    if (send && !window.confirm(`Email ${f.business} (${f.email}) the invoice for ${chosen.tier} Spot ${spot} — ${money(chosen.price)}?\n\nThe email explains what's included and has a Stripe pay button. When they pay, they become a member and EDITH sends their welcome.`)) return;
    const j = await act({ op: 'close', id: pid || null, spot, ...f, send }, send ? 'INVOICE SENT ✓' : 'INVOICE SAVED ✓');
    if (j.ok) { setDone(j); if (j.id) setPid(j.id); }
  };

  const out = prospects.filter((x) => x.deposit && !['paid', 'void'].includes(x.deposit.status) && !x.member_at && x.stage !== 'no');
  const paid = prospects.filter((x) => x.member_at && MEMBER_STAGES.includes(x.stage)).sort((a, b) => String(b.member_at).localeCompare(String(a.member_at))).slice(0, 10);

  return (
    <div>
      {!stripe ? <div style={S.warn}><b>Stripe isn’t connected yet</b>, so the invoice’s Pay button wouldn’t work — Send stays off until it is. You can still set everything up and save the invoice. To connect: put STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Vercel and redeploy.</div> : null}
      {!cfg.attorneyReviewed ? <div style={{ ...S.note, color: 'var(--gold)', marginBottom: '12px' }}>The agreement is still waiting on the attorney review, so no agreement goes out with the invoice yet (the invoice’s payment terms mention one). Once it’s ticked in Settings, the agreement goes with every invoice that has a film date.</div> : null}

      <div style={S.panel}>
        <div style={{ ...S.lbl, color: 'var(--gold)' }}>1 · Who said yes</div>
        <select style={{ ...S.inp, cursor: 'pointer' }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">+ A new business (type their details below)</option>
          {callable.map((x) => <option key={x.id} value={x.id}>{x.business}{x.owner_name ? ' · ' + x.owner_name : ''}{x.deposit && x.deposit.status !== 'void' ? ' · invoice ' + x.deposit.status : ''}</option>)}
        </select>

        <div style={{ ...S.lbl, color: 'var(--gold)', marginTop: '16px' }}>2 · The spot</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(128px,1fr))', gap: '8px' }}>
          {spots.map((s) => {
            const blocked = !!(s.holder || s.out);
            const on = s.n === spot;
            return (
              <button key={s.n} disabled={blocked} onClick={() => { setSpot(s.n); setPv(null); }} title={s.holder ? `Taken — ${s.holder.business}` : s.out ? `Invoice out to ${s.out.business}` : ''}
                style={{ textAlign: 'left', background: on ? 'rgba(200,16,46,.14)' : 'transparent', border: '1px solid ' + (on ? 'var(--red)' : s.tier === 'Feature' ? 'var(--gold)' : 'var(--line2)'), padding: '9px 11px', cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.45 : 1, fontFamily: 'var(--mono)' }}>
                <div style={{ fontSize: '9px', letterSpacing: '.14em', color: s.tier === 'Feature' ? 'var(--gold)' : 'var(--dim)', textTransform: 'uppercase' }}>Spot {s.n} · {s.tier}{s.n === 1 ? ' · lead' : ''}</div>
                <div style={{ fontFamily: 'var(--num)', fontSize: '19px', fontWeight: 700, color: 'var(--cream)', textDecoration: s.holder ? 'line-through' : 'none' }}>{money(s.price)}</div>
                <div style={{ fontSize: '9.5px', color: 'var(--dim)', minHeight: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.holder ? 'taken · ' + s.holder.business : s.out ? 'invoice out · ' + s.out.business : on ? 'selected' : 'open'}</div>
              </button>
            );
          })}
        </div>
        {chosen ? (
          <div style={{ marginTop: '10px', borderLeft: '2px solid var(--gold)', padding: '6px 12px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.65 }}>
            <b style={{ color: 'var(--cream)' }}>{chosen.tier} Spot {chosen.n} · {money(chosen.price)}</b> — paid in full at booking. Includes:
            <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>{(SCOPE[chosen.tier] || []).map((x) => <li key={x}>{x.replace(/ — included$/, '')}</li>)}</ul>
          </div>
        ) : null}

        <div style={{ ...S.lbl, color: 'var(--gold)', marginTop: '16px' }}>3 · Their details</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <Field label="Business *" grow="2 1 260px"><input style={S.inp} value={f.business} onChange={(e) => set({ business: e.target.value })} /></Field>
          <Field label="First name *"><input style={S.inp} value={f.first_name} onChange={(e) => set({ first_name: e.target.value })} /></Field>
          <Field label="Last name"><input style={S.inp} value={f.last_name} onChange={(e) => set({ last_name: e.target.value })} /></Field>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Field label="Email * — the invoice goes here" grow="2 1 260px"><input style={S.inp} type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Phone"><input style={S.inp} value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="Film date (if you set it on the call)"><input style={S.inp} type="date" value={f.film_date} onChange={(e) => set({ film_date: e.target.value })} /></Field>
        </div>

        <div style={{ ...S.lbl, color: 'var(--gold)', marginTop: '16px' }}>4 · Send it</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={S.btn(false)} disabled={!chosen || !!busy} onClick={preview}>Preview the email</button>
          <button style={S.btn(false)} disabled={!ready || !!busy} onClick={() => submit(false)} title="Creates the invoice and its pay link — no email">Save without sending</button>
          <button style={{ ...S.gold, opacity: ready && stripe ? 1 : 0.5 }} disabled={!ready || !stripe || !!busy} onClick={() => submit(true)} title={!stripe ? 'Connect Stripe first' : ''}>{busy === 'close' ? 'Sending…' : chosen ? `Send the invoice — ${money(chosen.price)}` : 'Send the invoice'}</button>
        </div>
        {!ready ? <div style={{ ...S.note, marginTop: '6px' }}>Needs a spot, the business, their first name, and an email.</div> : null}

        {pv ? (
          <div style={{ marginTop: '12px', border: '1px solid var(--line)', background: 'var(--deep)', padding: '12px 14px' }}>
            <div style={{ ...S.note, marginBottom: '6px' }}>From {cfg.caller || 'Emmanuel'} at hello@ · to {f.email || '[their email]'}</div>
            <div style={{ fontSize: '13px', color: 'var(--cream)', fontWeight: 700, marginBottom: '8px' }}>{pv.subject}</div>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--sans)', fontSize: '12.5px', lineHeight: 1.6, color: 'var(--muted)', margin: 0 }}>{pv.body}</pre>
          </div>
        ) : null}

        {done ? (
          <div style={{ marginTop: '12px', borderLeft: '2px solid ' + (done.sent ? 'var(--good)' : 'var(--gold)'), paddingLeft: '12px', fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.7 }}>
            {done.sent ? <div style={{ color: 'var(--good)' }}>Sent — invoice {done.number} is in {f.business}’s inbox. When it’s paid, they become a member and EDITH sends their welcome.</div> : <div style={{ color: 'var(--gold)' }}>{done.warning || `Saved — invoice ${done.number}. Nothing was emailed.`}</div>}
            <div>Pay link: <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => copy(done.link, flash)}>{done.link}</span> (click to copy)</div>
          </div>
        ) : null}
      </div>

      <div style={S.sec}>Invoices out — waiting on payment ({out.length})</div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {out.map((x) => (
          <div key={x.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', padding: '9px 4px', borderBottom: '1px solid var(--line)', fontSize: '12px' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 700, minWidth: '180px', cursor: 'pointer' }} onClick={() => onOpen && onOpen(x.id)}>{x.business}</span>
            <span style={{ color: 'var(--muted)' }}>{x.spot_number ? `Spot ${x.spot_number}` : '—'} · {x.deposit.amount ? money(x.deposit.amount) : ''} · {x.deposit.number} · {x.deposit.status}</span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              <button style={{ ...S.btn(false), padding: '5px 9px', fontSize: '9.5px' }} onClick={() => copy(x.deposit.link, flash)}>Copy pay link</button>
              <button style={{ ...S.btn(false), padding: '5px 9px', fontSize: '9.5px' }} disabled={!!busy || !stripe} onClick={() => window.confirm(`Email ${x.business} the invoice again?`) && act({ op: 'invoice_resend', id: x.id }, 'RESENT ✓')}>Resend</button>
              <button style={{ ...S.btn(false), padding: '5px 9px', fontSize: '9.5px' }} disabled={!!busy} onClick={() => window.confirm(`Cancel ${x.business}'s invoice ${x.deposit.number}? The spot goes back on the board.`) && act({ op: 'invoice_cancel', id: x.id }, 'CANCELLED — SPOT RELEASED')}>Cancel</button>
            </span>
          </div>
        ))}
        {!out.length ? <div style={{ ...S.note, padding: '10px 0' }}>No invoices waiting.</div> : null}
      </div>

      <div style={S.sec}>Paid — members ({paid.length})</div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        {paid.map((x) => (
          <div key={x.id} onClick={() => onOpen && onOpen(x.id)} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '9px 4px', borderBottom: '1px solid var(--line)', fontSize: '12px', cursor: 'pointer' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 700, minWidth: '180px' }}>{x.business}</span>
            <span style={{ color: 'var(--good)' }}>{x.spot_number ? `Spot ${x.spot_number}` : 'member'}</span>
            <span style={{ color: x.film_date ? 'var(--muted)' : 'var(--gold)' }}>{x.film_date ? `films ${x.film_date}` : 'film date not set yet'}</span>
            <span style={{ color: 'var(--muted)' }}>{x.q_returned_at ? '★ questions back' : x.q_sent_at ? 'welcome sent' : 'welcome not sent'}</span>
            <span style={{ color: 'var(--muted)' }}>{x.releases || 0} release{x.releases === 1 ? '' : 's'}</span>
          </div>
        ))}
        {!paid.length ? <div style={{ ...S.note, padding: '10px 0' }}>Nobody’s paid yet.</div> : null}
      </div>
      <div style={{ ...S.note, marginTop: '10px' }}>After payment: EDITH’s welcome goes out on its own (pre-production call link, prep questions, release form). Lock the film date on the pre-production call and set it on their card — the prep note and day-before email run off it.</div>
    </div>
  );
}
