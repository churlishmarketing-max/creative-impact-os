// EDITH — the Charlotte Spotlight email engine.
//
// Pure logic: no imports and no I/O. Everything it touches goes through the
// Store and Env it is handed, so the same code runs against Supabase in
// production (lib/edith/server.ts) and against the in-memory store at the
// bottom of this file in the unit tests and `npm run edith:dry-run`.
//
// The two source files govern everything here and are never edited by code:
//   automations/edith/edith-automations.yaml  — sequences, steps, exits, holds
//   automations/edith/EDITH_Email_Sequences.md — the copy, keyed by template_id
// `npm run edith:build` compiles them into content.generated.ts.
//
// Where the manifest could not be implemented literally, the choice made is
// written next to the code as INTERPRETATION so it can be reviewed.

/* ------------------------------------------------------------------ types */

export type Cond = Record<string, unknown>;

export type StepDef = {
  step: string;
  template_id: string;
  delay?: string;
  anchor?: string;
  at?: string;
  on_event?: string;
  ignore_send_window?: boolean;
  attach?: string;
  variant?: { when: Cond; template_id: string };
  when?: Cond;
  then?: {
    approval_window?: string;
    on_reply?: { create_task?: { assignee?: string; title: string } };
    on_silence?: { emit?: string; set_tag?: string };
    reminder?: { after: string; when?: Cond; template_id: string; once?: boolean };
  };
};

export type SeqDef = {
  id: string;
  name: string;
  enroll_on: { event: string; when?: Cond; unless_within?: { event: string; minutes: number } };
  exit_on?: string[];
  steps: StepDef[];
  on_complete?: { set_tag?: string; enroll?: string; release_spot?: boolean };
  side_effects_on_enroll?: Array<{ create_task?: { assignee?: string; title: string; due?: string }; set_tag?: string; remove_tags?: string[] }>;
  reply_routing?: Record<string, unknown>;
  audience?: { tags_any?: string[]; not_in_active_sequence?: boolean; not_tag?: string[] };
  on_event?: Record<string, unknown>;
};

export type Manifest = {
  version: number;
  sender: { name: string; from: string; reply_to: string; signature_block: string };
  global_rules: {
    timezone: string;
    send_window: { start: string; end: string; days: string[] };
    max_emails_per_contact_per_24h: number;
    stop_on: Array<{ event?: string; tag?: string; route_to?: string }>;
    merge_field_holds: string[];
    compliance: { physical_address_footer_on: string[]; unsubscribe_footer_on: string[] };
    approval: { templates_locked: boolean; live_send_requires_flag: string };
  };
  events: string[];
  contact_fields: { required_for_cold: string[]; computed?: Record<string, string>; tags: string[] };
  sequences: SeqDef[];
  tasks_for_humans: string[];
  reporting: { daily_digest_to: string; fields: string[] };
};

export type Template = {
  template_id: string;
  title: string;
  trigger: string;
  subject: string;
  preview_text: string;
  body: string;
  cta: string;
  internal_note: string;
  merge_fields_used: string[];
};

export type EdithContent = {
  manifest: Manifest;
  templates: Record<string, Template>;
  signature: string;
  source_hash: string;
  warnings: string[];
};

export type Contact = {
  id: string;
  email: string | null;
  tags: string[];
  do_not_contact: boolean;
  unsubscribe_url: string | null;
  // Merge-field values by manifest name (first_name, business_name, call_time
  // as ISO, film_date as YYYY-MM-DD, ...). Empty string / null = unknown.
  fields: Record<string, string | null>;
};

export type Enrollment = {
  id: string;
  contact_id: string;
  seq: string;
  status: "active" | "completed" | "exited";
  enrolled_at: string;
  ended_at?: string | null;
  end_reason?: string | null;
  context: Record<string, unknown>;
};

export type StepStatus = "scheduled" | "waiting" | "held" | "sending" | "sent" | "logged" | "done" | "skipped" | "cancelled" | "failed";

export type StepRow = {
  id: string;
  enrollment_id: string;
  contact_id: string;
  seq: string;
  step: string;
  template_id: string | null;
  kind: "email" | "internal";
  status: StepStatus;
  due_at: string | null;
  anchor?: string | null;
  hold_reason?: string | null;
  to_email?: string | null;
  subject?: string | null;
  body?: string | null;
  sent_at?: string | null;
  error?: string | null;
  meta: Record<string, unknown>;
};

export type EdithEvent = {
  contact_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  at: string;
  source?: string;
};

export type Task = {
  contact_id: string | null;
  key: string;
  title: string;
  detail?: string;
  due_at?: string | null;
};

export type EpisodeInfo = {
  link?: string;
  featured_count?: number;
  published_at?: string;
  promo_started_at?: string;
  promo_end_date?: string;
  promo_ended_at?: string;
  reach_number?: string;
  reach_screenshot?: string;
};

export type Config = {
  edith_live: boolean;
  from: string;
  reply_to: string;
  digest_to: string;
  digest: boolean;
  physical_address: string;
  booking_link: string;
  board_link: string;
  call_link: string;
  debrief_link: string;
  episode_link: string;
  next_board_date: string;
  current_episode: number;
  paused: Record<string, boolean>;
  episodes: Record<string, EpisodeInfo>;
};

export type OutMsg = {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
  idempotencyKey: string;
  ics: { start: string; end: string; title: string; description?: string } | null;
};

export interface Store {
  getContact(id: string): Promise<Contact | null>;
  listContacts(): Promise<Contact[]>;
  updateContact(id: string, patch: { tags?: string[]; do_not_contact?: boolean; fields?: Record<string, string | null> }): Promise<void>;
  insertEvent(e: EdithEvent): Promise<void>;
  listEvents(contactId: string, types?: string[]): Promise<EdithEvent[]>;
  listEnrollments(f: { contact_id?: string; status?: Enrollment["status"]; seq?: string }): Promise<Enrollment[]>;
  getEnrollment(id: string): Promise<Enrollment | null>;
  // Must enforce ONE active enrollment per (contact, seq): return null on conflict.
  insertEnrollment(e: Omit<Enrollment, "id">): Promise<Enrollment | null>;
  updateEnrollment(id: string, patch: Partial<Enrollment>): Promise<void>;
  listSteps(f: { enrollment_id?: string; contact_id?: string; status?: StepStatus[]; due_before?: string; limit?: number }): Promise<StepRow[]>;
  insertSteps(rows: Omit<StepRow, "id">[]): Promise<void>;
  updateStep(id: string, patch: Partial<StepRow>): Promise<void>;
  // Atomically move a step from `scheduled` to `sending`; false if someone else got it.
  claimStep(id: string): Promise<boolean>;
  // Latest EDITH email (sent, or logged while EDITH is off), ignoring the given sequences.
  lastSendAt(contactId: string, ignoreSeqs: string[]): Promise<string | null>;
  openTask(t: Task, opts?: { once?: boolean }): Promise<void>;
  closeTask(key: string): Promise<void>;
}

