import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";

// Operator-only: kick off the "Connect Facebook" OAuth flow. Redirects to
// Meta's consent dialog; /api/fb/callback completes it (token -> DB, page
// subscribed to leadgen). No env-var editing, no Graph Explorer.
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: "not_configured" }, { status: 400 });
  const cookieStore = await cookies();
  const sb = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const appId = process.env.FB_APP_ID || "1946322949355732"; // EVE
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/fb/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const dialog = new URL("https://www.facebook.com/v25.0/dialog/oauth");
  dialog.searchParams.set("client_id", appId);
  dialog.searchParams.set("redirect_uri", redirectUri);
  dialog.searchParams.set("state", state);
  // "Facebook Login for Business" apps use a configuration instead of raw scopes.
  // Create one under Facebook Login for Business -> Configurations, then set
  // FB_LOGIN_CONFIG_ID in Vercel; without it we fall back to the classic scope flow.
  const configId = process.env.FB_LOGIN_CONFIG_ID;
  if (configId) {
    dialog.searchParams.set("config_id", configId);
    dialog.searchParams.set("response_type", "code");
    dialog.searchParams.set("override_default_response_type", "true");
  } else {
    dialog.searchParams.set("scope", "pages_show_list,pages_manage_metadata,pages_read_engagement,leads_retrieval,business_management");
  }

  const res = NextResponse.redirect(dialog.toString());
  res.cookies.set("fb_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
