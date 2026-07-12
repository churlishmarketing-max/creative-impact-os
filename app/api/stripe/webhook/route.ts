import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { markPaid, ensureDiagnosticForSession, type StripeSessionLike } from "@/lib/diagnostic/pipeline";

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
    const isDiagnostic = session.metadata?.product === "authority_diagnostic" || (!!session.payment_link && session.amount_total === 75000);
    if (admin && isDiagnostic && session.payment_status === "paid") {
      if (session.metadata?.diagnostic_id) {
        await markPaid(admin, session.metadata.diagnostic_id, { session_id: session.id, payment_id: String(session.payment_intent || "") });
      } else {
        await ensureDiagnosticForSession(admin, session as unknown as StripeSessionLike);
      }
    }
    // invoice checkouts (metadata.token) keep their existing redirect-confirm flow
  }
  return NextResponse.json({ received: true });
}
