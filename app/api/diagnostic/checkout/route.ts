import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { dxEvent, type Diag } from "@/lib/diagnostic/pipeline";

export const runtime = "nodejs";

// Public: pre-checkout step for the Authority Diagnostic ($750). Collects
// name/email/business BEFORE payment so the OS owns the record, then hands
// off to Stripe Checkout. Webhook or redirect-confirm marks it paid.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const admin = getAdminClient();
  if (!secret || !admin) return NextResponse.json({ error: "not_configured" }, { status: 400 });

  let b: { name?: string; email?: string; business?: string } = {};
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const email = String(b.email || "").trim().toLowerCase();
  const business = String(b.business || "").trim();
  const name = String(b.name || "").trim();
  if (!email || !business) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  // single-operator OS: resolve the owner
  const { data: st } = await admin.from("app_state").select("user_id").limit(1).maybeSingle();
  const uid = st?.user_id;
  if (!uid) return NextResponse.json({ error: "not_configured" }, { status: 400 });

  // find-or-create the client record
  let { data: client } = await admin.from("clients").select("id").eq("user_id", uid).ilike("email", email).limit(1).maybeSingle();
  if (!client) {
    const ins = await admin.from("clients").insert({ user_id: uid, name: business, contact_name: name || null, email, status: "Lead", source: "Diagnostic" }).select("id").single();
    client = ins.data;
  }
  if (!client) return NextResponse.json({ error: "client_create_failed" }, { status: 500 });

  // Clarity Engine match (email) — links the free session for prefill + enrichment
  const { data: clarity } = await admin.from("clarity_sessions").select("id").eq("user_id", uid).ilike("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const { data: d, error } = await admin.from("diagnostics").insert({
    user_id: uid, client_id: client.id, clarity_session_id: clarity?.id || null,
  }).select("*").single();
  if (error || !d) return NextResponse.json({ error: error?.message || "create_failed" }, { status: 500 });
  await dxEvent(admin, d as Diag, "client", "checkout_started", { email, business, clarity_matched: !!clarity });

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const stripe = new Stripe(secret);
  try {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    metadata: { product: "authority_diagnostic", diagnostic_id: d.id },
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: "Authority Diagnostic", description: "Written read on your positioning + ad account, fixes ranked, report in 5 business days." },
        unit_amount: d.amount_cents || 75000,
      },
      quantity: 1,
    }],
    success_url: `${origin}/diagnostic/intake/${d.intake_token}?paid_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/diagnostic`,
  });
  await admin.from("diagnostics").update({ stripe_session_id: session.id }).eq("id", d.id);
  return NextResponse.json({ url: session.url });
  } catch (e) {
    // Surface the real Stripe error instead of a silent 500 (message only —
    // Stripe error messages are safe to return; they never contain keys).
    const msg = e instanceof Error ? e.message : String(e);
    console.error("diagnostic checkout stripe error:", msg);
    await dxEvent(admin, d as Diag, "system", "checkout_error", { error: msg });
    return NextResponse.json({ error: "stripe_error", detail: msg }, { status: 502 });
  }
}
