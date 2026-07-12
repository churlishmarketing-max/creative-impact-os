import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Clarity Engine -> OS sync (Option B, clarity-engine-integration.md §2).
// The Lovable app POSTs here on session completion. Signed with a shared
// secret header; idempotent on external_id. Body:
// { external_id, email, answers, board_read?, pdf_url?, created_at? }
export async function POST(req: Request) {
  const secret = process.env.CLARITY_WEBHOOK_SECRET;
  const admin = getAdminClient();
  if (!secret || !admin) return NextResponse.json({ error: "not_configured" }, { status: 400 });
  if (req.headers.get("x-clarity-secret") !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  let b: { external_id?: string; email?: string; answers?: unknown; board_read?: unknown; pdf_url?: string; created_at?: string } = {};
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  if (!b.external_id || !b.answers) return NextResponse.json({ error: "missing external_id or answers" }, { status: 400 });

  const { data: st } = await admin.from("app_state").select("user_id").limit(1).maybeSingle();
  if (!st?.user_id) return NextResponse.json({ error: "no_owner" }, { status: 400 });

  const row = {
    user_id: st.user_id,
    external_id: String(b.external_id),
    email: b.email ? String(b.email).trim().toLowerCase() : null,
    answers: b.answers,
    board_read: b.board_read || null,
    pdf_path: b.pdf_url || null,
    source: "lovable",
    ...(b.created_at ? { created_at: b.created_at } : {}),
  };
  const { error } = await admin.from("clarity_sessions").upsert(row, { onConflict: "external_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
