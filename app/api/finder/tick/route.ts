import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { huntTick } from "@/lib/finder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The finder's clock. PUBLIC in proxy.ts but key-guarded exactly like EDITH's
// tick: pg_cron's finder-tick job (supabase/26) calls it once a minute, only
// while a hunt is open, with the random key in edith_runtime.
const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

async function handle(req: Request) {
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  const key = req.headers.get("x-edith-key") || "";
  if (!/^[0-9a-f]{48}$/.test(key)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { data, error } = await admin.from("edith_runtime").select("user_id,tick_key");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  const row = (data || []).find((r) => same(String(r.tick_key), key));
  if (!row) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await huntTick(admin, row.user_id)) });
  } catch (e) {
    console.error("finder tick failed", e);
    return NextResponse.json({ ok: false, error: String((e as Error)?.message || e) }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
