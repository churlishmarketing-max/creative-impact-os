import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { gradeLead, parseLeadsCsv, type Week } from "@/lib/nationwide";

export const runtime = "nodejs";
export const maxDuration = 60;

// Operator-only API for the Nationwide (Hardscape & Landscape) lane. Session
// required; NOT in proxy.ts's public list. Leads live in lane_leads; the plan,
// decisions, publish gates, ad status, and Friday tracker rows live in
// app_state.ops.__nationwide.

const MIGRATION_HINT = "The lead table doesn't exist yet — run supabase/23_nationwide.sql in the Supabase SQL editor. (The plan, tracker, scripts, and call material all work without it.)";
const missingTable = (m?: string) => !!m && /does not exist|schema cache/i.test(m);
const STAGES = ["new", "attempting", "booked", "held", "closed", "lost", "closed_out", "filtered"];
const LEAD_FIELDS = ["full_name", "phone", "email", "state", "company", "web", "ad", "q_install", "q_revenue", "q_owner", "q_adspend", "specific_job", "decision_makers", "call_day", "call_time", "zoom_link", "notes"] as const;

type Cfg = { plan?: Record<string, boolean>; decisions?: Record<string, string>; gates?: Record<string, boolean>; ads?: Record<string, string>; weeks?: Week[] };

async function auth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { error: "not_configured" as const };
  const cookieStore = await cookies();
  const sb = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "unauthorized" as const };
  const admin = getAdminClient();
  if (!admin) return { error: "no_service_role" as const };
  return { user, admin };
}
const fail = (error: string | undefined, status = 400) => NextResponse.json({ ok: false, error: error || "error" }, { status });
type Admin = NonNullable<ReturnType<typeof getAdminClient>>;

async function getCfg(admin: Admin, uid: string) {
  const { data } = await admin.from("app_state").select("ops").eq("user_id", uid).maybeSingle();
  const ops = (data?.ops || {}) as Record<string, unknown>;
  return { ops, cfg: ((ops.__nationwide as Cfg) || {}) as Cfg };
}
async function putCfg(admin: Admin, uid: string, next: Cfg) {
  const { ops } = await getCfg(admin, uid);
  await admin.from("app_state").upsert({ user_id: uid, ops: { ...ops, __nationwide: next } }, { onConflict: "user_id" });
  return next;
}

function cleanLead(b: Record<string, unknown>) {
  const row: Record<string, unknown> = {};
  for (const k of LEAD_FIELDS) if (k in b) row[k] = b[k] == null || b[k] === "" ? null : String(b[k]).slice(0, k === "notes" ? 4000 : 400);
  if ("temperature" in b) row.temperature = b.temperature === "" || b.temperature == null ? null : Math.min(10, Math.max(1, Math.round(Number(b.temperature)) || 1));
  if ("lead_at" in b && b.lead_at && !isNaN(new Date(String(b.lead_at)).getTime())) row.lead_at = new Date(String(b.lead_at)).toISOString();
  if ("booked_for" in b) row.booked_for = b.booked_for && !isNaN(new Date(String(b.booked_for)).getTime()) ? new Date(String(b.booked_for)).toISOString() : null;
  if (b.situation && typeof b.situation === "object") row.situation = b.situation;
  return row;
}

// Counts for one Friday's week (Sat..Fri), by when each event HAPPENED.
function weekCounts(leads: Record<string, unknown>[], weekOf: string) {
  const end = weekOf;
  const s = new Date(weekOf + "T12:00:00Z"); s.setUTCDate(s.getUTCDate() - 6);
  const start = s.toISOString().slice(0, 10);
  const inW = (t: unknown) => { if (!t) return false; const d = String(t).slice(0, 10); return d >= start && d <= end; };
  const wk = leads.filter((l) => inW(l.lead_at));
  const qual = wk.filter((l) => l.grade === "A" || l.grade === "B");
  const mins = qual.filter((l) => l.first_call_at).map((l) => (new Date(String(l.first_call_at)).getTime() - new Date(String(l.lead_at)).getTime()) / 60000).filter((m) => m >= 0).sort((a, b) => a - b);
  const median = mins.length ? (mins.length % 2 ? mins[(mins.length - 1) / 2] : (mins[mins.length / 2 - 1] + mins[mins.length / 2]) / 2) : undefined;
  return {
    start, end,
    leads: wk.length, qualified: qual.length,
    booked: leads.filter((l) => inW(l.booked_at)).length,
    held: leads.filter((l) => inW(l.held_at)).length,
    closed: leads.filter((l) => inW(l.closed_at)).length,
    median_call_min: median != null ? Math.round(median * 10) / 10 : undefined,
  };
}

