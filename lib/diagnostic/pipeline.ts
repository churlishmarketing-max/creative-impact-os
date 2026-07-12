// Authority Diagnostic — pipeline plumbing (server-only): status transitions
// with audit events, and the E1–E7 email sends (copy verbatim from
// docs/authority-diagnostic/emails.md — send-ready, do not rewrite).
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailShell, esc } from "@/lib/email";

type Admin = NonNullable<ReturnType<typeof getAdminClient>>;
export type Diag = { id: string; user_id: string; client_id: string; status: string; trace_id: string; intake_token: string; report_token: string; credit_deadline?: string | null; is_comp?: boolean };

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://os.creativeimpactmedia.co";
export const SIG = `<div style="margin-top:18px;padding-top:12px;border-top:1px solid #24385c;font-size:12px;color:#8ea3c4;line-height:1.6"><b style="color:#f4f7fc">Brandon King</b> · Creative Impact · hello@creativeimpactmedia.co</div>`;

export async function dxEvent(admin: Admin, d: Diag, actor: string, event: string, payload: Record<string, unknown> = {}, from?: string, to?: string) {
  await admin.from("diagnostic_events").insert({
    diagnostic_id: d.id, user_id: d.user_id, trace_id: d.trace_id, actor, event,
    from_status: from || null, to_status: to || null, payload,
  });
}

export async function transition(admin: Admin, d: Diag, to: string, actor: string, payload: Record<string, unknown> = {}) {
  await admin.from("diagnostics").update({ status: to }).eq("id", d.id);
  await dxEvent(admin, d, actor, "status_change", payload, d.status, to);
  d.status = to;
}

function para(text: string): string {
  return text.split(/\n\n+/).map((p) => `<p style="font-size:13.5px;color:#b9c8e0;line-height:1.75;margin:0 0 14px">${esc(p).replace(/\n/g, "<br/>")}</p>`).join("");
}
function ctaBtn(label: string, url: string): string {
  return `<div style="margin:18px 0"><a href="${url}" style="display:inline-block;background:#ffb81c;color:#1a1608;font-weight:700;font-size:13px;letter-spacing:.06em;text-decoration:none;padding:12px 20px">→ ${esc(label)}</a></div>`;
}

async function clientEmail(admin: Admin, clientId: string): Promise<{ email: string; name: string } | null> {
  const { data: c } = await admin.from("clients").select("email, name").eq("id", clientId).maybeSingle();
  return c?.email ? { email: c.email, name: c.name } : null;
}

async function sendDx(admin: Admin, d: Diag, kind: string, subject: string, html: string) {
  const to = await clientEmail(admin, d.client_id);
  if (!to) return { ok: false, error: "client_has_no_email" };
  const res = await sendEmail({ to: to.email, subject, replyTo: process.env.EMAIL_REPLY_TO, from: `Brandon King — Creative Impact <${(process.env.EMAIL_FROM || "hello@os.creativeimpactmedia.co").replace(/^.*<|>$/g, "") || "hello@os.creativeimpactmedia.co"}>`, html: emailShell(html + SIG) });
  if (res.ok) {
    await dxEvent(admin, d, "system", "email_sent", { kind, subject });
    await admin.from("email_messages").insert({ user_id: d.user_id, client_id: d.client_id, direction: "out", from_email: "hello@os.creativeimpactmedia.co", to_email: to.email, subject, body: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000) });
  }
  return res;
}

// E1 — intake link (fires on paid / comp creation)
export async function sendE1(admin: Admin, d: Diag) {
  const link = `${SITE}/diagnostic/intake/${d.intake_token}`;
  return sendDx(admin, d, "dx_e1", "Your Diagnostic is paid. Here's step one.",
    para(`You just did the thing most owners won't: paid to find out what's actually wrong instead of guessing for another quarter.

Here's how this works. You fill out one form — about 12 minutes with your Ads Manager open. We read your real numbers against benchmark, tear into the creative and the positioning behind it, and put the whole thing in writing: where the money's leaking, why, and the prioritized fix. Report's in your hands within 5 business days of the form coming back.

No call required. The report is the deliverable.`) +
    ctaBtn("Start your intake — 12 minutes, and the clock on your report starts the second you submit", link));
}

// E2 — reminder, 48h no activity
export async function sendE2(admin: Admin, d: Diag) {
  const link = `${SITE}/diagnostic/intake/${d.intake_token}`;
  return sendDx(admin, d, "dx_e2", "Your report can't start until you do",
    para(`Quick one. Your Authority Diagnostic is paid and waiting — but we can't read an ad account we can't see. The intake takes about 12 minutes and the 5-day clock starts when you hit submit.`) +
    ctaBtn("Knock out the intake now — your leak isn't fixing itself", link));
}

