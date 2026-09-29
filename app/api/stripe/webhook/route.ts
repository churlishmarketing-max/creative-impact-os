import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { markPaid, ensureDiagnosticForSession, type StripeSessionLike } from "@/lib/diagnostic/pipeline";
import { onInvoicePaid } from "@/lib/spotlight";

export const runtime = "nodejs";

// Stripe webhook — the authoritative writer of `paid` (SPEC.md §5). The
// redirect-confirm route is the fallback; both are idempotent. Configure in
// Stripe: Developers -> Webhooks -> endpoint https://os.creativeimpactmedia.co/api/stripe/webhook
// with event checkout.session.completed, then set STRIPE_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) return NextResponse.json({ error: "not_configured" }, { status: 400 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  if (!sig) return NextResponse.json({ error: "no_signature" }, { status: 400 });

  const stripe = new Stripe(secret);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, whSecret);
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 403 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const admin = getAdminClient();
    // Ours if: tagged by metadata (offer page or tagged payment link), OR a
    // $750 payment-link purchase on this account (the Diagnostic's price).
    const isDiagnostic = !session.metadata?.token && (session.metadata?.product === "authority_diagnostic" || (!!session.payment_link && session.amount_total === 75000));
    if (admin && isDiagnostic && session.payment_status === "paid") {
      if (session.metadata?.diagnostic_id) {
        await markPaid(admin, session.metadata.diagnostic_id, { session_id: session.id, payment_id: String(session.payment_intent || "") });
      } else {
        await ensureDiagnosticForSession(admin, session as unknown as StripeSessionLike);
      }
    }
    // OS invoice checkouts (metadata.token): mark the invoice paid here too, so
    // a client who closes the tab before the redirect still counts. Idempotent
    // with /api/confirm. A paid Spotlight invoice makes them a member.
    const token = session.metadata?.token;
    if (admin && token && session.payment_status === "paid") {
      const { data: inv } = await admin.from("invoices").select("id,status").eq("token", token).maybeSingle();
      if (inv && inv.status !== "paid") {
        await admin.from("invoices").update({ status: "paid", paid_at: new Date().toISOString(), stripe_session_id: session.id }).eq("id", inv.id);
      }
      if (inv) await onInvoicePaid(admin, token).catch((e) => console.error("spotlight onInvoicePaid (webhook) failed", e));
    }
  }
  return NextResponse.json({ received: true });
}
