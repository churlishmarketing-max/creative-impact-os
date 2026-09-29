// EDITH, server side (server-only): the Supabase store behind the engine, the
// live Env (Resend delivery, the OS log), the daily digest, and the small hooks
// the rest of the OS calls when something happens — edithEmit / edithTouch.
//
// Every hook swallows its own errors: EDITH must never break the booking, the
// payment confirmation, or the save that triggered it.
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailShell, esc } from "@/lib/email";
import { buildIcs } from "@/lib/ics";
import { CONTENT } from "./content.generated";
import { discordNotify } from "@/lib/discord";
import { DEFAULT_PRICES, DEFAULT_FEATURE_SPOTS, DEFAULT_FLOOR_DATE, money, spotPrice, spotTier, floorLine } from "@/lib/spotlight-offer";
import {
  emit, runDue, contactChanged, retryHeld, settle, etParts, renderEmail, FIELD_LABELS,
  type Config, type Contact, type Env, type Store, type StepRow, type Enrollment,
} from "./engine";

type Admin = NonNullable<ReturnType<typeof getAdminClient>>;
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://os.creativeimpactmedia.co";
export const EDITH_MIGRATION = "EDITH's tables don't exist yet — run supabase/22_spotlight.sql (if you haven't), then 24_edith.sql and 25_edith_clock.sql in the Supabase SQL editor.";
export const missingTable = (m?: string) => !!m && /does not exist|schema cache/i.test(m);

/* ---------------------------------------------------------------- config */

export function defaultConfig(): Config {
  const s = CONTENT.manifest.sender;
  return {
    // The kill switch. Turned ON 2026-09-29 at Brandon's instruction ("go ahead
    // and turn her on"). Turning her off in the cockpit stores false, which wins.
    edith_live: true,
    from: `${s.name} <${s.from}>`,
    reply_to: s.reply_to,
    digest_to: process.env.EMAIL_BCC || "hello@creativeimpactmedia.co",
    digest: true,
    physical_address: "",
    booking_link: `${SITE}/go/spotlight`,
    board_link: `${SITE}/spotlight/board`, // the public board: prices, spots left, the interest form
    call_link: "",
    debrief_link: `${SITE}/go/debrief`,
    preprod_link: `${SITE}/go/preprod`, // new members book the pre-production call (EDITH 6-1)
    episode_link: "https://youtu.be/wNylbkgS1mQ", // the Omaha original, per 2-3's note, until Charlotte Ep 1 exists
    next_board_date: "",
    current_episode: 1,
    paused: {},
    episodes: {},
    cold_daily_cap: 20,
    deposit_pay_link: "",
    balance_pay_link: "",
  };
}

// The OS's own /pay pages only take cards once Stripe is connected.
export const stripeConnected = () => !!process.env.STRIPE_SECRET_KEY;

async function loadOps(admin: Admin, uid: string) {
  const { data } = await admin.from("app_state").select("ops").eq("user_id", uid).maybeSingle();
  return (data?.ops || {}) as Record<string, unknown>;
}
export async function getEdithConfig(admin: Admin, uid: string): Promise<Config> {
  const ops = await loadOps(admin, uid);
  return { ...defaultConfig(), ...((ops.__edith as Partial<Config>) || {}) };
}
// Stores only what was set, so a changed default still reaches unset fields.
export async function saveEdithConfig(admin: Admin, uid: string, patch: Partial<Config>): Promise<Config> {
  const ops = await loadOps(admin, uid);
  const stored = { ...((ops.__edith as object) || {}), ...patch };
  await admin.from("app_state").upsert({ user_id: uid, ops: { ...ops, __edith: stored } }, { onConflict: "user_id" });
  return { ...defaultConfig(), ...stored };
}

/* --------------------------------------------------------------- contacts */

// Manifest merge-field name -> spotlight_prospects column.
const COLS: Record<string, string> = {
  first_name: "first_name", business_name: "business", neighborhood: "suburb", years_in_business: "years",
  specific_detail: "specific_detail", q5_answer: "q5_answer", call_time: "call_time", call_end: "call_end",
  call_link: "call_link", rebook_link: "rebook_link", call_outcome: "call_outcome", spot_number: "spot_number",
  episode_number: "episode_number", film_date: "film_date", not_fit_reason: "not_fit_reason",
  what_would_change: "what_would_change", cut_link: "cut_link", reach_number: "reach_number", reach_screenshot: "reach_screenshot",
};
const INT_COLS = ["years", "spot_number", "episode_number"];