// E3 — reminder, day 5
export async function sendE3(admin: Admin, d: Diag) {
  const link = `${SITE}/diagnostic/intake/${d.intake_token}`;
  return sendDx(admin, d, "dx_e3", "$750 is sitting on the table",
    para(`You paid for a diagnosis nine days of ad spend ago. Every week the form sits, the same creative runs and the same leak drains. Twelve minutes closes the gap.`) +
    ctaBtn("Finish the intake — the report ships 5 business days after you do", link) +
    para(`If something's blocking you — can't find a number, not sure what counts — just reply. We'll get you unstuck.`));
}

// E4 — report delivered
export async function sendE4(admin: Admin, d: Diag, creditDeadline: string) {
  const link = `${SITE}/diagnostic/report/${d.report_token}`;
  return sendDx(admin, d, "dx_e4", "Your Diagnostic is in. Read Fix 01 first.",
    para(`It's done. Your Authority Diagnostic is in — the numbers read against benchmark, the gaps named, the fixes in priority order, and the math on what fixing it is worth.

Two things before you open it:

1. It's direct. That's the deal. The report should sting a little and help a lot.
2. Fix 01 is the biggest lever. If you do exactly one thing this month, it's that.`) +
    ctaBtn("Read your report — then hand Fix 01 to whoever runs your ads this week", link) +
    para(`Everything in it is yours. Run it yourself and never call us — genuinely fine. If you'd rather we build the fix, the report's last page shows the path, and your $750 credits toward the first month if you move by ${creditDeadline}.`));
}

// E5 — day 3 post-delivery
export async function sendE5(admin: Admin, d: Diag) {
  return sendDx(admin, d, "dx_e5", "Did Fix 01 ship yet?",
    para(`Three days in. The question that decides whether the Diagnostic was worth it isn't "was the report good" — it's "did the opening line change."

If it shipped: watch hook rate over the next two weeks and reply with the number. I want to see it move.

If it didn't: what's in the way? Reply with one sentence. Most of the time it's a ten-minute unblock.`));
}

// E6 — day 14 post-delivery
export async function sendE6(admin: Admin, d: Diag, creditDeadline: string, bookingLink: string | null) {
  return sendDx(admin, d, "dx_e6", "The two-week read on your numbers",
    para(`By now the rewritten hook has enough impressions to say something. Pull the same Ads Manager view from your intake and compare: hook rate, link CTR, cost per lead.

Moving? Good — keep going down the fix list, the order matters.

Not moving, or nobody's had the hours to touch it? That's exactly what the Authority Engine exists for — we build the creative bench, the positioning, and the rotation so this doesn't depend on anyone finding spare time. Your $750 credits toward month one through ${creditDeadline}.`) +
    (bookingLink ? ctaBtn("See exactly how we'd build your fix — grab a 15-minute walkthrough of your own report", bookingLink)
      : para(`Reply to this email and we'll set up a 15-minute walkthrough of your own report.`)));
}

// E7 — day 75 post-delivery (credit window closing)
export async function sendE7(admin: Admin, d: Diag, creditDeadline: string, bookingLink: string | null) {
  return sendDx(admin, d, "dx_e7", "15 days left on your $750 credit",
    para(`Housekeeping, not pressure: the Diagnostic credit toward your first Authority Engine or System month expires ${creditDeadline}. After that the report still stands — the credit doesn't.

If the fixes shipped and the numbers moved, ignore this and enjoy the cheaper leads. If they're still sitting in the report, 15 minutes decides it.`) +
    (bookingLink ? ctaBtn(`Claim the credit — map your build in a 15-minute call before ${creditDeadline}`, bookingLink)
      : para(`Reply to this email to claim it before ${creditDeadline}.`)));
}

export async function operatorBookingLink(admin: Admin, userId: string): Promise<string | null> {
  const { data: st } = await admin.from("app_state").select("ops").eq("user_id", userId).maybeSingle();
  const t = (st?.ops as { __booking?: { token?: string } } | null)?.__booking?.token;
  return t ? `${SITE}/book/${t}` : null;
}

// Resolve (or create) the diagnostic for a paid Stripe Checkout Session.
// Handles BOTH origins: the /diagnostic offer page (metadata.diagnostic_id set
// pre-checkout) and the shareable Stripe Payment Link (no pre-existing record
// — the client is created here from what Stripe collected). Idempotent: the
// unique stripe_session_id index settles races between webhook and redirect.
export type StripeSessionLike = {
  id: string;
  payment_status?: string | null;
  payment_intent?: unknown;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null } | null;
  collected_information?: { business_name?: string | null } | null;
};

