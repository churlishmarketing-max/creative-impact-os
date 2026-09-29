import { NextResponse, after } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { verifyDiscord, canAct, whoIs, getDiscordSettings, saveDiscordSettings, discordApi, discordEnv, replyToInteraction } from "@/lib/discord";
import { startHunt, finderAct } from "@/lib/finder";
import { edithChat } from "@/lib/edith/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Discord → EDITH. Discord POSTs every slash command and button click here,
// signed with the app's key (DISCORD_PUBLIC_KEY); anything unsigned is refused.
// PUBLIC in proxy.ts — the signature is the lock. Discord wants an answer in
// 3 seconds, so slow work (EDITH thinking, a button that queues email) is
// acknowledged first and finished in after().
//
// Who can act: members with Manage Server or Administrator (the slash
// commands are registered that way too), or an allow-listed user id.

const EPHEMERAL = 64;
const reply = (content: string, ephemeral = false) => NextResponse.json({ type: 4, data: { content: content.slice(0, 2000), allowed_mentions: { parse: [] }, ...(ephemeral ? { flags: EPHEMERAL } : {}) } });

// The single operator account the OS runs for (same lookup as the public board).
async function owner() {
  const admin = getAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("app_state").select("user_id").limit(1).maybeSingle();
  return data?.user_id ? { admin, uid: data.user_id as string } : null;
}

type Interaction = {
  type: number; token: string; channel_id?: string; guild_id?: string;
  data?: { name?: string; custom_id?: string; options?: Array<{ name: string; value: unknown }> };
  member?: { permissions?: string; nick?: string | null; user?: { id?: string; username?: string; global_name?: string | null } };
  user?: { id?: string; username?: string; global_name?: string | null };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyDiscord(req.headers.get("x-signature-ed25519"), req.headers.get("x-signature-timestamp"), raw)) {
    return new NextResponse("invalid request signature", { status: 401 });
  }
  let i: Interaction;
  try { i = JSON.parse(raw); } catch { return new NextResponse("bad request", { status: 400 }); }
  if (i.type === 1) return NextResponse.json({ type: 1 }); // PING

  const o = await owner();
  if (!o) return reply("The OS isn't set up (no database connection).", true);
  const { admin, uid } = o;
  const settings = await getDiscordSettings(admin, uid);
  if (!canAct(i, settings)) return reply("Only people who manage this server can do that.", true);
  const by = whoIs(i);

  // Slash commands
  if (i.type === 2) {
    const name = i.data?.name || "";
    const opt = Object.fromEntries((i.data?.options || []).map((x) => [x.name, x.value]));
    // The first command EDITH hears sets her home channel, if none is set.
    if (!settings.channel_id && i.channel_id && name !== "edith-here") await saveDiscordSettings(admin, uid, { channel_id: i.channel_id, guild_id: i.guild_id });

    if (name === "edith-here") {
      await saveDiscordSettings(admin, uid, { channel_id: i.channel_id, guild_id: i.guild_id });
      return reply(`👋 EDITH here. I'll report to this channel: the finder's businesses (approve, call, or skip them right here), fleet agent reports, automations, payments, bookings, form leads, and signed releases. Ask me anything with \`/edith\`.`);
    }
    if (name === "find") {
      const r = await startHunt(admin, uid, { vertical: String(opt.vertical || ""), area: opt.area ? String(opt.area) : undefined, count: opt.count ? Number(opt.count) : undefined, requestedBy: by, channelId: i.channel_id || null });
      return reply(r.ok ? `🔎 ${r.message}` : `⚠️ ${r.error}`);
    }
    if (name === "edith") {
      const message = String(opt.message || "").slice(0, 1800);
      after(async () => {
        try {
          const s = await getDiscordSettings(admin, uid);
          const history = Array.isArray((s as { history?: unknown }).history) ? ((s as { history?: Array<{ role: string; content: string }> }).history || []).slice(-6) : [];
          const r = await edithChat(admin, uid, { messages: [...history, { role: "user", content: message }] }, { surface: "discord", by });
          const text = r.ok ? r.reply : `Something went wrong: ${r.error}`;
          const acts = r.ok && r.actions.length ? "\n\n" + r.actions.map((a) => "✓ " + a.split("\n")[0].slice(0, 180)).join("\n") : "";
          await replyToInteraction(i.token, `> ${by}: ${message.slice(0, 300)}\n\n${text}${acts}`);
          if (r.ok) await saveDiscordSettings(admin, uid, { history: [...history, { role: "user", content: message }, { role: "assistant", content: r.reply.slice(0, 1500) }].slice(-8) });
        } catch (e) {
          await replyToInteraction(i.token, `Something went wrong: ${String((e as Error)?.message || e).slice(0, 300)}`);
        }
      });
      return NextResponse.json({ type: 5 }); // "EDITH is thinking…"
    }
    return reply("I don't know that command yet.", true);
  }

  // Buttons on a finder card: fnd:<e|c|s>:<prospect id>
  if (i.type === 3) {
    const [ns, act, id] = String(i.data?.custom_id || "").split(":");
    if (ns === "fnd" && ["e", "c", "s"].includes(act) && /^[0-9a-f-]{36}$/i.test(id || "")) {
      after(async () => {
        const r = await finderAct(admin, uid, id, act as "e" | "c" | "s", by);
        const { appId } = discordEnv();
        if (r.card) await discordApi(`/webhooks/${appId}/${i.token}/messages/@original`, { method: "PATCH", bot: false, body: r.card });
        if (!r.ok) await discordApi(`/webhooks/${appId}/${i.token}`, { method: "POST", bot: false, body: { content: `⚠️ ${r.error}`, flags: EPHEMERAL } });
      });
      return NextResponse.json({ type: 6 }); // acknowledged; the card updates in a moment
    }
    return reply("That button isn't wired to anything.", true);
  }

  return reply("Not supported.", true);
}
