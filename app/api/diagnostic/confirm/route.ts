import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { markPaid } from "@/lib/diagnostic/pipeline";

export const runtime = "nodejs";

// Public fallback: the intake page calls this after Stripe redirects back.
// Verifies the session server-side and marks the diagnostic paid (idempotent
// with the webhook — whichever lands first wins, the other no-ops).
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const admin = getAdminClient();
  if (!secret || !admin) return NextResponse.json({ paid: false }, { status: 400 });

  let token = "", session_id = "";
  try { ({ token, session_id } = await req.json()); } catch { return NextResponse.json({ paid: false }, { status: 400 }); }
  if (!token || !session_id) return NextResponse.json({ paid: false }, { status: 400 });

  const { data: d } = await admin.from("diagnostics").select("id, stripe_session_id").eq("intake_token", token).maybeSingle();
  if (!d) return NextResponse.json({ paid: false }, { status: 404 });

  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.retrieve(session_id);
  if (session.payment_status !== "paid") return NextResponse.json({ paid: false });
  // receipt must belong to THIS diagnostic (anti replay, same as invoices)
  if (session.metadata?.diagnostic_id !== d.id) return NextResponse.json({ paid: false });

  const res = await markPaid(admin, d.id, { session_id, payment_id: String(session.payment_intent || "") });
  return NextResponse.json({ paid: res.ok });
}