function firstNameOf(row: Row): string {
  const f = String(row.first_name || String(row.owner_name || "").trim().split(/\s+/)[0] || "").trim();
  return f && f === f.toLowerCase() ? f.charAt(0).toUpperCase() + f.slice(1) : f;
}

// The price board (Spotlight settings) — what {{spot_price}} and {{floor_line}} read.
export type Offer = { prices: number[]; featureSpots: number; floorDate: string };
const DEFAULT_OFFER: Offer = { prices: DEFAULT_PRICES, featureSpots: DEFAULT_FEATURE_SPOTS, floorDate: DEFAULT_FLOOR_DATE };
export async function getOffer(admin: Admin, uid: string): Promise<Offer> {
  const sp = ((await loadOps(admin, uid)).__spotlight || {}) as Partial<Offer>;
  return { prices: Array.isArray(sp.prices) && sp.prices.length ? sp.prices : DEFAULT_PRICES, featureSpots: Number(sp.featureSpots ?? DEFAULT_FEATURE_SPOTS), floorDate: sp.floorDate || DEFAULT_FLOOR_DATE };
}

export function toContact(row: Row, links: { deposit: string | null; balance: string | null } = { deposit: null, balance: null }, offer: Offer = DEFAULT_OFFER): Contact {
  const f: Record<string, string | null> = {};
  for (const [k, col] of Object.entries(COLS)) f[k] = row[col] == null || row[col] === "" ? null : String(row[col]);
  f.first_name = firstNameOf(row) || null;
  const n = Number(row.spot_number);
  const price = n >= 1 ? spotPrice(offer.prices, n) : null;
  f.spot_price = price ? money(price) : null;
  f.floor_line = n >= 1 ? floorLine(spotTier(n, offer.featureSpots), offer.floorDate) : null;
  // EDITH's welcome (6-1): the member's prep questions and their business's release form.
  f.questions_link = row.q_token ? `${SITE}/spotlight/q/${row.q_token}` : null;
  f.release_line = row.release_token ? `3. Anyone who'll be on camera — you, your team, even a customer or two — signs a one-minute release first. Send them this link (we'll have it on film day too): ${SITE}/spotlight/release/${row.release_token}` : null;
  f.deposit_link = links.deposit;
  f.balance_link = links.balance;
  return {
    id: row.id, email: row.email || null, tags: row.tags || [], do_not_contact: !!row.do_not_contact,
    unsubscribe_url: row.u_token ? `${SITE}/e/unsubscribe/${row.u_token}` : null, fields: f,
  };
}

/* ------------------------------------------------------------------ store */

