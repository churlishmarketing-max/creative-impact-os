import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { dxEvent, type Diag } from "@/lib/diagnostic/pipeline";

export const runtime = "nodejs";

// Public, token-gated: Ads Manager screenshot upload -> private storage bucket.
// 4MB cap per file (Vercel body limit head-room).
export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 400 });

  let token = "", name = "", dataUrl = "";
  try { ({ token, name, dataUrl } = await req.json()); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,([\s\S]+)$/.exec(dataUrl || "");
  if (!token || !m) return NextResponse.json({ ok: false, error: "bad_file" }, { status: 400 });
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 4 * 1024 * 1024) return NextResponse.json({ ok: false, error: "too_large" }, { status: 400 });

  const { data: d } = await admin.from("diagnostics").select("id, user_id, trace_id, status, client_id, intake_token, report_token").eq("intake_token", token).maybeSingle();
  if (!d || !["intake_sent", "intake_in_progress"].includes(d.status)) return NextResponse.json({ ok: false }, { status: 404 });

  const safe = (name || "screenshot").replace(/[^a-z0-9._-]/gi, "_").slice(0, 80);
  const path = `${d.id}/${Date.now()}-${safe}`;
  const { error } = await admin.storage.from("diagnostic-uploads").upload(path, bytes, { contentType: m[1] });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const { data: intake } = await admin.from("diagnostic_intakes").select("screenshots").eq("diagnostic_id", d.id).maybeSingle();
  const shots = [...(((intake?.screenshots as { path: string; name: string }[] | null)) || []), { path, name: safe }];
  await admin.from("diagnostic_intakes").upsert({ diagnostic_id: d.id, user_id: d.user_id, screenshots: shots }, { onConflict: "diagnostic_id" });
  await dxEvent(admin, d as Diag, "client", "screenshot_uploaded", { path });
  return NextResponse.json({ ok: true, count: shots.length });
}
