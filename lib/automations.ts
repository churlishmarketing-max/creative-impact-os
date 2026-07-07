// Lifecycle automations (server-only). Called from the stage-advance hook and
// the daily cron. Everything client-facing is drafted by Anchor and queued
// for approval in COMMS — EXCEPT the onboarding nudge, which auto-sends (same
// standing instruction as submission responses: routine onboarding mechanics
// don't wait on the operator).
import { getAdminClient } from "@/lib/supabase/admin";
import { draftAgentEmail, sendQueuedEmail } from "@/lib/agent";
import crypto from "crypto";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://os.creativeimpactmedia.co";

type Admin = NonNullable<ReturnType<typeof getAdminClient>>;

async function hasEmailOfKind(admin: Admin, clientId: string, kind: string, after?: string) {
  let q = admin.from("email_log").select("id", { count: "exact", head: true })
    .eq("client_id", clientId).eq("kind", kind).neq("status", "rejected");
  if (after) q = q.gt("created_at", after);
  const { count } = await q;
  return (count || 0) > 0;
}

export async function ensureReferralCode(admin: Admin, userId: string, clientId: string): Promise<string> {
  const { data: existing } = await admin.from("referral_codes").select("code").eq("client_id", clientId).maybeSingle();
  if (existing?.code) return existing.code;
  const code = crypto.randomBytes(4).toString("hex");
  const { error } = await admin.from("referral_codes").insert({ user_id: userId, client_id: clientId, code });
  if (error) { // lost a race or re-run — read back
    const { data: again } = await admin.from("referral_codes").select("code").eq("client_id", clientId).maybeSingle();
    return again?.code || code;
  }
  return code;
}

// Referral sequence step N (1-3). Drafts for approval; dedupes on kind.
const REFERRAL_TASKS: Record<number, string> = {
  1: "The client's project has reached the advocacy stage — the work is done and live. Ask, warmly and personally, whether they know one other business owner who'd benefit from the same kind of work. Give them their personal referral link (provided) — anyone who uses it lands on our page and we know it came from them. Frame it as a favor between partners, not a campaign.",
  2: "Follow up on the referral ask from about a week ago, with a different angle: briefly remind them what got built for them, and that the best clients come from people like them. Include their referral link. Keep it shorter than the first ask.",
  3: "Final, lightest touch of the referral sequence — one or two sentences. The door stays open, their referral link is below, zero pressure. This is the last one we send about it.",
};

export async function draftReferralStep(admin: Admin, userId: string, clientId: string, step: 1 | 2 | 3) {
  const kind = `referral_${step}`;
  if (await hasEmailOfKind(admin, clientId, kind)) return { ok: false, skipped: true };
  const code = await ensureReferralCode(admin, userId, clientId);
  const res = await draftAgentEmail({
    userId, clientId, kind,
    task: REFERRAL_TASKS[step],
    context: { link: `${SITE}/r/${code}` },
  });
  if (res.ok) {
    await admin.from("client_events").insert({ user_id: userId, client_id: clientId, kind: "email", message: `Anchor drafted referral ask ${step}/3 (awaiting approval)` });
  }
  return res;
}

// Runs when a client enters a new pipeline stage: queue the stage-update email
// if the stage wants one, and kick off the referral sequence on Advocacy.
export async function stageEnteredAutomations(userId: string, clientId: string) {
  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "not_configured" };

  const { data: client } = await admin.from("clients")
    .select("id, pipeline_stage_id, stage_entered_at").eq("id", clientId).eq("user_id", userId).maybeSingle();
  if (!client?.pipeline_stage_id) return { ok: false, error: "no_stage" };

  const { data: stage } = await admin.from("pipeline_stages")
    .select("name, email_on_enter").eq("id", client.pipeline_stage_id).maybeSingle();
  if (!stage) return { ok: false, error: "no_stage" };

  const did: string[] = [];
  if (stage.email_on_enter) {
    // one stage email per stage entry — dedupe against drafts since entering
    const dup = await hasEmailOfKind(admin, clientId, "stage_update", client.stage_entered_at || undefined);
    if (!dup) {
      const res = await draftAgentEmail({
        userId, clientId, kind: "stage_update",
        task: `The client's project just entered the "${stage.name}" stage. Tell them in two or three sentences what this stage means and what happens next. No action needed from them unless it's obvious from the stage itself.`,
        context: { stage: stage.name },
      });
      if (res.ok) did.push("stage_update drafted");
    }
  }
  if (stage.name === "Advocacy") {
    const r = await draftReferralStep(admin, userId, clientId, 1);
    if (r.ok) did.push("referral sequence started");
  }
  return { ok: true, did };
}