export function supabaseStore(admin: Admin, uid: string, cfg?: Config, offer: Offer = DEFAULT_OFFER): Store {
  const must = (r: { error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); };
  const enr = (r: Row): Enrollment => ({ id: r.id, contact_id: r.prospect_id, seq: r.seq, status: r.status, enrolled_at: r.enrolled_at, ended_at: r.ended_at, end_reason: r.end_reason, context: r.context || {} });
  const step = (r: Row): StepRow => ({ id: r.id, enrollment_id: r.enrollment_id, contact_id: r.prospect_id, seq: r.seq, step: r.step, template_id: r.template_id, kind: r.kind, status: r.status, due_at: r.due_at, anchor: r.anchor, hold_reason: r.hold_reason, to_email: r.to_email, subject: r.subject, body: r.body, sent_at: r.sent_at, error: r.error, meta: r.meta || {} });
  const cols = (p: Record<string, unknown>) => { const o: Record<string, unknown> = { ...p }; if ("contact_id" in o) { o.prospect_id = o.contact_id; delete o.contact_id; } delete o.id; return o; };

  return {
    async getContact(id) {
      const { data } = await admin.from("spotlight_prospects").select("*").eq("user_id", uid).eq("id", id).maybeSingle();
      if (!data) return null;
      const ids = [data.deposit_invoice_id, data.balance_invoice_id].filter(Boolean);
      const links = { deposit: null as string | null, balance: null as string | null };
      // A pay link EDITH quotes has to actually take money: the OS invoice page
      // when Stripe is connected, otherwise the payment link from settings.
      if (ids.length && stripeConnected()) {
        const { data: inv } = await admin.from("invoices").select("id,token").in("id", ids);
        const m = new Map((inv || []).map((x) => [x.id, `${SITE}/pay/${x.token}`]));
        links.deposit = m.get(data.deposit_invoice_id) || null;
        links.balance = m.get(data.balance_invoice_id) || null;
      }
      if (!links.deposit && cfg?.deposit_pay_link) links.deposit = cfg.deposit_pay_link;
      if (!links.balance && cfg?.balance_pay_link) links.balance = cfg.balance_pay_link;
      return toContact(data, links, offer);
    },
    async listContacts() {
      const { data } = await admin.from("spotlight_prospects").select("*").eq("user_id", uid);
      return (data || []).map((r) => toContact(r, undefined, offer));
    },
    async updateContact(id, p) {
      const row: Record<string, unknown> = {};
      if (p.tags) row.tags = p.tags;
      if (p.do_not_contact != null) { row.do_not_contact = p.do_not_contact; if (p.do_not_contact) row.unsubscribed_at = new Date().toISOString(); }
      for (const [k, v] of Object.entries(p.fields || {})) {
        const col = COLS[k];
        if (!col) continue; // derived values (deposit_link, ...) are never written back
        if (INT_COLS.includes(col)) row[col] = v == null || v === "" || isNaN(Number(v)) ? null : Math.round(Number(v));
        else if (col === "film_date") row[col] = /^\d{4}-\d{2}-\d{2}/.test(String(v || "")) ? String(v).slice(0, 10) : null;
        else row[col] = v == null || v === "" ? null : String(v).slice(0, 2000);
      }
      if (Object.keys(row).length) must(await admin.from("spotlight_prospects").update(row).eq("user_id", uid).eq("id", id));
    },
    async insertEvent(e) {
      must(await admin.from("edith_events").insert({ user_id: uid, prospect_id: e.contact_id, type: e.type, payload: e.payload, source: e.source || null, at: e.at }));
    },
    async listEvents(cid, types) {
      let q = admin.from("edith_events").select("prospect_id,type,payload,at,source").eq("user_id", uid).eq("prospect_id", cid);
      if (types) q = q.in("type", types);
      const { data } = await q.order("at");
      return (data || []).map((r) => ({ contact_id: r.prospect_id, type: r.type, payload: r.payload || {}, at: r.at, source: r.source }));
    },
    async listEnrollments(f) {
      let q = admin.from("edith_enrollments").select("*").eq("user_id", uid);
      if (f.contact_id) q = q.eq("prospect_id", f.contact_id);
      if (f.status) q = q.eq("status", f.status);
      if (f.seq) q = q.eq("seq", f.seq);
      const { data } = await q.order("enrolled_at");
      return (data || []).map(enr);
    },
    async getEnrollment(id) {
      const { data } = await admin.from("edith_enrollments").select("*").eq("id", id).maybeSingle();
      return data ? enr(data) : null;
    },
    async insertEnrollment(e) {
      const { data, error } = await admin.from("edith_enrollments").insert({ user_id: uid, prospect_id: e.contact_id, seq: e.seq, status: e.status, enrolled_at: e.enrolled_at, context: e.context }).select("*").maybeSingle();
      if (error) { if (/duplicate|unique/i.test(error.message)) return null; throw new Error(error.message); }
      return data ? enr(data) : null;
    },
    async updateEnrollment(id, p) {
      must(await admin.from("edith_enrollments").update(cols(p as Record<string, unknown>)).eq("id", id));
    },
    async listSteps(f) {
      let q = admin.from("edith_steps").select("*").eq("user_id", uid);
      if (f.enrollment_id) q = q.eq("enrollment_id", f.enrollment_id);
      if (f.contact_id) q = q.eq("prospect_id", f.contact_id);
      if (f.status) q = q.in("status", f.status);
      if (f.due_before) q = q.lte("due_at", f.due_before);
      const { data } = await q.order("created_at").limit(f.limit || 1000);
      return (data || []).map(step);
    },
    async insertSteps(rows) {
      if (rows.length) must(await admin.from("edith_steps").insert(rows.map((r) => ({ user_id: uid, ...cols(r as unknown as Record<string, unknown>) }))));
    },
    async updateStep(id, p) {
      must(await admin.from("edith_steps").update(cols(p as Record<string, unknown>)).eq("id", id));
    },
    async claimStep(id) {
      const { data } = await admin.from("edith_steps").update({ status: "sending" }).eq("id", id).eq("status", "scheduled").select("id");
      return !!data?.length;
    },
    async lastSendAt(cid, ignore) {
      const { data } = await admin.from("edith_steps").select("sent_at,seq").eq("prospect_id", cid).eq("kind", "email").in("status", ["sent", "logged"]).not("sent_at", "is", null).order("sent_at", { ascending: false }).limit(25);
      return (data || []).find((x) => !ignore.includes(x.seq))?.sent_at || null;
    },
    async countSent(f) {
      const { count } = await admin.from("edith_steps").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("seq", f.seq).eq("step", f.step).in("status", ["sent", "logged"]).gte("sent_at", f.since);
      return count || 0;
    },
    async openTask(t, opts) {
      if (opts?.once) {
        const { data } = await admin.from("ops_tasks").select("id").eq("user_id", uid).eq("key", t.key).limit(1);
        if (data?.length) return;
      }
      const { error } = await admin.from("ops_tasks").insert({ user_id: uid, prospect_id: t.contact_id, key: t.key, title: t.title.slice(0, 300), detail: t.detail || null, due_at: t.due_at || null });
      if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    },
    async closeTask(key) {
      await admin.from("ops_tasks").update({ status: "done", done_at: new Date().toISOString() }).eq("user_id", uid).eq("key", key).eq("status", "open");
    },
  };
}

