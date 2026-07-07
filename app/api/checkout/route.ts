import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Creates a Stripe Checkout session for an invoice (by its public token).
// Public route (the client clicks "Pay"). Requires STRIPE_SECRET_KEY (server env).
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "payments_not_configured" }, { status: 400 });

  let token = "";
  try {
    ({ token } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data: inv, error } = await sb.rpc("get_invoice_by_token", { p_token: token });
  if (error || !inv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (inv.status === "paid") return NextResponse.json({ error: "already_paid" }, { status: 400 });

  const amount = Number(inv.amount_cents) || 0;
  if (amount < 50) return NextResponse.json({ error: "invalid_amount" }, { status: 400 });

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // Bind the session to THIS invoice so /api/confirm can verify the receipt
    // being presented actually paid for this token (prevents receipt replay).
    metadata: { token },
    line_items: [
      {
        price_data: {
          currency: inv.currency || "usd",
          product_data: { name: (inv.number || "Invoice") + (inv.title ? " · " + inv.title : "") },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/pay/${token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pay/${token}`,
  });

  return NextResponse.json({ url: session.url });
}
