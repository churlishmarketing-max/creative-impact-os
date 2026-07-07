import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stageEnteredAutomations } from "@/lib/automations";

export const runtime = "nodejs";

// Operator-only: fire stage-entered automations for a client that just moved
// (stage-update email if the stage wants one; referral kickoff on Advocacy).
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  const cookieStore = await cookies();
  const sb = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let clientId = "";
  try { ({ clientId } = await req.json()); } catch { /* fall through */ }
  if (!clientId) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });

  const res = await stageEnteredAutomations(user.id, clientId);
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}
