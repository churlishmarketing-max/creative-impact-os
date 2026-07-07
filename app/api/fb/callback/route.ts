import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Completes the Connect Facebook flow:
//   code -> user token -> long-lived token -> pick page -> permanent page token
//   -> subscribe page to leadgen -> store in app_state.ops.__fb (no env vars).
// Multi-page admins get a picker (?page_id= completes the choice).

const G = "https://graph.facebook.com/v25.0";

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><body style="background:#080809;color:#ece8e1;font-family:ui-monospace,monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><div style="max-width:480px;padding:32px;border:1px solid #26262c;border-top:3px solid #e6322b;background:#0e0e11">${body}</div></body></html>`,
    { status, headers: { "content-type": "text/html" } }
  );
}
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function saveOps(admin: NonNullable<ReturnType<typeof getAdminClient>>, uid: string, patch: Record<string, unknown>) {
  const { data: st } = await admin.from("app_state").select("ops").eq("user_id", uid).maybeSingle();
  const ops = { ...(st?.ops || {}), ...patch };
  await admin.from("app_state").upsert({ user_id: uid, ops }, { onConflict: "user_id" });
}

async function completeWithPage(admin: NonNullable<ReturnType<typeof getAdminClient>>, uid: string, llut: string, pageId: string, origin: string) {
  const acc = await fetch(`${G}/me/accounts?fields=id,name,access_token&limit=100&access_token=${encodeURIComponent(llut)}`).then((r) => r.json());
  const page = (acc.data || []).find((p: { id: string }) => p.id === pageId);
  if (!page?.access_token) return html(`<b style="color:#e6322b">Page not found or no access.</b><div style="margin-top:10px;font-size:13px;color:#8b867d">Close this tab and try Connect again.</div>`, 400);

  // Subscribe the page's leadgen feed to this app
  const sub = await fetch(`${G}/${pageId}/subscribed_apps?subscribed_fields=leadgen&access_token=${encodeURIComponent(page.access_token)}`, { method: "POST" }).then((r) => r.json());

  await saveOps(admin, uid, {
    __fb: { page_id: pageId, page_name: page.name, token: page.access_token, connected_at: new Date().toISOString(), leadgen_subscribed: !!sub.success },
    __fb_pending: null,
  });
  await admin.from("log_entries").insert({ user_id: uid, tag: "EV", color: "var(--red)", message: `facebook connected · ${page.name} · leadgen ${sub.success ? "subscribed" : "SUBSCRIBE FAILED"}` });
  return NextResponse.redirect(`${origin}/?fb=connected`);
}

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.FB_APP_SECRET;
  const appId = process.env.FB_APP_ID || "1946322949355732";
  if (!url || !anon) return html("Not configured.", 400);
  const cookieStore = await cookies();
  const sb = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const admin = getAdminClient();
  if (!admin) return html("Missing SUPABASE_SERVICE_ROLE_KEY.", 400);

  const u = new URL(req.url);
  const origin = u.origin;

  // Step 2 of the picker: user chose a page
  const choosePage = u.searchParams.get("page_id");
  if (choosePage) {
    const { data: st } = await admin.from("app_state").select("ops").eq("user_id", user.id).maybeSingle();
    const llut = st?.ops?.__fb_pending?.llut;
    if (!llut) return html(`<b style="color:#e6322b">Session expired.</b><div style="margin-top:10px;font-size:13px;color:#8b867d">Start Connect again from the OS.</div>`, 400);
    return completeWithPage(admin, user.id, llut, choosePage, origin);
  }

  // Step 1: back from Meta with a code
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const cookieState = cookieStore.get("fb_oauth_state")?.value;
  if (!code) return html(`<b style="color:#e6322b">Connection cancelled.</b><div style="margin-top:10px;font-size:13px;color:#8b867d">${esc(u.searchParams.get("error_description") || "No code returned.")} <a style="color:#e6322b" href="/">Back to the OS</a></div>`, 400);
  if (!state || state !== cookieState) return html(`<b style="color:#e6322b">State mismatch.</b><div style="margin-top:10px;font-size:13px;color:#8b867d">Start Connect again from the OS.</div>`, 400);
  if (!secret) return html("Missing FB_APP_SECRET in Vercel.", 400);

  const redirectUri = `${origin}/api/fb/callback`;
  const tok = await fetch(`${G}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${secret}&code=${encodeURIComponent(code)}`).then((r) => r.json());
  if (!tok.access_token) return html(`<b style="color:#e6322b">Token exchange failed.</b><div style="margin-top:10px;font-size:12px;color:#8b867d">${esc(tok.error?.message || "")}</div>`, 400);

  const ll = await fetch(`${G}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${secret}&fb_exchange_token=${encodeURIComponent(tok.access_token)}`).then((r) => r.json());
  const llut = ll.access_token || tok.access_token;

  const acc = await fetch(`${G}/me/accounts?fields=id,name&limit=100&access_token=${encodeURIComponent(llut)}`).then((r) => r.json());
  const pages: { id: string; name: string }[] = acc.data || [];
  if (!pages.length) return html(`<b style="color:#e6322b">No pages found.</b><div style="margin-top:10px;font-size:13px;color:#8b867d">Make sure you granted page access in the Facebook dialog, then try again.</div>`, 400);

  if (pages.length === 1) return completeWithPage(admin, user.id, llut, pages[0].id, origin);

  // Multiple pages: stash the token briefly and show a picker
  await saveOps(admin, user.id, { __fb_pending: { llut, at: Date.now() } });
  const list = pages.map((p) => `<a href="/api/fb/callback?page_id=${esc(p.id)}" style="display:block;padding:12px 14px;border:1px solid #34343c;margin-bottom:8px;color:#ece8e1;text-decoration:none;font-size:14px">▸ ${esc(p.name)}</a>`).join("");
  return html(`<div style="font-weight:900;font-size:20px;margin-bottom:6px">PICK THE PAGE</div><div style="font-size:12px;color:#8b867d;margin-bottom:16px">Which Page do your lead ads run on?</div>${list}`);
}
