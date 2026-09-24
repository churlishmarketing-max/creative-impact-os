import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { unsubscribeByToken } from "@/lib/edith/server";

export const runtime = "nodejs";

// PUBLIC (proxy.ts). Two callers:
//  - mail clients' one-click unsubscribe (RFC 8058): POST ?t=<token> with body
//    "List-Unsubscribe=One-Click" — the List-Unsubscribe header on SEQ1/SEQ7.
//  - the /e/unsubscribe/<token> page's button: POST JSON { token }.
// A GET never unsubscribes (link scanners prefetch GETs); it shows the page.
export async function POST(req: Request) {
  const url = new URL(req.url);
  let token = url.searchParams.get("t") || "";
  if (!token) { try { token = String(((await req.json()) as { token?: string }).token || ""); } catch { /* one-click form body */ } }
  const admin = getAdminClient();
  if (!admin || !token) return NextResponse.json({ ok: false }, { status: 400 });
  const r = await unsubscribeByToken(admin, token);
  return NextResponse.json({ ok: r.ok }, { status: r.ok ? 200 : 404 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = (url.searchParams.get("t") || "").replace(/[^0-9a-f-]/gi, "");
  return NextResponse.redirect(new URL(`/e/unsubscribe/${t}`, url.origin));
}