export type Env = {
  store: Store;
  content: EdithContent;
  cfg: Config;
  now: () => Date;
  spotsRemaining: () => Promise<number>;
  deliver: (m: OutMsg) => Promise<{ ok: boolean; id?: string; error?: string }>;
  log?: (line: string) => void | Promise<void>;
};

/* ------------------------------------------------------- interpretations */

// INTERPRETATION: the manifest's global stop_on says every stop ends every
// active sequence, but two sequences can't work that way. SEQ3 asks for replies
// ("reply and I'll reschedule you") and must still send the 1-hour reminder;
// SEQ6 is declared `exit_on: [] # runs to the debrief` and expects replies
// (6-4 revisions). Unsubscribe / do_not_contact still end everything.
export const STOP_IMMUNE: Record<string, string[]> = {
  SEQ3: ["email.replied"],
  SEQ6: ["email.replied", "call.booked", "deposit.paid"],
};
// "sequences 3 and 4 are exempt (time-anchored reminders)" — manifest.
export const RATE_EXEMPT = ["SEQ3", "SEQ4"];
// Where {{call_time}} follows "Tomorrow at" / "one hour out", it renders as the
// time only; everywhere else as day + time.
const SHORT_TIME_TEMPLATES = ["3-2", "3-3"];
// Payload values an event writes onto the contact (so merge fields resolve).
const PAYLOAD_FIELDS: Record<string, string[]> = {
  "call.booked": ["call_time", "call_end", "call_link", "rebook_link"],
  "call.completed": ["spot_number", "not_fit_reason", "what_would_change"],
  "deposit.paid": ["spot_number", "film_date", "episode_number"],
  "cut.delivered": ["cut_link"],
  "lead.form_submitted": ["q5_answer", "years_in_business", "business_name", "neighborhood"],
};
const PENDING: StepStatus[] = ["scheduled", "waiting", "held", "sending"];

// Every merge field the engine knows how to fill, with the words a human sees
// when one is missing and the send is HELD.
export const FIELD_LABELS: Record<string, string> = {
  first_name: "their first name (owner name)",
  business_name: "the business name",
  neighborhood: "their neighborhood (suburb)",
  years_in_business: "years in business",
  specific_detail: "the specific detail — one sentence a human writes after looking at the business",
  q5_answer: "their answer to form question 5",
  booking_link: "the booking link (EDITH settings)",
  board_link: "the board link (EDITH settings)",
  call_time: "the call time",
  call_link: "the call link (a standing meeting link in EDITH settings, or on the contact)",
  rebook_link: "the rebook link",
  spot_number: "the spot number (log the call outcome)",
  deposit_link: "a deposit invoice (Spotlight → Money → create deposit invoice)",
  balance_link: "a balance invoice (Spotlight → Money → create balance invoice)",
  film_date: "the film date",
  cut_link: "the cut link",
  episode_number: "the episode number",
  episode_link: "the episode link",
  featured_count: "how many businesses are in the episode",
  reach_number: "the reach number (Friday receipt pull)",
  reach_screenshot: "the reach screenshot link (Friday receipt pull)",
  debrief_link: "the debrief booking link (EDITH settings)",
  spots_remaining: "spots remaining",
  next_board_date: "the next board date (EDITH settings)",
  not_fit_reason: "the not-a-fit reason (from the call outcome)",
  what_would_change: "what would change it (from the call outcome)",
  physical_address: "the physical mailing address (EDITH settings — CAN-SPAM footer)",
  unsubscribe_link: "the unsubscribe link",
};
export const KNOWN_FIELDS = Object.keys(FIELD_LABELS);

/* ------------------------------------------------------------------ time */

const TZ = "America/New_York";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (d: Date) => d.toISOString();
const ms = (s: string | null | undefined) => (s ? new Date(s).getTime() : NaN);

export function etParts(d: Date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(d)) p[x.type] = x.value;
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, wd: p.weekday };
}

// Eastern wall-clock time -> the UTC instant (DST-correct).
export function etToUtc(y: number, mo: number, d: number, h: number, mi: number): Date {
  const want = Date.UTC(y, mo - 1, d, h, mi);
  let guess = want;
  for (let i = 0; i < 3; i++) {
    const p = etParts(new Date(guess));
    const diff = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - want;
    if (!diff) break;
    guess -= diff;
  }
  return new Date(guess);
}

export function parseDur(s: string): number {
  const m = /^\s*\+?(\d+)\s*(m|h|d)\s*$/.exec(String(s));
  if (!m) throw new Error(`EDITH: bad duration "${s}"`);
  return +m[1] * ({ m: 60e3, h: 3600e3, d: 86400e3 } as Record<string, number>)[m[2]];
}

// Move t by a duration. Day units keep the Eastern wall-clock time across a
// DST change ("Day 3" at 10:30 stays 10:30); minutes and hours are exact.
export function shift(t: Date | string | number, dur: string, sign: 1 | -1 = 1): Date {
  const d = new Date(t);
  const m = /^\s*\+?(\d+)\s*(m|h|d)\s*$/.exec(String(dur));
  if (!m) throw new Error(`EDITH: bad duration "${dur}"`);
  if (m[2] !== "d") return new Date(d.getTime() + sign * parseDur(dur));
  const p = etParts(d);
  return etToUtc(p.y, p.mo, p.d + sign * +m[1], p.h, p.mi);
}

// "call_time - 24h" | "film_date - 3d" | "promo.started + 15d" | "step[6-4].sent_at + 4d"
export function parseAt(expr: string): { base: string; sign: 1 | -1; ms: number; dur: string } {
  const m = /^\s*([A-Za-z_][\w.]*(?:\[[\w-]+\][\w.]*)?)\s*([+-])\s*(\d+\s*[mhd])\s*$/.exec(String(expr));
  if (!m) throw new Error(`EDITH: bad at: expression "${expr}"`);
  return { base: m[1], sign: m[2] === "-" ? -1 : 1, ms: parseDur(m[3]), dur: m[3].replace(/\s+/g, "") };
}

