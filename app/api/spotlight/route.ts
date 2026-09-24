import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  STAGES, STAGE_KEYS, VERTICALS, TEMPLATES, getConfig, saveConfig, render, nextTouch, importWebsite,
  draftQuestions, sendTemplate, makeMember, createInvoice, createAgreement, agreementText,
  reconcilePaidDeposits, DEFAULT_AGREEMENT, type Prospect, type Question, type SpotlightConfig,
} from "@/lib/spotlight";

export const runtime = "nodejs";
export const maxDuration = 60;

// Operator-only Charlotte Spotlight API (session required; not in proxy's
// public list). The public questionnaire lives at /api/spotlight/questionnaire.

const MIGRATION_HINT = "The Spotlight table doesn't exist yet — run supabase/22_spotlight.sql in the Supabase SQL editor.";
const missingTable = (m?: string) => !!m && /does not exist|schema cache/i.test(m);

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

const FIELDS = ["business", "owner_name", "email", "phone", "website", "vertical", "suburb", "reviews", "years", "video_situation", "source", "slot_month", "film_date", "quote_mentioned", "season_named", "not_now_month", "notes"] as const;
function clean(b: Record<string, unknown>) {
  const row: Record<string, unknown> = {};
  for (const k of FIELDS) {
    if (!(k in b)) continue;
    const v = b[k];
    if (k === "reviews" || k === "years") row[k] = v === "" || v == null ? null : Math.max(0, Math.round(Number(v))) || 0;
    else if (k === "film_date") row[k] = /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : null;
    else row[k] = v == null || v === "" ? null : String(v).slice(0, k === "notes" ? 4000 : 300);
  }
  if ("business" in row && !row.business) row.business = "";
  return row;
}

export async function GET() {
  const a = await auth();
  if ("error" in a) return fail(a.error, a.error === "unauthorized" ? 401 : 400);
  const cfg = await getConfig(a.admin, a.user.id);

  const { data, error } = await a.admin.from("spotlight_prospects").select("*").eq("user_id", a.user.id).order("created_at", { ascending: true });
  if (error) {
    if (missingTable(error.message)) return NextResponse.json({ ok: true, needsMigration: true, hint: MIGRATION_HINT, config: cfg, prospects: [], stages: STAGES, verticals: VERTICALS, templates: TEMPLATES.map(({ key, label, when, kind }) => ({ key, label, when, kind })) });
    return fail(error.message, 500);
  }
  let rows = (data || []) as Prospect[];
  if (await reconcilePaidDeposits(a.admin, a.user.id, rows)) {
    const again = await a.admin.from("spotlight_prospects").select("*").eq("user_id", a.user.id).order("created_at", { ascending: true });
    rows = (again.data || rows) as Prospect[];
  }

  // Money + paper status in two queries, not one per row.
  const invIds = rows.flatMap((p) => [p.deposit_invoice_id, p.balance_invoice_id]).filter(Boolean) as string[];
  const proIds = rows.map((p) => p.agreement_id).filter(Boolean) as string[];
  const [invR, proR] = await Promise.all([
    invIds.length ? a.admin.from("invoices").select("id,number,status,token,amount_cents").in("id", invIds) : Promise.resolve({ data: [] as { id: string; number: string; status: string; token: string; amount_cents: number }[] }),
    proIds.length ? a.admin.from("proposals").select("id,number,status,token,accepted_at,signer_name").in("id", proIds) : Promise.resolve({ data: [] as { id: string; number: string; status: string; token: string; accepted_at: string | null; signer_name: string | null }[] }),
  ]);
  const inv = new Map((invR.data || []).map((x) => [x.id, x]));
  const pro = new Map((proR.data || []).map((x) => [x.id, x]));
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://os.creativeimpactmedia.co";

  const prospects = rows.map((p) => {
    const d = p.deposit_invoice_id ? inv.get(p.deposit_invoice_id) : null;
    const b = p.balance_invoice_id ? inv.get(p.balance_invoice_id) : null;
    const g = p.agreement_id ? pro.get(p.agreement_id) : null;
    return {
      ...p,
      deposit: d ? { number: d.number, status: d.status, link: `${site}/pay/${d.token}` } : null,
      balance: b ? { number: b.number, status: b.status, link: `${site}/pay/${b.token}` } : null,
      agreement: g ? { number: g.number, status: g.accepted_at ? "signed" : g.status, signer: g.signer_name, link: `${site}/proposal/${g.token}` } : null,
      next_touch: nextTouch(p),
      q_link: `${site}/spotlight/q/${p.q_token}`,
    };
  });
  return NextResponse.json({ ok: true, config: cfg, prospects, stages: STAGES, verticals: VERTICALS, templates: TEMPLATES.map(({ key, label, when, kind }) => ({ key, label, when, kind })), defaultAgreement: DEFAULT_AGREEMENT });
}

