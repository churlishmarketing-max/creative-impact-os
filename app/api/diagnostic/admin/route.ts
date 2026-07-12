import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { dxEvent, transition, sendE1, sendE4, markPaid, operatorBookingLink, type Diag } from "@/lib/diagnostic/pipeline";
import { runDiagnostic } from "@/lib/diagnostic/agent";
import { validateVoice } from "@/lib/diagnostic/voice";

export const runtime = "nodejs";
export const maxDuration = 300; // rerun action executes the agent inline

// Operator-only actions on the diagnostic board. HITL gate lives here:
// nothing reaches the client without `approve` + `deliver` by Brandon.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = getAdminClient();
  if (!url || !anon || !admin) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  const cookieStore = await cookies();
  const sb = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let b: { action?: string; id?: string; edits?: Record<string, unknown>; name?: string; email?: string; business?: string } = {};
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const action = String(b.action || "");

  // ---- comp creation (the first three are free — same pipeline, no Stripe)
  if (action === "comp_create") {
    const email = String(b.email || "").trim().toLowerCase();
    const business = String(b.business || "").trim();
    if (!email || !business) return NextResponse.json({ ok: false, error: "missing email or business" }, { status: 400 });
    let { data: client } = await admin.from("clients").select("id").eq("user_id", user.id).ilike("email", email).limit(1).maybeSingle();
    if (!client) {
      const ins = await admin.from("clients").insert({ user_id: user.id, name: business, contact_name: String(b.name || "") || null, email, status: "Lead", source: "Diagnostic (comp)" }).select("id").single();
      client = ins.data;
    }
    if (!client) return NextResponse.json({ ok: false, error: "client_create_failed" }, { status: 500 });
    const { data: clarity } = await admin.from("clarity_sessions").select("id").eq("user_id", user.id).ilike("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: d, error } = await admin.from("diagnostics").insert({
      user_id: user.id, client_id: client.id, is_comp: true, amount_cents: 0, clarity_session_id: clarity?.id || null,
    }).select("*").single();
    if (error || !d) return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
    await dxEvent(admin, d as Diag, "brandon", "comp_created", { email, business });
    const paid = await markPaid(admin, d.id, null); // sends E1
    return NextResponse.json({ ok: paid.ok, id: d.id });
  }

  // ---- everything else operates on an existing diagnostic
  const { data: d } = await admin.from("diagnostics").select("*").eq("id", String(b.id || "")).eq("user_id", user.id).maybeSingle();
  if (!d) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const { data: report } = await admin.from("diagnostic_reports").select("*").eq("diagnostic_id", d.id).order("version", { ascending: false }).limit(1).maybeSingle();

  if (action === "resend_intake") {
    const r = await sendE1(admin, d as Diag);
    return NextResponse.json(r);
  }

  if (action === "rerun") {
    const r = await runDiagnostic(d.id);
    return NextResponse.json(r);
  }

  if (action === "save_edits") {
    if (!report) return NextResponse.json({ ok: false, error: "no_report" }, { status: 400 });
    if (report.is_approved) return NextResponse.json({ ok: false, error: "already_approved_locked" }, { status: 400 });
    const merged = { ...(report.report as Record<string, unknown>), ...(b.edits || {}) };
    const violations = validateVoice(merged);
    if (violations.length) return NextResponse.json({ ok: false, error: "voice_violations", violations }, { status: 400 });
    await admin.from("diagnostic_reports").update({ report: merged }).eq("id", report.id);
    await dxEvent(admin, d as Diag, "brandon", "report_edited", { keys: Object.keys(b.edits || {}) });
    if (d.status === "draft_ready") await transition(admin, d as Diag, "in_review", "brandon");
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    if (!report) return NextResponse.json({ ok: false, error: "no_report" }, { status: 400 });
    await admin.from("diagnostic_reports").update({ is_approved: true, approved_at: new Date().toISOString() }).eq("id", report.id);
    await transition(admin, d as Diag, "approved", "brandon", { version: report.version });
    return NextResponse.json({ ok: true });
  }

  if (action === "deliver") {
    if (!report?.is_approved) return NextResponse.json({ ok: false, error: "not_approved" }, { status: 400 });
    const deadline = new Date(Date.now() + 90 * 86400_000);
    const deadlineStr = deadline.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    await admin.from("diagnostic_reports").update({ delivered_at: new Date().toISOString() }).eq("id", report.id);
    await admin.from("diagnostics").update({ credit_deadline: deadline.toISOString().slice(0, 10) }).eq("id", d.id);
    await transition(admin, d as Diag, "delivered", "brandon", { credit_deadline: deadlineStr });
    const sent = await sendE4(admin, d as Diag, deadlineStr);
    await admin.from("client_events").insert({ user_id: d.user_id, client_id: d.client_id, kind: "system", message: "Diagnostic report delivered — 90-day credit window open" });
    return NextResponse.json({ ok: true, emailed: sent.ok });
  }

  if (action === "mark_converted") {
    await admin.from("diagnostics").update({ converted_at: new Date().toISOString() }).eq("id", d.id);
    await transition(admin, d as Diag, "converted", "brandon");
    await admin.from("log_entries").insert({ user_id: d.user_id, tag: "EV", color: "var(--red)", message: `diagnostic CONVERTED — remember the −$750 credit line on invoice one (money already paid, never call it a discount)` });
    return NextResponse.json({ ok: true });
  }

  if (action === "close") {
    await transition(admin, d as Diag, "closed", "brandon");
    return NextResponse.json({ ok: true });
  }

  // Hard delete (operator only, confirmed in the UI). Cascades take the
  // intake, metrics, reports, and event trail; screenshots are swept from
  // storage best-effort. Deliberately NOT exposed to Rookie or any agent.
  if (action === "delete") {
    try {
      const { data: files } = await admin.storage.from("diagnostic-uploads").list(d.id, { limit: 100 });
      if (files?.length) await admin.storage.from("diagnostic-uploads").remove(files.map((f) => `${d.id}/${f.name}`));
    } catch { /* storage sweep is best-effort */ }
    const { data: client } = await admin.from("clients").select("name").eq("id", d.client_id).maybeSingle();
    const { error } = await admin.from("diagnostics").delete().eq("id", d.id).eq("user_id", user.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await admin.from("log_entries").insert({ user_id: user.id, tag: "EV", color: "var(--muted)", message: `diagnostic deleted · ${client?.name || d.id.slice(0, 8)}${d.is_comp ? " (comp)" : ""}` });
    return NextResponse.json({ ok: true });
  }

  if (action === "booking_link") {
    return NextResponse.json({ ok: true, link: await operatorBookingLink(admin, user.id) });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
