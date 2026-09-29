'use client';
/* ============================================================================
 * Spotlight → Prospects → "Import a spreadsheet".
 * Reads a CSV / TSV / Excel (.xlsx) file — or pasted rows — in the browser,
 * finds the header row (a title above it is fine), guesses which column is
 * which (you can change every guess), previews the result — including who
 * EDITH would email, who goes on the call list, and her first email — and
 * sends clean rows to /api/spotlight (op: import_rows). Nothing is overwritten
 * on people already in the pipeline: matches by email or business name only
 * get their EMPTY fields filled. The mapping rules live in lib/sheet-map.ts,
 * shared with EDITH's own importer.
 * ========================================================================== */
import React, { useMemo, useState } from 'react';
import { FIELDS, guessMapping, headerRowIndex, buildRows } from '@/lib/sheet-map';
import { parseDelimited, parseXlsx } from './files';

const S = {
  lbl: { display: 'block', fontSize: '9px', letterSpacing: '.18em', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: '5px' },
  inp: { background: 'var(--deep)', border: '1px solid var(--line2)', color: 'var(--cream)', fontFamily: 'var(--mono)', fontSize: '12px', padding: '7px 9px', width: '100%' },
  note: { fontSize: '11px', color: 'var(--dim)', lineHeight: 1.6 },
  gold: { background: 'var(--gold)', border: '1px solid var(--gold)', color: 'var(--golddark)', fontFamily: 'var(--mono)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.1em', padding: '8px 12px', cursor: 'pointer', textTransform: 'uppercase' },
  btn: { background: 'transparent', border: '1px solid var(--line2)', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '10.5px', letterSpacing: '.1em', padding: '8px 12px', cursor: 'pointer', textTransform: 'uppercase' },
  pill: (c) => ({ fontSize: '10px', color: c, border: '1px solid ' + c, padding: '1px 6px', whiteSpace: 'nowrap' }),
};

// What happens to a row if it's imported with "cold" ticked.
const lane = (r) => (r.hold ? 'hold' : r.email ? 'email' : r.phone ? 'call' : 'none');
const LANE = { email: ['✉ EDITH', 'var(--good)'], call: ['☎ call list', 'var(--gold)'], hold: ['⚠ check first', 'var(--red)'], none: ['no contact', 'var(--dim)'] };

