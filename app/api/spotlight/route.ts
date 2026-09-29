import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  STAGES, STAGE_KEYS, VERTICALS, TEMPLATES, getConfig, saveConfig, render, nextTouch, importWebsite,
  draftQuestions, sendTemplate, makeMember, createInvoice, createAgreement, agreementText,
  reconcilePaidDeposits, reconcilePaidBalances, DEFAULT_AGREEMENT, closeSpot, invoiceEmail, resendInvoice, cancelInvoice,
  type Prospect, type Question, type SpotlightConfig,
} from "@/lib/spotlight";
import { DEFAULT_RELEASE } from "@/lib/spotlight-release";
import { stripeConnected } from "@/lib/edith/server";
import { edithEmit, edithTouch, previewColdEmail } from "@/lib/edith/server";
import { importProspects } from "@/lib/spotlight-import";

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
  await reconcilePaidBalances(a.admin, a.user.id, rows).catch((e) => console.error("balance reconcile failed", e));
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
  // Signed releases per business (migration 26; zero until it's run).
  const relR = await a.admin.from("spotlight_releases").select("prospect_id").eq("user_id", a.user.id);
  const releases = new Map<string, number>();
  for (const r of relR.data || []) releases.set(r.prospect_id, (releases.get(r.prospect_id) || 0) + 1);
  const pro = new Map((proR.data || []).map((x) => [x.id, x]));
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://os.creativeimpactmedia.co";

  const prospects = rows.map((p) => {
    const d = p.deposit_invoice_id ? inv.get(p.deposit_invoice_id) : null;
    const b = p.balance_invoice_id ? inv.get(p.balance_invoice_id) : null;
    const g = p.agreement_id ? pro.get(p.agreement_id) : null;
    return {
      ...p,
      deposit: d ? { number: d.number, status: d.status, link: `${site}/pay/${d.token}`, amount: Math.round((d.amount_cents || 0) / 100) } : null,
      release_link: (p as Prospect & { release_token?: string }).release_token ? `${site}/spotlight/release/${(p as Prospect & { release_token?: string }).release_token}` : null,
      releases: releases.get(p.id) || 0,
      balance: b ? { number: b.number, status: b.status, link: `${site}/pay/${b.token}` } : null,
      agreement: g ? { number: g.number, status: g.accepted_at ? "signed" : g.status, signer: g.signer_name, link: `${site}/proposal/${g.token}` } : null,
      next_touch: nextTouch(p),
      q_link: `${site}/spotlight/q/${p.q_token}`,
    };
  });
  return NextResponse.json({ ok: true, config: cfg, prospects, stages: STAGES, verticals: VERTICALS, templates: TEMPLATES.map(({ key, label, when, kind }) => ({ key, label, when, kind })), defaultAgreement: DEFAULT_AGREEMENT, defaultRelease: DEFAULT_RELEASE, stripe: stripeConnected(), releasesReady: !relR.error });
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
    if (Array.isArray(patch.prices)) {
      const prices = (patch.prices as unknown[]).slice(0, 30).map((v) => Math.max(0, Math.round(Number(v)) || 0));
      if (!prices.length || prices.some((v) => !v)) return fail("Every spot on the board needs a price.");
      allowed.prices = prices;
      allowed.perMonth = prices.length;
    }
    if ("featureSpots" in patch) allowed.featureSpots = Math.max(0, Math.min(30, Math.round(Number(patch.featureSpots)) || 0));
    if ("floorDate" in patch) allowed.floorDate = String(patch.floorDate || "").slice(0, 60);
    for (const k of ["month", "episodeDate", "episodeUrl", "crewReelUrl", "caller", "callerPhone"] as const) if (k in patch) allowed[k] = String(patch[k] ?? "").slice(0, 300);
    for (const k of ["autoSendQuestions", "attorneyReviewed"] as const) if (k in patch) allowed[k] = !!patch[k];
    if ("agreementTemplate" in patch) allowed.agreementTemplate = String(patch.agreementTemplate || DEFAULT_AGREEMENT).slice(0, 40000);
    if ("releaseTemplate" in patch) allowed.releaseTemplate = String(patch.releaseTemplate || DEFAULT_RELEASE).slice(0, 20000);
    return NextResponse.json({ ok: true, config: await saveConfig(a.admin, uid, allowed) });
  }

  if (op === "import") {
    const r = await importWebsite(String(b.url || ""));
    return NextResponse.json(r);
  }

  // A spreadsheet of leads (read in the browser — SheetImport.jsx, or by
  // EDITH from a sheet attached in her chat). lib/spotlight-import.ts does the
  // work: dedupe, fill-empty-only, the cold tag, the mail-server check.
  if (op === "import_rows") {
    const r = await importProspects(a.admin, uid, Array.isArray(b.rows) ? (b.rows as Record<string, unknown>[]) : [], { source: String(b.source || "import"), cold: !!b.cold });
    if (!r.ok) return fail(r.error);
    return NextResponse.json(r);
  }

  // The importer's preview: EDITH's first cold email to one of the rows.
  if (op === "cold_preview") {
    const r = await previewColdEmail(a.admin, uid, (b.row || {}) as Record<string, unknown>);
    if (!r.ok) return fail(r.error);
    return NextResponse.json(r);
  }

  // Close a Spot: after a yes — the spot, their details, the invoice + its email.
  if (op === "close_preview") {
    const spot = Math.round(Number(b.spot) || 0);
    if (!spot || !cfg.prices[spot - 1]) return fail("Pick a spot on the board.");
    const mail = invoiceEmail({ business: String(b.business || "[Business]"), owner_name: null, first_name: String(b.first_name || "") }, cfg, spot, { link: "[the Stripe pay link — made when you send]" });
    return NextResponse.json({ ok: true, ...mail, stripe: stripeConnected(), attorneyReviewed: !!cfg.attorneyReviewed });
  }
  if (op === "close") {
    const r = await closeSpot(a.admin, uid, { id: b.id ? String(b.id) : null, business: String(b.business || ""), first_name: String(b.first_name || ""), last_name: String(b.last_name || ""), email: String(b.email || ""), phone: String(b.phone || ""), spot: Number(b.spot), film_date: String(b.film_date || ""), send: !!b.send, by: "the cockpit" });
    return r.ok ? NextResponse.json(r) : fail(r.error);
  }
  if (op === "invoice_resend" || op === "invoice_cancel") {
    const r = op === "invoice_resend" ? await resendInvoice(a.admin, uid, String(b.id || "")) : await cancelInvoice(a.admin, uid, String(b.id || ""));
    return r.ok ? NextResponse.json(r) : fail(r.error);
  }
  // A business's signed releases (the drawer's Release forms section).
  if (op === "releases") {
    const { data, error } = await a.admin.from("spotlight_releases").select("id,first_name,last_name,email,source,signed_at,consent_version").eq("user_id", uid).eq("prospect_id", String(b.id || "")).order("signed_at", { ascending: false });
    if (error) return fail(missingTable(error.message) ? "Release forms need supabase/26_close_release_finder.sql — run it in the Supabase SQL editor." : error.message);
    return NextResponse.json({ ok: true, releases: data || [] });
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
      await edithTouch(a.admin, uid, String(b.id));
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (!row.business) return fail("A business name, at least.");
    const { data, error } = await a.admin.from("spotlight_prospects").insert({ user_id: uid, stage: "prospect", ...row }).select("id").maybeSingle();
    if (error) return fail(missingTable(error.message) ? MIGRATION_HINT : error.message);
    await a.admin.from("log_entries").insert({ user_id: uid, tag: "CS", color: "var(--gold)", message: `spotlight · added ${row.business}` });
    if (data?.id) await edithEmit(a.admin, uid, { prospect_id: data.id, type: "contact.created", source: "cockpit" });
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
    // A clean No is a do-not-contact: EDITH ends every sequence for them.
    if (stage === "no") await edithEmit(a.admin, uid, { prospect_id: p.id, type: "contact.unsubscribed", payload: { via: "stage no" }, source: "cockpit" });
    else await edithTouch(a.admin, uid, p.id);
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
    await edithTouch(a.admin, uid, p.id);
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
    // The hand-sent cold emails (e1–e6) and EDITH's SEQ1 must never both run.
    if (TEMPLATES.find((t) => t.key === String(b.key || ""))?.kind === "cold") {
      const { data: seq1 } = await a.admin.from("edith_enrollments").select("id").eq("prospect_id", p.id).eq("seq", "SEQ1").eq("status", "active").limit(1);
      if (seq1?.length) return fail(`EDITH is already running the cold emails for ${p.business} — sending this by hand would double up.`);
    }
    const r = await sendTemplate(a.admin, p, cfg, String(b.key || ""), String(b.subject || ""), String(b.body || ""));
    return NextResponse.json(r);
  }

  if (op === "invoice") {
    // Paid in full at booking — one invoice per spot, no balance invoice.
    if (b.kind === "balance") return fail("Spots are paid in full at booking — there's no balance invoice.");
    if (p.deposit_invoice_id) return fail("This prospect already has an invoice.");
    const inv = await createInvoice(a.admin, p, cfg);
    if (inv.ok) await edithTouch(a.admin, uid, p.id); // releases a 5-x / 6-3 held for a missing pay link
    return NextResponse.json(inv);
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