const hm = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0); };

export function inWindow(t: Date, w: Manifest["global_rules"]["send_window"]): boolean {
  const p = etParts(t);
  if (!w.days.includes(p.wd)) return false;
  const m = p.h * 60 + p.mi;
  return m >= hm(w.start) && m < hm(w.end);
}

// The first instant at or after t that is inside the send window.
export function nextOpen(t: Date, w: Manifest["global_rules"]["send_window"]): Date {
  const p = etParts(t);
  for (let i = 0; i < 9; i++) {
    const day = new Date(Date.UTC(p.y, p.mo - 1, p.d + i));
    if (!w.days.includes(DOW[day.getUTCDay()])) continue;
    const [y, mo, d] = [day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate()];
    const start = etToUtc(y, mo, d, Math.floor(hm(w.start) / 60), hm(w.start) % 60);
    const end = etToUtc(y, mo, d, Math.floor(hm(w.end) / 60), hm(w.end) % 60);
    if (t.getTime() < start.getTime()) return start;
    if (t.getTime() < end.getTime()) return t;
  }
  return t;
}

export function fmtCallTime(isoStr: string, short: boolean): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const time = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d) + " ET";
  if (short) return time;
  const day = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }).format(d);
  return `${day} at ${time}`;
}

export function fmtDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ""));
  if (!m) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
}

/* --------------------------------------------------------------- helpers */

const has = (v: unknown) => v != null && String(v).trim() !== "";
const seqDef = (env: Env, id: string) => env.content.manifest.sequences.find((s) => s.id === id) || null;
const addTag = (tags: string[], t: string) => (tags.includes(t) ? tags : [...tags, t]);
const log = async (env: Env, line: string) => { if (env.log) await env.log(line); };
const fill = (s: string, v: Record<string, string>) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (has(v[k]) ? String(v[k]) : `{{${k}}}`));

// A step definition, including the synthetic ones `then:` blocks create.
export function findDef(env: Env, seqId: string, stepId: string): StepDef | null {
  const seq = seqDef(env, seqId);
  if (!seq) return null;
  const d = seq.steps.find((s) => s.step === stepId);
  if (d) return d;
  for (const s of seq.steps) {
    const r = s.then?.reminder;
    if (r && stepId === `${s.step}-reminder`) return { step: stepId, template_id: r.template_id, when: r.when };
  }
  return null;
}

