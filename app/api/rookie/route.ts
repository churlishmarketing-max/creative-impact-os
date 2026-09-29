import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { edithChat, type ChatBody } from "@/lib/edith/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

// EDITH in the cockpit (the header bar and the desk — screen id `rookie`).
// Operator-only (session-verified); NOT exempted in the proxy. Her tools and
// prompt live in lib/edith/chat.ts, shared with Discord.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ ok: false, error: "no_api_key" }, { status: 400 });

  const cookieStore = await cookies();
  const sb = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "no_service_role" }, { status: 400 });

  let body: ChatBody = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const r = await edithChat(admin, user.id, body, { surface: "cockpit", by: "the operator" });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  return NextResponse.json(r);
}
