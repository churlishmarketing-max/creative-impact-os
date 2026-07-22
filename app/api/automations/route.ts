import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { runAutomation, ACTIONS, CADENCES, type Automation } from "@/lib/automations-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

// Operator-only automations API for the AUTOMATIONS tab.
// GET            -> list
// POST {op:save} -> create/update    {op:toggle} -> enable/disable
// POST {op:run}  -> fire one now (manual run, ignores cadence)
// Not exempted in the proxy: session required.

const MIGRATION_HINT = "The automations table doesn't exist yet — run supabase/21_automations.sql in the Supabase SQL editor.";
const isMissingTable = (m?: string) => !!m && /relation .* does not exist/i.test(m);

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

export async function GET() {
  const a = await auth();
  if ("error" in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.error === "unauthorized" ? 401 : 400 });

  const { data, error } = await a.admin.from("automations").select("*").eq("user_id", a.user.id).order("created_at", { ascending: true });
  if (error) {
    if (isMissingTable(error.message)) return NextResponse.json({ ok: true, automations: [], needsMigration: true, hint: MIGRATION_HINT });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, automations: data || [], actions: ACTIONS, cadences: CADENCES });
}

export async function POST(req: Request) {
  const a = await auth();
  if ("error" in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.error === "unauthorized" ? 401 : 400 });

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const op = String(b.op || "save");

  if (op === "toggle") {
    const id = String(b.id || "");
    const { data: cur, error: e1 } = await a.admin.from("automations").select("id,enabled,name").eq("user_id", a.user.id).eq("id", id).maybeSingle();
    if (e1 && isMissingTable(e1.message)) return NextResponse.json({ ok: false, error: MIGRATION_HINT }, { status: 400 });
    if (!cur) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    const next = b.enabled == null ? !cur.enabled : !!b.enabled;
    const { error } = await a.admin.from("automations").update({ enabled: next }).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id, enabled: next });
  }

  if (op === "run") {
    const id = String(b.id || "");
    const { data: row, error: e1 } = await a.admin.from("automations").select("*").eq("user_id", a.user.id).eq("id", id).maybeSingle();
    if (e1 && isMissingTable(e1.message)) return NextResponse.json({ ok: false, error: MIGRATION_HINT }, { status: 400 });
    if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    const r = await runAutomation(a.admin, row as Automation);
    return NextResponse.json(r.ok ? { ok: true, title: r.title, summary: r.summary } : { ok: false, error: r.error });
  }

  // save (create or update)
  const id = b.id ? String(b.id) : null;
  const name = String(b.name || "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
  const action = ACTIONS.includes(String(b.action) as (typeof ACTIONS)[number]) ? String(b.action) : "log_marker";
  const cadence = CADENCES.includes(String(b.cadence) as (typeof CADENCES)[number]) ? String(b.cadence) : "daily";
  const row: Record<string, unknown> = {
    user_id: a.user.id,
    name,
    description: b.description ? String(b.description).slice(0, 600) : null,
    cadence,
    day_of_week: b.day_of_week == null ? null : Math.min(6, Math.max(0, Number(b.day_of_week))),
    day_of_month: b.day_of_month == null ? null : Math.min(31, Math.max(1, Number(b.day_of_month))),
    action,
    action_config: b.action_config && typeof b.action_config === "object" ? b.action_config : {},
    enabled: b.enabled == null ? true : !!b.enabled,
    created_by: b.created_by === "jarvis" ? "jarvis" : "operator",
  };
  if (id) delete row.created_by;

  const q = id
    ? a.admin.from("automations").update(row).eq("user_id", a.user.id).eq("id", id).select("id").maybeSingle()
    : a.admin.from("automations").insert(row).select("id").maybeSingle();
  const { data, error } = await q;
  if (error) {
    if (isMissingTable(error.message)) return NextResponse.json({ ok: false, error: MIGRATION_HINT }, { status: 400 });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data?.id });
}