export function classifyReply(text: string): "stop" | "later" | "yes" | "other" {
  const fresh = String(text || "").split(/\n\s*>|\nOn .{4,200}wrote:|-----Original Message-----|\n_{5,}/)[0].trim().toLowerCase().slice(0, 400);
  if (/\b(unsubscribe|remove me|take me off|opt me out|opt out|do not (contact|email) me|don'?t (contact|email) me)\b/.test(fresh) || /^\W*stop\W*$/.test(fresh.split("\n")[0] || "")) return "stop";
  if (/^\W*later\b/.test(fresh) || /\b(not now|not yet|check back|circle back|next (month|board|season))\b/.test(fresh)) return "later";
  if (/^\W*(yes|yep|yeah)\b/.test(fresh)) return "yes";
  return "other";
}

function evalWhen(cond: Cond | undefined, x: { contact: Contact; payload?: Record<string, unknown>; spots?: number; events?: EdithEvent[]; steps?: StepRow[]; since?: string | null }): boolean {
  if (!cond) return true;
  for (const [k, v] of Object.entries(cond)) {
    let ok: boolean;
    if (k === "tag") ok = x.contact.tags.includes(String(v));
    else if (k === "outcome") ok = String(x.payload?.outcome ?? x.contact.fields.call_outcome ?? "") === String(v);
    else if (k === "spots_remaining") ok = x.spots === Number(v);
    else if (k === "event_seen") ok = (x.events || []).some((e) => e.type === v);
    else if (k === "not") ok = !(x.events || []).some((e) => e.type === v && (!x.since || ms(e.at) >= ms(x.since)));
    else if (k === "no_reply_since") {
      const sent = (x.steps || []).find((s) => s.step === String(v) && s.sent_at);
      ok = !(x.events || []).some((e) => e.type === "email.replied" && (!sent || ms(e.at) >= ms(sent.sent_at)));
    } else ok = v === "not_empty" ? has(x.contact.fields[k]) : String(x.contact.fields[k] ?? "") === String(v);
    if (!ok) return false;
  }
  return true;
}

/* ------------------------------------------------------------- rendering */

export function mergeValues(env: Env, tplId: string, c: Contact, ctx: Record<string, unknown>, spots: number): Record<string, string> {
  const f = c.fields;
  const cfg = env.cfg;
  const epNo = String(ctx.episode_number ?? f.episode_number ?? "");
  const ep: EpisodeInfo = (epNo && cfg.episodes?.[epNo]) || {};
  const s = (v: unknown) => (v == null ? "" : String(v));
  return {
    first_name: s(f.first_name),
    business_name: s(f.business_name),
    neighborhood: s(f.neighborhood),
    years_in_business: s(f.years_in_business),
    specific_detail: s(f.specific_detail),
    q5_answer: s(f.q5_answer),
    booking_link: s(cfg.booking_link),
    board_link: s(cfg.board_link),
    call_time: f.call_time ? fmtCallTime(f.call_time, SHORT_TIME_TEMPLATES.includes(tplId)) : "",
    call_link: s(f.call_link || cfg.call_link),
    rebook_link: s(f.rebook_link || cfg.booking_link),
    spot_number: s(f.spot_number),
    deposit_link: s(f.deposit_link),
    balance_link: s(f.balance_link),
    film_date: f.film_date ? fmtDate(f.film_date) : "",
    cut_link: s(ctx.cut_link || f.cut_link),
    episode_number: s(ctx.episode_number ?? f.episode_number),
    // The Omaha original until a Charlotte episode exists (settings), or the
    // link the episode.published event carried.
    episode_link: s(ctx.episode_link || cfg.episode_link),
    featured_count: s(ctx.featured_count ?? ep.featured_count),
    reach_number: s(ep.reach_number || f.reach_number),
    reach_screenshot: s(ep.reach_screenshot || f.reach_screenshot),
    debrief_link: s(cfg.debrief_link),
    spots_remaining: String(spots),
    next_board_date: s(cfg.next_board_date),
    not_fit_reason: s(f.not_fit_reason),
    what_would_change: s(f.what_would_change),
  };
}

export function renderEmail(env: Env, tplId: string, seqId: string, c: Contact, ctx: Record<string, unknown>, spots: number) {
  const t = env.content.templates[tplId];
  if (!t) return { subject: "", preview: "", text: "", html: "", missing: [`template ${tplId}`] };
  const v = mergeValues(env, tplId, c, ctx, spots);
  const missing = t.merge_fields_used.filter((k) => !has(v[k]));
  const comp = env.content.manifest.global_rules.compliance;
  const foot: string[] = [];
  if (comp.physical_address_footer_on.includes(seqId)) {
    if (has(env.cfg.physical_address)) foot.push(`Creative Impact · ${env.cfg.physical_address}`);
    else missing.push("physical_address");
  }
  if (comp.unsubscribe_footer_on.includes(seqId)) {
    if (has(c.unsubscribe_url)) foot.push(`Unsubscribe: ${c.unsubscribe_url}`);
    else missing.push("unsubscribe_link");
  }
  const subject = fill(t.subject, v);
  const preview = fill(t.preview_text, v);
  const text = `${fill(t.body, v)}\n\n${env.content.signature}${foot.length ? "\n\n--\n" + foot.join("\n") : ""}`;
  return { subject, preview, text, html: plainHtml(text, preview), missing };
}

// Plain text is the email. The HTML part exists only to carry the template's
// preview text (a text-only email can't); it renders as the same plain text.
function plainHtml(text: string, preview: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const body = esc(text).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}">${u}</a>`);
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}${"&#8199;&#65279;&#847; ".repeat(40)}</div><div style="white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1d1d1d">${body}</div>`;
}

/* ------------------------------------------------------------ enrollment */

async function planStep(env: Env, c: Contact, enr: Enrollment, def: StepDef, sibling: StepRow[]): Promise<Omit<StepRow, "id">> {
  const row: Omit<StepRow, "id"> = { enrollment_id: enr.id, contact_id: c.id, seq: enr.seq, step: def.step, template_id: def.template_id, kind: "email", status: "scheduled", due_at: null, anchor: null, meta: {} };
  if (def.on_event) return { ...row, status: "waiting", anchor: `on:${def.on_event}` };
  if (def.at) {
    const r = resolveAt(env, def.at, c, enr, sibling);
    if (r.state === "waiting") return { ...row, status: "waiting", anchor: def.at, hold_reason: r.reason };
    if (r.state === "past") return { ...row, status: "skipped", anchor: def.at, due_at: r.due, hold_reason: r.reason };
    return { ...row, anchor: def.at, due_at: r.due };
  }
  const base = def.anchor && def.anchor !== "enroll" ? ms(String(enr.context[def.anchor] || "")) : ms(enr.enrolled_at);
  return { ...row, anchor: def.anchor || "enroll", due_at: iso(shift(isNaN(base) ? ms(enr.enrolled_at) : base, def.delay || "0m")) };
}

// Resolve an at: expression to a due time. A reminder that lands after the
// moment it anchors to (e.g. a 24-hour reminder for a call booked 10 hours
// out) is skipped, never sent late.
function resolveAt(env: Env, expr: string, c: Contact, enr: Enrollment, steps: StepRow[]): { state: "ok" | "waiting" | "past"; due: string | null; reason?: string } {
  const a = parseAt(expr);
  let base: number = NaN;
  if (a.base === "film_date") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(c.fields.film_date || ""));
    if (m) base = etToUtc(+m[1], +m[2], +m[3], 9, 0).getTime(); // film day, 9:00 AM ET
  } else if (a.base === "promo.started") {
    base = ms(String((enr.context.events as Record<string, string> | undefined)?.["promo.started"] || ""));
  } else if (/^step\[/.test(a.base)) {
    const id = (/^step\[([\w-]+)\]/.exec(a.base) || [])[1];
    base = ms(steps.find((s) => s.step === id && s.sent_at)?.sent_at || "");
  } else base = ms(String(c.fields[a.base] || enr.context[a.base] || ""));
  if (isNaN(base)) return { state: "waiting", due: null, reason: `waiting for ${a.base}` };
  const due = shift(base, a.dur, a.sign).getTime();
  const now = env.now().getTime();
  if (a.sign < 0 && due < now) return { state: "past", due: iso(new Date(due)), reason: `${a.base} is too close — this reminder's moment already passed` };
  return { state: "ok", due: iso(new Date(due)) };
}

async function enroll(env: Env, c: Contact, seq: SeqDef, ev: EdithEvent): Promise<Enrollment | null> {
  const enr = await env.store.insertEnrollment({ contact_id: c.id, seq: seq.id, status: "active", enrolled_at: ev.at, context: { ...ev.payload, enrolled_by: ev.type, events: { [ev.type]: ev.at } } });
  if (!enr) return null;
  let tags = c.tags;
  for (const fx of seq.side_effects_on_enroll || []) {
    if (fx.create_task) {
      await env.store.openTask({
        contact_id: c.id,
        key: `${seq.id}:${enr.id}:task`,
        title: fx.create_task.title.replace(/\{\{\s*business_name\s*\}\}/g, c.fields.business_name || "this business"),
        due_at: fx.create_task.due ? iso(shift(ev.at, fx.create_task.due)) : null,
      });
    }
    if (fx.set_tag) tags = addTag(tags, fx.set_tag);
    if (fx.remove_tags) tags = tags.filter((t) => !fx.remove_tags!.includes(t));
  }
  if (tags !== c.tags) { await env.store.updateContact(c.id, { tags }); c.tags = tags; }
  const rows: Omit<StepRow, "id">[] = [];
  for (const def of seq.steps) rows.push(await planStep(env, c, enr, def, []));
  await env.store.insertSteps(rows);
  await log(env, `EDITH · ${c.fields.business_name || c.email} enrolled in ${seq.id} (${seq.name})`);
  return enr;
}

