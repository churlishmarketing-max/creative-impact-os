import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, stable booking address: /go/book -> /book/<current token>.
// Emails, the Clarity Engine, and bio links all point HERE, so the real
// token can rotate without breaking anything. If no booking token exists
// yet, one is minted and persisted (same shape the cockpit generates).
export async function GET(req: Request) {
  const admin = getAdminClient();
  const origin = new URL(req.url).origin;
  if (!admin) return NextResponse.redirect(origin, 302);

  const { data: st } = await admin.from("app_state").select("user_id, ops").limit(1).maybeSingle();
  if (!st) return NextResponse.redirect(origin, 302);

  const ops = (st.ops || {}) as Record<string, unknown>;
  const booking = (ops.__booking || {}) as Record<string, unknown>;
  let token = typeof booking.token === "string" ? booking.token : "";
  if (!token) {
    token = crypto.randomUUID();
    await admin.from("app_state").update({ ops: { ...ops, __booking: { ...booking, token } } }).eq("user_id", st.user_id);
  }
  return NextResponse.redirect(`${origin}/book/${token}`, 302);
}
