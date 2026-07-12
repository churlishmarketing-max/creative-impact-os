// Authority Diagnostic — agent runner (server-only).
// One job: runDiagnostic(diagnosticId). Reads OS data + the scoring law,
// writes report JSON back as a draft. It NEVER touches a client-visible
// surface — delivery is gated on Brandon's approval (HITL, hard-coded).
import { getAdminClient } from "@/lib/supabase/admin";
import { SCORING_LAW, REPORT_BLUEPRINT } from "./law";
import { validateVoice, validateReportShape } from "./voice";
import { projectFix, type ComputedMetrics } from "./metrics";

const MODEL = process.env.AGENT_MODEL || "claude-sonnet-5";
type Admin = NonNullable<ReturnType<typeof getAdminClient>>;

async function logEvent(admin: Admin, d: { id: string; user_id: string; trace_id: string }, event: string, payload: Record<string, unknown> = {}, from?: string, to?: string) {
  await admin.from("diagnostic_events").insert({
    diagnostic_id: d.id, user_id: d.user_id, trace_id: d.trace_id,
    actor: "agent", event, from_status: from || null, to_status: to || null, payload,
  });
}

// Fetch client site copy server-side (standing rule: read their URLs before writing).
async function fetchSiteText(url?: string | null): Promise<string> {
  if (!url) return "";
  try {
    const u = /^https?:\/\//i.test(url) ? url : "https://" + url;
    const r = await fetch(u, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0 (Creative ImpactOS diagnostic)" } });
    if (!r.ok) return "";
    const html = await r.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/\s+/g, " ").trim().slice(0, 6000);
  } catch { return ""; }
}

const REPORT_TOOL = {
  name: "submit_report",
  description: "Submit the completed Authority Diagnostic report.",
  input_schema: {
    type: "object",
    properties: {
      snapshot: {
        type: "object",
        properties: {
          authority_score: {
            type: "object",
            properties: {
              value: { type: "number" }, band: { type: "string" },
              factors: { type: "array", items: { type: "object", properties: { name: { type: "string" }, score: { type: "number" }, evidence: { type: "string" } }, required: ["name", "score", "evidence"] } },
              read: { type: "string" },
            },
            required: ["value", "band", "factors", "read"],
          },
          cards: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, value: { type: "string" }, target: { type: "string" }, read: { type: "string" } }, required: ["metric", "value", "target", "read"] } },
          verdict_line: { type: "string" },
          verdict_paragraph: { type: "string" },
        },
        required: ["authority_score", "cards", "verdict_line", "verdict_paragraph"],
      },
      numbers: {
        type: "object",
        properties: {
          rows: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, value: { type: "string" }, healthy: { type: "string" }, read: { type: "string" }, rating: { type: "string" } }, required: ["metric", "value", "healthy", "read", "rating"] } },
          diagnosis: { type: "string" },
          data_gaps: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, why_it_matters: { type: "string" } }, required: ["metric", "why_it_matters"] } },
        },
        required: ["rows", "diagnosis", "data_gaps"],
      },
      gap: {
        type: "object",
        properties: {
          framing: { type: "string" },
          items: { type: "array", items: { type: "object", properties: { header: { type: "string" }, body: { type: "string" }, evidence_quote: { type: "string" }, maps_to_factor: { type: "string" } }, required: ["header", "body", "evidence_quote"] } },
        },
        required: ["framing", "items"],
      },
      fix: {
        type: "object",
        properties: {
          items: { type: "array", items: { type: "object", properties: { rank: { type: "number" }, biggest_lever: { type: "boolean" }, title: { type: "string" }, body: { type: "string" } }, required: ["rank", "biggest_lever", "title", "body"] } },
          rewrite: { type: "object", properties: { before: { type: "string" }, after: { type: "string" }, proof_point_source: { type: "string" } }, required: ["before", "after", "proof_point_source"] },
        },
        required: ["items", "rewrite"],
      },
      math: {
        type: "object",
        properties: {
          rows: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] } },
          assumptions: { type: "string" },
          point_of_750: { type: "string" },
          skipped: { type: "boolean" },
        },
        required: ["rows", "assumptions", "point_of_750", "skipped"],
      },
      next: { type: "object", properties: { cta: { type: "string" } }, required: ["cta"] },
      internal_notes: { type: "string", description: "Adversary pass: one paragraph a skeptical owner would push back with. Brandon-only." },
      confidence_flags: { type: "array", items: { type: "object", properties: { path: { type: "string" }, note: { type: "string" } }, required: ["path", "note"] } },
      insufficient_data: { type: "boolean", description: "true ONLY when the intake is too thin to diagnose — never fabricate a read." },
      data_gaps_fatal: { type: "array", items: { type: "string" }, description: "when insufficient_data: the specific missing pieces" },
    },
    required: ["snapshot", "numbers", "gap", "fix", "math", "next", "internal_notes", "confidence_flags", "insufficient_data"],
  },
};