async function enrollFor(env: Env, c: Contact, ev: EdithEvent, opts: { onceEver?: boolean } = {}) {
  if (c.do_not_contact || c.tags.includes("do_not_contact")) return;
  const events = await env.store.listEvents(c.id);
  for (const seq of env.content.manifest.sequences) {
    if (seq.enroll_on.event !== ev.type || seq.audience) continue;
    if (!evalWhen(seq.enroll_on.when, { contact: c, payload: ev.payload })) continue;
    const uw = seq.enroll_on.unless_within;
    // INTERPRETATION: "no booking within 10 minutes" is enforced both ways — a
    // booking in the 10 minutes BEFORE the form blocks enrollment, and one in
    // the 10 minutes after exits SEQ2 via stop_on before 2-1 (5m) can matter.
    if (uw && events.some((e) => e.type === uw.event && Math.abs(ms(e.at) - ms(ev.at)) <= uw.minutes * 60e3)) continue;
    const mine = await env.store.listEnrollments({ contact_id: c.id, seq: seq.id });
    if (mine.some((e) => e.status === "active")) continue;
    // Sequences that enroll on contact.created run once per contact, ever.
    if ((opts.onceEver || seq.enroll_on.event === "contact.created") && mine.length) continue;
    await enroll(env, c, seq, ev);
  }
}

async function exitEnrollment(env: Env, enr: Enrollment, reason: string) {
  await env.store.updateEnrollment(enr.id, { status: "exited", ended_at: iso(env.now()), end_reason: reason });
  for (const s of await env.store.listSteps({ enrollment_id: enr.id, status: PENDING })) {
    await env.store.updateStep(s.id, { status: "cancelled", hold_reason: `exited: ${reason}` });
    await env.store.closeTask(`hold:${s.id}`);
  }
  await log(env, `EDITH · ${enr.seq} exited (${reason})`);
}

async function maybeComplete(env: Env, enr: Enrollment) {
  const fresh = await env.store.getEnrollment(enr.id);
  if (!fresh || fresh.status !== "active") return;
  const left = await env.store.listSteps({ enrollment_id: enr.id, status: PENDING });
  if (left.length) return;
  await env.store.updateEnrollment(enr.id, { status: "completed", ended_at: iso(env.now()), end_reason: "completed" });
  const oc = seqDef(env, enr.seq)?.on_complete;
  if (!oc) return;
  const c = await env.store.getContact(enr.contact_id);
  if (!c) return;
  let tags = c.tags;
  if (oc.set_tag) tags = addTag(tags, oc.set_tag);
  // INTERPRETATION: `enroll: SEQ7` = join the monthly-episode audience (tag
  // nurture). SEQ7 is a per-episode broadcast; enrolling now would send an
  // episode email with no new episode to announce.
  if (oc.enroll === "SEQ7") tags = addTag(tags, "nurture");
  if (tags !== c.tags) await env.store.updateContact(c.id, { tags });
  // INTERPRETATION: release_spot is a no-op here — spots are only claimed at
  // deposit, so an undecided contact never held one. Logged for the record.
  await log(env, `EDITH · ${enr.seq} complete for ${c.fields.business_name || c.email}${oc.set_tag ? ` → tagged ${oc.set_tag}` : ""}${oc.release_spot ? " (no spot was held)" : ""}`);
}

/* ---------------------------------------------------------------- events */

export async function emit(env: Env, input: Omit<EdithEvent, "at"> & { at?: string }): Promise<void> {
  const ev: EdithEvent = { ...input, at: input.at || iso(env.now()) };
  await env.store.insertEvent(ev);
  if (!ev.contact_id) { await broadcast(env, ev); return; }
  let c = await env.store.getContact(ev.contact_id);
  if (!c) return;

  // 1. What the event tells us about the contact.
  const patch: Record<string, string | null> = {};
  for (const k of PAYLOAD_FIELDS[ev.type] || []) if (has(ev.payload[k])) patch[k] = String(ev.payload[k]);
  if (ev.type === "call.completed" && has(ev.payload.outcome)) patch.call_outcome = String(ev.payload.outcome);
  if (Object.keys(patch).length) await env.store.updateContact(c.id, { fields: patch });
  if (ev.type === "contact.unsubscribed") await env.store.updateContact(c.id, { do_not_contact: true, tags: addTag(c.tags, "do_not_contact") });
  c = (await env.store.getContact(c.id))!;

  // 2. Stops and exits.
  const stops = env.content.manifest.global_rules.stop_on.map((s) => s.event).filter(Boolean) as string[];
  for (const enr of await env.store.listEnrollments({ contact_id: c.id, status: "active" })) {
    const def = seqDef(env, enr.seq);
    const byGlobal = stops.includes(ev.type) && !(STOP_IMMUNE[enr.seq] || []).includes(ev.type);
    const byOwn = (def?.exit_on || []).includes(ev.type);
    if (ev.type === "contact.unsubscribed" || byGlobal || byOwn) await exitEnrollment(env, enr, ev.type);
  }

  // 3. Replies: route to a human, then act on the keyword.
  if (ev.type === "email.replied") {
    const kw = (ev.payload.keyword as string) || classifyReply(String(ev.payload.text || ""));
    await env.store.openTask({ contact_id: c.id, key: `reply:${c.id}:${ev.at}`, title: `${c.fields.business_name || c.email} replied${kw !== "other" ? ` ("${kw}")` : ""} — answer it from Emmanuel's inbox`, detail: String(ev.payload.text || "").slice(0, 500) });
    if (kw === "later") await env.store.updateContact(c.id, { tags: addTag(c.tags, "nurture") });
    if (kw === "stop") { await emit(env, { contact_id: c.id, type: "contact.unsubscribed", payload: { via: "reply" }, source: "reply" }); return; }
  }

  // 4. Steps waiting on this event, in the sequences still running.
  await fireOnEvent(env, c, ev);

  // 5. New enrollments.
  await enrollFor(env, c, ev);

  // 6. Human tasks the manifest names.
  await bookkeeping(env, c, ev);
  await runDue(env, { contactId: c.id });
}

