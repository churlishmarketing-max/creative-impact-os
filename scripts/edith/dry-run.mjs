// EDITH dry run — `npm run edith:dry-run` (add --full to print every email).
//
// Five fake contacts, a fake clock advanced through 45 days in 5-minute ticks,
// the real engine and the real compiled templates, an in-memory store, and
// edith_live = false (the kill switch), so every send is written to the log
// instead of sent. Nothing here touches the database or the network.
//
// Fails (exit 1) if any logged email still contains an unfilled {{merge_field}}.
import { emit, runDue, contactChanged, createMemoryStore, etToUtc, etParts } from "../../lib/edith/engine.ts";
import { CONTENT } from "../../lib/edith/content.generated.ts";

const FULL = process.argv.includes("--full");
const START = etToUtc(2026, 10, 5, 8, 0); // Monday, October 5, 2026, 8:00 AM ET
const DAYS = 45;
const at = (day, h, m = 0) => { const d = new Date(START.getTime() + day * 86400e3); const p = etParts(d); return etToUtc(p.y, p.mo, p.d, h, m); };
const ymd = (day) => { const p = etParts(at(day, 12)); return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`; };

const contact = (id, first, business, hood, extra = {}) => ({
  id, email: `${id}@example.com`, tags: [], do_not_contact: false,
  unsubscribe_url: `https://os.example/e/unsubscribe/u-${id}`,
  fields: { first_name: first, business_name: business, neighborhood: hood, ...extra },
});
const people = [
  contact("dana", "Dana", "Queen City Roasters", "NoDa", { specific_detail: "Three hundred Google reviews and half of them mention the Saturday cupping." }),
  contact("marcus", "Marcus", "Hale Plumbing", "Plaza Midwood"),
  contact("priya", "Priya", "Nair Family Dental", "Ballantyne"),
  contact("tom", "Tom", "Reyes Auto Care", "South End", { deposit_link: "https://os.example/pay/dep-reyes" }),
  contact("alicia", "Alicia", "Grant & Co. Florals", "Dilworth", { balance_link: "https://os.example/pay/bal-grant" }),
];
people[0].tags = ["cold_prospect"];

const mem = createMemoryStore(people);
let clock = START;
const cfg = {
  edith_live: false,
  from: "EDITH at Creative Impact <edith@creativeimpactmedia.co>", reply_to: "emmanuel@creativeimpactmedia.co", digest_to: "ops@example.com", digest: true,
  physical_address: "[dry-run address] 100 Example St, Charlotte, NC 28202",
  booking_link: "https://os.example/go/spotlight", board_link: "https://os.example/board", call_link: "https://meet.example/emmanuel",
  debrief_link: "https://os.example/go/debrief", episode_link: "https://youtu.be/wNylbkgS1mQ", next_board_date: "November 2",
  current_episode: 1, paused: {}, episodes: {},
};
const env = {
  store: mem.store, content: CONTENT, cfg, now: () => clock,
  spotsRemaining: async () => 10 - mem.enrollments.filter((e) => e.seq === "SEQ6").length,
  deliver: async () => { throw new Error("dry run must never deliver"); },
};