export async function GET() {
  const a = await auth();
  if ("error" in a) return fail(a.error, a.error === "unauthorized" ? 401 : 400);
  const { cfg } = await getCfg(a.admin, a.user.id);
  const { data, error } = await a.admin.from("lane_leads").select("*").eq("user_id", a.user.id).eq("lane", "hardscape").order("lead_at", { ascending: false });
  if (error) {
    if (missingTable(error.message)) return NextResponse.json({ ok: true, needsMigration: true, hint: MIGRATION_HINT, cfg, leads: [] });
    return fail(error.message, 500);
  }
  return NextResponse.json({ ok: true, cfg, leads: data || [] });
}

export async function POST(req: Request) {
  const a = await auth();
  if ("error" in a) return fail(a.error, a.error === "unauthorized" ? 401 : 400);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return fail("bad request"); }
  const op = String(b.op || "");
  const uid = a.user.id;

  // ---- settings-backed pieces (work without the lead table) ----
  if (op === "toggle") {
    // {bucket: plan|gates, id, value}
    const bucket = b.bucket === "gates" ? "gates" : "plan";
    const { cfg } = await getCfg(a.admin, uid);
    const next = { ...cfg, [bucket]: { ...(cfg[bucket] || {}), [String(b.id)]: !!b.value } };
    return NextResponse.json({ ok: true, cfg: await putCfg(a.admin, uid, next) });
  }
  if (op === "decision") {
    const { cfg } = await getCfg(a.admin, uid);
    const next = { ...cfg, decisions: { ...(cfg.decisions || {}), [String(b.id)]: String(b.value ?? "").slice(0, 1000) } };
    return NextResponse.json({ ok: true, cfg: await putCfg(a.admin, uid, next) });
  }
  if (op === "ad_status") {
    const allowed = ["not filmed", "filmed", "edited", "live", "paused", "killed"];
    const v = String(b.value || "");
    if (!allowed.includes(v)) return fail("unknown status");
    const { cfg } = await getCfg(a.admin, uid);
    const next = { ...cfg, ads: { ...(cfg.ads || {}), [String(b.id)]: v } };
    return NextResponse.json({ ok: true, cfg: await putCfg(a.admin, uid, next) });
  }
  if (op === "save_week") {
    const w = (b.week || {}) as Week;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(w.week_of || ""))) return fail("Pick the Friday this row is for.");
    const num = (x: unknown) => (x === "" || x == null || isNaN(Number(x)) ? undefined : Number(x));
    const clean: Week = {
      week_of: w.week_of, spend: num(w.spend), impressions: num(w.impressions), views3s: num(w.views3s), frequency: num(w.frequency),
      leads: num(w.leads), qualified: num(w.qualified), booked: num(w.booked), held: num(w.held), closed: num(w.closed),
      median_call_min: num(w.median_call_min), note: w.note ? String(w.note).slice(0, 600) : undefined,
    };
    const { cfg } = await getCfg(a.admin, uid);
    const weeks = (cfg.weeks || []).filter((x) => x.week_of !== clean.week_of).concat(clean).sort((x, y) => x.week_of.localeCompare(y.week_of));
    return NextResponse.json({ ok: true, cfg: await putCfg(a.admin, uid, { ...cfg, weeks }) });
  }
  if (op === "remove_week") {
    // Removing a mistyped tracker row is an edit of your own settings, not a
    // record deletion — nothing downstream depends on a single row.
    const { cfg } = await getCfg(a.admin, uid);
    const weeks = (cfg.weeks || []).filter((x) => x.week_of !== String(b.week_of));
    return NextResponse.json({ ok: true, cfg: await putCfg(a.admin, uid, { ...cfg, weeks }) });
  }

  // ---- the lead log ----
  if (op === "fill_week") {
    const weekOf = String(b.week_of || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) return fail("Pick the Friday first.");
    const { data, error } = await a.admin.from("lane_leads").select("lead_at,grade,first_call_at,booked_at,held_at,closed_at").eq("user_id", uid).eq("lane", "hardscape");
    if (error) return fail(missingTable(error.message) ? MIGRATION_HINT : error.message);
    return NextResponse.json({ ok: true, counts: weekCounts((data || []) as Record<string, unknown>[], weekOf) });
  }

  if (op === "save_lead") {
    const row = cleanLead(b);
    const id = b.id ? String(b.id) : null;
    // grade from the merged answers (existing row + this edit)
    let merged = row;
    if (id) {
      const { data: cur, error } = await a.admin.from("lane_leads").select("q_install,q_revenue,q_owner,stage").eq("user_id", uid).eq("id", id).maybeSingle();
      if (error) return fail(missingTable(error.message) ? MIGRATION_HINT : error.message);
      merged = { ...(cur || {}), ...row };
      row.grade = gradeLead(merged as never);
      if ((row.grade === "C" || row.grade === "D") && cur?.stage === "new") { row.stage = "filtered"; row.stage_at = new Date().toISOString(); }
      const { error: e2 } = await a.admin.from("lane_leads").update(row).eq("user_id", uid).eq("id", id);
      if (e2) return fail(e2.message);
      return NextResponse.json({ ok: true, id, grade: row.grade });
    }
    if (!row.full_name && !row.company && !row.email && !row.phone) return fail("A name, a company, or a way to reach them.");
    row.grade = gradeLead(row as never);
    const stage = row.grade === "C" || row.grade === "D" ? "filtered" : "new";
    const { data, error } = await a.admin.from("lane_leads").insert({ user_id: uid, lane: "hardscape", stage, ...row }).select("id").maybeSingle();
    if (error) return fail(missingTable(error.message) ? MIGRATION_HINT : error.message);
    await a.admin.from("log_entries").insert({ user_id: uid, tag: "HL", color: "var(--gold)", message: `hardscape lead · ${row.company || row.full_name || "—"} · grade ${row.grade || "?"}` });
    return NextResponse.json({ ok: true, id: data?.id, grade: row.grade });
  }

  if (op === "import_csv") {
    const { rows, unmapped } = parseLeadsCsv(String(b.text || ""));
    if (!rows.length) return fail("Couldn't find any leads in that — paste the Lead Center export including its header row.");
    const { data: existing, error } = await a.admin.from("lane_leads").select("email,phone").eq("user_id", uid).eq("lane", "hardscape");
    if (error) return fail(missingTable(error.message) ? MIGRATION_HINT : error.message);
    const seen = new Set((existing || []).flatMap((e) => [e.email && String(e.email).toLowerCase(), e.phone && String(e.phone).replace(/\D/g, "")]).filter(Boolean) as string[]);
    const fresh = rows.filter((r) => !((r.email && seen.has(r.email.toLowerCase())) || (r.phone && seen.has(r.phone.replace(/\D/g, "")))));
    const toInsert = fresh.map((r) => {
      const grade = gradeLead(r);
      return { user_id: uid, lane: "hardscape", ...Object.fromEntries(Object.entries(r).filter(([, v]) => v != null)), grade, stage: grade === "C" || grade === "D" ? "filtered" : "new" };
    });
    if (toInsert.length) {
      const { error: e2 } = await a.admin.from("lane_leads").insert(toInsert);
      if (e2) return fail(e2.message);
      await a.admin.from("log_entries").insert({ user_id: uid, tag: "HL", color: "var(--gold)", message: `hardscape · imported ${toInsert.length} lead${toInsert.length === 1 ? "" : "s"} from Lead Center` });
    }
    const g = (x: string) => toInsert.filter((r) => r.grade === x).length;
    return NextResponse.json({ ok: true, imported: toInsert.length, skipped: rows.length - toInsert.length, grades: { A: g("A"), B: g("B"), C: g("C"), D: g("D"), ungraded: toInsert.filter((r) => !r.grade).length }, unmapped });
  }

  // Everything below acts on one lead.
  const id = String(b.id || "");
  const { data: lead, error: le } = await a.admin.from("lane_leads").select("*").eq("user_id", uid).eq("id", id).maybeSingle();
  if (le) return fail(missingTable(le.message) ? MIGRATION_HINT : le.message);
  if (!lead) return fail("not found");
  const now = new Date().toISOString();

  if (op === "stage") {
    const stage = String(b.stage || "");
    if (!STAGES.includes(stage)) return fail("unknown stage");
    const patch: Record<string, unknown> = { stage, stage_at: now };
    // Event stamps (set once) — these feed the Friday tracker.
    if (["booked", "held", "closed"].includes(stage) && !lead.booked_at) patch.booked_at = now;
    if (["held", "closed"].includes(stage) && !lead.held_at) patch.held_at = now;
    if (stage === "closed" && !lead.closed_at) patch.closed_at = now;
    const { error } = await a.admin.from("lane_leads").update(patch).eq("id", id);
    if (error) return fail(error.message);
    if (stage === "closed") await a.admin.from("log_entries").insert({ user_id: uid, tag: "HL", color: "var(--good)", message: `hardscape · SIGNED · ${lead.company || lead.full_name}` });
    return NextResponse.json({ ok: true });
  }
  if (op === "log_call") {
    const patch: Record<string, unknown> = { call_attempts: (lead.call_attempts || 0) + 1 };
    if (!lead.first_call_at) patch.first_call_at = now;
    if (lead.stage === "new") { patch.stage = "attempting"; patch.stage_at = now; }
    await a.admin.from("lane_leads").update(patch).eq("id", id);
    const mins = lead.first_call_at ? null : Math.round((Date.now() - new Date(lead.lead_at).getTime()) / 6000) / 10;
    return NextResponse.json({ ok: true, minutes: mins });
  }
  if (op === "log_text") {
    await a.admin.from("lane_leads").update({ texts_sent: (lead.texts_sent || 0) + 1 }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  return fail("unknown op");
}