export async function runDiagnostic(diagnosticId: string): Promise<{ ok: boolean; error?: string; insufficient?: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const admin = getAdminClient();
  if (!admin || !apiKey) return { ok: false, error: "not_configured" };

  const { data: d } = await admin.from("diagnostics").select("*").eq("id", diagnosticId).maybeSingle();
  if (!d) return { ok: false, error: "not_found" };
  if (!["intake_complete", "analyzing"].includes(d.status)) return { ok: false, error: "wrong_status_" + d.status };

  const [{ data: intake }, { data: metrics }, { data: client }] = await Promise.all([
    admin.from("diagnostic_intakes").select("*").eq("diagnostic_id", d.id).maybeSingle(),
    admin.from("diagnostic_metrics").select("*").eq("diagnostic_id", d.id).maybeSingle(),
    admin.from("clients").select("name, contact_name, email").eq("id", d.client_id).maybeSingle(),
  ]);
  if (!intake?.submitted_at || !metrics) return { ok: false, error: "intake_not_complete" };

  await admin.from("diagnostics").update({ status: "analyzing" }).eq("id", d.id);
  await logEvent(admin, d, "agent_run_started", {}, d.status, "analyzing");

  // benchmark config (industry override falls through to default)
  const { data: benchRows } = await admin.from("benchmark_configs").select("*").in("key", [d.benchmark_key, "default_local_service_meta"]);
  const bench = (benchRows || []).find((b) => b.key === d.benchmark_key) || (benchRows || [])[0];
  const benchDefault = (benchRows || []).find((b) => b.is_default) || bench;

  // fetched site copy (may already be cached on the intake)
  let siteText = intake.site_text || "";
  if (!siteText) {
    const home = await fetchSiteText(intake.website_url);
    const landing = intake.landing_url && intake.landing_url !== intake.website_url ? await fetchSiteText(intake.landing_url) : "";
    siteText = [home && "HOMEPAGE:\n" + home, landing && "LANDING PAGE:\n" + landing].filter(Boolean).join("\n\n");
    if (siteText) await admin.from("diagnostic_intakes").update({ site_text: siteText }).eq("diagnostic_id", d.id);
  }

  // OS-computed projection (the agent never computes ratios — Fable Law 6)
  const computed = metrics.computed as ComputedMetrics;
  const raw = metrics.raw as { leads?: number; spend?: number };
  const projection = projectFix(computed, raw.leads ?? null, raw.spend ?? null, (bench?.projection as never) || undefined);

  // Clarity Engine enrichment when a session is linked
  let clarityBlock = "";
  if (d.clarity_session_id) {
    const { data: cs } = await admin.from("clarity_sessions").select("answers, board_read, created_at").eq("id", d.clarity_session_id).maybeSingle();
    if (cs) clarityBlock = `\n\nCLARITY ENGINE SESSION (free positioning interview this client completed ${new Date(cs.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })} — use as evidence for Authority Score factors, reference for continuity where it earns trust, and flag contradictions with the intake in internal_notes, never in the client report):\nANSWERS: ${JSON.stringify(cs.answers).slice(0, 4000)}\nBOARD READ: ${JSON.stringify(cs.board_read || {}).slice(0, 2000)}`;
  }

  const system = `You are the Authority Diagnostic agent for Creative Impact — Brandon King's one-operator marketing studio. You write the $750 written diagnostic report: where a prospect's authority positioning and ad spend are leaking money, and the prioritized fix. The report either converts them to a retainer or stands alone — both are wins. Proof before promise; the problem named before the pitch.

THE SCORING LAW (follow exactly — benchmarks, matrices, Authority Score anchors, CTA law, projection rules):
${SCORING_LAW}

THE REPORT CONTRACT (structure, section content, voice law — follow exactly):
${REPORT_BLUEPRINT}

HARD RULES:
- next.cta sells the NEXT step only (Authority Engine/System — or, on the no-ads track, the prescribed entry offer). The reader has already bought and read this diagnostic: the CTA must NEVER mention the diagnostic itself and must never contain the word "free". Validation rejects both.
- Every finding carries a number, a range, or a date. A finding without a number gets cut or quantified.
- Read metric pairs, never single metrics. The matrices drive the prescription — the OS already placed this account; do not re-derive ratios or contradict the placement.
- No fabricated proof, no invented client results, no guessed industry stats. Missing data is named as missing. If they gave no proof point, the rewrite holds labeled space "[your number here — the first thing to go earn]".
- Every CTA you write must pass the CTA law (approved patterns only; the banned list fails the build).
- The report should hurt a little and help a lot. Quote THEIR actual copy in every gap item.
- internal_notes = your adversary pass: what would a skeptical owner push back on in this draft? Brandon-only.
- If the data is genuinely too thin to diagnose, set insufficient_data=true and list what's missing — never fabricate a read.
- Submit via the submit_report tool. Nothing else.`;

  // Track: paid ads (numbers to read) vs go-to-market (nothing to read — the
  // diagnosis is that they need to START, and which entry offer fits).
  const payload = (intake.payload || {}) as Record<string, unknown>;
  const noAdsTrack = String(payload.running_ads || "").startsWith("No ads");
  const organicTrack = noAdsTrack && String(payload.posting_organic || "").startsWith("Yes");
  const trackBlock = noAdsTrack ? `

TRACK: NO PAID ADS — GO-TO-MARKET VARIANT (do NOT return insufficient_data; this track is fully diagnosable):
${organicTrack
    ? "- They post ORGANIC content but run no ads. Read their organic reality from the intake (platforms, frequency, best post, where it sends people) the way you'd read an ad account: name what's working, what's wasted, and what organic alone cannot do at their customer value."
    : "- They run NO ads and post NO consistent content. The diagnosis is the cost of invisibility: read how customers find them today, what that channel can't scale to, and what staying dark costs at their stated customer value."}
- Section 02 (numbers): fill the rows with WHAT WE'D MEASURE FIRST — metric name, value "—", the healthy range from the benchmark, and a read on why that number will matter to them. The diagnosis paragraph reads their current reality, not fabricated metrics.
- Section 04 rewrite: "before" is ${organicTrack ? "their best post's opening line from the intake" : "their homepage's opening line from the fetched site copy (quote it verbatim; if no site copy was fetched, use their 'why pick us' answer as the before)"}.
- Section 05 math: skipped=true, with assumptions explaining the honest version — what a first properly-run month would tell us, using their customer value and budget answer. Never invent projections without a current baseline.
- Section 06 prescription — ENTRY LADDER (exact prices, never invent others, never promise credits beyond what's stated):
  · Ad Creative Tournament — $2,500 one-time. Best when they need creative proven fast before committing monthly.
  · 48-Hour Tool Sprint — $5,000 one-time. Best when the offer/funnel needs building before traffic makes sense.
  · Authority Engine — $3,500/mo, 3-month minimum. Best when they're ready to run the whole system. The $750 diagnostic credit applies toward the FIRST MONTH of Engine (or Market Domination, $6,000/mo) only — never toward one-time offers.
  Prescribe ONE primary path, chosen from their budget answer ("${String(payload.budget_ready || "not given")}") and capacity — name it plainly in next.cta.` : "";

  const userMsg = `CLIENT: ${client?.name || "Unknown"} (contact: ${client?.contact_name || "—"})${trackBlock}
BENCHMARK CONFIG USED: ${bench?.key || "default_local_service_meta"} (${bench?.label || ""}) — thresholds: ${JSON.stringify(bench?.thresholds || {})}${bench?.key !== benchDefault?.key ? `\nDEFAULT FALLTHROUGH: ${JSON.stringify(benchDefault?.thresholds || {})}` : ""}

INTAKE (their words, verbatim — quote from this):
${JSON.stringify(intake.payload, null, 1).slice(0, 12000)}

OS-COMPUTED METRICS (authoritative — never recompute):
raw: ${JSON.stringify(metrics.raw)}
computed: ${JSON.stringify(metrics.computed)}
ratings vs benchmark: ${JSON.stringify(metrics.ratings)}
matrix_1: ${metrics.matrix_1} · matrix_2: ${metrics.matrix_2} · frequency_override: ${metrics.freq_override} · verdict action: ${String(metrics.action || "").toUpperCase()}

OS-COMPUTED PROJECTION (section 05 uses these numbers verbatim; if skipped, honor the reason):
${JSON.stringify(projection)}

INTAKE ANOMALIES (soft-validation warnings — mention in internal_notes if they matter): ${JSON.stringify(intake.anomalies)}

FETCHED SITE COPY:
${siteText || "(fetch failed or no URL — note as a data gap if positioning evidence is thin)"}${clarityBlock}

Write the full report now and submit it via submit_report.`;

  const call = async (extra?: string) => {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 8000, system,
        tools: [REPORT_TOOL], tool_choice: { type: "tool", name: "submit_report" },
        messages: [{ role: "user", content: extra ? `${userMsg}\n\nYOUR PREVIOUS DRAFT FAILED VALIDATION — fix these and resubmit:\n${extra}` : userMsg }],
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || "api_error");
    const tu = (j.content || []).find((b: { type: string }) => b.type === "tool_use");
    return tu?.input as Record<string, unknown> | undefined;
  };

  try {
    let report = await call();
    let problems = validateReport(report);
    if (problems.length) {
      await logEvent(admin, d, "agent_validation_failed", { problems });
      report = await call(problems.join("\n"));
      problems = validateReport(report);
      if (problems.length) {
        await logEvent(admin, d, "agent_run_failed", { problems });
        return { ok: false, error: "validation_failed: " + problems.slice(0, 3).join("; ") };
      }
    }
    const rep = report as Record<string, unknown>;

    if (rep.insufficient_data) {
      await admin.from("diagnostics").update({ status: "intake_complete" }).eq("id", d.id);
      await logEvent(admin, d, "insufficient_data", { gaps: rep.data_gaps_fatal }, "analyzing", "intake_complete");
      await admin.from("log_entries").insert({ user_id: d.user_id, tag: "AL", color: "var(--red)", message: `diagnostic ${client?.name || d.id.slice(0, 8)} · insufficient data — decide: request more or positioning-only report` });
      return { ok: true, insufficient: true };
    }

    // version = max existing + 1
    const { data: prev } = await admin.from("diagnostic_reports").select("version").eq("diagnostic_id", d.id).order("version", { ascending: false }).limit(1).maybeSingle();
    const version = (prev?.version || 0) + 1;
    const internal_notes = String(rep.internal_notes || "");
    const confidence = rep.confidence_flags || [];
    delete rep.internal_notes; delete rep.confidence_flags; delete rep.insufficient_data; delete rep.data_gaps_fatal;
    rep.matrix_positions = { m1: metrics.matrix_1, m2: metrics.matrix_2, frequency_override: metrics.freq_override, action: metrics.action };
    rep.benchmark_config = bench?.key || "default_local_service_meta";

    const { error } = await admin.from("diagnostic_reports").insert({
      diagnostic_id: d.id, user_id: d.user_id, version, report: rep,
      internal_notes, confidence, data_gaps: (rep.numbers as { data_gaps?: unknown[] })?.data_gaps || [],
    });
    if (error) return { ok: false, error: error.message };

    await admin.from("diagnostics").update({ status: "draft_ready" }).eq("id", d.id);
    await logEvent(admin, d, "draft_ready", { version }, "analyzing", "draft_ready");
    await admin.from("log_entries").insert({ user_id: d.user_id, tag: "RK", color: "var(--cream)", message: `diagnostic draft ready · ${client?.name || ""} · v${version} — review + approve on the board` });
    return { ok: true };
  } catch (e) {
    await logEvent(admin, d, "agent_run_error", { error: String(e) });
    return { ok: false, error: String(e) };
  }
}

function validateReport(report: Record<string, unknown> | undefined): string[] {
  if (!report) return ["no tool_use output returned"];
  if (report.insufficient_data) return []; // honesty path is always valid
  const shape = validateReportShape(report);
  const voice = validateVoice(report).map((v) => `${v.kind} "${v.match}" at ${v.path}`);
  // The closing CTA sells the NEXT step — never the diagnostic the reader is
  // holding, never "free" (they paid $750 for this document).
  const cta = String((report.next as { cta?: string } | undefined)?.cta || "");
  const ctaProblems = /\b(diagnostic|free)\b/i.test(cta)
    ? [`next.cta must sell the next step (Engine/System or the prescribed entry offer) — it may not contain "diagnostic" or "free". Got: "${cta}"`]
    : [];
  return [...shape, ...voice, ...ctaProblems];
}