// Print every step the moment it reaches a final state.
const who = Object.fromEntries(people.map((p) => [p.id, p.fields.business_name]));
const fmt = (d) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
const dayNo = (d) => "D" + String(Math.floor((d.getTime() - START.getTime()) / 86400e3)).padStart(2, "0");
const lines = [];
const out = (tag, cid, text) => lines.push(`${dayNo(clock)}  ${fmt(clock).padEnd(24)} ${String(who[cid] || "—").padEnd(22)} ${tag.padEnd(9)} ${text}`);
const fullBodies = [];
const updateStep = mem.store.updateStep;
mem.store.updateStep = async (id, patch) => {
  const prev = mem.steps.find((s) => s.id === id)?.status;
  await updateStep(id, patch);
  const s = mem.steps.find((x) => x.id === id);
  if (!s || !patch.status || (patch.status === prev && prev !== "held")) return;
  const lbl = `${s.seq} ${s.step}`.padEnd(15);
  if (patch.status === "logged") {
    out("LOGGED", s.contact_id, `${lbl} "${s.subject}"${s.subject.length > 50 ? `  (${s.subject.length} chars)` : ""}`);
    fullBodies.push({ when: fmt(clock), to: s.to_email, id: s.template_id, subject: s.subject, body: s.body });
  } else if (patch.status === "held") out("HELD", s.contact_id, `${lbl} ${s.hold_reason}`);
  else if (patch.status === "skipped") out("SKIPPED", s.contact_id, `${lbl} ${s.hold_reason}`);
  else if (patch.status === "done") out("INTERNAL", s.contact_id, `${lbl} ${s.hold_reason}`);
};
const insertSteps = mem.store.insertSteps;
mem.store.insertSteps = async (rows) => {
  await insertSteps(rows);
  for (const r of rows) if (r.status === "skipped") out("SKIPPED", r.contact_id, `${(r.seq + " " + r.step).padEnd(15)} ${r.hold_reason}`);
};
const updateEnrollment = mem.store.updateEnrollment;
mem.store.updateEnrollment = async (id, patch) => {
  await updateEnrollment(id, patch);
  const e = mem.enrollments.find((x) => x.id === id);
  if (patch.status === "exited") out("EXIT", e.contact_id, `${e.seq} ended by ${patch.end_reason}`);
  if (patch.status === "completed") {
    const oc = CONTENT.manifest.sequences.find((q) => q.id === e.seq)?.on_complete || {};
    const then = [oc.set_tag && `tag ${oc.set_tag}`, oc.enroll === "SEQ7" && "join the episode list (nurture)", oc.release_spot && "release spot"].filter(Boolean);
    out("DONE", e.contact_id, `${e.seq} complete${then.length ? " → " + then.join(", ") : ""}`);
  }
};

// The script: what happens in the world, and when.
const P = (day, h, m, fn, label, cid) => ({ t: at(day, h, m), fn, label, cid });
const script = [
  P(0, 8, 30, () => emit(env, { contact_id: "dana", type: "contact.created", payload: {} }), "contact.created (cold prospect, specific detail written)", "dana"),
  P(0, 10, 0, () => emit(env, { contact_id: "marcus", type: "lead.form_submitted", payload: { q5_answer: "We've fixed half the pipes in this neighborhood and nobody knows our name.", owner: true } }), "lead.form_submitted (no booking)", "marcus"),
  P(0, 11, 0, () => emit(env, { contact_id: "priya", type: "call.booked", payload: { call_time: at(2, 14).toISOString(), call_end: at(2, 14, 15).toISOString() } }), "call.booked for Wed 2:00 PM", "priya"),
  P(0, 11, 30, () => emit(env, { contact_id: "tom", type: "call.booked", payload: { call_time: at(1, 10).toISOString(), call_end: at(1, 10, 15).toISOString() } }), "call.booked for Tue 10:00 AM (under 24h out)", "tom"),
  P(0, 12, 0, () => emit(env, { contact_id: "alicia", type: "call.booked", payload: { call_time: at(1, 15).toISOString(), call_end: at(1, 15, 15).toISOString() } }), "call.booked for Tue 3:00 PM", "alicia"),
  P(1, 10, 20, () => emit(env, { contact_id: "tom", type: "call.completed", payload: { outcome: "undecided", spot_number: 6 } }), "call.completed — undecided, Spot 6", "tom"),
  P(1, 15, 20, () => emit(env, { contact_id: "alicia", type: "call.completed", payload: { outcome: "closed", spot_number: 4 } }), "call.completed — closed, Spot 4", "alicia"),
  P(1, 15, 40, () => emit(env, { contact_id: "alicia", type: "deposit.paid", payload: { spot_number: 4, film_date: ymd(9), episode_number: 1 } }), `deposit.paid — film date ${ymd(9)}, Episode 1`, "alicia"),
  P(2, 14, 20, () => emit(env, { contact_id: "priya", type: "call.no_show", payload: {} }), "call.no_show", "priya"),
  P(8, 8, 0, () => emit(env, { contact_id: "alicia", type: "balance.paid", payload: {} }), "balance.paid (before film day)", "alicia"),
  P(12, 11, 0, () => emit(env, { contact_id: "alicia", type: "cut.delivered", payload: { cut_link: "https://frame.example/grant-cut-v1" } }), "cut.delivered", "alicia"),
  P(21, 10, 0, () => emit(env, { contact_id: null, type: "episode.published", payload: { episode_number: 1, episode_link: "https://youtu.be/charlotte-ep1", featured_count: 8 } }), "episode.published — Episode 1, 8 businesses (broadcast)", null),
  P(21, 10, 30, () => emit(env, { contact_id: null, type: "promo.started", payload: { episode_number: 1, promo_end_date: ymd(40) } }), "promo.started — Episode 1", null),
  P(37, 9, 0, async () => { cfg.episodes["1"] = { ...(cfg.episodes["1"] || {}), reach_number: "31,400", reach_screenshot: "https://os.example/receipts/ep1-reach.png" }; await mem.store.closeTask("reach:1"); await contactChanged(env, "alicia"); }, "Friday receipt pull logged — reach 31,400 (fills the held 6-7)", "alicia"),
  P(40, 10, 0, () => emit(env, { contact_id: null, type: "promo.ended", payload: { episode_number: 1 } }), "promo.ended — Episode 1", null),
];

