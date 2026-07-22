import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailShell, esc } from "@/lib/email";
import { runOnboardingNudges, detectStalls, runReferralFollowups, runAdvocacyCatchup, type Stall } from "@/lib/automations";
import { runDiagnosticJobs } from "@/lib/diagnostic/cron";
import { dispatchDueAutomations } from "@/lib/automations-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily automation sweep, invoked by Vercel Cron (vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>" automatically once the CRON_SECRET
// env var is set — without it, this endpoint refuses to run.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });

  const nudges = await runOnboardingNudges(admin).catch((e) => { console.error("nudges failed", e); return -1; });
  const stalls: Stall[] = await detectStalls(admin).catch((e) => { console.error("stalls failed", e); return []; });
  const referrals = await runReferralFollowups(admin).catch((e) => { console.error("referrals failed", e); return -1; });
  const advocacy = await runAdvocacyCatchup(admin).catch((e) => { console.error("advocacy failed", e); return -1; });
  const diagnostic = await runDiagnosticJobs(admin).catch((e) => { console.error("diagnostic jobs failed", e); return null; });
  // Operator/Jarvis-defined automations (AUTOMATIONS tab). Never fails the sweep.
  const automations = await dispatchDueAutomations(admin).catch((e) => { console.error("automations failed", e); return { error: String(e) }; });

  // Stall digest to the operator (one email listing everything newly stalled).
  if (stalls.length) {
    const to = process.env.EMAIL_BCC || "hello@creativeimpactmedia.co";
    const rows = stalls.map((s) => `<div style="padding:8px 0;border-bottom:1px solid #24385c"><b style="color:#f4f7fc">${esc(s.name)}</b> — ${s.days} days in ${esc(s.stage)} (threshold ${s.threshold})</div>`).join("");
    await sendEmail({
      to,
      bcc: null, // already going straight to the operator
      subject: `Creative Impact OS — ${stalls.length} client${stalls.length > 1 ? "s" : ""} stalled`,
      html: emailShell(`<div style="font-size:13.5px;color:#b9c8e0;line-height:1.75">These clients have sat in a pipeline stage past its threshold:</div>${rows}<div style="font-size:12px;color:#8ea3c4;margin-top:14px">Each is flagged once per stage — advance them or touch base to clear it.</div>`),
    }).catch((e) => console.error("stall digest failed", e));
  }

  return NextResponse.json({ ok: true, nudges, stalls: stalls.length, referrals, advocacy, diagnostic, automations });
}
