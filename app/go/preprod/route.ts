import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, stable Charlotte Spotlight PRE-PRODUCTION call link: /go/preprod ->
// /book/<current token>?for=preprod — the link in EDITH's welcome (6-1), sent
// the moment a spot is paid. The 15-minute call where the film date is locked.
// Same booking engine; covered by the /go/ prefix.
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
  return NextResponse.redirect(`${origin}/book/${token}?for=preprod`, 302);
}