/* -------------------------------------------------------------------- env */

// Open spots on this month's board — the same count the Spotlight board shows.
export async function spotsRemaining(admin: Admin, uid: string) {
  const ops = await loadOps(admin, uid);
  const sp = (ops.__spotlight || {}) as { perMonth?: number; month?: string };
  const perMonth = Number(sp.perMonth) || 10;
  const month = sp.month || "October";
  const { data } = await admin.from("spotlight_prospects").select("slot_month").eq("user_id", uid).in("stage", ["member", "filming", "filmed", "delivered", "published"]);
  return Math.max(0, perMonth - (data || []).filter((p) => (p.slot_month || month) === month).length);
}

export async function edithEnv(admin: Admin, uid: string): Promise<Env> {
  const [cfg, offer] = await Promise.all([getEdithConfig(admin, uid), getOffer(admin, uid)]);
  return {
    store: supabaseStore(admin, uid, cfg, offer),
    content: CONTENT,
    cfg,
    now: () => new Date(),
    spotsRemaining: () => spotsRemaining(admin, uid),
    deliver: async (m) => {
      const ics = m.ics
        ? buildIcs({ start: m.ics.start, end: m.ics.end, title: m.ics.title, description: m.ics.description, location: m.ics.description, uid: `${m.idempotencyKey}@creativeimpactos`, organizer: { name: "Creative Impact", email: process.env.EMAIL_BCC || "hello@creativeimpactmedia.co" }, alarmMinutes: 60 })
        : undefined;
      const r = await sendEmail({ to: m.to, from: m.from, replyTo: m.replyTo, subject: m.subject, text: m.text, html: m.html, bcc: null, headers: m.headers, idempotencyKey: m.idempotencyKey, ics });
      if ("skipped" in r && r.skipped) return { ok: false, error: "Email isn't configured (RESEND_API_KEY)." };
      return { ok: !!r.ok, id: "id" in r ? r.id : undefined, error: "error" in r ? String(r.error || "") : undefined };
    },
    log: async (line) => { await admin.from("log_entries").insert({ user_id: uid, tag: "CS", color: "var(--gold)", message: line.slice(0, 200) }); },
  };
}

/* ------------------------------------------------------------------ hooks */

type Emit = { prospect_id: string | null; type: string; payload?: Record<string, unknown>; source?: string };

// opts.run = false queues whatever the event starts for the minute clock
// instead of sending it inside this request (bulk imports).
export async function edithEmit(admin: Admin, uid: string, ev: Emit, opts: { run?: boolean } = {}): Promise<{ ok: boolean; error?: string }> {
  try {
    const env = await edithEnv(admin, uid);
    const payload = { ...(ev.payload || {}) };
    // A deposit with no episode named joins the current episode (settings).
    if (ev.type === "deposit.paid" && (payload.episode_number == null || payload.episode_number === "")) payload.episode_number = env.cfg.current_episode;
    await emit(env, { contact_id: ev.prospect_id, type: ev.type, payload, source: ev.source }, opts);
    return { ok: true };
  } catch (e) {
    const m = String((e as Error)?.message || e);
    if (!missingTable(m)) console.error("EDITH emit failed", ev.type, m);
    return { ok: false, error: missingTable(m) ? EDITH_MIGRATION : m };
  }
}

