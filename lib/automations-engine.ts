// Automations engine (server-only). Rows in public.automations are created by
// the operator on the AUTOMATIONS tab or by Jarvis, and dispatched once a day
// by the Vercel cron in /api/cron/daily.
//
// Design notes:
//  - The Vercel Hobby plan allows ONE cron run per day, so "due" is evaluated
//    at day granularity. Moving to Pro adds dispatch windows without changing
//    any of this logic.
//  - Actions are DETERMINISTIC where the data allows it. The leak sweep reads
//    the board directly rather than asking a model to summarise it, so every
//    dollar figure traces to a row — which is exactly Black Widow's guardrail
//    ("dollar figures come from the board; if a value is unknown, say unpriced").
//  - Every run reports to fleet_reports, so automations land on /fleet next to
//    the agents' own runs, and drops a sys.log line.
import { getAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof getAdminClient>>;

export type Automation = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cadence: string;
  day_of_week: number | null;
  day_of_month: number | null;
  action: string;
  action_config: Record<string, unknown> | null;
  enabled: boolean;
  last_run_at: string | null;
  run_count: number;
};

export const ACTIONS = ["leak_sweep", "board_digest", "log_marker"] as const;
export const CADENCES = ["daily", "weekdays", "weekly", "monthly", "manual"] as const;

const c2d = (cents: unknown) => Math.round((Number(cents) || 0) / 100);
const money = (cents: unknown) => "$" + c2d(cents).toLocaleString("en-US");
const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 86400000);

// Is this automation due to run right now? Day-granularity, and never twice in
// the same UTC day (the cron may retry).
export function isDue(a: Automation, now = new Date()): boolean {
  if (!a.enabled) return false;
  if (a.cadence === "manual") return false;

  if (a.last_run_at) {
    const last = new Date(a.last_run_at);
    if (last.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)) return false;
  }

  const dow = now.getUTCDay();
  switch (a.cadence) {
    case "daily": return true;
    case "weekdays": return dow >= 1 && dow <= 5;
    case "weekly": return dow === (a.day_of_week ?? 1);
    case "monthly": return now.getUTCDate() === (a.day_of_month ?? 1);
    default: return false;
  }
}

// --- Actions ----------------------------------------------------------------

