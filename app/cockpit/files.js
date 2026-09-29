'use client';
/* ============================================================================
 * Reading files in the browser — no libraries. .xlsx and .docx are zip files of
 * XML, unzipped with the browser's own DecompressionStream; CSV/TSV are parsed
 * by hand. Used by the spreadsheet importer and by EDITH's 📎 (header bar and
 * desk), which sends her the text instead of the raw file.
 * ========================================================================== */

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
  if (eocd < 0) throw new Error('That file isn’t a valid Office file (.xlsx / .docx).');
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
    const text = f.method === 0 ? new TextDecoder().decode(data) : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    return text.replace(/^﻿/, '');
  };
}

// Namespace-blind lookups: Excel writes <row>, other tools write <x:row>.
const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
const tags = (el, name) => Array.from(el.getElementsByTagNameNS('*', name));
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const colIndex = (letters) => { let n = 0; for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

export async function parseXlsx(buf) {
  const read = await unzip(buf);
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const [wb, rels] = await Promise.all([read('xl/workbook.xml'), read('xl/_rels/workbook.xml.rels')]);
  if (wb && rels) {
    const first = tags(xml(wb), 'sheet')[0];
    const rid = first && (first.getAttributeNS(REL_NS, 'id') || first.getAttribute('r:id'));
    const rel = tags(xml(rels), 'Relationship').find((r) => r.getAttribute('Id') === rid);
    if (rel) { const t = rel.getAttribute('Target') || ''; sheetPath = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''); }
  }
  const ss = await read('xl/sharedStrings.xml');
  const shared = ss ? tags(xml(ss), 'si').map((si) => tags(si, 't').map((t) => t.textContent).join('')) : [];
  const sheet = await read(sheetPath);
  if (!sheet) throw new Error('Couldn’t find the first sheet in that file.');
  const rows = [];
  for (const r of tags(xml(sheet), 'row')) {
    const out = [];
    for (const c of tags(r, 'c')) {
      const col = colIndex((c.getAttribute('r') || '').replace(/\d+/g, ''));
      const t = c.getAttribute('t'); const v = tags(c, 'v')[0];
      const val = t === 's' ? (shared[Number(v && v.textContent)] ?? '') : t === 'inlineStr' ? tags(c, 't').map((x) => x.textContent).join('') : (v ? v.textContent : '');
      out[col >= 0 ? col : out.length] = val;
    }
    rows.push(Array.from(out, (x) => (x == null ? '' : String(x))));
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

// A Word document as plain text: paragraphs on their own lines, table cells
// joined with " | ", list items bulleted.
export async function parseDocx(buf) {
  const read = await unzip(buf);
  const doc = await read('word/document.xml');
  if (!doc) throw new Error('That .docx has no document body.');
  const body = tags(xml(doc), 'body')[0];
  if (!body) return '';
  const paraText = (p) => {
    let s = '';
    for (const n of tags(p, '*')) {
      if (n.localName === 't') s += n.textContent;
      else if (n.localName === 'tab') s += '\t';
      else if (n.localName === 'br') s += '\n';
    }
    return (tags(p, 'numPr').length ? '• ' : '') + s;
  };
  const out = [];
  const walk = (el) => {
    for (const n of Array.from(el.children)) {
      if (n.localName === 'p') { const t = paraText(n); if (t.trim()) out.push(t); }
      else if (n.localName === 'tbl') {
        for (const tr of Array.from(n.children).filter((x) => x.localName === 'tr')) {
          const cells = Array.from(tr.children).filter((x) => x.localName === 'tc').map((tc) => tags(tc, 'p').map(paraText).filter((x) => x.trim()).join(' / '));
          if (cells.some((c) => c.trim())) out.push(cells.join(' | '));
        }
        out.push('');
      } else if (n.children && n.children.length) walk(n);
    }
  };
  walk(body);
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

export const toTsv = (rows) => rows.map((r) => r.map((c) => String(c ?? '').replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n');

// Anything the operator attaches, turned into what EDITH can read:
//   image / pdf → base64 (she sees it directly)
//   .docx       → its text
//   .xlsx / .csv / .tsv → the rows (she can import them) + a text copy
//   text-ish    → the text
export async function readForEdith(f) {
  const name = f.name || 'upload';
  const ext = (name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';
  const b64 = () => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Couldn’t read the file.')); r.readAsDataURL(f); });
  if (/^image\//.test(f.type) || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    if (f.size > 3.5 * 1024 * 1024) throw new Error('Images can be up to 3.5MB.');
    return { name, kind: 'image', media_type: f.type || 'image/png', data: await b64() };
  }
  if (f.type === 'application/pdf' || ext === 'pdf') {
    if (f.size > 3.5 * 1024 * 1024) throw new Error('PDFs can be up to 3.5MB — split it, or export the pages you need.');
    return { name, kind: 'pdf', media_type: 'application/pdf', data: await b64() };
  }
  if (f.size > 15 * 1024 * 1024) throw new Error('That file is over 15MB.');
  if (ext === 'docx') return { name, kind: 'text', text: await parseDocx(await f.arrayBuffer()) };
  if (ext === 'doc') throw new Error('That’s the old Word format (.doc) — open it in Word or Google Docs and save it as .docx or PDF.');
  if (ext === 'xls') throw new Error('That’s the old Excel format (.xls) — open it in Excel or Google Sheets and save it as .xlsx or .csv.');
  if (ext === 'xlsx' || ext === 'csv' || ext === 'tsv') {
    const rows = ext === 'xlsx' ? await parseXlsx(await f.arrayBuffer()) : parseDelimited(await f.text());
    if (!rows.length) throw new Error('No rows in that sheet.');
    return { name, kind: 'sheet', rows: rows.slice(0, 2000).map((r) => r.slice(0, 40).map((c) => String(c ?? '').slice(0, 500))), text: toTsv(rows.slice(0, 400)) };
  }
  return { name, kind: 'text', text: await f.text() };
}

export const EDITH_ACCEPT = 'image/*,application/pdf,.pdf,.docx,.doc,.xlsx,.xls,.csv,.tsv,.txt,.md,.json';