export async function POST(req: Request) {
  const a = await auth();
  if ("error" in a) return fail(a.error, a.error === "unauthorized" ? 401 : 400);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return fail("bad request"); }
  const op = String(b.op || "");
  const uid = a.user.id;
  const cfg = await getConfig(a.admin, uid);

  if (op === "save_config") {
    const patch = (b.patch || {}) as Partial<SpotlightConfig>;
    const allowed: Partial<SpotlightConfig> = {};
    for (const k of ["price", "deposit", "balance", "perMonth"] as const) if (k in patch) allowed[k] = Math.max(0, Number(patch[k]) || 0);
    for (const k of ["month", "episodeDate", "episodeUrl", "crewReelUrl", "caller", "callerPhone"] as const) if (k in patch) allowed[k] = String(patch[k] ?? "").slice(0, 300);
    for (const k of ["autoSendQuestions", "attorneyReviewed"] as const) if (k in patch) allowed[k] = !!patch[k];
    if ("agreementTemplate" in patch) allowed.agreementTemplate = String(patch.agreementTemplate || DEFAULT_AGREEMENT).slice(0, 40000);
    return NextResponse.json({ ok: true, config: await saveConfig(a.admin, uid, allowed) });
  }

  if (op === "import") {
    const r = await importWebsite(String(b.url || ""));
    return NextResponse.json(r);
  }

  // Everything below acts on (or creates) one prospect.
  const load = async (id: string) => {
    const { data, error } = await a.admin.from("spotlight_prospects").select("*").eq("user_id", uid).eq("id", id).maybeSingle();
    if (error && missingTable(error.message)) return { error: MIGRATION_HINT };
    return data ? { p: data as Prospect } : { error: "not found" };
  };

  if (op === "save") {
    const row = clean(b);
    if (b.profile && typeof b.profile === "object") row.profile = b.profile;
    if (b.id) {
      const { error } = await a.admin.from("spotlight_prospects").update(row).eq("user_id", uid).eq("id", String(b.id));
      if (error) return fail(missingTable(error.message) ? MIGRATION_HINT : error.message);
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (!row.business) return fail("A business name, at least.");
    const { data, error } = await a.admin.from("spotlight_prospects").insert({ user_id: uid, stage: "prospect", ...row }).select("id").maybeSingle();
    if (error) return fail(missingTable(error.message) ? MIGRATION_HINT : error.message);
    await a.admin.from("log_entries").insert({ user_id: uid, tag: "CS", color: "var(--gold)", message: `spotlight · added ${row.business}` });
    return NextResponse.json({ ok: true, id: data?.id });
  }

  const got = await load(String(b.id || ""));
  if ("error" in got) return fail(got.error as string);
  const p = got.p;

  if (op === "stage") {
    const stage = String(b.stage || "");
    if (!STAGE_KEYS.includes(stage)) return fail("unknown stage");
    if (stage === "member") {
      const r = await makeMember(a.admin, p);
      return NextResponse.json({ ok: true, ...r });
    }
    const patch: Record<string, unknown> = { stage, stage_at: new Date().toISOString() };
    if (stage === "not_now" && b.not_now_month) patch.not_now_month = String(b.not_now_month).slice(0, 60);
    const { error } = await a.admin.from("spotlight_prospects").update(patch).eq("id", p.id);
    if (error) return fail(error.message);
    await a.admin.from("log_entries").insert({ user_id: uid, tag: "CS", color: "var(--gold)", message: `spotlight · ${p.business} → ${STAGES.find((s) => s.key === stage)?.label}` });
    return NextResponse.json({ ok: true });
  }

  if (op === "import_to") {
    const r = await importWebsite(String(b.url || p.website || ""));
    if (!r.ok) return NextResponse.json(r);
    const pr = r.profile as Record<string, unknown>;
    // Fill only EMPTY fields — never overwrite what the operator typed.
    const patch: Record<string, unknown> = { profile: pr };
    if (!p.website && b.url) patch.website = String(b.url);
    if (!p.owner_name && pr.owner_name) patch.owner_name = String(pr.owner_name);
    if (!p.phone && pr.phone) patch.phone = String(pr.phone);
    if (!p.email && pr.email) patch.email = String(pr.email);
    if (!p.suburb && pr.city_or_suburb) patch.suburb = String(pr.city_or_suburb);
    if (!p.vertical && pr.vertical && VERTICALS[String(pr.vertical)]) patch.vertical = String(pr.vertical);
    if (p.years == null && pr.years_in_business != null && !isNaN(Number(pr.years_in_business))) patch.years = Number(pr.years_in_business);
    await a.admin.from("spotlight_prospects").update(patch).eq("id", p.id);
    return NextResponse.json({ ok: true, profile: pr, filled: Object.keys(patch).filter((k) => k !== "profile") });
  }

  if (op === "draft_questions") {
    const qs = await draftQuestions(p);
    await a.admin.from("spotlight_prospects").update({ questions: qs }).eq("id", p.id);
    return NextResponse.json({ ok: true, questions: qs });
  }
  if (op === "save_questions") {
    const qs = (Array.isArray(b.questions) ? b.questions : []) as Question[];
    const cleanQs = qs.filter((q) => q && String(q.q || "").trim()).slice(0, 15).map((q, i) => ({ id: String(q.id || `m${i}`), q: String(q.q).slice(0, 300), why: q.why ? String(q.why).slice(0, 200) : undefined, core: !!q.core }));
    await a.admin.from("spotlight_prospects").update({ questions: cleanQs }).eq("id", p.id);
    return NextResponse.json({ ok: true, questions: cleanQs });
  }

  if (op === "preview") {
    const r = render(p, cfg, String(b.key || ""));
    return r ? NextResponse.json({ ok: true, ...r }) : fail("unknown template");
  }
  if (op === "send") {
    const r = await sendTemplate(a.admin, p, cfg, String(b.key || ""), String(b.subject || ""), String(b.body || ""));
    return NextResponse.json(r);
  }

  if (op === "invoice") {
    const kind = b.kind === "balance" ? "balance" : "deposit";
    if (kind === "deposit" && p.deposit_invoice_id) return fail("A deposit invoice already exists for this prospect.");
    if (kind === "balance" && p.balance_invoice_id) return fail("A balance invoice already exists for this prospect.");
    return NextResponse.json(await createInvoice(a.admin, p, cfg, kind));
  }

  if (op === "agreement_preview") {
    return NextResponse.json({ ok: true, ...agreementText(p, cfg), attorneyReviewed: cfg.attorneyReviewed });
  }
  if (op === "agreement") {
    if (p.agreement_id) return fail("An agreement already exists for this prospect.");
    return NextResponse.json(await createAgreement(a.admin, p, cfg));
  }

  return fail("unknown op");
}