// Black Widow's Revenue Leak Sweep, computed straight off the board.
async function leakSweep(admin: Admin, userId: string) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const leaks: { amount: number; line: string }[] = [];
  const clean: string[] = [];

  const [invR, propR, dealR, shootR, offerR] = await Promise.all([
    admin.from("invoices").select("number,title,amount_cents,status,due_date").eq("user_id", userId),
    admin.from("proposals").select("number,title,amount_cents,status,created_at").eq("user_id", userId),
    admin.from("deals").select("name,offer,value_cents,stage,expected_date,updated_at").eq("user_id", userId),
    admin.from("shoots").select("shoot_date,client,kind,status").eq("user_id", userId),
    admin.from("offers").select("name,slug,price_monthly_cents").eq("user_id", userId),
  ]);

  // 1. Invoices sent and past their due date.
  const overdue = (invR.data || []).filter((i) => i.status === "sent" && i.due_date && i.due_date < today);
  overdue.forEach((i) => {
    const age = daysBetween(now, new Date(i.due_date as string));
    leaks.push({ amount: Number(i.amount_cents) || 0, line: `${money(i.amount_cents)} — invoice ${i.number || "(no number)"}${i.title ? " · " + i.title : ""}, ${age}d past due → resend + call` });
  });
  if (!overdue.length) clean.push("no invoices past due");

  // 2. Proposals sent with no acceptance after 7 days.
  const quiet = (propR.data || []).filter((p) => p.status === "sent" && daysBetween(now, new Date(p.created_at)) >= 7);
  quiet.forEach((p) => {
    const age = daysBetween(now, new Date(p.created_at));
    leaks.push({ amount: Number(p.amount_cents) || 0, line: `${money(p.amount_cents)} — proposal ${p.number || "(no number)"}${p.title ? " · " + p.title : ""} silent ${age}d → decision ask` });
  });
  if (!quiet.length) clean.push("no proposals gone quiet");

  // 3. Open deals past their expected date, and Audit Done sitting >5 days.
  const openStages = ["Lead", "Audit Booked", "Audit Done", "Proposal"];
  const deals = (dealR.data || []).filter((d) => openStages.includes(String(d.stage)));
  const stalled = deals.filter((d) => d.expected_date && String(d.expected_date) < today);
  stalled.forEach((d) => {
    const age = daysBetween(now, new Date(d.expected_date as string));
    leaks.push({ amount: Number(d.value_cents) || 0, line: `${money(d.value_cents)} — ${d.name} past expected close by ${age}d (${d.stage}) → re-date or kill` });
  });
  const auditDone = deals.filter((d) => d.stage === "Audit Done" && d.updated_at && daysBetween(now, new Date(d.updated_at)) > 5);
  auditDone.forEach((d) => {
    const age = daysBetween(now, new Date(d.updated_at as string));
    leaks.push({ amount: Number(d.value_cents) || 0, line: `${money(d.value_cents)} — ${d.name} in Audit Done ${age}d with no proposal → send the proposal` });
  });
  if (!stalled.length && !auditDone.length) clean.push("no stalled deals");

  // 4. OPEN capture days inside 21 days = unsold inventory, valued at the
  // Story Capture Pilot price FROM THE OFFERS BOARD. The pricing ladder is not
  // ratified yet, so if that offer isn't priced we report the slot as
  // "unpriced" rather than inventing a figure — never estimate.
  const pilot = (offerR.data || []).find((o) => /story[\s-]?capture|pilot/i.test(`${o.slug || ""} ${o.name || ""}`));
  const pilotCents = Number(pilot?.price_monthly_cents) || 0;
  const horizon = new Date(now.getTime() + 21 * 86400000).toISOString().slice(0, 10);
  const openSlots = (shootR.data || []).filter((s) => String(s.status).toUpperCase() === "OPEN" && String(s.shoot_date) >= today && String(s.shoot_date) <= horizon);
  openSlots.forEach((s) => {
    const out = daysBetween(new Date(String(s.shoot_date)), now);
    leaks.push(pilotCents
      ? { amount: pilotCents, line: `${money(pilotCents)} — ${s.shoot_date} capture day unsold, ${out}d out → push audit bookings` }
      : { amount: 0, line: `unpriced — ${s.shoot_date} capture day unsold, ${out}d out → push audit bookings (no Story Capture Pilot price on the Offers board)` });
  });
  if (!openSlots.length) clean.push("no unsold capture days inside 21 days");

  leaks.sort((a, b) => b.amount - a.amount);
  const total = leaks.reduce((s, l) => s + l.amount, 0);

  const body = leaks.length
    ? leaks.map((l, i) => `  ${i + 1}. ${l.line}`).join("\n")
    : "  Clean sweep — nothing leaking that the board can see.";

  const summary = [
    `LEAK SWEEP — ${today} · total at risk: ${money(total)}`,
    body,
    "",
    `CLEAN: ${clean.length ? clean.join(" · ") : "—"}`,
    "",
    "Note: renewals are not swept yet (no renewal-date field on clients). Every figure comes straight from the board — invoice/proposal/deal values as recorded, capture days at the Offers-board pilot price. Nothing is estimated; anything unpriced says so.",
  ].join("\n");

  return {
    title: `Leak sweep — ${money(total)} at risk across ${leaks.length} leak${leaks.length === 1 ? "" : "s"}`,
    summary,
    agent: "black-widow",
  };
}

