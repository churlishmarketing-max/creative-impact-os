import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { draftAgentEmail } from "@/lib/agent";

export const runtime = "nodejs";

// Operator-only: ask an agent to draft an email for a client (queues for approval).
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
  const { clientId, kind, task, context } = b;
  if (!clientId || !kind) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });

  const TASKS: Record<string, string> = {
    onboarding_welcome: "Welcome this new client and ask them to complete their onboarding intake form at the link provided. Make the ten-minute effort feel worth it.",
    onboarding_confirmation: "Confirm we received their completed intake, thank them briefly, and tell them what happens next (work starts, they'll see it land on their board, we stay in touch each stage).",
  };
  const res = await draftAgentEmail({ userId: user.id, clientId, kind, task: task || TASKS[kind] || "Write a short, useful update for this client.", context });
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}
