// Importing a list of businesses into the Spotlight pipeline (server-only).
// One code path for both doors: the spreadsheet importer on the Prospects
// screen (/api/spotlight op import_rows) and EDITH importing a sheet attached
// in her chat (spotlight_import_sheet).
//
// New rows become Prospects. A row that matches someone already here (email,
// else business name) only fills that prospect's EMPTY fields — nothing typed
// by a human is overwritten and nobody is added twice.
//
// "cold" = these are businesses it's okay to cold-email: rows with a usable
// email get the cold_prospect tag, which starts EDITH's cold sequence (SEQ1)
// under the daily cap. A row does NOT get the tag (it's imported, but EDITH
// leaves it alone) when:
//   - it has no email — it's on the call list instead;
//   - the sheet itself says to verify it first ("verify before outreach");
//   - its email domain doesn't exist or has no mail server — a bounce hurts
//     the sending domain for every other email EDITH sends.
import { promises as dns } from "node:dns";
import type { getAdminClient } from "@/lib/supabase/admin";
import { VERTICALS } from "@/lib/spotlight";
import { edithEmit, edithTouch, getEdithConfig } from "@/lib/edith/server";

type Admin = NonNullable<ReturnType<typeof getAdminClient>>;
type Row = Record<string, unknown>;

export type ImportSummary = {
  ok: true;
  added: number; updated: number; skipped: number;
  queued: number;          // tagged cold with a good email — EDITH will write to them
  callList: number;        // a phone, no usable email
  held: Array<{ business: string; reason: string }>;
  badEmail: Array<{ business: string; email: string; reason: string }>;
  edith: { live: boolean; address: boolean; cap: number };
};

const TEXT = ["business", "owner_name", "email", "phone", "website", "vertical", "suburb", "notes"] as const;
const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const FREEMAIL = new Set(["gmail.com", "googlemail.com", "yahoo.com", "aol.com", "hotmail.com", "outlook.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com", "comcast.net", "att.net", "bellsouth.net", "verizon.net", "protonmail.com", "proton.me"]);

function clean(raw: Row): Row {
  const row: Row = {};
  for (const k of TEXT) {
    const v = raw[k];
    row[k] = v == null || String(v).trim() === "" ? null : String(v).trim().slice(0, k === "notes" ? 4000 : 300);
  }
  for (const k of ["reviews", "years"] as const) {
    const v = raw[k];
    row[k] = v === "" || v == null || isNaN(Number(v)) ? null : Math.max(0, Math.round(Number(v)));
  }
  if (row.email) row.email = String(row.email).toLowerCase().replace(/^mailto:/, "");
  if (row.email && !EMAIL_OK.test(String(row.email))) row.email = null;
  if (row.vertical && !VERTICALS[String(row.vertical)]) row.vertical = null;
  return row;
}

// null = mail can be delivered (or we couldn't tell — never block on our own
// network trouble); a string = why it can't.
async function mailServer(domain: string): Promise<string | null> {
  const within = <T,>(p: Promise<T>) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), 4000))]);
  let code = "";
  try { if ((await within(dns.resolveMx(domain))).length) return null; code = "ENODATA"; }
  catch (e) { code = String((e as { code?: string }).code || ""); }
  if (code === "ENOTFOUND") return "that email's domain doesn't exist — it would bounce";
  if (code === "ENODATA") {
    // No MX record: mail falls back to the domain's own address (RFC 5321).
    try { if ((await within(dns.resolve4(domain))).length) return null; } catch { /* fall through */ }
    return "that email's domain has no mail server — it would bounce";
  }
  if (code === "ESERVFAIL") return "that email's domain isn't answering (broken DNS) — check it before emailing";
  return null;
}

