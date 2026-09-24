import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { edithTick, missingTable } from "@/lib/edith/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// EDITH's clock. PUBLIC in proxy.ts but key-guarded: the database's pg_cron
// job (supabase/25_edith_clock.sql) calls this only when an email is due or
// it's digest time, sending the random key stored in edith_runtime. The key
// never leaves the database and the server, so nothing secret is pasted.
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
  if (error) return NextResponse.json({ ok: false, error: missingTable(error.message) ? "migration 24 not run" : error.message }, { status: 400 });
  const row = (data || []).find((r) => same(String(r.tick_key), key));
  if (!row) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await edithTick(admin, row.user_id, { digest: "window" })) });
  } catch (e) {
    console.error("EDITH tick failed", e);
    return NextResponse.json({ ok: false, error: String((e as Error)?.message || e) }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
