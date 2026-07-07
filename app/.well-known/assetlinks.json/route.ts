import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Digital Asset Links: proves we own os.creativeimpactmedia.co so the Android TWA app
// runs full-screen (no Chrome URL bar). The fingerprint is the SHA-256 of the
// signing key PWABuilder generates — paste it into Vercel as ASSETLINKS_SHA256
// (comma-separated if there's ever more than one key) and redeploy.
export async function GET() {
  const prints = (process.env.ASSETLINKS_SHA256 || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (!prints.length) return NextResponse.json({ error: "not_configured" }, { status: 404 });
  return NextResponse.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: process.env.ANDROID_PACKAGE_ID || "com.creativeimpact.os",
        sha256_cert_fingerprints: prints,
      },
    },
  ]);
}
