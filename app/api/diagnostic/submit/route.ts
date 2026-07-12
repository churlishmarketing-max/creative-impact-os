import { NextResponse, after } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { computeDerived, findAnomalies, rateMetrics, placeMatrices, type RawMetrics } from "@/lib/diagnostic/metrics";
import { dxEvent, transition, type Diag } from "@/lib/diagnostic/pipeline";
import { runDiagnostic } from "@/lib/diagnostic/agent";

export const runtime = "nodejs";
export const maxDuration = 300; // the agent run happens inline when it fits

// Public, token-gated: final intake submit. The OS computes every derived
// metric here (the one implementation), stores raw+computed together, then
// auto-fires the analysis (SPEC.md assumption 2 — confirmed by Brandon).
export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 400 });

  let token = "";
  try { ({ token } = await req.json()); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const { data: d } = await admin.from("diagnostics").select("*").eq("intake_token", token).maybeSingle();
  if (!d) return NextResponse.json({ ok: false }, { status: 404 });
  if (!["intake_sent", "intake_in_progress"].includes(d.status)) {
    return NextResponse.json({ ok: d.status !== "created", already: true });
  }

  const { data: intake } = await admin.from("diagnostic_intakes").select("payload").eq("diagnostic_id", d.id).maybeSingle();
  const p = ((intake?.payload as Record<string, unknown>) || {});

  // Branch-aware requireds (mirrors the form's fieldVisible logic):
  // ads track needs the raw numbers + creative; no-ads forks into the
  // organic track or the nothing-running (go-to-market) track.
  const noAds = String(p.running_ads || "").startsWith("No ads");
  const organic = String(p.posting_organic || "").startsWith("Yes");
  const required = ["business", "industry", "market", "website", "customer_value", "offer", "why_us", "proof", "ideal_customer", "objection", "running_ads"];
  if (!noAds) required.push("platforms", "date_range", "spend", "impressions", "reach", "link_clicks", "leads", "budget", "retargeting", "opening_line", "ad_copy", "creatives_live", "creative_age", "cta");
  else {
    required.push("posting_organic", "budget_ready");
    if (organic) required.push("platforms_organic", "post_frequency", "best_post", "best_post_opening");
    else required.push("found_today", "why_not");
  }
  const missing = required.filter((k) => p[k] == null || String(p[k]).trim() === "");
  if (missing.length) return NextResponse.json({ ok: false, error: "missing_required", missing }, { status: 400 });

  // "I don't have this" boxes arrive as literal null markers. On the no-ads
  // track there are no numbers to read: metrics stay null and the agent
  // writes the go-to-market variant instead (never a fabricated read).
  const rawNum = (k: string): number | null => (noAds || p[k] === "__none__" || p[k] == null || p[k] === "" ? null : Number(String(p[k]).replace(/[$,\s]/g, "")));
  const raw: RawMetrics = {
    spend: rawNum("spend"), impressions: rawNum("impressions"), reach: rawNum("reach"),
    plays_3s: rawNum("plays_3s"), views_50: rawNum("views_50"),
    link_clicks: rawNum("link_clicks"), clicks_all: rawNum("clicks_all"), leads: rawNum("leads"),
  };
  const computed = computeDerived(raw);
  const anomalies = noAds ? [] : findAnomalies(raw);

  // benchmark: industry override row when one exists, else default
  const industry = String(p.industry || "").toLowerCase();
  const { data: benchRows } = await admin.from("benchmark_configs").select("key, thresholds, industry, is_default").eq("user_id", d.user_id);
  const bench = (benchRows || []).find((b) => b.industry && industry.includes(b.industry)) || null;
  const benchDefault = (benchRows || []).find((b) => b.is_default) || null;
  const benchKey = bench?.key || benchDefault?.key || "default_local_service_meta";
  const ratings = rateMetrics(computed, (bench?.thresholds as never) || (benchDefault?.thresholds as never) || {}, (benchDefault?.thresholds as never) || {});
  const matrices = noAds
    ? { matrix_1: null, matrix_2: null, freq_override: false, action: null } // go-to-market track, not "insufficient"
    : placeMatrices(computed, String(p.retargeting || "no"));

  await admin.from("diagnostic_metrics").upsert({
    diagnostic_id: d.id, user_id: d.user_id, raw, computed, ratings,
    matrix_1: matrices.matrix_1, matrix_2: matrices.matrix_2,
    freq_override: matrices.freq_override, action: matrices.action,
    computed_at: new Date().toISOString(),
  }, { onConflict: "diagnostic_id" });
  await admin.from("diagnostics").update({ benchmark_key: benchKey }).eq("id", d.id);
  await admin.from("diagnostic_intakes").update({ submitted_at: new Date().toISOString(), anomalies }).eq("diagnostic_id", d.id);
  await transition(admin, d as Diag, "intake_complete", "client", { anomalies, action: matrices.action, track: noAds ? (organic ? "organic_only" : "nothing_running") : "ads" });

  const { data: client } = await admin.from("clients").select("name").eq("id", d.client_id).maybeSingle();
  await admin.from("log_entries").insert({ user_id: d.user_id, tag: "EV", color: "#2ee06f", message: `diagnostic intake in · ${client?.name || ""} · ${noAds ? "GO-TO-MARKET track (no ads)" : "verdict " + String(matrices.action).toUpperCase()} · analysis running` });
  await admin.from("client_events").insert({ user_id: d.user_id, client_id: d.client_id, kind: "system", message: "Diagnostic intake submitted — analysis started" });

  // Auto-fire the analysis after the response returns (after() keeps the
  // function alive). If the clock still cuts it short, the daily cron + the
  // board's RUN button retry — status tracks the truth either way.
  after(async () => {
    const r = await runDiagnostic(d.id).catch((e) => ({ ok: false, error: String(e) }));
    if (!r.ok) console.error("diagnostic run failed", r.error);
  });

  return NextResponse.json({ ok: true });
}
