'use client';
/* ============================================================================
 * Spotlight → Prospects → "Import a spreadsheet".
 * Reads a CSV / TSV / Excel (.xlsx) file — or pasted rows — in the browser,
 * guesses which column is which (you can change every guess), previews the
 * result, and sends clean rows to /api/spotlight (op: import_rows). Nothing
 * is overwritten on people already in the pipeline: matches by email or
 * business name only get their EMPTY fields filled.
 * No libraries: .xlsx is a zip of XML, unzipped with the browser's own
 * DecompressionStream.
 * ========================================================================== */
import React, { useMemo, useState } from 'react';

/* ------------------------------ parsing ------------------------------ */
export function parseDelimited(text) {
  text = String(text || '').replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const count = (re) => (first.match(re) || []).length;
  const delim = count(/\t/g) > count(/,/g) ? '\t' : count(/;/g) > count(/,/g) ? ';' : ',';
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"' && cell === '') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

async function unzip(buf) {
  const dv = new DataView(buf); const u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('That file isn’t a valid .xlsx.');
  const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const files = {};
  for (let k = 0; k < n && dv.getUint32(p, true) === 0x02014b50; k++) {
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    files[new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen))] = { method: dv.getUint16(p + 10, true), size: dv.getUint32(p + 20, true), off: dv.getUint32(p + 42, true) };
    p += 46 + nlen + xlen + clen;
  }
  return async (name) => {
    const f = files[name]; if (!f) return null;
    const start = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true);
    const data = u8.subarray(start, start + f.size);
    if (f.method === 0) return new TextDecoder().decode(data);
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  };
}
const colIndex = (letters) => { let n = 0; for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

export async function parseXlsx(buf) {
  const read = await unzip(buf);
  const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const [wb, rels] = await Promise.all([read('xl/workbook.xml'), read('xl/_rels/workbook.xml.rels')]);
  if (wb && rels) {
    const first = xml(wb).getElementsByTagName('sheet')[0];
    const rid = first && first.getAttribute('r:id');
    const rel = Array.from(xml(rels).getElementsByTagName('Relationship')).find((r) => r.getAttribute('Id') === rid);
    if (rel) { const t = rel.getAttribute('Target') || ''; sheetPath = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''); }
  }
  const ss = await read('xl/sharedStrings.xml');
  const shared = ss ? Array.from(xml(ss).getElementsByTagName('si')).map((si) => Array.from(si.getElementsByTagName('t')).map((t) => t.textContent).join('')) : [];
  const sheet = await read(sheetPath);
  if (!sheet) throw new Error('Couldn’t find the first sheet in that file.');
  const rows = [];
  for (const r of Array.from(xml(sheet).getElementsByTagName('row'))) {
    const out = [];
    for (const c of Array.from(r.getElementsByTagName('c'))) {
      const col = colIndex((c.getAttribute('r') || '').replace(/\d+/g, ''));
      const t = c.getAttribute('t'); const v = c.getElementsByTagName('v')[0];
      const val = t === 's' ? (shared[Number(v && v.textContent)] ?? '') : t === 'inlineStr' ? Array.from(c.getElementsByTagName('t')).map((x) => x.textContent).join('') : (v ? v.textContent : '');
      out[col >= 0 ? col : out.length] = val;
    }
    rows.push(Array.from(out, (x) => (x == null ? '' : String(x))));
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

/* ------------------------------ mapping ------------------------------ */
const FIELDS = [
  ['', '— skip this column —'], ['business', 'Business *'], ['owner_name', 'Owner / contact name'], ['first_name', 'First name'], ['last_name', 'Last name'],
  ['email', 'Email'], ['phone', 'Phone'], ['website', 'Website'], ['suburb', 'Neighborhood / city'], ['vertical', 'Vertical / industry'],
  ['reviews', 'Google reviews'], ['years', 'Years in business'], ['founded', 'Year founded'], ['specific_detail', 'Specific detail (EDITH 1-1 opener)'], ['notes', 'Notes'],
];
const GUESS = [
  ['business', /^(business|company|business name|company name|account|account name|organi[sz]ation|name of business|store|brand)$/i, /business|company|organi[sz]ation/i],
  ['email', /^e-?mail( address)?$/i, /e-?mail/i],
  ['phone', /^(phone|phone number|mobile|cell|telephone|tel)$/i, /phone|mobile|cell\b/i],
  ['website', /^(website|web|url|site|domain|web site)$/i, /website|url|domain/i],
  ['first_name', /^first( name)?$/i, /^first/i],
  ['last_name', /^(last|surname)( name)?$/i, /^last|surname/i],
  ['owner_name', /^(owner|owner name|contact|contact name|full name|name|decision maker)$/i, /owner|contact name|full name/i],
  ['suburb', /^(suburb|neighbou?rhood|area|city|town|location)$/i, /suburb|neighbou?rhood|city\b|area\b/i],
  ['vertical', /^(vertical|industry|category|niche|type|business type)$/i, /industry|vertical|category|niche/i],
  ['reviews', /^(reviews?|google reviews|review count|# ?reviews|number of reviews)$/i, /reviews?\b/i],
  ['founded', /^(founded|year founded|established|since|est\.?)$/i, /founded|established/i],
  ['years', /^(years|years in business|yrs)$/i, /years/i],
  ['specific_detail', /^(specific detail|detail|hook|opener|personali[sz]ation|first line|icebreaker)$/i, /specific.?detail|personali[sz]|icebreaker|opener/i],
  ['notes', /^(notes?|comments?|description)$/i, /notes?\b|comment/i],
];
export function guessMapping(headers) {
  const map = headers.map(() => ''); const used = new Set();
  for (const pass of [1, 2]) {
    for (const [field, exact, fuzzy] of GUESS) {
      if (used.has(field)) continue;
      const i = headers.findIndex((h, j) => !map[j] && (pass === 1 ? exact.test(String(h).trim()) : fuzzy && fuzzy.test(String(h).trim())));
      if (i >= 0) { map[i] = field; used.add(field); }
    }
  }
  return map;
}
const VERTICAL_WORDS = [['hvac', /hvac|heating|cooling|air cond|furnace/i], ['roofing', /roof/i], ['pest', /pest|extermin|termite/i], ['landscaping', /landscap|lawn|hardscape|yard|tree/i], ['builders', /build|construct|contractor|remodel|renovat/i], ['auto', /auto|car\b|mechanic|tire|collision|body shop/i], ['medspa', /med ?spa|aesthetic|botox|skin|spa\b/i], ['law', /law|attorney|legal/i], ['insurance', /insur/i]];
function toVertical(v, verticals) {
  const s = String(v || '').trim(); if (!s) return '';
  if (verticals[s.toLowerCase()]) return s.toLowerCase();
  const hit = VERTICAL_WORDS.find(([k, re]) => verticals[k] && re.test(s));
  return hit ? hit[0] : '';
}
export function buildRows(body, map, verticals) {
  const year = new Date().getFullYear();
  return body.map((r) => {
    const o = {};
    map.forEach((f, i) => { if (f) { const v = String(r[i] ?? '').trim(); if (v) o[f] = o[f] ? o[f] + ' ' + v : v; } });
    const owner = o.owner_name || [o.first_name, o.last_name].filter(Boolean).join(' ');
    const digits = (x) => { const m = String(x || '').replace(/,/g, '').match(/\d+/); return m ? Number(m[0]) : null; };
    let years = digits(o.years);
    const founded = digits(o.founded);
    if (years == null && founded && founded > 1800 && founded <= year) years = year - founded;
    if (years != null && years > 1800 && years <= year) years = year - years; // a founding year typed into "years"
    return {
      business: o.business || '', owner_name: owner || '', email: (o.email || '').toLowerCase(), phone: o.phone || '', website: o.website || '',
      suburb: o.suburb || '', vertical: toVertical(o.vertical, verticals), reviews: digits(o.reviews) ?? '', years: years ?? '',
      specific_detail: o.specific_detail || '', notes: [o.notes, o.vertical && !toVertical(o.vertical, verticals) ? `Industry: ${o.vertical}` : ''].filter(Boolean).join(' · '),
    };
  });
}

/* ------------------------------ the panel ------------------------------ */
const S = {
  lbl: { display: 'block', fontSize: '9px', letterSpacing: '.18em', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: '5px' },
  inp: { background: 'var(--deep)', border: '1px solid var(--line2)', color: 'var(--cream)', fontFamily: 'var(--mono)', fontSize: '12px', padding: '7px 9px', width: '100%' },
  note: { fontSize: '11px', color: 'var(--dim)', lineHeight: 1.6 },
  gold: { background: 'var(--gold)', border: '1px solid var(--gold)', color: 'var(--golddark)', fontFamily: 'var(--mono)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.1em', padding: '8px 12px', cursor: 'pointer', textTransform: 'uppercase' },
  btn: { background: 'transparent', border: '1px solid var(--line2)', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '10.5px', letterSpacing: '.1em', padding: '8px 12px', cursor: 'pointer', textTransform: 'uppercase' },
};

export default function SheetImport({ verticals, act, flash }) {
  const [grid, setGrid] = useState(null); // { headers, body, name }
  const [map, setMap] = useState([]);
  const [paste, setPaste] = useState('');
  const [source, setSource] = useState('cold list');
  const [cold, setCold] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = (rows, name) => {
    setErr(''); setResult(null);
    if (!rows.length) { setErr('No rows found.'); return; }
    const h = rows.findIndex((r) => r.filter((c) => String(c).trim()).length >= 2);
    const headers = rows[h < 0 ? 0 : h].map((c) => String(c).trim());
    const body = rows.slice((h < 0 ? 0 : h) + 1);
    setGrid({ headers, body, name }); setMap(guessMapping(headers));
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
  const withDetail = good.filter((r) => r.specific_detail).length;

  const run = async () => {
    if (!good.length) return;
    if (cold && !window.confirm(`Tag all ${good.length} as cold prospects? EDITH may cold-email every one of them that has a specific detail — ${withDetail} do right now — up to your daily cap, once the mailing address is set.`)) return;
    setBusy(true); setErr('');
    const sum = { added: 0, updated: 0, skipped: rows.length - good.length };
    for (let i = 0; i < good.length; i += 250) {
      const j = await act({ op: 'import_rows', rows: good.slice(i, i + 250), source, cold });
      if (!j.ok) { setErr(j.error || 'Import stopped.'); break; }
      sum.added += j.added || 0; sum.updated += j.updated || 0; sum.skipped += j.skipped || 0;
    }
    setBusy(false); setResult(sum);
    flash(`IMPORTED — ${sum.added} NEW, ${sum.updated} UPDATED`);
  };

  return (
    <div>
      {!grid ? (
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 260px' }}>
            <label style={S.lbl}>Upload a spreadsheet — .xlsx, .csv, or .tsv</label>
            <input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" style={{ ...S.inp, padding: '6px' }} onChange={(e) => onFile(e.target.files && e.target.files[0])} />
            <div style={{ ...S.note, marginTop: '6px' }}>First row = column names. Google Sheets: File → Download → .xlsx or .csv.</div>
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
            <div style={{ fontSize: '12.5px', color: 'var(--cream)' }}>{grid.name}: <b>{good.length}</b> businesses{rows.length - good.length ? <span style={{ color: 'var(--gold)' }}> · {rows.length - good.length} rows have no business name and will be skipped</span> : null}</div>
            <button style={S.btn} onClick={() => { setGrid(null); setPaste(''); setResult(null); }}>Start over</button>
          </div>
          <div style={{ ...S.lbl, marginTop: '12px' }}>Which column is which — change any guess</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
            {grid.headers.map((h, i) => (
              <div key={i}>
                <div style={{ fontSize: '11px', color: map[i] ? 'var(--cream)' : 'var(--dim)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h}>{h || `(column ${i + 1})`}</div>
                <select style={{ ...S.inp, cursor: 'pointer' }} value={map[i]} onChange={(e) => setMap((m) => m.map((x, j) => (j === i ? e.target.value : x === e.target.value && e.target.value ? '' : x)))}>
                  {FIELDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ ...S.lbl, marginTop: '14px' }}>Preview — first {Math.min(6, good.length)}</div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--line)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11.5px' }}>
              <thead><tr>{['Business', 'Owner', 'Email', 'Phone', 'Where', 'Vertical', 'Reviews', 'Years', 'Detail'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--dim)', fontWeight: 400, borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
              <tbody>{good.slice(0, 6).map((r, i) => (
                <tr key={i}>{[r.business, r.owner_name, r.email, r.phone, r.suburb, r.vertical, r.reviews, r.years, r.specific_detail].map((v, j) => <td key={j} style={{ padding: '6px 8px', color: 'var(--muted)', borderBottom: '1px solid var(--line)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(v)}>{v === '' ? '—' : String(v)}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '12px' }}>
            <div style={{ flex: '0 1 170px' }}>
              <label style={S.lbl}>Source</label>
              <select style={{ ...S.inp, cursor: 'pointer' }} value={source} onChange={(e) => setSource(e.target.value)}>{['cold list', 'warm', 'referral', 'ad', 'event', 'walk-in'].map((x) => <option key={x}>{x}</option>)}</select>
            </div>
            <label style={{ ...S.note, flex: '1 1 320px', display: 'flex', gap: '8px', alignItems: 'flex-start', color: cold ? 'var(--cream)' : 'var(--dim)' }}>
              <input type="checkbox" checked={cold} onChange={(e) => setCold(e.target.checked)} style={{ marginTop: '2px' }} />
              <span>Tag them as <b>cold prospects</b> — EDITH may send her cold sequence to anyone tagged who has a specific detail{withDetail ? ` (${withDetail} in this sheet do)` : ''}. Only tick this for people it’s okay to cold-email.</span>
            </label>
            <button style={S.gold} disabled={busy || !good.length} onClick={run}>{busy ? 'Importing…' : `Import ${good.length}`}</button>
          </div>
          <div style={{ ...S.note, marginTop: '8px' }}>Already in the pipeline (same email or business name)? Only their empty fields get filled — nothing you typed is overwritten, and nobody is added twice.</div>
          {result ? <div style={{ fontSize: '12.5px', color: 'var(--good)', marginTop: '10px' }}>Done — {result.added} added, {result.updated} updated, {result.skipped} skipped.</div> : null}
        </div>
      )}
      {err ? <div style={{ fontSize: '12px', color: 'var(--red)', marginTop: '8px' }}>{err}</div> : null}
    </div>
  );
}
