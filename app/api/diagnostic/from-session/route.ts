import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { ensureDiagnosticForSession, type StripeSessionLike } from "@/lib/diagnostic/pipeline";

export const runtime = "nodejs";

// Public: the thanks page calls this after a Stripe PAYMENT LINK purchase.
// Verifies the session server-side, creates/links the diagnostic (idempotent
// with the webhook), and hands back the intake token so the buyer lands
// directly on their intake — same UX as the offer-page flow.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const admin = getAdminClient();
  if (!secret || !admin) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });

  let session_id = "";
  try { ({ session_id } = await req.json()); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (!session_id || !/^cs_/.test(session_id)) return NextResponse.json({ ok: false, error: "bad_session" }, { status: 400 });

  const stripe = new Stripe(secret);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id);
  } catch {
    return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });
  }

  // Only sessions that are (a) paid and (b) ours: either tagged by metadata
  // (offer page / tagged payment link) or created from a payment link at all
  // — a $750 payment-link session on this account IS a diagnostic purchase.
  const isDiagnostic = session.metadata?.product === "authority_diagnostic" || (!!session.payment_link && session.amount_total === 75000);
  if (!isDiagnostic) return NextResponse.json({ ok: false, error: "not_a_diagnostic" }, { status: 400 });

  const r = await ensureDiagnosticForSession(admin, session as unknown as StripeSessionLike);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
