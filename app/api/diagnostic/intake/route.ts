import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { dxEvent, transition, type Diag } from "@/lib/diagnostic/pipeline";

export const runtime = "nodejs";

// Public, token-gated intake state. GET loads; POST autosaves (merge).
// The clarity prefill only offers fields present in the operator-configured
// field map (app_state.ops.__clarity_map) — never guessed, never silent,
// and Step 2 raw metrics never prefill (clarity-engine-integration.md §3).

async function loadDiag(token: string) {
  const admin = getAdminClient();
  if (!admin) return { admin: null, d: null };
  const { data: d } = await admin.from("diagnostics").select("*").eq("intake_token", token).maybeSingle();
  return { admin, d };
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const { admin, d } = await loadDiag(token);
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 400 });
  if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: client } = await admin.from("clients").select("name, contact_name").eq("id", d.client_id).maybeSingle();
  const { data: intake } = await admin.from("diagnostic_intakes").select("payload, submitted_at").eq("diagnostic_id", d.id).maybeSingle();

  // Opt-in prefill offer from a linked Clarity session. The default map was
  // built from the ACTUAL Clarity Engine brief shape (read from its source,
  // not guessed) and only maps fields that genuinely correspond — never their
  // "current opening line" (the board's suggested hook is not their current
  // ad, and prefilling it would corrupt the diagnostic's read of their copy).
  const DEFAULT_CLARITY_MAP: Record<string, string> = {
    why_us: "authorityAngle",
    ideal_customer: "idealAvatar.snapshot",
  };
  let prefill: { date: string; fields: Record<string, string> } | null = null;
  if (d.clarity_session_id && !intake?.submitted_at) {
    const [{ data: cs }, { data: st }] = await Promise.all([
      admin.from("clarity_sessions").select("answers, board_read, created_at").eq("id", d.clarity_session_id).maybeSingle(),
      admin.from("app_state").select("ops").eq("user_id", d.user_id).maybeSingle(),
    ]);
    const opsMap = ((st?.ops as Record<string, unknown> | null)?.__clarity_map || {}) as Record<string, string>;
    const map = Object.keys(opsMap).length ? opsMap : DEFAULT_CLARITY_MAP;
    if (cs) {
      const source = { ...((cs.board_read as Record<string, unknown>) || {}), ...((cs.answers as Record<string, unknown>) || {}) };
      const dig = (path: string): string => {
        let v: unknown = source;
        for (const k of path.split(".")) { if (v && typeof v === "object") v = (v as Record<string, unknown>)[k]; else return ""; }
        return typeof v === "string" ? v.trim() : "";
      };
      const RAW_METRIC_FIELDS = ["spend", "impressions", "reach", "plays_3s", "views_50", "link_clicks", "clicks_all", "leads", "budget"];
      const fields: Record<string, string> = {};
      for (const [intakeField, clarityKey] of Object.entries(map)) {
        if (RAW_METRIC_FIELDS.includes(intakeField)) continue; // Step 2 raw metrics NEVER prefill
        const v = dig(clarityKey);
        if (v) fields[intakeField] = v;
      }
      if (Object.keys(fields).length) prefill = { date: new Date(cs.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), fields };
    }
  }

  return NextResponse.json({
    status: d.status,
    business: client?.name || "",
    contact: client?.contact_name || "",
    payload: intake?.payload || {},
    submitted: !!intake?.submitted_at,
    prefill,
  });
}

export async function POST(req: Request) {
  let token = "", payload: Record<string, unknown> = {}, prefillEvent = "";
  try { ({ token, payload, prefillEvent } = await req.json()); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const { admin, d } = await loadDiag(token);
  if (!admin) return NextResponse.json({ ok: false }, { status: 400 });
  if (!d) return NextResponse.json({ ok: false }, { status: 404 });
  if (!["intake_sent", "intake_in_progress"].includes(d.status)) return NextResponse.json({ ok: false, error: "locked" }, { status: 400 });

  const { data: cur } = await admin.from("diagnostic_intakes").select("payload").eq("diagnostic_id", d.id).maybeSingle();
  const merged = { ...((cur?.payload as Record<string, unknown>) || {}), ...payload };
  await admin.from("diagnostic_intakes").upsert({
    diagnostic_id: d.id, user_id: d.user_id, payload: merged,
    industry: String(merged.industry || "") || null,
    website_url: String(merged.website || "") || null,
    landing_url: String(merged.landing || "") || null,
    is_retargeting: String(merged.retargeting || "") || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "diagnostic_id" });

  if (d.status === "intake_sent") await transition(admin, d as Diag, "intake_in_progress", "client", { first_save: true });
  if (prefillEvent) await dxEvent(admin, d as Diag, "client", prefillEvent); // clarity_prefill_offered/accepted
  return NextResponse.json({ ok: true });
}
