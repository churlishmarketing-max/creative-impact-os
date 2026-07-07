import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: tracked referral link. Counts the click, notes it on the referring
// client's activity feed, and forwards the visitor to the referral target
// (REFERRAL_TARGET_URL, defaulting to the Creative Impact site).
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const target = process.env.REFERRAL_TARGET_URL || "https://creativeimpactmedia.co";
  const { code } = await params;
  const admin = getAdminClient();
  if (admin && code && /^[a-z0-9-]{4,64}$/i.test(code)) {
    try {
      const { data: ref } = await admin.from("referral_codes").select("id, user_id, client_id, clicks").eq("code", code).maybeSingle();
      if (ref) {
        await admin.from("referral_codes").update({ clicks: (ref.clicks || 0) + 1 }).eq("id", ref.id);
        await admin.from("client_events").insert({ user_id: ref.user_id, client_id: ref.client_id, kind: "system", message: "Referral link clicked" });
      }
    } catch { /* never block the redirect on tracking */ }
  }
  return NextResponse.redirect(target, 302);
}
