// EDITH in Discord (server-only). Discord is where EDITH tells the team what
// happened: the finder's businesses (with Approve / Call list / Skip buttons),
// fleet agent reports, automations, payments, bookings, form leads, releases.
// And it's where the team talks back: /find, /edith, /edith-here.
//
// No gateway connection (Vercel can't hold one): Discord POSTs every slash
// command and button click to /api/discord/interactions, signed with the app's
// Ed25519 key; EDITH posts with the bot token over REST.
//
// Vercel env (secrets, never in chat or the repo):
//   DISCORD_APPLICATION_ID  DISCORD_PUBLIC_KEY  DISCORD_BOT_TOKEN
// The channel she posts to is set by using /edith-here in it (or
// DISCORD_CHANNEL_ID); it's stored in app_state.ops.__discord.
//
// Every post swallows its own errors: Discord being down or unset must never
// break a payment, a booking, or an import.
import crypto from "crypto";
import type { getAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof getAdminClient>>;
const API = "https://discord.com/api/v10";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://os.creativeimpactmedia.co";

export const GOLD = 0xd4af37;
export const RED = 0xc8102e;
export const GREEN = 0x3fb950;

export function discordEnv() {
  return {
    appId: process.env.DISCORD_APPLICATION_ID || "",
    publicKey: process.env.DISCORD_PUBLIC_KEY || "",
    botToken: process.env.DISCORD_BOT_TOKEN || "",
  };
}

// View Channel + Send Messages + Embed Links + Read Message History.
export const BOT_PERMISSIONS = String(1024 + 2048 + 16384 + 65536);
export function inviteUrl() {
  const { appId } = discordEnv();
  return appId ? `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot+applications.commands&permissions=${BOT_PERMISSIONS}` : "";
}

export type DiscordSettings = { channel_id?: string; guild_id?: string; allowed_user_ids?: string[] };
async function loadOps(admin: Admin, uid: string) {
  const { data } = await admin.from("app_state").select("ops").eq("user_id", uid).maybeSingle();
  return (data?.ops || {}) as Record<string, unknown>;
}
export async function getDiscordSettings(admin: Admin, uid: string): Promise<DiscordSettings> {
  const s = ((await loadOps(admin, uid)).__discord || {}) as DiscordSettings;
  return { ...s, channel_id: s.channel_id || process.env.DISCORD_CHANNEL_ID || "" };
}
export async function saveDiscordSettings(admin: Admin, uid: string, patch: Partial<DiscordSettings> & { history?: unknown }) {
  const ops = await loadOps(admin, uid);
  const next = { ...((ops.__discord as object) || {}), ...patch };
  await admin.from("app_state").upsert({ user_id: uid, ops: { ...ops, __discord: next } }, { onConflict: "user_id" });
  return next;
}

/* --------------------------------------------------------- verification */

// Discord signs every interaction: Ed25519 over (timestamp + raw body).
export function verifyDiscord(signature: string | null, timestamp: string | null, body: string): boolean {
  const { publicKey } = discordEnv();
  if (!signature || !timestamp || !/^[0-9a-f]{64}$/i.test(publicKey) || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  try {
    const key = crypto.createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(publicKey, "hex")]), format: "der", type: "spki" });
    return crypto.verify(null, Buffer.from(timestamp + body), key, Buffer.from(signature, "hex"));
  } catch { return false; }
}

// Who may approve, skip, or command EDITH: people with Manage Server (or
// Administrator) in the Discord server, or a user id on the allow list.
export function canAct(i: { member?: { permissions?: string; user?: { id?: string } }; user?: { id?: string } }, s: DiscordSettings): boolean {
  const id = i.member?.user?.id || i.user?.id || "";
  if (id && (s.allowed_user_ids || []).includes(id)) return true;
  try { const p = BigInt(i.member?.permissions || "0"); return (p & BigInt(8)) !== BigInt(0) || (p & BigInt(32)) !== BigInt(0); } catch { return false; }
}
export const whoIs = (i: { member?: { nick?: string | null; user?: { global_name?: string | null; username?: string } }; user?: { global_name?: string | null; username?: string } }) =>
  i.member?.nick || i.member?.user?.global_name || i.member?.user?.username || i.user?.global_name || i.user?.username || "someone";

/* ---------------------------------------------------------------- REST */

export async function discordApi(path: string, init: { method?: string; body?: unknown; bot?: boolean } = {}) {
  const { botToken } = discordEnv();
  const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "CreativeImpactOS (https://os.creativeimpactmedia.co, 1)" };
  if (init.bot !== false) { if (!botToken) return { ok: false as const, status: 0, error: "DISCORD_BOT_TOKEN isn't set in Vercel" }; headers.Authorization = `Bot ${botToken}`; }
  try {
    const r = await fetch(API + path, { method: init.method || "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
    const text = await r.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!r.ok) return { ok: false as const, status: r.status, error: (data as { message?: string })?.message || `Discord said ${r.status}`, data };
    return { ok: true as const, status: r.status, data };
  } catch (e) { return { ok: false as const, status: 0, error: String((e as Error)?.message || e) }; }
}