export async function importProspects(admin: Admin, uid: string, rows: Row[], opts: { source?: string; cold?: boolean; by?: string }): Promise<ImportSummary | { ok: false; error: string }> {
  const list = rows.slice(0, 500);
  const source = String(opts.source || "import").slice(0, 40);
  const cold = !!opts.cold;
  const { data: have, error: hErr } = await admin.from("spotlight_prospects").select("*").eq("user_id", uid);
  if (hErr) return { ok: false, error: /does not exist|schema cache/i.test(hErr.message) ? "The Spotlight table doesn't exist yet — run supabase/22_spotlight.sql in the Supabase SQL editor." : hErr.message };

  const key = (s: unknown) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const byEmail = new Map<string, Row>();
  const byBiz = new Map<string, Row>();
  for (const p of have || []) { if (p.email) byEmail.set(key(p.email), p); if (p.business) byBiz.set(key(p.business), p); }

  // Check each email domain once, only when EDITH might write to it.
  const bad = new Map<string, string | null>();
  if (cold) {
    const domains = [...new Set(list.map((r) => clean(r).email as string | null).filter(Boolean).map((e) => e!.split("@")[1]).filter((d) => !FREEMAIL.has(d)))];
    for (let i = 0; i < domains.length; i += 10) {
      const chunk = domains.slice(i, i + 10);
      const res = await Promise.all(chunk.map(mailServer));
      chunk.forEach((d, j) => bad.set(d, res[j]));
    }
  }

  const summary: ImportSummary = { ok: true, added: 0, updated: 0, skipped: 0, queued: 0, callList: 0, held: [], badEmail: [], edith: { live: false, address: false, cap: 0 } };
  const inserts: Row[] = [];
  const touched: string[] = [];

  for (const raw of list) {
    const row = clean(raw);
    const detail = String(raw.specific_detail || "").trim().slice(0, 1000);
    if (!row.business) { summary.skipped++; continue; }
    const email = row.email ? String(row.email) : "";
    const sheetHold = raw.hold ? String(raw.hold).slice(0, 300) : "";
    const domainIssue = email ? bad.get(email.split("@")[1]) || null : null;
    let why = "";
    if (cold && sheetHold) { why = sheetHold; summary.held.push({ business: String(row.business), reason: sheetHold }); }
    else if (cold && domainIssue) { why = domainIssue; summary.badEmail.push({ business: String(row.business), email, reason: domainIssue }); }
    const coldOk = cold && !!email && !why;
    if (!email && row.phone) summary.callList++;
    if (why) row.notes = [row.notes, `EDITH isn't emailing them: ${why}`].filter(Boolean).join(" · ").slice(0, 4000);

    const match = (email && byEmail.get(key(email))) || byBiz.get(key(row.business));
    if (match && !match.id) {
      // The same business twice in this sheet: fold it into the row that's
      // about to be inserted.
      for (const [k, v] of Object.entries(row)) if (v != null && v !== "" && (match[k] == null || match[k] === "")) match[k] = v;
      summary.skipped++;
      continue;
    }
    if (match) {
      const patch: Row = {};
      for (const [k, v] of Object.entries(row)) if (v != null && v !== "" && (match[k] == null || match[k] === "")) patch[k] = v;
      if (detail && !match.specific_detail) patch.specific_detail = detail;
      const tags = (match.tags as string[]) || [];
      if (coldOk && !match.do_not_contact && !tags.includes("cold_prospect")) { patch.tags = [...tags, "cold_prospect"]; summary.queued++; }
      if (Object.keys(patch).length) {
        await admin.from("spotlight_prospects").update(patch).eq("id", String(match.id));
        Object.assign(match, patch); summary.updated++; touched.push(String(match.id));
      } else summary.skipped++;
      continue;
    }
    const ins: Row = { user_id: uid, stage: "prospect", ...row, source, specific_detail: detail || null, tags: coldOk ? ["cold_prospect"] : [] };
    if (coldOk) summary.queued++;
    inserts.push(ins);
    if (email) byEmail.set(key(email), ins);
    byBiz.set(key(row.business), ins);
  }

  const added: Array<{ id: string; tags: string[] }> = [];
  for (let i = 0; i < inserts.length; i += 100) {
    const { data, error } = await admin.from("spotlight_prospects").insert(inserts.slice(i, i + 100)).select("id,tags");
    if (error) return { ok: false, error: `Imported ${added.length}, then stopped: ${error.message}` };
    added.push(...((data || []) as Array<{ id: string; tags: string[] }>));
  }
  summary.added = added.length;

  // EDITH: new cold rows are contact.created (SEQ1 starts); updated rows get
  // re-checked (a newly added tag or email can start it too). The first emails
  // are queued, not sent here: EDITH's minute clock sends them one at a time,
  // so the daily cap holds exactly and a big list doesn't time out the import.
  const work: Array<() => Promise<unknown>> = [
    ...added.filter((r) => (r.tags || []).includes("cold_prospect")).map((r) => () => edithEmit(admin, uid, { prospect_id: r.id, type: "contact.created", source: opts.by || "import" }, { run: false })),
    ...touched.map((id) => () => edithTouch(admin, uid, id)),
  ];
  for (let i = 0; i < work.length; i += 5) await Promise.all(work.slice(i, i + 5).map((f) => f()));

  const ecfg = await getEdithConfig(admin, uid);
  summary.edith = { live: !!ecfg.edith_live, address: !!String(ecfg.physical_address || "").trim(), cap: Number(ecfg.cold_daily_cap) || 0 };
  await admin.from("log_entries").insert({ user_id: uid, tag: "CS", color: "var(--gold)", message: `spotlight · imported ${summary.added} new, ${summary.updated} updated${cold ? ` · ${summary.queued} queued for EDITH` : ""}${opts.by ? ` (${opts.by})` : ""}`.slice(0, 200) });
  return summary;
}
