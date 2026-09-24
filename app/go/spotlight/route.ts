import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, stable Charlotte Spotlight fit-call link: /go/spotlight ->
// /book/<current token>?for=spotlight. Same booking engine and availability;
// the page presents itself as the Spotlight call, and the booking lands in the
// Spotlight pipeline as "Call booked". Covered by proxy.ts's /go/ prefix.
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
  return NextResponse.redirect(`${origin}/book/${token}?for=spotlight`, 302);
}