export type DMessage = { content?: string; embeds?: unknown[]; components?: unknown[]; allowed_mentions?: unknown };
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// Post to EDITH's channel (or the one given). Returns the message id, or null.
export async function discordSay(admin: Admin, uid: string, msg: DMessage, channelId?: string): Promise<string | null> {
  try {
    const { botToken } = discordEnv();
    if (!botToken) return null;
    const channel = channelId || (await getDiscordSettings(admin, uid)).channel_id;
    if (!channel) return null;
    const body = { allowed_mentions: { parse: [] }, ...msg, ...(msg.content ? { content: clip(msg.content, 2000) } : {}) };
    const r = await discordApi(`/channels/${channel}/messages`, { method: "POST", body });
    if (!r.ok) { console.error("discord post failed", r.error); return null; }
    return String((r.data as { id?: string })?.id || "") || null;
  } catch (e) { console.error("discord post failed", e); return null; }
}

// A one-line heads-up from EDITH — the shape every "agent reports back" uses.
export async function discordNotify(admin: Admin, uid: string, title: string, body?: string, color = GOLD) {
  return discordSay(admin, uid, { embeds: [{ title: clip(title, 256), description: body ? clip(body, 3800) : undefined, color, footer: { text: "EDITH · Creative Impact OS" }, timestamp: new Date().toISOString() }] });
}

/* ---------------------------------------------- interaction responses */

// Replace the original (deferred) interaction reply, then add follow-ups for
// anything past Discord's 2,000-character limit.
export async function replyToInteraction(token: string, content: string, extra: Partial<DMessage> = {}) {
  const { appId } = discordEnv();
  const parts: string[] = [];
  let rest = content || "Done.";
  while (rest.length > 1900) {
    let cut = rest.lastIndexOf("\n", 1900);
    if (cut < 800) cut = 1900;
    parts.push(rest.slice(0, cut)); rest = rest.slice(cut);
  }
  parts.push(rest);
  await discordApi(`/webhooks/${appId}/${token}/messages/@original`, { method: "PATCH", bot: false, body: { content: parts[0], allowed_mentions: { parse: [] }, ...extra } });
  for (const p of parts.slice(1)) await discordApi(`/webhooks/${appId}/${token}`, { method: "POST", bot: false, body: { content: p, allowed_mentions: { parse: [] } } });
}

/* ------------------------------------------------------------ commands */

const MANAGE_GUILD = "32";
export const COMMANDS = [
  {
    name: "find", description: "EDITH's finder: businesses for the Charlotte Spotlight, posted here for approval", default_member_permissions: MANAGE_GUILD, dm_permission: false,
    options: [
      { type: 3, name: "vertical", description: "What kind of business", required: true, choices: [
        { name: "HVAC / plumbing / electrical", value: "hvac" }, { name: "Roofing", value: "roofing" }, { name: "Pest control", value: "pest" },
        { name: "Landscaping", value: "landscaping" }, { name: "Builders / remodeling", value: "builders" }, { name: "Auto repair", value: "auto" },
        { name: "Med spa / aesthetics", value: "medspa" }, { name: "Law", value: "law" }, { name: "Insurance / financial", value: "insurance" },
        { name: "Restaurant / salon / gym", value: "local" },
      ] },
      { type: 3, name: "area", description: "Where (default: Charlotte, NC)", required: false },
      { type: 4, name: "count", description: "How many (1–25, default 10)", required: false, min_value: 1, max_value: 25 },
    ],
  },
  {
    name: "edith", description: "Ask EDITH anything — the pipeline, a call script line, what's queued", default_member_permissions: MANAGE_GUILD, dm_permission: false,
    options: [{ type: 3, name: "message", description: "What you want", required: true }],
  },
  { name: "edith-here", description: "Make this the channel EDITH reports to", default_member_permissions: MANAGE_GUILD, dm_permission: false },
];

export async function registerCommands() {
  const { appId } = discordEnv();
  if (!appId) return { ok: false as const, error: "DISCORD_APPLICATION_ID isn't set in Vercel" };
  const r = await discordApi(`/applications/${appId}/commands`, { method: "PUT", body: COMMANDS });
  return r.ok ? { ok: true as const, count: (r.data as unknown[])?.length || 0 } : { ok: false as const, error: r.error };
}

export const OS_LINK = SITE;