// Emit only if this contact has never had this event (reconcile loops re-run).
export async function edithEmitOnce(admin: Admin, uid: string, ev: Emit) {
  if (!ev.prospect_id) return { ok: false };
  const { data, error } = await admin.from("edith_events").select("id").eq("prospect_id", ev.prospect_id).eq("type", ev.type).limit(1);
  if (error || data?.length) return { ok: false };
  return edithEmit(admin, uid, ev);
}

// After any edit to a Spotlight prospect: enroll if now eligible, re-time
// film-date steps, retry anything held for a field that's now filled.
export async function edithTouch(admin: Admin, uid: string, prospectId: string) {
  try { await contactChanged(await edithEnv(admin, uid), prospectId); }
  catch (e) { const m = String((e as Error)?.message || e); if (!missingTable(m)) console.error("EDITH touch failed", m); }
}

// What EDITH's first cold email (SEQ1's first step) would say to this
// business right now — for the importer's preview. Nothing is saved.
export async function previewColdEmail(admin: Admin, uid: string, row: Row) {
  const env = await edithEnv(admin, uid);
  const c = toContact({ id: "preview", business: row.business, owner_name: row.owner_name, first_name: row.first_name, specific_detail: row.specific_detail, email: row.email || "them@example.com", tags: ["cold_prospect"], u_token: "preview" });
  const step = CONTENT.manifest.sequences.find((s) => s.id === "SEQ1")?.steps[0];
  if (!step) return { ok: false as const, error: "SEQ1 isn't in the manifest" };
  const tpl = step.variant && c.fields.specific_detail ? step.variant.template_id : step.template_id;
  const r = renderEmail(env, tpl, "SEQ1", c, {}, await env.spotsRemaining());
  return {
    ok: true as const, template: tpl, from: env.cfg.from, subject: r.subject, text: r.text,
    // What would make it HOLD (the mailing address, usually) — in plain words.
    missing: r.missing.map((k) => FIELD_LABELS[k] || k),
    live: !!env.cfg.edith_live, cap: Number(env.cfg.cold_daily_cap) || 0,
  };
}

export async function edithRetryAll(admin: Admin, uid: string) {
  try { await retryHeld(await edithEnv(admin, uid)); } catch (e) { console.error("EDITH retry failed", e); }
}

export async function edithSettle(admin: Admin, uid: string, enrollmentId: string) {
  await settle(await edithEnv(admin, uid), enrollmentId);
}

// Bookings: a Spotlight booking is call.booked. A booking by someone who is
// already a client is NOT a fit call — if their debrief invite (6-8) went out,
// it's debrief.booked; otherwise it's just a call, and EDITH stays out of it.
// Returns true only when EDITH's own confirmation (3-1) was actually SENT —
// the booking route sends its generic welcome otherwise, so a booker is never
// left with no confirmation (e.g. 3-1 held for a missing call link).
export async function edithOnBooking(admin: Admin, uid: string, a: { email: string; start: string; end: string; isSpotlight: boolean }): Promise<boolean> {
  try {
    if (!a.email) return false;
    const { data: p, error } = await admin.from("spotlight_prospects").select("id,member_at").eq("user_id", uid).ilike("email", a.email).limit(1).maybeSingle();
    if (error || !p) return false;
    if (p.member_at) {
      const { data: sent } = await admin.from("edith_steps").select("id").eq("prospect_id", p.id).eq("step", "6-8").in("status", ["sent", "logged"]).limit(1);
      if (sent?.length) await edithEmit(admin, uid, { prospect_id: p.id, type: "debrief.booked", payload: { call_time: a.start }, source: "booking" });
      return false;
    }
    if (!a.isSpotlight) return false;
    const since = new Date(Date.now() - 60e3).toISOString();
    await edithEmit(admin, uid, { prospect_id: p.id, type: "call.booked", payload: { call_time: a.start, call_end: a.end }, source: "booking" });
    const { data: conf } = await admin.from("edith_steps").select("id").eq("prospect_id", p.id).eq("step", "3-1").eq("status", "sent").gte("sent_at", since).limit(1);
    return !!conf?.length;
  } catch (e) { console.error("EDITH booking hook failed", e); return false; }
}