// ---- Daily cron jobs --------------------------------------------------------

// Nudge clients whose onboarding form has sat unfinished for 3+ days.
// AUTO-SENDS (one nudge per run, ever).
export async function runOnboardingNudges(admin: Admin) {
  const cutoff = new Date(Date.now() - 3 * 86400_000).toISOString();
  const { data: runs } = await admin.from("onboarding_runs")
    .select("id, user_id, client_id, magic_token, sent_at, status")
    .in("status", ["sent", "in_progress"]).lt("sent_at", cutoff);
  let sent = 0;
  for (const run of runs || []) {
    if (await hasEmailOfKind(admin, run.client_id, "onboarding_nudge", run.sent_at)) continue;
    const draft = await draftAgentEmail({
      userId: run.user_id, clientId: run.client_id, kind: "onboarding_nudge",
      task: "Their onboarding form has been waiting about three days. Nudge them gently — acknowledge everyone's busy, restate that it takes about ten minutes and it's what unblocks the work, and include the link. Do not guilt them.",
      context: { link: `${SITE}/onboard/${run.magic_token}` },
    });
    if (draft.ok && draft.id) {
      const r = await sendQueuedEmail(draft.id, run.user_id);
      if (r.ok) sent++; // if send fails it stays queued in COMMS for manual approval
    }
  }
  return sent;
}

// Flag clients who've sat in a stage past its stall_days threshold.
// Operator-facing only: activity-feed event + cockpit log; caller emails the digest.
export type Stall = { userId: string; clientId: string; name: string; stage: string; days: number; threshold: number };

export async function detectStalls(admin: Admin): Promise<Stall[]> {
  const { data: clients } = await admin.from("clients")
    .select("id, user_id, name, pipeline_stage_id, stage_entered_at")
    .not("pipeline_stage_id", "is", null).not("stage_entered_at", "is", null);
  const stalls: Stall[] = [];
  for (const c of clients || []) {
    const { data: stage } = await admin.from("pipeline_stages").select("name, stall_days").eq("id", c.pipeline_stage_id).maybeSingle();
    if (!stage?.stall_days) continue;
    const days = Math.floor((Date.now() - new Date(c.stage_entered_at).getTime()) / 86400_000);
    if (days < stage.stall_days) continue;
    // one alert per stage entry
    const { count } = await admin.from("client_events").select("id", { count: "exact", head: true })
      .eq("client_id", c.id).eq("kind", "stall").gt("created_at", c.stage_entered_at);
    if ((count || 0) > 0) continue;
    stalls.push({ userId: c.user_id, clientId: c.id, name: c.name, stage: stage.name, days, threshold: stage.stall_days });
    await admin.from("client_events").insert({ user_id: c.user_id, client_id: c.id, kind: "stall", message: `Stalled: ${days} days in ${stage.name} (threshold ${stage.stall_days})` });
    await admin.from("log_entries").insert({ user_id: c.user_id, tag: "AL", color: "var(--red)", message: `stall alert · ${c.name} · ${days}d in ${stage.name}` });
  }
  return stalls;
}

// Advance the referral sequence: step 2 a week after step 1 was SENT,
// step 3 a week after step 2 was SENT. (If a draft is never approved, the
// sequence waits — that's the point of approval mode.)
export async function runReferralFollowups(admin: Admin) {
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  let drafted = 0;
  for (const step of [2, 3] as const) {
    const prev = `referral_${step - 1}`;
    const { data: sentPrev } = await admin.from("email_log")
      .select("user_id, client_id").eq("kind", prev).eq("status", "sent").lt("sent_at", weekAgo).not("client_id", "is", null);
    for (const row of sentPrev || []) {
      const r = await draftReferralStep(admin, row.user_id, row.client_id!, step);
      if (r.ok) drafted++;
    }
  }
  return drafted;
}

// Safety net: a client sitting in Advocacy with no referral_1 yet (e.g. moved
// there before this build, or moved outside the dashboard) gets the kickoff.
export async function runAdvocacyCatchup(admin: Admin) {
  const { data: stages } = await admin.from("pipeline_stages").select("id, user_id").eq("name", "Advocacy");
  let started = 0;
  for (const s of stages || []) {
    const { data: clients } = await admin.from("clients").select("id, user_id").eq("pipeline_stage_id", s.id);
    for (const c of clients || []) {
      const r = await draftReferralStep(admin, c.user_id, c.id, 1);
      if (r.ok) started++;
    }
  }
  return started;
}