export default function SheetImport({ verticals, act, flash }) {
  const [grid, setGrid] = useState(null); // { headers, body, name, headerRow }
  const [map, setMap] = useState([]);
  const [paste, setPaste] = useState('');
  const [source, setSource] = useState('cold list');
  const [cold, setCold] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [pv, setPv] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const load = (rows, name) => {
    setErr(''); setResult(null); setPv(null);
    if (!rows.length) { setErr('No rows found.'); return; }
    const h = headerRowIndex(rows);
    const headers = rows[h].map((c) => String(c).trim());
    const body = rows.slice(h + 1).filter((r) => r.some((c) => String(c).trim()));
    setGrid({ headers, body, name, headerRow: h }); setMap(guessMapping(headers));
  };
  const onFile = async (file) => {
    if (!file) return;
    try {
      if (/\.xlsx$/i.test(file.name)) load(await parseXlsx(await file.arrayBuffer()), file.name);
      else if (/\.xls$/i.test(file.name)) setErr('That’s the old .xls format — open it in Excel or Google Sheets and save as .xlsx or .csv.');
      else load(parseDelimited(await file.text()), file.name);
    } catch (e) { setErr(String((e && e.message) || e)); }
  };

  const rows = useMemo(() => (grid ? buildRows(grid.body, map, verticals || {}) : []), [grid, map, verticals]);
  const good = rows.filter((r) => r.business);
  const count = (k) => good.filter((r) => lane(r) === k).length;
  const toEmail = count('email');
  const firstEmail = good.find((r) => lane(r) === 'email');

  const preview = async () => {
    if (!firstEmail) return;
    const j = await act({ op: 'cold_preview', row: firstEmail });
    if (j.ok) setPv(j);
  };

  const run = async () => {
    if (!good.length) return;
    if (cold && !window.confirm(`Import ${good.length} businesses and start EDITH's cold emails to the ${toEmail} with an email address?\n\nShe sends from hello@, Mon–Sat 8 AM–6 PM ET, up to your daily cold cap — then a follow-up 3 days and 7 days after each first email. A reply, booking, or unsubscribe stops her.${count('hold') ? `\n\n${count('hold')} flagged “check first” are imported but NOT emailed.` : ''}`)) return;
    setBusy(true); setErr('');
    const sum = { added: 0, updated: 0, skipped: rows.length - good.length, queued: 0, callList: 0, held: [], badEmail: [], edith: null };
    for (let i = 0; i < good.length; i += 250) {
      const j = await act({ op: 'import_rows', rows: good.slice(i, i + 250), source, cold });
      if (!j.ok) { setErr(j.error || 'Import stopped.'); break; }
      for (const k of ['added', 'updated', 'skipped', 'queued', 'callList']) sum[k] += j[k] || 0;
      sum.held.push(...(j.held || [])); sum.badEmail.push(...(j.badEmail || [])); sum.edith = j.edith || sum.edith;
    }
    setBusy(false); setResult(sum);
    flash(`IMPORTED — ${sum.added} NEW, ${sum.updated} UPDATED${cold ? `, ${sum.queued} QUEUED FOR EDITH` : ''}`);
  };

  const shown = showAll ? good : good.slice(0, 8);
  return (
    <div>
      {!grid ? (
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 260px' }}>
            <label style={S.lbl}>Upload a spreadsheet — .xlsx, .csv, or .tsv</label>
            <input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" style={{ ...S.inp, padding: '6px' }} onChange={(e) => onFile(e.target.files && e.target.files[0])} />
            <div style={{ ...S.note, marginTop: '6px' }}>A title or totals row above the column names is fine. Google Sheets: File → Download → .xlsx or .csv. Or attach it to EDITH (📎 in the top bar) and tell her to import it.</div>
          </div>
          <div style={{ flex: '1 1 260px' }}>
            <label style={S.lbl}>…or paste rows (copied straight from a sheet)</label>
            <textarea style={{ ...S.inp, minHeight: '64px' }} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Business\tOwner\tEmail\tPhone\nQueen City Roasters\tDana Whitfield\tdana@…'} />
            <button style={{ ...S.btn, marginTop: '6px' }} disabled={!paste.trim()} onClick={() => load(parseDelimited(paste), 'pasted rows')}>Read the rows</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--cream)' }}>
              {grid.name}: <b>{good.length}</b> businesses{grid.headerRow ? <span style={{ color: 'var(--dim)' }}> · column names found on row {grid.headerRow + 1}</span> : null}
              {rows.length - good.length ? <span style={{ color: 'var(--gold)' }}> · {rows.length - good.length} rows have no business name and will be skipped</span> : null}
            </div>
            <button style={S.btn} onClick={() => { setGrid(null); setPaste(''); setResult(null); setPv(null); }}>Start over</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            <span style={S.pill('var(--good)')}>{toEmail} have an email</span>
            <span style={S.pill('var(--gold)')}>{count('call')} phone only → call list</span>
            {count('hold') ? <span style={S.pill('var(--red)')}>{count('hold')} the sheet says to check first</span> : null}
            {count('none') ? <span style={S.pill('var(--dim)')}>{count('none')} no email or phone</span> : null}
            {good.some((r) => r.vertical_guessed) ? <span style={S.pill('var(--dim)')}>vertical? = guessed from the name</span> : null}
          </div>

          <div style={{ ...S.lbl, marginTop: '12px' }}>Which column is which — change any guess</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
            {grid.headers.map((h, i) => (
              <div key={i}>
                <div style={{ fontSize: '11px', color: map[i] ? 'var(--cream)' : 'var(--dim)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h}>{h || `(column ${i + 1})`}</div>
                <select style={{ ...S.inp, cursor: 'pointer' }} value={map[i]} onChange={(e) => setMap((m) => m.map((x, j) => (j === i ? e.target.value : x === e.target.value && e.target.value ? '' : x)))}>
                  {FIELDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ ...S.lbl, marginTop: '14px' }}>Preview — {showAll ? `all ${good.length}` : `first ${Math.min(8, good.length)}`}</div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', maxHeight: showAll ? '420px' : 'none', overflowY: showAll ? 'auto' : 'visible' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11.5px' }}>
              <thead><tr>{['', 'Business', 'Email', 'Phone', 'Website', 'Vertical', 'Notes'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--dim)', fontWeight: 400, borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'var(--panel)' }}>{h}</th>)}</tr></thead>
              <tbody>{shown.map((r, i) => {
                const [l, c] = LANE[lane(r)];
                return (
                  <tr key={i}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)' }} title={r.hold || ''}><span style={S.pill(c)}>{l}</span></td>
                    {[r.business, r.email, r.phone, r.website.replace(/^https?:\/\//, ''), r.vertical ? r.vertical + (r.vertical_guessed ? '?' : '') : '', r.hold ? 'Check first — ' + r.hold : r.notes].map((v, j) => (
                      <td key={j} style={{ padding: '6px 8px', color: j === 0 ? 'var(--cream)' : 'var(--muted)', borderBottom: '1px solid var(--line)', maxWidth: j === 5 ? '320px' : '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(v)}>{v === '' ? '—' : String(v)}</td>
                    ))}
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          {good.length > 8 ? <button style={{ ...S.btn, marginTop: '6px', padding: '4px 8px', fontSize: '9.5px' }} onClick={() => setShowAll((x) => !x)}>{showAll ? 'Show fewer' : `Show all ${good.length}`}</button> : null}

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '14px' }}>
            <div style={{ flex: '0 1 170px' }}>
              <label style={S.lbl}>Source</label>
              <select style={{ ...S.inp, cursor: 'pointer' }} value={source} onChange={(e) => setSource(e.target.value)}>{['cold list', 'warm', 'referral', 'ad', 'event', 'walk-in'].map((x) => <option key={x}>{x}</option>)}</select>
            </div>
            <label style={{ ...S.note, flex: '1 1 340px', display: 'flex', gap: '8px', alignItems: 'flex-start', color: cold ? 'var(--cream)' : 'var(--dim)' }}>
              <input type="checkbox" checked={cold} onChange={(e) => setCold(e.target.checked)} style={{ marginTop: '2px' }} />
              <span><b>Start EDITH’s cold emails</b> to the {toEmail} with an email address — three emails over about a week, up to your daily cold cap, stopped by any reply, booking, or unsubscribe. The phone-only ones go on the call list (Call Script tab). Only tick this for businesses it’s okay to cold-email.</span>
            </label>
            <button style={S.gold} disabled={busy || !good.length} onClick={run}>{busy ? 'Importing…' : cold ? `Import ${good.length} + queue ${toEmail} emails` : `Import ${good.length}`}</button>
          </div>

          {firstEmail ? (
            <div style={{ marginTop: '12px' }}>
              <button style={S.btn} onClick={preview}>{pv ? 'Refresh the preview' : `Preview EDITH’s first email (to ${firstEmail.business})`}</button>
              {pv ? (
                <div style={{ marginTop: '8px', border: '1px solid var(--line)', background: 'var(--deep)', padding: '12px 14px' }}>
                  <div style={{ ...S.note, marginBottom: '6px' }}>From {pv.from} · to {firstEmail.email} · {pv.template}</div>
                  <div style={{ fontSize: '13px', color: 'var(--cream)', fontWeight: 700, marginBottom: '8px' }}>{pv.subject}</div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--sans)', fontSize: '12.5px', lineHeight: 1.6, color: 'var(--muted)', margin: 0 }}>{pv.text}</pre>
                  {pv.missing && pv.missing.length ? <div style={{ fontSize: '11.5px', color: 'var(--red)', marginTop: '8px' }}>EDITH would HOLD this one until you add: {pv.missing.join('; ')}. (EDITH → Settings)</div> : null}
                  {!pv.live ? <div style={{ fontSize: '11.5px', color: 'var(--gold)', marginTop: '6px' }}>EDITH is OFF — she’ll log these instead of sending until she’s turned on.</div> : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ ...S.note, marginTop: '10px' }}>Already in the pipeline (same email or business name)? Only their empty fields get filled — nothing you typed is overwritten, and nobody is added twice. Before EDITH writes to anyone, the OS checks their email’s domain can receive mail; ones that can’t are imported but left off her list.</div>

          {result ? (
            <div style={{ marginTop: '12px', borderLeft: '2px solid var(--good)', paddingLeft: '12px', fontSize: '12.5px', lineHeight: 1.7, color: 'var(--muted)' }}>
              <div style={{ color: 'var(--good)' }}>Done — {result.added} added, {result.updated} updated, {result.skipped} skipped.</div>
              {cold ? <div><b style={{ color: 'var(--cream)' }}>{result.queued}</b> queued for EDITH{result.edith && result.edith.cap ? ` — at ${result.edith.cap} new a day` : ''}. {result.callList} on the call list.</div> : null}
              {cold && result.edith && !result.edith.address ? <div style={{ color: 'var(--red)' }}>Her emails are HOLDING until you add the mailing address (EDITH → Settings) — the law requires it in every cold email. Add it and they start going out.</div> : null}
              {cold && result.edith && !result.edith.live ? <div style={{ color: 'var(--gold)' }}>EDITH is OFF — she’ll log instead of send.</div> : null}
              {result.held.length ? <div><span style={{ color: 'var(--red)' }}>Not emailed — the sheet says to check first:</span> {result.held.map((h) => h.business).join(', ')}</div> : null}
              {result.badEmail.length ? <div><span style={{ color: 'var(--red)' }}>Not emailed — the address can’t receive mail:</span> {result.badEmail.map((h) => `${h.business} (${h.email})`).join(', ')}</div> : null}
            </div>
          ) : null}
        </div>
      )}
      {err ? <div style={{ fontSize: '12px', color: 'var(--red)', marginTop: '8px' }}>{err}</div> : null}
    </div>
  );
}