export async function ensureDiagnosticForSession(admin: Admin, session: StripeSessionLike): Promise<{ ok: boolean; intake_token?: string; error?: string }> {
  if (session.payment_status !== "paid") return { ok: false, error: "not_paid" };

  // already linked? (offer-page flow, or a webhook/redirect race we lost)
  const { data: existing } = await admin.from("diagnostics").select("*").eq("stripe_session_id", session.id).maybeSingle();
  if (existing) {
    await markPaid(admin, existing.id, { session_id: session.id, payment_id: String(session.payment_intent || "") });
    return { ok: true, intake_token: existing.intake_token };
  }
  if (session.metadata?.diagnostic_id) {
    const r = await markPaid(admin, session.metadata.diagnostic_id, { session_id: session.id, payment_id: String(session.payment_intent || "") });
    if (!r.ok) return { ok: false, error: r.error };
    const { data: d } = await admin.from("diagnostics").select("intake_token").eq("id", session.metadata.diagnostic_id).maybeSingle();
    return { ok: true, intake_token: d?.intake_token };
  }

  // payment-link flow: no record yet — build it from what Stripe collected
  const email = String(session.customer_details?.email || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "no_email_on_session" };
  const contact = String(session.customer_details?.name || "").trim();
  const business = String(session.collected_information?.business_name || "").trim() || contact || email.split("@")[0];

  const { data: st } = await admin.from("app_state").select("user_id").limit(1).maybeSingle();
  const uid = st?.user_id;
  if (!uid) return { ok: false, error: "no_owner" };

  let { data: client } = await admin.from("clients").select("id").eq("user_id", uid).ilike("email", email).limit(1).maybeSingle();
  if (!client) {
    const ins = await admin.from("clients").insert({ user_id: uid, name: business, contact_name: contact || null, email, phone: session.customer_details?.phone || null, status: "Lead", source: "Diagnostic (payment link)" }).select("id").single();
    client = ins.data;
  }
  if (!client) return { ok: false, error: "client_create_failed" };
  const { data: clarity } = await admin.from("clarity_sessions").select("id").eq("user_id", uid).ilike("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const { data: d, error } = await admin.from("diagnostics").insert({
    user_id: uid, client_id: client.id, stripe_session_id: session.id, clarity_session_id: clarity?.id || null,
  }).select("*").single();
  if (error) {
    // unique-index race: the other writer got there first — reuse their row
    const { data: again } = await admin.from("diagnostics").select("*").eq("stripe_session_id", session.id).maybeSingle();
    if (!again) return { ok: false, error: error.message };
    await markPaid(admin, again.id, { session_id: session.id, payment_id: String(session.payment_intent || "") });
    return { ok: true, intake_token: again.intake_token };
  }
  await dxEvent(admin, d as Diag, "stripe", "payment_link_purchase", { email, business });
  await markPaid(admin, d.id, { session_id: session.id, payment_id: String(session.payment_intent || "") });
  return { ok: true, intake_token: d.intake_token };
}

// Mark a diagnostic paid (webhook or redirect-confirm — idempotent) and fire E1.
export async function markPaid(admin: Admin, diagnosticId: string, stripe: { session_id?: string; payment_id?: string } | null) {
  const { data: d } = await admin.from("diagnostics").select("*").eq("id", diagnosticId).maybeSingle();
  if (!d) return { ok: false, error: "not_found" };
  if (d.status !== "created") return { ok: true, already: true }; // idempotent
  await admin.from("diagnostics").update({
    status: "intake_sent",
    stripe_session_id: stripe?.session_id || d.stripe_session_id,
    stripe_payment_id: stripe?.payment_id || null,
  }).eq("id", d.id);
  await dxEvent(admin, d as Diag, stripe ? "stripe" : "brandon", "status_change", {}, "created", "paid");
  await dxEvent(admin, d as Diag, "system", "status_change", {}, "paid", "intake_sent");
  const sent = await sendE1(admin, d as Diag);
  await admin.from("log_entries").insert({ user_id: d.user_id, tag: "EV", color: "var(--red)", message: `diagnostic ${d.is_comp ? "comp created" : "PAID · $" + Math.round((d.amount_cents || 75000) / 100)} · intake link ${sent.ok ? "sent" : "NOT SENT — send manually"}` });
  return { ok: true };
}
