// Authority Diagnostic — daily scheduled jobs (called from /api/cron/daily).
// Reminders E2/E3 + day-10 flag, follow-ups E5/E6/E7, stuck-analysis retry,
// and the Clarity E0 upsell (+24h). Every send dedupes on diagnostic_events.
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailShell, esc } from "@/lib/email";
import { sendE2, sendE3, sendE5, sendE6, sendE7, operatorBookingLink, dxEvent, SIG, type Diag } from "./pipeline";
import { runDiagnostic } from "./agent";

type Admin = NonNullable<ReturnType<typeof getAdminClient>>;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://os.creativeimpactmedia.co";
const DAY = 86400_000;

async function sentAlready(admin: Admin, diagnosticId: string, kind: string): Promise<boolean> {
  const { count } = await admin.from("diagnostic_events").select("id", { count: "exact", head: true })
    .eq("diagnostic_id", diagnosticId).eq("event", "email_sent").eq("payload->>kind", kind);
  return (count || 0) > 0;
}
async function flagged(admin: Admin, diagnosticId: string, event: string): Promise<boolean> {
  const { count } = await admin.from("diagnostic_events").select("id", { count: "exact", head: true })
    .eq("diagnostic_id", diagnosticId).eq("event", event);
  return (count || 0) > 0;
}
async function statusAge(admin: Admin, diagnosticId: string, to: string): Promise<number | null> {
  const { data } = await admin.from("diagnostic_events").select("created_at").eq("diagnostic_id", diagnosticId)
    .eq("event", "status_change").eq("to_status", to).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ? Date.now() - new Date(data.created_at).getTime() : null;
}

