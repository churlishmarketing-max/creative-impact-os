import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Cowork fleet -> OS bridge. Each agent skill ends its run by POSTing here:
// { agent: "kid-flash", title: "38 prospects sourced", summary: "...", payload?: {...}, run_at?: ISO }
// Header: x-os-secret = FLEET_INGEST_SECRET (falls back to CLARITY_WEBHOOK_SECRET
// so no new env var is required). Lands in fleet_reports + the sys.log ticker.
export async function POST(req: Request) {
  const secret = process.env.FLEET_INGEST_SECRET || process.env.CLARITY_WEBHOOK_SECRET;
  const admin = getAdminClient();
  if (!secret || !admin) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  if (req.headers.get("x-os-secret") !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });

  let b: { agent?: string; title?: string; summary?: string; payload?: unknown; run_at?: string } = {};
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const agent = String(b.agent || "").trim().toLowerCase().replace(/[^a-z0-9\-_ ]/g, "").slice(0, 40);
  const summary = String(b.summary || "").slice(0, 20000);
  const title = String(b.title || "").slice(0, 200);
  if (!agent || (!summary && !title)) return NextResponse.json({ ok: false, error: "missing agent or content" }, { status: 400 });

  const { data: st } = await admin.from("app_state").select("user_id").limit(1).maybeSingle();
  if (!st?.user_id) return NextResponse.json({ ok: false, error: "no_owner" }, { status: 400 });

  const { error } = await admin.from("fleet_reports").insert({
    user_id: st.user_id, agent, title, summary,
    payload: b.payload && typeof b.payload === "object" ? b.payload : {},
    ...(b.run_at ? { run_at: b.run_at } : {}),
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // sys.log ticker line, tagged with the agent's initials (KF, BB, IW, GU...)
  const tag = agent.split(/[-_ ]+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "FL";
  await admin.from("log_entries").insert({
    user_id: st.user_id, tag, color: "var(--cream)",
    message: `${agent} · ${(title || summary).slice(0, 120)}`,
  });
  return NextResponse.json({ ok: true });
}