// A call was rescheduled or cancelled (from the EDITH desk). EDITH follows it only if the
// call is one she's tracking — the contact's latest call event is a booking.
export async function edithOnBookingChange(admin: Admin, uid: string, email: string, a: { cancelled?: boolean; start?: string; end?: string }) {
  try {
    const { data: p } = await admin.from("spotlight_prospects").select("id").eq("user_id", uid).ilike("email", email).limit(1).maybeSingle();
    if (!p) return;
    const { data: evs } = await admin.from("edith_events").select("type").eq("prospect_id", p.id).in("type", ["call.booked", "call.completed", "call.no_show", "call.cancelled"]).order("at", { ascending: false }).limit(1);
    if (evs?.[0]?.type !== "call.booked") return;
    if (a.cancelled) await edithEmit(admin, uid, { prospect_id: p.id, type: "call.cancelled", source: "edith-desk" });
    else await edithEmit(admin, uid, { prospect_id: p.id, type: "call.booked", payload: { call_time: a.start, call_end: a.end }, source: "edith-desk" });
  } catch (e) { console.error("EDITH booking change failed", e); }
}

export async function unsubscribeByToken(admin: Admin, token: string): Promise<{ ok: boolean; business?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false };
  const { data } = await admin.from("spotlight_prospects").select("id,user_id,business,do_not_contact").eq("u_token", token).maybeSingle();
  if (!data) return { ok: false };
  if (!data.do_not_contact) {
    const r = await edithEmit(admin, data.user_id, { prospect_id: data.id, type: "contact.unsubscribed", payload: { via: "link" }, source: "unsubscribe" });
    if (!r.ok) await admin.from("spotlight_prospects").update({ do_not_contact: true, unsubscribed_at: new Date().toISOString() }).eq("id", data.id);
  }
  return { ok: true, business: data.business };
}

/* ------------------------------------------------------------- the clock */

const todayET = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

// One tick: send whatever is due; at 7:30 AM ET send the digest once a day.
// digest "window" = only 7:30–8:00 ET (the minute clock); "any" = any time
// after 7:30 if today's hasn't gone (the once-a-day Vercel cron fallback).
export async function edithTick(admin: Admin, uid: string, opts: { digest: "window" | "any" } = { digest: "window" }) {
  const env = await edithEnv(admin, uid);
  const ran = await runDue(env, { limit: 40 });
  const { data: rt } = await admin.from("edith_runtime").select("digest_sent_on").eq("user_id", uid).maybeSingle();
  const p = etParts(new Date());
  const mins = p.h * 60 + p.mi;
  const due = opts.digest === "any" ? mins >= 450 : mins >= 450 && mins < 480;
  let digest: unknown = null;
  if (env.cfg.digest && due && rt && rt.digest_sent_on !== todayET()) {
    digest = await sendDigest(admin, uid, env.cfg);
    await admin.from("edith_runtime").update({ digest_sent_on: todayET() }).eq("user_id", uid);
  }
  await admin.from("edith_runtime").update({ last_tick_at: new Date().toISOString() }).eq("user_id", uid);
  return { ran, digest };
}

/* ------------------------------------------------------------- the digest */

