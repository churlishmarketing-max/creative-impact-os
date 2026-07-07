import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";

// Called by the pay page after Stripe redirects back. Verifies the session was
// actually paid (server-side, with the secret key), then marks the invoice paid.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ paid: false, error: "not_configured" }, { status: 400 });

  let token = "";
  let session_id = "";
  try {
    ({ token, session_id } = await req.json());
  } catch {
    return NextResponse.json({ paid: false }, { status: 400 });
  }
  if (!token || !session_id) return NextResponse.json({ paid: false }, { status: 400 });

  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.retrieve(session_id);
  if (session.payment_status !== "paid") return NextResponse.json({ paid: false });
  // The session must have been created FOR this invoice — otherwise a paid
  // receipt from one (cheap) invoice could be replayed to mark another paid.
  if (session.metadata?.token !== token) return NextResponse.json({ paid: false });

  const admin = getAdminClient();
  if (admin) {
    await admin
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString(), stripe_session_id: session_id })
      .eq("token", token);
  }
  return NextResponse.json({ paid: true });
}