for (clock = START; clock.getTime() <= at(DAYS, 23, 55).getTime(); clock = new Date(clock.getTime() + 5 * 60e3)) {
  while (script.length && script[0].t.getTime() <= clock.getTime()) {
    const s = script.shift();
    out("EVENT", s.cid, s.label);
    await s.fn();
  }
  await runDue(env);
}

console.log(`EDITH DRY RUN — ${fmt(START)} ET → +${DAYS} days · edith_live = false (everything below was LOGGED, nothing sent)`);
console.log(`Templates ${CONTENT.source_hash} · ${Object.keys(CONTENT.templates).length} templates · ${CONTENT.manifest.sequences.length} sequences\n`);
console.log("DAY  WHEN (ET)                WHO                    WHAT      DETAIL");
for (const l of lines) console.log(l);

const logged = mem.steps.filter((s) => s.status === "logged");
const blanks = logged.filter((s) => /\{\{\s*\w+\s*\}\}/.test(s.subject + s.body));
const byTpl = [...new Set(logged.map((s) => s.template_id))];
const neverSent = Object.keys(CONTENT.templates).filter((t) => !byTpl.includes(t));
console.log(`\n${logged.length} emails logged across ${byTpl.length} templates. Templates this scenario never reaches: ${neverSent.join(", ") || "none"}.`);
console.log(`Open tasks for humans:`);
for (const t of mem.tasks.filter((x) => x.status === "open")) console.log(`  · ${t.title}`);
console.log(`Closed on their own: ${mem.tasks.filter((x) => x.status === "done").length}`);

const samples = FULL ? fullBodies : fullBodies.filter((b) => ["1-1", "6-1", "7-1"].includes(b.id)).slice(0, 3);
for (const b of samples) console.log(`\n────── ${b.id} · ${b.when} ET · to ${b.to}\nSubject: ${b.subject}\n\n${b.body}`);

if (blanks.length) {
  console.error(`\nFAIL: ${blanks.length} logged email(s) contain an unfilled merge field: ${blanks.map((s) => s.template_id).join(", ")}`);
  process.exit(1);
}
console.log(`\nPASS: every logged email has every merge field filled.`);