export async function sendDigest(admin: Admin, uid: string, cfg: Config) {
  const since = new Date(Date.now() - 86400e3).toISOString();
  const [sent, held, evs, ended, tasks, names] = await Promise.all([
    admin.from("edith_steps").select("prospect_id,seq,step,template_id,subject,status,error").eq("user_id", uid).in("status", ["sent", "logged", "failed"]).gte("updated_at", since).order("sent_at"),
    admin.from("edith_steps").select("prospect_id,seq,step,template_id,hold_reason").eq("user_id", uid).eq("status", "held"),
    admin.from("edith_events").select("prospect_id,type,at").eq("user_id", uid).gte("at", since).in("type", ["email.replied", "call.booked", "deposit.paid", "call.no_show"]),
    admin.from("edith_enrollments").select("prospect_id,seq,status,end_reason").eq("user_id", uid).in("status", ["exited", "completed"]).gte("ended_at", since),
    admin.from("ops_tasks").select("title,due_at").eq("user_id", uid).eq("status", "open").order("due_at", { ascending: true, nullsFirst: false }).limit(12),
    admin.from("spotlight_prospects").select("id,business").eq("user_id", uid),
  ]);
  const who = new Map((names.data || []).map((x) => [x.id, x.business || "—"]));
  const S = sent.data || [], H = held.data || [], E = evs.data || [], X = ended.data || [], T = tasks.data || [];
  const count = (t: string) => E.filter((e) => e.type === t);
  if (!S.length && !H.length && !E.length && !X.length && !T.length) return { skipped: "nothing to report" };

  const sec = (title: string, rows: string[]) => rows.length ? `<div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#5c7096;margin:18px 0 6px">${title}</div>${rows.map((r) => `<div style="font-size:13px;line-height:1.65;color:#b9c8e0;border-bottom:1px solid #1c2c48;padding:4px 0">${r}</div>`).join("")}` : "";
  const nm = (id: string) => `<b style="color:#f4f7fc">${esc(who.get(id) || "—")}</b>`;
  const liveWord = cfg.edith_live ? "Sent" : "Would have sent (EDITH is OFF — logged only)";
  const html = emailShell(
    `<div style="font-size:15px;color:#f4f7fc">EDITH · the last 24 hours</div>` +
    sec(liveWord, S.filter((s) => s.status !== "failed").map((s) => `${nm(s.prospect_id)} · ${esc(s.template_id)} — ${esc(s.subject || "")}`)) +
    sec("Failed to send", S.filter((s) => s.status === "failed").map((s) => `${nm(s.prospect_id)} · ${esc(s.template_id)} — ${esc(s.error || "")}`)) +
    sec("Held (a human needs to fill something)", H.map((s) => `${nm(s.prospect_id)} · ${esc(s.template_id)} — ${esc(s.hold_reason || "")}`)) +
    sec("Replies routed to you", count("email.replied").map((e) => nm(e.prospect_id))) +
    sec("Bookings", count("call.booked").map((e) => nm(e.prospect_id))) +
    sec("Deposits", count("deposit.paid").map((e) => nm(e.prospect_id))) +
    sec("No-shows", count("call.no_show").map((e) => nm(e.prospect_id))) +
    sec("Sequence exits", X.map((x) => `${nm(x.prospect_id)} · ${esc(x.seq)} ${x.status === "completed" ? "completed" : "ended by " + esc(x.end_reason || "")}`)) +
    sec("Open tasks", T.map((t) => esc(t.title))) +
    `<div style="font-size:11px;color:#5c7096;margin-top:18px">Everything EDITH does is on the Spotlight → EDITH screen.</div>`,
  );
  const subject = `EDITH · ${S.filter((s) => s.status !== "failed").length} ${cfg.edith_live ? "sent" : "logged"}, ${H.length} held, ${count("email.replied").length} replies`;
  const r = await sendEmail({ to: cfg.digest_to, from: cfg.from, bcc: null, subject, html });
  const line = (label: string, rows: string[]) => (rows.length ? `**${label}:** ${rows.slice(0, 12).join(", ")}${rows.length > 12 ? ` +${rows.length - 12} more` : ""}` : "");
  await discordNotify(admin, uid, `☀️ ${subject}`, [
    line(cfg.edith_live ? "Sent" : "Logged (EDITH off)", S.filter((s) => s.status !== "failed").map((s) => `${who.get(s.prospect_id) || "—"} (${s.template_id})`)),
    line("Failed", S.filter((s) => s.status === "failed").map((s) => who.get(s.prospect_id) || "—")),
    line("Held — a human needs to fill something", H.map((s) => `${who.get(s.prospect_id) || "—"} (${s.template_id}: ${String(s.hold_reason || "").slice(0, 60)})`)),
    line("Replies", count("email.replied").map((e) => who.get(e.prospect_id) || "—")),
    line("Bookings", count("call.booked").map((e) => who.get(e.prospect_id) || "—")),
    line("Paid", count("deposit.paid").map((e) => who.get(e.prospect_id) || "—")),
    line("Open tasks", T.map((t) => t.title)),
  ].filter(Boolean).join("\n") || "Quiet day.");
  return { sent: !!r.ok, subject };
}