export async function runDiagnosticJobs(admin: Admin): Promise<Record<string, number>> {
  const out = { e2: 0, e3: 0, day10: 0, e5: 0, e6: 0, e7: 0, retries: 0, e0: 0 };

  // ---- intake reminders --------------------------------------------------
  const { data: waiting } = await admin.from("diagnostics").select("*").in("status", ["intake_sent", "intake_in_progress"]);
  for (const d of waiting || []) {
    const age = await statusAge(admin, d.id, "intake_sent");
    if (age == null) continue;
    if (d.status === "intake_sent" && age > 2 * DAY && !(await sentAlready(admin, d.id, "dx_e2"))) {
      if ((await sendE2(admin, d as Diag)).ok) out.e2++;
    }
    if (age > 5 * DAY && !(await sentAlready(admin, d.id, "dx_e3"))) {
      if ((await sendE3(admin, d as Diag)).ok) out.e3++;
    }
    if (age > 10 * DAY && !(await flagged(admin, d.id, "day10_flag"))) {
      await dxEvent(admin, d as Diag, "system", "day10_flag");
      const { data: c } = await admin.from("clients").select("name").eq("id", d.client_id).maybeSingle();
      await admin.from("log_entries").insert({ user_id: d.user_id, tag: "AL", color: "var(--red)", message: `diagnostic intake stalled 10d · ${c?.name || ""} — send a personal nudge` });
      out.day10++;
    }
  }

  // ---- stuck analysis retry (max 3 attempts, then it's the board's problem)
  const { data: stuck } = await admin.from("diagnostics").select("*").in("status", ["intake_complete", "analyzing"]);
  for (const d of stuck || []) {
    const { data: intake } = await admin.from("diagnostic_intakes").select("submitted_at").eq("diagnostic_id", d.id).maybeSingle();
    if (!intake?.submitted_at || Date.now() - new Date(intake.submitted_at).getTime() < 3600_000) continue;
    const { count: errs } = await admin.from("diagnostic_events").select("id", { count: "exact", head: true })
      .eq("diagnostic_id", d.id).in("event", ["agent_run_error", "agent_run_failed"]);
    const { count: insufficient } = await admin.from("diagnostic_events").select("id", { count: "exact", head: true })
      .eq("diagnostic_id", d.id).eq("event", "insufficient_data");
    if ((errs || 0) >= 3 || (insufficient || 0) > 0) continue; // human decision territory
    const r = await runDiagnostic(d.id).catch(() => ({ ok: false }));
    if (r.ok) out.retries++;
  }

  // ---- post-delivery follow-ups -------------------------------------------
  const { data: delivered } = await admin.from("diagnostics").select("*").eq("status", "delivered");
  for (const d of delivered || []) {
    const { data: rep } = await admin.from("diagnostic_reports").select("delivered_at").eq("diagnostic_id", d.id).not("delivered_at", "is", null).order("version", { ascending: false }).limit(1).maybeSingle();
    if (!rep?.delivered_at) continue;
    const age = Date.now() - new Date(rep.delivered_at).getTime();
    const deadline = d.credit_deadline ? new Date(d.credit_deadline + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "the credit deadline";
    const booking = await operatorBookingLink(admin, d.user_id);
    if (age > 3 * DAY && !(await sentAlready(admin, d.id, "dx_e5"))) { if ((await sendE5(admin, d as Diag)).ok) out.e5++; }
    if (age > 14 * DAY && !(await sentAlready(admin, d.id, "dx_e6"))) { if ((await sendE6(admin, d as Diag, deadline, booking)).ok) out.e6++; }
    if (age > 75 * DAY && !(await sentAlready(admin, d.id, "dx_e7"))) { if ((await sendE7(admin, d as Diag, deadline, booking)).ok) out.e7++; }
    // credit clock expiry -> closed
    if (d.credit_deadline && new Date(d.credit_deadline + "T23:59:59Z").getTime() < Date.now()) {
      await admin.from("diagnostics").update({ status: "closed" }).eq("id", d.id);
      await dxEvent(admin, d as Diag, "system", "status_change", { reason: "credit window expired" }, "delivered", "closed");
    }
  }

  // ---- Clarity E0 upsell (+24h after session, once, only if no diagnostic) --
  const cutoff = new Date(Date.now() - DAY).toISOString();
  const { data: sessions } = await admin.from("clarity_sessions").select("*")
    .is("upsell_email_sent_at", null).not("email", "is", null).lt("created_at", cutoff).limit(25);
  for (const s of sessions || []) {
    // skip anyone already in the diagnostic pipeline
    const { data: existing } = await admin.from("diagnostics").select("id").eq("clarity_session_id", s.id).limit(1).maybeSingle();
    if (existing) { await admin.from("clarity_sessions").update({ upsell_email_sent_at: new Date().toISOString() }).eq("id", s.id); continue; }
    const res = await sendEmail({
      to: s.email!,
      subject: "Your Clarity read is the diagnosis. Here's the price tag on the disease.",
      replyTo: process.env.EMAIL_REPLY_TO,
      html: emailShell(
        `<p style="font-size:13.5px;color:#b9c8e0;line-height:1.75;margin:0 0 14px">Yesterday the board gave you the read on your positioning. Fair warning about what usually happens next: nothing. The read gets filed, the same ads keep running, and the same leak keeps draining.</p>
         <p style="font-size:13.5px;color:#b9c8e0;line-height:1.75;margin:0 0 14px">Here's the alternative. The Authority Diagnostic takes what the board saw and runs it against your actual ad account — your spend, your hook rate, your cost per lead, read against benchmark. You get the leak located, the fixes ranked by impact per dollar, and the math on what the fix is worth. In writing, $750, no discovery call standing between you and the price.</p>
         <p style="font-size:13.5px;color:#b9c8e0;line-height:1.75;margin:0 0 14px">Everything in the report is yours to run with — plenty of people take it and never talk to us again. That was the deal.</p>
         <div style="margin:18px 0"><a href="${esc(SITE + "/diagnostic")}" style="display:inline-block;background:#ffb81c;color:#1a1608;font-weight:700;font-size:13px;letter-spacing:.06em;text-decoration:none;padding:12px 20px">→ Turn the read into the fix list — $750, report in 5 business days</a></div>` + SIG
      ),
    });
    if (res.ok) { await admin.from("clarity_sessions").update({ upsell_email_sent_at: new Date().toISOString() }).eq("id", s.id); out.e0++; }
    else break; // email not configured — don't spin the loop
  }

  return out;
}