// A plain snapshot of where the number stands.
async function boardDigest(admin: Admin, userId: string) {
  const [dealR, sprintR, shootR] = await Promise.all([
    admin.from("deals").select("value_cents,stage").eq("user_id", userId),
    admin.from("sprint").select("target_cents,deadline_date,one_thing_title").eq("user_id", userId).maybeSingle(),
    admin.from("shoots").select("shoot_date,status").eq("user_id", userId),
  ]);
  const deals = dealR.data || [];
  const sum = (f: (d: { stage: string }) => boolean) =>
    deals.filter(f).reduce((s, d: { value_cents?: number; stage: string }) => s + (Number(d.value_cents) || 0), 0);

  const collected = sum((d) => d.stage === "Collected");
  const signed = sum((d) => d.stage === "Signed" || d.stage === "Collected");
  const open = sum((d) => !["Collected", "Signed", "Lost"].includes(d.stage));
  const target = Number(sprintR.data?.target_cents) || 0;
  const gap = Math.max(0, target - collected);
  const coverage = gap ? (open / gap).toFixed(2) + "x" : "—";
  const today = new Date().toISOString().slice(0, 10);
  const openSlots = (shootR.data || []).filter((s) => String(s.status).toUpperCase() === "OPEN" && String(s.shoot_date) >= today).length;

  const summary = [
    `BOARD DIGEST — ${today}`,
    `  Collected: ${money(collected)}${target ? " of " + money(target) + " target" : ""}`,
    `  Signed (in-year): ${money(signed)}`,
    `  Open pipeline: ${money(open)} across ${deals.filter((d) => !["Collected", "Signed", "Lost"].includes(d.stage)).length} live deals`,
    `  Coverage: ${coverage}${gap ? " (need >=3x the " + money(gap) + " gap)" : ""}`,
    `  Open capture days ahead: ${openSlots}`,
    sprintR.data?.one_thing_title ? `  THE ONE THING: ${sprintR.data.one_thing_title}` : "",
  ].filter(Boolean).join("\n");

  return { title: `Board — ${money(collected)} collected, ${money(open)} open, coverage ${coverage}`, summary, agent: "board-digest" };
}

async function logMarker(_admin: Admin, _userId: string, cfg: Record<string, unknown>) {
  const note = String(cfg?.note || "Automation heartbeat.");
  return { title: `Heartbeat — 1 marker`, summary: note, agent: "automations" };
}

// --- Dispatch ---------------------------------------------------------------

export async function runAutomation(admin: Admin, a: Automation) {
  const cfg = (a.action_config || {}) as Record<string, unknown>;
  let out: { title: string; summary: string; agent: string };

  try {
    if (a.action === "leak_sweep") out = await leakSweep(admin, a.user_id);
    else if (a.action === "board_digest") out = await boardDigest(admin, a.user_id);
    else if (a.action === "log_marker") out = await logMarker(admin, a.user_id, cfg);
    else throw new Error(`unknown action "${a.action}"`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("automations").update({
      last_run_at: new Date().toISOString(), last_status: "error", last_result: msg.slice(0, 500), run_count: (a.run_count || 0) + 1,
    }).eq("id", a.id);
    return { ok: false, error: msg };
  }

  // Land it on /fleet next to the agents' own runs.
  await admin.from("fleet_reports").insert({
    user_id: a.user_id, agent: out.agent, title: out.title.slice(0, 200), summary: out.summary.slice(0, 20000),
    payload: { automation_id: a.id, automation: a.name },
  });
  const tag = out.agent.split(/[-_ ]+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "AU";
  await admin.from("log_entries").insert({
    user_id: a.user_id, tag, color: "var(--cream)", message: `${a.name} · ${out.title}`.slice(0, 200),
  });
  await admin.from("automations").update({
    last_run_at: new Date().toISOString(), last_status: "ok", last_result: out.title.slice(0, 500), run_count: (a.run_count || 0) + 1,
  }).eq("id", a.id);

  return { ok: true, title: out.title, summary: out.summary };
}

// Called by the daily cron. Returns a per-automation result list.
export async function dispatchDueAutomations(admin: Admin) {
  const { data, error } = await admin.from("automations").select("*").eq("enabled", true);
  if (error) {
    // Table not created yet (migration 21 not run) — not an error worth failing the cron over.
    if (/relation .* does not exist/i.test(error.message)) return { skipped: "automations table not created (run supabase/21_automations.sql)" };
    return { error: error.message };
  }
  const due = (data as Automation[]).filter((a) => isDue(a));
  const results: { name: string; ok: boolean; detail?: string }[] = [];
  for (const a of due) {
    const r = await runAutomation(admin, a);
    results.push({ name: a.name, ok: !!r.ok, detail: r.ok ? r.title : r.error });
  }
  return { considered: data.length, ran: results.length, results };
}
