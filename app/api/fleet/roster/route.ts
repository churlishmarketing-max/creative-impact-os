import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Second Brain -> OS roster sync. The second-brain skill's Update Protocol
// POSTs here whenever a unit is created, changed, or retired, so the OS
// fleet manifest never drifts from the roster. Same secret as fleet ingest.
// upsert: { action: "upsert", unit: { key, name, alias?, division?, job?, triggers?, schedule?, loc? } }
// remove: { action: "remove", key: "unit-key" }
export async function POST(req: Request) {
  const secret = process.env.FLEET_INGEST_SECRET || process.env.CLARITY_WEBHOOK_SECRET;
  const admin = getAdminClient();
  if (!secret || !admin) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  if (req.headers.get("x-os-secret") !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });

  let b: { action?: string; key?: string; unit?: Record<string, unknown> } = {};
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const { data: st } = await admin.from("app_state").select("user_id").limit(1).maybeSingle();
  if (!st?.user_id) return NextResponse.json({ ok: false, error: "no_owner" }, { status: 400 });

  if (b.action === "remove") {
    const key = String(b.key || "").trim().toLowerCase();
    if (!key) return NextResponse.json({ ok: false, error: "missing key" }, { status: 400 });
    await admin.from("fleet_roster").delete().eq("user_id", st.user_id).eq("key", key);
    return NextResponse.json({ ok: true, removed: key });
  }

  const u = (b.unit || {}) as Record<string, unknown>;
  const key = String(u.key || "").trim().toLowerCase().replace(/[^a-z0-9\-_]/g, "").slice(0, 60);
  const name = String(u.name || "").slice(0, 120);
  if (!key || !name) return NextResponse.json({ ok: false, error: "unit needs key and name" }, { status: 400 });
  const division = ["command", "war-rooms", "fleet", "production", "systems", "clients"].includes(String(u.division)) ? String(u.division) : "fleet";

  const { error } = await admin.from("fleet_roster").upsert({
    user_id: st.user_id, key, name,
    alias: String(u.alias || "").slice(0, 120),
    division,
    job: String(u.job || "").slice(0, 600),
    triggers: String(u.triggers || "").slice(0, 300),
    schedule: u.schedule ? String(u.schedule).slice(0, 80) : null,
    loc: ["WS", "CC", "OS"].includes(String(u.loc)) ? String(u.loc) : "WS",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await admin.from("log_entries").insert({ user_id: st.user_id, tag: "SB", color: "var(--muted)", message: `roster updated · ${name} (${key})` });
  return NextResponse.json({ ok: true, key });
}