async function broadcast(env: Env, ev: EdithEvent) {
  const epNo = has(ev.payload.episode_number) ? String(ev.payload.episode_number) : "";
  const contacts = await env.store.listContacts();
  for (const c of contacts) {
    if (!epNo || String(c.fields.episode_number || "") !== epNo) continue;
    if (!(await env.store.listEnrollments({ contact_id: c.id, status: "active", seq: "SEQ6" })).length) continue;
    await fireOnEvent(env, c, ev);
    await runDue(env, { contactId: c.id });
  }
  for (const seq of env.content.manifest.sequences) {
    if (!seq.audience || seq.enroll_on.event !== ev.type) continue;
    const a = seq.audience;
    for (const c of contacts) {
      if (c.do_not_contact || (a.not_tag || []).some((t) => c.tags.includes(t))) continue;
      if (a.tags_any && !a.tags_any.some((t) => c.tags.includes(t))) continue;
      if (a.not_in_active_sequence && (await env.store.listEnrollments({ contact_id: c.id, status: "active" })).length) continue;
      await enroll(env, c, seq, { ...ev, contact_id: c.id });
      await runDue(env, { contactId: c.id });
    }
  }
  if (ev.type === "promo.started" && epNo) {
    await env.store.openTask({ contact_id: null, key: `reach:${epNo}`, title: `Friday receipt pull — Episode ${epNo}: reach number + screenshot (feeds 6-7)`, due_at: iso(nextFriday(env.now())) });
  }
}

function nextFriday(d: Date): Date {
  const p = etParts(d);
  const add = (5 - DOW.indexOf(p.wd) + 7) % 7 || 7;
  const day = new Date(Date.UTC(p.y, p.mo - 1, p.d + add));
  return etToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), 17, 0);
}

async function fireOnEvent(env: Env, c: Contact, ev: EdithEvent) {
  for (const enr of await env.store.listEnrollments({ contact_id: c.id, status: "active" })) {
    const steps = await env.store.listSteps({ enrollment_id: enr.id });
    const context = { ...enr.context, ...ev.payload, events: { ...((enr.context.events as object) || {}), [ev.type]: ev.at } };
    await env.store.updateEnrollment(enr.id, { context });
    enr.context = context;
    for (const s of steps) {
      if (s.status === "waiting" && s.anchor === `on:${ev.type}`) await env.store.updateStep(s.id, { status: "scheduled", due_at: ev.at, hold_reason: null });
      else if ((s.status === "waiting" || s.status === "scheduled") && s.anchor && s.anchor.startsWith(ev.type)) {
        const r = resolveAt(env, s.anchor, c, enr, steps);
        if (r.state === "ok") await env.store.updateStep(s.id, { status: "scheduled", due_at: r.due, hold_reason: null });
      }
    }
    // 6-4's approval window: a reply inside it is a revisions request.
    if (ev.type === "email.replied") {
      for (const s of steps.filter((x) => x.kind === "internal" && x.status === "scheduled" && x.meta.on_reply)) {
        const t = (s.meta.on_reply as { create_task?: { title: string } }).create_task;
        if (t) await env.store.openTask({ contact_id: c.id, key: `revisions:${s.id}`, title: t.title.replace(/\{\{\s*business_name\s*\}\}/g, c.fields.business_name || "client") });
        await env.store.updateStep(s.id, { status: "done", hold_reason: "reply received — revisions requested, not auto-approved" });
      }
    }
  }
}

async function bookkeeping(env: Env, c: Contact, ev: EdithEvent) {
  const who = c.fields.business_name || c.email || "this contact";
  if (ev.type === "call.booked" && c.fields.call_time) {
    await env.store.openTask({ contact_id: c.id, key: `outcome:${c.id}`, title: `Log the outcome of ${who}'s call — outcome + spot number (+ reasons if not a fit)`, due_at: iso(new Date(ms(c.fields.call_time) + 30 * 60e3)) });
  }
  if (["call.completed", "call.no_show", "call.cancelled"].includes(ev.type)) await env.store.closeTask(`outcome:${c.id}`);
  await coldDetailTask(env, c);
}

async function coldDetailTask(env: Env, c: Contact) {
  if (c.tags.includes("cold_prospect") && !has(c.fields.specific_detail) && !c.do_not_contact) {
    await env.store.openTask({ contact_id: c.id, key: `detail:${c.id}`, title: `Write the specific detail for ${c.fields.business_name || c.email} — SEQ1 can't start without it` });
  } else await env.store.closeTask(`detail:${c.id}`);
}

// Call after any edit to a contact: re-checks enrollment for contact.created
// sequences (e.g. the specific detail just got written), re-times at: steps
// (the film date moved), and retries anything HELD for a now-filled field.
export async function contactChanged(env: Env, contactId: string) {
  const c = await env.store.getContact(contactId);
  if (!c) return;
  await enrollFor(env, c, { contact_id: c.id, type: "contact.created", payload: {}, at: iso(env.now()) }, { onceEver: true });
  await coldDetailTask(env, c);
  for (const enr of await env.store.listEnrollments({ contact_id: c.id, status: "active" })) {
    const steps = await env.store.listSteps({ enrollment_id: enr.id });
    for (const s of steps) {
      if ((s.status === "waiting" || s.status === "scheduled") && s.anchor && !s.anchor.startsWith("on:") && s.anchor !== "enroll" && /[+-]\s*\d/.test(s.anchor)) {
        const r = resolveAt(env, s.anchor, c, enr, steps);
        if (r.state === "ok" && (s.status === "waiting" || r.due !== s.due_at)) await env.store.updateStep(s.id, { status: "scheduled", due_at: r.due, hold_reason: null });
        if (r.state === "past" && s.status === "waiting") await env.store.updateStep(s.id, { status: "skipped", hold_reason: r.reason });
      }
    }
  }
  await retryHeld(env, contactId);
  await runDue(env, { contactId });
}

// Complete an enrollment if nothing is left pending (e.g. after a human skips a step).
export async function settle(env: Env, enrollmentId: string) {
  const e = await env.store.getEnrollment(enrollmentId);
  if (e) await maybeComplete(env, e);
}

export async function retryHeld(env: Env, contactId?: string) {
  const held = await env.store.listSteps({ contact_id: contactId, status: ["held"] });
  for (const s of held) await env.store.updateStep(s.id, { status: "scheduled", due_at: s.due_at && ms(s.due_at) > env.now().getTime() ? s.due_at : iso(env.now()) });
  if (held.length) await runDue(env, { contactId });
}

/* ------------------------------------------------------------------ send */

export async function runDue(env: Env, opts: { contactId?: string; limit?: number } = {}): Promise<number> {
  let n = 0;
  for (let pass = 0; pass < 4; pass++) {
    const due = (await env.store.listSteps({ contact_id: opts.contactId, status: ["scheduled"], due_before: iso(env.now()), limit: opts.limit || 50 }))
      .sort((a, b) => ms(a.due_at) - ms(b.due_at));
    if (!due.length) break;
    let moved = 0;
    for (const s of due) { if (await runStep(env, s)) moved++; n++; }
    if (!moved) break;
  }
  return n;
}

