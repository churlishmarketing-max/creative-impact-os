import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Gate the ENTIRE app behind login. No public route, no signup.
// In local dev with no Supabase env vars, gating is disabled so the design
// stays viewable.
export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isLogin = path === "/login";
  // Public, client-facing routes (no operator login): pay pages + their APIs.
  const isPublic =
    path.startsWith("/pay/") ||
    path.startsWith("/proposal/") ||
    path.startsWith("/book/") ||
    path.startsWith("/intake/") ||
    path.startsWith("/onboard/") ||
    path.startsWith("/r/") ||                 // tracked referral links
    path.startsWith("/status/") ||            // client read-only status pages
    path === "/manifest.json" ||              // PWA manifest (Android app wrapper)
    path === "/sw.js" ||                      // service worker
    path.startsWith("/icons/") ||             // app icons
    path.startsWith("/.well-known/") ||       // asset links (TWA verification)
    path === "/api/cron/daily" ||             // Vercel Cron (guarded by CRON_SECRET)
    path === "/api/onboard/submit" ||
    path === "/api/checkout" ||
    path === "/api/confirm" ||
    path === "/api/accept" ||
    path === "/api/book" ||
    path === "/api/fb/webhook" ||
    path === "/api/email/inbound";
  if (isPublic) return res;

  if (!user && !isLogin) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  if (user && isLogin) {
    const to = req.nextUrl.clone();
    to.pathname = "/";
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  // Run on everything except Next internals, the favicon, and font files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
