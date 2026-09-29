import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { discordEnv, inviteUrl, getDiscordSettings, saveDiscordSettings, registerCommands, discordSay, discordApi, GOLD } from "@/lib/discord";

export const runtime = "nodejs";

// Operator-only: the Discord panel on the EDITH desk. Shows what's connected
// (never the secrets themselves), sets up the slash commands, sends a test.

async function auth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const cookieStore = await cookies();
  const sb = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await sb.auth.getUser();
  const admin = getAdminClient();
  return user && admin ? { admin, uid: user.id } : null;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://os.creativeimpactmedia.co";

export async function GET() {
  const a = await auth();
  if (!a) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const env = discordEnv();
  const s = await getDiscordSettings(a.admin, a.uid);
  let channelName = "";
  if (env.botToken && s.channel_id) {
    const r = await discordApi(`/channels/${s.channel_id}`);
    if (r.ok) channelName = String((r.data as { name?: string })?.name || "");
  }
  return NextResponse.json({
    ok: true,
    env: { application_id: !!env.appId, public_key: !!env.publicKey, bot_token: !!env.botToken },
    channel_id: s.channel_id || "", channel_name: channelName, allowed_user_ids: s.allowed_user_ids || [],
    invite_url: inviteUrl(), interactions_url: `${SITE}/api/discord/interactions`,
  });
}

export async function POST(req: Request) {
  const a = await auth();
  if (!a) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* empty */ }
  if (b.op === "register") {
    const r = await registerCommands();
    return NextResponse.json(r.ok ? { ok: true, count: r.count } : { ok: false, error: r.error });
  }
  if (b.op === "test") {
    const id = await discordSay(a.admin, a.uid, { embeds: [{ title: "EDITH is connected", description: "This is where I'll report: the finder's businesses (approve, call, or skip them here), fleet agent reports, automations, payments, bookings, form leads, and signed releases. Try `/find` or `/edith`.", color: GOLD }] });
    return NextResponse.json(id ? { ok: true } : { ok: false, error: "Couldn't post — check the bot token, that EDITH is in the server, and the channel (use /edith-here in it)." });
  }
  if (b.op === "save") {
    const ids = String(b.allowed_user_ids || "").split(/[\s,]+/).filter((x) => /^\d{15,21}$/.test(x));
    const patch: Record<string, unknown> = { allowed_user_ids: ids };
    if (typeof b.channel_id === "string" && /^\d{15,21}$|^$/.test(b.channel_id)) patch.channel_id = b.channel_id;
    await saveDiscordSettings(a.admin, a.uid, patch);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "unknown op" }, { status: 400 });
}