async function hold(env: Env, s: StepRow, c: Contact, tplId: string, reason: string, task: boolean) {
  await env.store.updateStep(s.id, { status: "held", hold_reason: reason });
  if (task) await env.store.openTask({ contact_id: c.id, key: `hold:${s.id}`, title: `EDITH is holding ${tplId} for ${c.fields.business_name || c.email}: ${reason}`, detail: `${s.seq} · step ${s.step}` });
}

// Returns true when the step reached a final state (so a follow-on step may now be due).
async function runStep(env: Env, s: StepRow): Promise<boolean> {
  const now = env.now();
  const enr = await env.store.getEnrollment(s.enrollment_id);
  if (!enr || enr.status !== "active") { await env.store.updateStep(s.id, { status: "cancelled", hold_reason: "sequence no longer active" }); return true; }
  const c = await env.store.getContact(s.contact_id);
  if (!c || c.do_not_contact) { await env.store.updateStep(s.id, { status: "cancelled", hold_reason: "do not contact" }); return true; }
  const events = await env.store.listEvents(c.id);
  const steps = await env.store.listSteps({ enrollment_id: enr.id });

  if (s.kind === "internal") return runInternal(env, s, enr, c, events);

  const def = findDef(env, enr.seq, s.step);
  if (!def) { await env.store.updateStep(s.id, { status: "failed", error: "step not in manifest" }); return true; }

  // A reminder whose moment has passed is skipped, not sent late.
  if (def.at && parseAt(def.at).sign < 0) {
    const r = resolveAt(env, def.at, c, enr, steps);
    const base = r.due ? shift(r.due, parseAt(def.at).dur, 1).getTime() : NaN;
    if (!isNaN(base) && now.getTime() >= base) { await env.store.updateStep(s.id, { status: "skipped", hold_reason: "too late — the moment it anchors to has passed" }); await maybeComplete(env, enr); return true; }
  }
  const parent = s.step.endsWith("-reminder") ? steps.find((x) => `${x.step}-reminder` === s.step) : null;
  if (def.when && !evalWhen(def.when, { contact: c, events, steps, since: parent?.sent_at || null })) {
    await env.store.updateStep(s.id, { status: "skipped", hold_reason: `condition not met: ${JSON.stringify(def.when)}` });
    await maybeComplete(env, enr);
    return true;
  }

  const spots = await env.spotsRemaining();
  const tplId = def.variant && evalWhen(def.variant.when, { contact: c, events, steps, spots }) ? def.variant.template_id : (s.template_id || def.template_id);

  if (env.cfg.paused?.[enr.seq]) { await hold(env, s, c, tplId, `${enr.seq} is paused in EDITH settings`, false); return false; }

  const w = env.content.manifest.global_rules.send_window;
  if (!def.ignore_send_window && !inWindow(now, w)) { await env.store.updateStep(s.id, { due_at: iso(nextOpen(now, w)), hold_reason: "outside the send window" }); return false; }

  if (!RATE_EXEMPT.includes(enr.seq)) {
    // INTERPRETATION: exempt means SEQ3/SEQ4 reminders neither wait on the cap
    // nor count toward it — 5-1 is designed to land two hours after a call
    // whose 1-hour reminder (3-3) just went out.
    const last = await env.store.lastSendAt(c.id, RATE_EXEMPT);
    const cap = env.content.manifest.global_rules.max_emails_per_contact_per_24h || 1;
    if (last && cap <= 1 && now.getTime() - ms(last) < 86400e3) {
      await env.store.updateStep(s.id, { due_at: iso(nextOpen(new Date(ms(last) + 86400e3), w)), hold_reason: "one email per contact per 24h" });
      return false;
    }
  }

  if (!has(c.email)) { await hold(env, s, c, tplId, "no email address on file", true); return false; }
  const r = renderEmail(env, tplId, enr.seq, c, enr.context, spots);
  if (r.missing.length) { await hold(env, s, c, tplId, `missing ${r.missing.map((k) => FIELD_LABELS[k] || k).join("; ")}`, true); return false; }

  if (!(await env.store.claimStep(s.id))) return false;
  const base = { to_email: c.email, subject: r.subject, body: r.text, hold_reason: null, template_id: tplId };
  if (!env.cfg.edith_live) {
    await env.store.updateStep(s.id, { ...base, status: "logged", sent_at: iso(now) });
  } else {
    const unsub = env.content.manifest.global_rules.compliance.unsubscribe_footer_on.includes(enr.seq) && c.unsubscribe_url;
    let res: { ok: boolean; id?: string; error?: string };
    try {
      res = await env.deliver({
      to: c.email!, from: env.cfg.from, replyTo: env.cfg.reply_to, subject: r.subject, text: r.text, html: r.html,
      headers: unsub ? { "List-Unsubscribe": `<${c.unsubscribe_url!.replace("/e/unsubscribe/", "/api/edith/unsubscribe?t=")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {},
      idempotencyKey: `edith-${s.id}`,
      ics: def.attach === "ics" && c.fields.call_time ? { start: c.fields.call_time, end: c.fields.call_end || iso(new Date(ms(c.fields.call_time) + 15 * 60e3)), title: "Charlotte Spotlight fit call with Emmanuel", description: mergeValues(env, tplId, c, enr.context, spots).call_link } : null,
      });
    } catch (e) { res = { ok: false, error: String((e as Error)?.message || e) }; }
    if (!res.ok) {
      await env.store.updateStep(s.id, { ...base, status: "failed", error: res.error || "send failed" });
      await env.store.openTask({ contact_id: c.id, key: `failed:${s.id}`, title: `EDITH couldn't send ${tplId} to ${c.fields.business_name || c.email}: ${res.error || "send failed"}` });
      return true;
    }
    await env.store.updateStep(s.id, { ...base, status: "sent", sent_at: iso(now), meta: { ...s.meta, resend_id: res.id || null } });
  }
  await env.store.closeTask(`hold:${s.id}`);
  await log(env, `EDITH · ${env.cfg.edith_live ? "sent" : "logged (EDITH off)"} ${tplId} → ${c.fields.business_name || c.email}: ${r.subject}`);
  await afterSend(env, { ...s, sent_at: iso(now) }, enr, c, def);
  await maybeComplete(env, enr);
  return true;
}

async function afterSend(env: Env, s: StepRow, enr: Enrollment, c: Contact, def: StepDef) {
  const t = def.then;
  const extra: Omit<StepRow, "id">[] = [];
  if (t?.approval_window) {
    extra.push({ enrollment_id: enr.id, contact_id: c.id, seq: enr.seq, step: `${s.step}:approval`, template_id: null, kind: "internal", status: "scheduled", due_at: iso(shift(s.sent_at!, t.approval_window)), anchor: `step[${s.step}].sent_at + ${t.approval_window}`, meta: { on_reply: t.on_reply || null, on_silence: t.on_silence || null } });
  }
  if (t?.reminder) {
    extra.push({ enrollment_id: enr.id, contact_id: c.id, seq: enr.seq, step: `${s.step}-reminder`, template_id: t.reminder.template_id, kind: "email", status: "scheduled", due_at: iso(shift(s.sent_at!, t.reminder.after)), anchor: `step[${s.step}].sent_at + ${t.reminder.after}`, meta: {} });
  }
  if (extra.length) await env.store.insertSteps(extra);
  // Steps timed off this one (6-5 = step[6-4].sent_at + 4d).
  const steps = await env.store.listSteps({ enrollment_id: enr.id, status: ["waiting"] });
  for (const w of steps) {
    if (!w.anchor || !w.anchor.startsWith(`step[${s.step}]`)) continue;
    const r = resolveAt(env, w.anchor, c, enr, [s]);
    if (r.state === "ok") await env.store.updateStep(w.id, { status: "scheduled", due_at: r.due, hold_reason: null });
  }
}

async function runInternal(env: Env, s: StepRow, enr: Enrollment, c: Contact, events: EdithEvent[]): Promise<boolean> {
  const parentId = s.step.split(":")[0];
  const parent = (await env.store.listSteps({ enrollment_id: enr.id })).find((x) => x.step === parentId);
  const replied = events.some((e) => e.type === "email.replied" && parent?.sent_at && ms(e.at) >= ms(parent.sent_at));
  if (replied) { await env.store.updateStep(s.id, { status: "done", hold_reason: "reply received — revisions requested" }); await maybeComplete(env, enr); return true; }
  const sil = s.meta.on_silence as { emit?: string; set_tag?: string } | null;
  await env.store.updateStep(s.id, { status: "done", sent_at: iso(env.now()), hold_reason: "no reply in the window — approved as-is" });
  if (sil?.set_tag) await env.store.updateContact(c.id, { tags: addTag(c.tags, sil.set_tag) });
  if (sil?.emit) await emit(env, { contact_id: c.id, type: sil.emit, payload: { via: "silence" }, source: "edith" });
  await maybeComplete(env, enr);
  return true;
}

/* ----------------------------------------------------- in-memory store */

// For tests and the dry run. Mirrors the Supabase store's semantics, including
// the one-active-enrollment-per-sequence rule and the atomic claim.
export function createMemoryStore(seed: Contact[] = []) {
  let n = 0;
  const id = (p: string) => `${p}${++n}`;
  const contacts = new Map(seed.map((c) => [c.id, structuredClone(c)]));
  const events: EdithEvent[] = [];
  const enrollments: Enrollment[] = [];
  const steps: StepRow[] = [];
  const tasks: Array<Task & { status: "open" | "done" }> = [];
  const store: Store = {
    async getContact(cid) { const c = contacts.get(cid); return c ? structuredClone(c) : null; },
    async listContacts() { return [...contacts.values()].map((c) => structuredClone(c)); },
    async updateContact(cid, p) {
      const c = contacts.get(cid); if (!c) return;
      if (p.tags) c.tags = [...p.tags];
      if (p.do_not_contact != null) c.do_not_contact = p.do_not_contact;
      if (p.fields) Object.assign(c.fields, p.fields);
    },
    async insertEvent(e) { events.push(structuredClone(e)); },
    async listEvents(cid, types) { return events.filter((e) => e.contact_id === cid && (!types || types.includes(e.type))).map((e) => structuredClone(e)); },
    async listEnrollments(f) { return enrollments.filter((e) => (!f.contact_id || e.contact_id === f.contact_id) && (!f.status || e.status === f.status) && (!f.seq || e.seq === f.seq)).map((e) => structuredClone(e)); },
    async getEnrollment(eid) { const e = enrollments.find((x) => x.id === eid); return e ? structuredClone(e) : null; },
    async insertEnrollment(e) {
      if (enrollments.some((x) => x.contact_id === e.contact_id && x.seq === e.seq && x.status === "active")) return null;
      const row = { ...structuredClone(e), id: id("enr") }; enrollments.push(row); return structuredClone(row);
    },
    async updateEnrollment(eid, p) { const e = enrollments.find((x) => x.id === eid); if (e) Object.assign(e, structuredClone(p)); },
    async listSteps(f) {
      return steps.filter((s) => (!f.enrollment_id || s.enrollment_id === f.enrollment_id) && (!f.contact_id || s.contact_id === f.contact_id) && (!f.status || f.status.includes(s.status)) && (!f.due_before || (s.due_at != null && ms(s.due_at) <= ms(f.due_before))))
        .slice(0, f.limit || 10000).map((s) => structuredClone(s));
    },
    async insertSteps(rows) { for (const r of rows) steps.push({ ...structuredClone(r), id: id("st") }); },
    async updateStep(sid, p) { const s = steps.find((x) => x.id === sid); if (s) Object.assign(s, structuredClone(p)); },
    async claimStep(sid) { const s = steps.find((x) => x.id === sid); if (!s || s.status !== "scheduled") return false; s.status = "sending"; return true; },
    async lastSendAt(cid, ignoreSeqs) {
      const t = steps.filter((s) => s.contact_id === cid && s.kind === "email" && !ignoreSeqs.includes(s.seq) && (s.status === "sent" || s.status === "logged") && s.sent_at).map((s) => ms(s.sent_at));
      return t.length ? iso(new Date(Math.max(...t))) : null;
    },
    async openTask(t, opts) {
      if (tasks.some((x) => x.key === t.key && (opts?.once || x.status === "open"))) return;
      tasks.push({ ...structuredClone(t), status: "open" });
    },
    async closeTask(key) { for (const t of tasks) if (t.key === key && t.status === "open") t.status = "done"; },
  };
  return { store, contacts, events, enrollments, steps, tasks };
}
