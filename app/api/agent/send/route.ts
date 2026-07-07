import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendQueuedEmail } from "@/lib/agent";

export const runtime = "nodejs";

// Operator-only approval inbox action: approve (send via the shared agent send
// engine) or reject a queued draft.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  const cookieStore = await cookies();
  const sb = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let b: any = {};
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const { logId, action, subject, body } = b;
  if (!logId || !["approve", "reject"].includes(action)) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });

  if (action === "reject") {
    const admin = getAdminClient();
    if (!admin) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
    const { data: row } = await admin.from("email_log").select("id,status").eq("id", logId).eq("user_id", user.id).maybeSingle();
    if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (row.status !== "draft_pending_approval") return NextResponse.json({ ok: false, error: "already_" + row.status }, { status: 400 });
    await admin.from("email_log").update({ status: "rejected" }).eq("id", logId);
    return NextResponse.json({ ok: true });
  }

  const res = await sendQueuedEmail(logId, user.id, { subject, body });
  return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
