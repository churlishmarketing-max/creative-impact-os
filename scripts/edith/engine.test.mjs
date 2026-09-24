// EDITH engine unit tests — `npm run edith:test` (node's built-in runner).
// Covers: enrollment conditions, exit cancellation, hold logic, send-window
// scheduling, the at: expression parser, reply-keyword routing, the rate
// limit, variants, the kill switch, and that the compiled templates are current.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  emit, runDue, contactChanged, createMemoryStore, etToUtc, etParts, parseAt, shift, inWindow, nextOpen, classifyReply,
} from "../../lib/edith/engine.ts";
import { CONTENT } from "../../lib/edith/content.generated.ts";
import { compile } from "./build.mjs";

const W = CONTENT.manifest.global_rules.send_window;
const ET = (y, mo, d, h, mi = 0) => etToUtc(y, mo, d, h, mi);
const et = (d) => { const p = etParts(new Date(d)); return `${p.wd} ${p.mo}/${p.d} ${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`; };

function world(people, over = {}) {
  const mem = createMemoryStore(people.map((p) => ({ email: `${p.id}@example.com`, tags: [], do_not_contact: false, unsubscribe_url: `https://os.example/e/unsubscribe/u-${p.id}`, ...p, fields: { first_name: "Sam", business_name: `${p.id} Co`, neighborhood: "NoDa", ...(p.fields || {}) } })));
  const w = {
    mem, clock: ET(2026, 10, 6, 9), sent: [], spots: 5,
    cfg: {
      edith_live: false, from: "EDITH at Creative Impact <edith@creativeimpactmedia.co>", reply_to: "emmanuel@creativeimpactmedia.co", digest_to: "", digest: true,
      physical_address: "100 Example St, Charlotte, NC", booking_link: "https://os.example/go/spotlight", board_link: "https://os.example/board",
      call_link: "https://meet.example/e", debrief_link: "https://os.example/d", episode_link: "https://youtu.be/x", next_board_date: "November 2",
      current_episode: 1, paused: {}, episodes: {}, ...over,
    },
  };
  w.env = { store: mem.store, content: CONTENT, cfg: w.cfg, now: () => w.clock, spotsRemaining: async () => w.spots, deliver: async (m) => { w.sent.push(m); return { ok: true, id: "re_" + w.sent.length }; } };
  w.at = async (d) => { w.clock = d; await runDue(w.env); };
  w.run = async (days) => { const end = w.clock.getTime() + days * 86400e3; while (w.clock.getTime() < end) { w.clock = new Date(w.clock.getTime() + 5 * 60e3); await runDue(w.env); } };
  w.steps = (cid, seq) => mem.steps.filter((s) => s.contact_id === cid && (!seq || s.seq === seq));
  w.status = (cid, step) => mem.steps.filter((s) => s.contact_id === cid && s.step === step).map((s) => s.status).join(",");
  w.open = () => mem.tasks.filter((t) => t.status === "open").map((t) => t.key);
  return w;
}

/* ---------------------------------------------------------- at: + time */

test("at: parser reads every expression the manifest uses", () => {
  assert.deepEqual(parseAt("call_time - 24h"), { base: "call_time", sign: -1, ms: 86400e3, dur: "24h" });
  assert.deepEqual(parseAt("call_time - 60m"), { base: "call_time", sign: -1, ms: 3600e3, dur: "60m" });
  assert.deepEqual(parseAt("film_date - 3d"), { base: "film_date", sign: -1, ms: 3 * 86400e3, dur: "3d" });
  assert.deepEqual(parseAt("promo.started + 15d"), { base: "promo.started", sign: 1, ms: 15 * 86400e3, dur: "15d" });
  assert.deepEqual(parseAt("step[6-4].sent_at + 4d"), { base: "step[6-4].sent_at", sign: 1, ms: 4 * 86400e3, dur: "4d" });
  assert.throws(() => parseAt("sometime soon"));
  for (const seq of CONTENT.manifest.sequences) for (const s of seq.steps) if (s.at) assert.doesNotThrow(() => parseAt(s.at), s.at);
});

test("day offsets keep Eastern wall-clock time across the DST change", () => {
  assert.equal(et(shift(ET(2026, 10, 26, 10, 30), "15d")), "Tue 11/10 10:30");
  assert.equal(et(shift(ET(2026, 11, 5, 9), "3d", -1)), "Mon 11/2 09:00");
  assert.equal(shift(ET(2026, 10, 26, 10), "24h").getTime() - ET(2026, 10, 26, 10).getTime(), 86400e3);
});

/* ------------------------------------------------------- send window */

test("send window: Mon–Sat 8–6 ET; outside it moves to the next open slot", () => {
  assert.equal(inWindow(ET(2026, 10, 6, 10), W), true);
  assert.equal(inWindow(ET(2026, 10, 6, 7, 59), W), false);
  assert.equal(inWindow(ET(2026, 10, 6, 18), W), false);
  assert.equal(inWindow(ET(2026, 10, 11, 12), W), false, "Sunday");
  assert.equal(et(nextOpen(ET(2026, 10, 6, 6, 15), W)), "Tue 10/6 08:00");
  assert.equal(et(nextOpen(ET(2026, 10, 10, 19), W)), "Mon 10/12 08:00", "Saturday evening → Monday");
  assert.equal(et(nextOpen(ET(2026, 10, 11, 12), W)), "Mon 10/12 08:00", "Sunday → Monday");
  assert.equal(et(nextOpen(ET(2026, 10, 7, 11, 20), W)), "Wed 10/7 11:20", "already open");
});

test("a step due outside the window waits; ignore_send_window steps don't", async () => {
  const w = world([{ id: "a" }]);
  // Call Tuesday 8:30 AM → 3-3 (60 min before, ignore_send_window) is due 7:30 AM.
  w.clock = ET(2026, 10, 5, 17, 55); // Monday 5:55 PM
  await emit(w.env, { contact_id: "a", type: "call.booked", payload: { call_time: ET(2026, 10, 6, 8, 30).toISOString() } });
  assert.equal(w.status("a", "3-1"), "logged");
  await w.at(ET(2026, 10, 6, 7, 30));
  assert.equal(w.status("a", "3-3"), "logged", "3-3 sends at 7:30 AM");
  const w2 = world([{ id: "b", tags: ["cold_prospect"], fields: { specific_detail: "Great reviews." } }]);
  w2.clock = ET(2026, 10, 11, 12); // Sunday noon
  await emit(w2.env, { contact_id: "b", type: "contact.created", payload: {} });
  const s = w2.steps("b", "SEQ1").find((x) => x.step === "1-1");
  assert.equal(s.status, "scheduled");
  assert.equal(et(s.due_at), "Mon 10/12 08:00");
});

/* ------------------------------------------------------- enrollment */

test("SEQ1 needs the cold_prospect tag AND a specific detail; a task asks a human for it", async () => {
  const w = world([{ id: "a", tags: ["cold_prospect"] }, { id: "b" }]);
  await emit(w.env, { contact_id: "a", type: "contact.created", payload: {} });
  await emit(w.env, { contact_id: "b", type: "contact.created", payload: {} });
  assert.equal(w.steps("a").length, 0);
  assert.equal(w.steps("b").length, 0);
  assert.ok(w.open().includes("detail:a"));
  await w.mem.store.updateContact("a", { fields: { specific_detail: "Their sign on Central Ave is hand-painted." } });
  await contactChanged(w.env, "a");
  assert.equal(w.status("a", "1-1"), "logged");
  assert.ok(!w.open().includes("detail:a"), "task closes itself");
  await contactChanged(w.env, "a");
  assert.equal(w.mem.enrollments.filter((e) => e.contact_id === "a" && e.seq === "SEQ1").length, 1, "SEQ1 runs once per contact, ever");
});

test("call.completed routes by outcome: undecided → SEQ5, not_fit → SEQ5B, closed → nothing", async () => {
  const w = world([{ id: "u" }, { id: "n" }, { id: "c" }]);
  await emit(w.env, { contact_id: "u", type: "call.completed", payload: { outcome: "undecided", spot_number: 3 } });
  await emit(w.env, { contact_id: "n", type: "call.completed", payload: { outcome: "not_fit", not_fit_reason: "They're booked a year out.", what_would_change: "A second location." } });
  await emit(w.env, { contact_id: "c", type: "call.completed", payload: { outcome: "closed", spot_number: 2 } });
  assert.deepEqual(w.mem.enrollments.map((e) => `${e.contact_id}:${e.seq}`).sort(), ["n:SEQ5B", "u:SEQ5"]);
});

test("SEQ2 does not enroll when a call was booked in the 10 minutes before the form", async () => {
  const w = world([{ id: "a" }, { id: "b" }]);
  await emit(w.env, { contact_id: "a", type: "call.booked", payload: { call_time: ET(2026, 10, 8, 10).toISOString() } });
  w.clock = new Date(w.clock.getTime() + 4 * 60e3);
  await emit(w.env, { contact_id: "a", type: "lead.form_submitted", payload: { q5_answer: "We fix it right." } });
  await emit(w.env, { contact_id: "b", type: "lead.form_submitted", payload: { q5_answer: "We fix it right." } });
  assert.equal(w.mem.enrollments.some((e) => e.contact_id === "a" && e.seq === "SEQ2"), false);
  assert.equal(w.mem.enrollments.some((e) => e.contact_id === "b" && e.seq === "SEQ2"), true);
  assert.ok(w.mem.tasks.some((t) => t.title === "Call b Co — speed to lead"), "speed-to-lead task created on enroll");
});

test("one active enrollment per contact per sequence; a reschedule restarts SEQ3", async () => {
  const w = world([{ id: "a" }]);
  await emit(w.env, { contact_id: "a", type: "call.booked", payload: { call_time: ET(2026, 10, 9, 10).toISOString() } });
  await emit(w.env, { contact_id: "a", type: "call.booked", payload: { call_time: ET(2026, 10, 12, 14).toISOString() } });
  const seq3 = w.mem.enrollments.filter((e) => e.seq === "SEQ3");
  assert.deepEqual(seq3.map((e) => e.status), ["exited", "active"]);
  assert.equal(w.mem.steps.filter((s) => s.step === "3-2" && s.status === "scheduled").length, 1);
});

/* ------------------------------------------------------- exits */

test("a reply ends SEQ1 and cancels every pending step", async () => {
  const w = world([{ id: "a", tags: ["cold_prospect"], fields: { specific_detail: "x." } }]);
  await emit(w.env, { contact_id: "a", type: "contact.created", payload: {} });
  await emit(w.env, { contact_id: "a", type: "email.replied", payload: { text: "Sounds interesting, what does it cost?" } });
  assert.deepEqual(w.steps("a", "SEQ1").map((s) => s.status), ["logged", "cancelled", "cancelled"]);
  assert.equal(w.mem.enrollments[0].end_reason, "email.replied");
  assert.ok(w.open().some((k) => k.startsWith("reply:a")), "reply becomes a task for a human");
});

test("a booking ends SEQ2; a deposit ends SEQ5", async () => {
  const w = world([{ id: "a" }, { id: "b", fields: { deposit_link: "https://os.example/pay/1" } }]);
  await emit(w.env, { contact_id: "a", type: "lead.form_submitted", payload: { q5_answer: "Q." } });
  w.clock = new Date(w.clock.getTime() + 60 * 60e3);
  await emit(w.env, { contact_id: "a", type: "call.booked", payload: { call_time: ET(2026, 10, 9, 10).toISOString() } });
  assert.ok(w.steps("a", "SEQ2").filter((s) => s.step !== "2-1").every((s) => s.status === "cancelled"));
  await emit(w.env, { contact_id: "b", type: "call.completed", payload: { outcome: "undecided", spot_number: 7 } });
  await emit(w.env, { contact_id: "b", type: "deposit.paid", payload: { spot_number: 7, film_date: "2026-10-20", episode_number: 1 } });
  assert.equal(w.mem.enrollments.find((e) => e.contact_id === "b" && e.seq === "SEQ5").status, "exited");
  assert.equal(w.mem.enrollments.find((e) => e.contact_id === "b" && e.seq === "SEQ6").status, "active");
});

test("SEQ3 and SEQ6 keep running through a reply (INTERPRETATION); a reply in the cut window means revisions", async () => {
  const w = world([{ id: "a", fields: { balance_link: "https://os.example/pay/b" } }]);
  await emit(w.env, { contact_id: "a", type: "call.booked", payload: { call_time: ET(2026, 10, 9, 10).toISOString() } });
  await emit(w.env, { contact_id: "a", type: "email.replied", payload: { text: "See you then!" } });
  assert.equal(w.mem.enrollments.find((e) => e.seq === "SEQ3").status, "active");
  await emit(w.env, { contact_id: "a", type: "deposit.paid", payload: { spot_number: 1, film_date: "2026-10-20", episode_number: 1 } });
  await w.at(ET(2026, 10, 22, 10)); // two days after filming
  await emit(w.env, { contact_id: "a", type: "cut.delivered", payload: { cut_link: "https://f.example/1" } });
  assert.equal(w.status("a", "6-4"), "logged");
  w.clock = new Date(w.clock.getTime() + 86400e3);
  await emit(w.env, { contact_id: "a", type: "email.replied", payload: { text: "Can we fix the spelling of my last name?" } });
  assert.equal(w.mem.enrollments.find((e) => e.seq === "SEQ6").status, "active");
  assert.ok(w.mem.tasks.some((t) => t.title === "Revisions — a Co"));
  await w.run(6);
  assert.equal(w.status("a", "6-5"), "skipped", "no 'last day for tweaks' after they replied");
  assert.equal(w.mem.contacts.get("a").tags.includes("cut_approved"), false, "not auto-approved");
});

test("silence through the cut window auto-approves (emits cut.approved, tags cut_approved)", async () => {
  const w = world([{ id: "a" }]);
  await emit(w.env, { contact_id: "a", type: "deposit.paid", payload: { spot_number: 1, film_date: "2026-10-08", episode_number: 1 } });
  await emit(w.env, { contact_id: "a", type: "cut.delivered", payload: { cut_link: "https://f.example/1" } });
  await w.run(6);
  assert.equal(w.status("a", "6-5"), "logged");
  assert.ok(w.mem.contacts.get("a").tags.includes("cut_approved"));
  assert.ok(w.mem.events.some((e) => e.type === "cut.approved" && e.contact_id === "a"));
});

/* ------------------------------------------------------- holds */

test("an empty hold field HOLDS the send, creates a task, and sends once filled", async () => {
  const w = world([{ id: "a" }]);
  await emit(w.env, { contact_id: "a", type: "lead.form_submitted", payload: {} }); // no q5_answer
  await w.at(new Date(w.clock.getTime() + 6 * 60e3));
  assert.equal(w.status("a", "2-1"), "held");
  const hold = w.mem.steps.find((s) => s.step === "2-1");
  assert.match(hold.hold_reason, /form question 5/);
  assert.ok(w.open().includes(`hold:${hold.id}`));
  await w.mem.store.updateContact("a", { fields: { q5_answer: "That we answer the phone." } });
  await contactChanged(w.env, "a");
  assert.equal(w.status("a", "2-1"), "logged");
  assert.ok(!w.open().includes(`hold:${hold.id}`));
  assert.doesNotMatch(hold.subject + w.mem.steps.find((s) => s.step === "2-1").body, /\{\{/);
});

test("5b-1 holds without the not-fit reason; SEQ1 holds without a mailing address (CAN-SPAM)", async () => {
  const w = world([{ id: "a" }, { id: "b", tags: ["cold_prospect"], fields: { specific_detail: "x." } }], { physical_address: "" });
  await emit(w.env, { contact_id: "a", type: "call.completed", payload: { outcome: "not_fit" } });
  await w.run(0.2);
  assert.equal(w.status("a", "5b-1"), "held");
  await emit(w.env, { contact_id: "b", type: "contact.created", payload: {} });
  assert.equal(w.status("b", "1-1"), "held");
  assert.match(w.mem.steps.find((s) => s.step === "1-1").hold_reason, /mailing address/);
});

/* ------------------------------------------------------- rate limit + variants */

test("one email per contact per 24h, except SEQ3/SEQ4 reminders", async () => {
  const w = world([{ id: "a", fields: { q5_answer: "Q." } }]);
  await emit(w.env, { contact_id: "a", type: "lead.form_submitted", payload: {} });
  await w.run(1.1);
  const [s1, s2] = ["2-1", "2-2"].map((k) => w.mem.steps.find((s) => s.step === k));
  assert.ok(new Date(s2.sent_at) - new Date(s1.sent_at) >= 86400e3, "2-2 waited out the 24 hours");
  const w2 = world([{ id: "b", fields: { deposit_link: "https://os.example/pay/1" } }]);
  w2.clock = ET(2026, 10, 6, 9);
  await emit(w2.env, { contact_id: "b", type: "call.booked", payload: { call_time: ET(2026, 10, 6, 10, 30).toISOString() } });
  await w2.at(ET(2026, 10, 6, 10, 45));
  await emit(w2.env, { contact_id: "b", type: "call.completed", payload: { outcome: "undecided", spot_number: 2 } });
  await w2.run(0.1);
  assert.equal(w2.status("b", "5-1"), "logged", "the recap still lands two hours after the call");
});

test("variants: 2-4-full when the board is full; 6-3 (balance) vs 6-3-paid", async () => {
  const w = world([{ id: "a", fields: { q5_answer: "Q." } }]);
  w.spots = 0;
  await emit(w.env, { contact_id: "a", type: "lead.form_submitted", payload: {} });
  await w.run(7);
  const s = w.mem.steps.find((x) => x.step === "2-4");
  assert.equal(s.template_id, "2-4-full");
  assert.match(s.subject, /next one opens November 2/);
  const w2 = world([{ id: "b", fields: { balance_link: "https://os.example/pay/b" } }, { id: "c" }]);
  await emit(w2.env, { contact_id: "b", type: "deposit.paid", payload: { spot_number: 1, film_date: "2026-10-12", episode_number: 1 } });
  await emit(w2.env, { contact_id: "c", type: "deposit.paid", payload: { spot_number: 2, film_date: "2026-10-12", episode_number: 1 } });
  await emit(w2.env, { contact_id: "c", type: "balance.paid", payload: {} });
  await w2.run(6);
  assert.equal(w2.mem.steps.find((x) => x.contact_id === "b" && x.step === "6-3").template_id, "6-3");
  assert.equal(w2.mem.steps.find((x) => x.contact_id === "c" && x.step === "6-3").template_id, "6-3-paid");
});

/* ------------------------------------------------------- replies */

test("reply keywords: stop / later / yes / everything else", () => {
  assert.equal(classifyReply("STOP"), "stop");
  assert.equal(classifyReply("Please remove me from your list."), "stop");
  assert.equal(classifyReply("Later — we're slammed until spring."), "later");
  assert.equal(classifyReply("Not yet, just busy"), "later");
  assert.equal(classifyReply("Yes"), "yes");
  assert.equal(classifyReply("I can't stop thinking about this, let's talk"), "other");
  assert.equal(classifyReply("Sounds good.\n\nOn Tue, Oct 6, 2026 EDITH wrote:\n> Should I close your file? Say stop"), "other", "quoted text is ignored");
});

test("'later' tags nurture; 'stop' unsubscribes and ends everything, even SEQ6", async () => {
  const w = world([{ id: "a", tags: ["cold_prospect"], fields: { specific_detail: "x." } }, { id: "b" }]);
  await emit(w.env, { contact_id: "a", type: "contact.created", payload: {} });
  await emit(w.env, { contact_id: "a", type: "email.replied", payload: { text: "later" } });
  assert.ok(w.mem.contacts.get("a").tags.includes("nurture"));
  await emit(w.env, { contact_id: "b", type: "deposit.paid", payload: { spot_number: 1, film_date: "2026-10-20", episode_number: 1 } });
  await emit(w.env, { contact_id: "b", type: "email.replied", payload: { text: "Unsubscribe me please" } });
  assert.equal(w.mem.contacts.get("b").do_not_contact, true);
  assert.equal(w.mem.enrollments.find((e) => e.contact_id === "b").status, "exited");
  await emit(w.env, { contact_id: null, type: "episode.published", payload: { episode_number: 1, episode_link: "https://y.example/1", featured_count: 9 } });
  assert.equal(w.mem.enrollments.some((e) => e.contact_id === "b" && e.seq === "SEQ7"), false);
  assert.equal(w.mem.enrollments.some((e) => e.contact_id === "a" && e.seq === "SEQ7"), true, "nurture gets the episode");
});

/* ------------------------------------------------------- kill switch */

test("edith_live=false logs and never delivers; true delivers with sender, reply-to, unsubscribe header, .ics", async () => {
  const off = world([{ id: "a", tags: ["cold_prospect"], fields: { specific_detail: "x." } }]);
  await emit(off.env, { contact_id: "a", type: "contact.created", payload: {} });
  assert.equal(off.status("a", "1-1"), "logged");
  assert.equal(off.sent.length, 0);

  const on = world([{ id: "a", tags: ["cold_prospect"], fields: { specific_detail: "x." } }, { id: "b" }], { edith_live: true });
  await emit(on.env, { contact_id: "a", type: "contact.created", payload: {} });
  await emit(on.env, { contact_id: "b", type: "call.booked", payload: { call_time: ET(2026, 10, 9, 10).toISOString() } });
  assert.equal(on.status("a", "1-1"), "sent");
  const [cold, confirm] = on.sent;
  assert.equal(cold.from, "EDITH at Creative Impact <edith@creativeimpactmedia.co>");
  assert.equal(cold.replyTo, "emmanuel@creativeimpactmedia.co");
  assert.match(cold.headers["List-Unsubscribe"], /\/api\/edith\/unsubscribe\?t=u-a/);
  assert.match(cold.text, /Unsubscribe: https:\/\/os\.example\/e\/unsubscribe\/u-a/);
  assert.match(cold.text, /Creative Impact · 100 Example St/);
  assert.match(cold.text, /the AI kind\. A human reads every reply\./, "signature on every email");
  assert.match(cold.html, /One question, then I'll get out of your way\./, "preview text rides in the HTML part");
  assert.ok(confirm.ics && confirm.ics.start, "3-1 carries the calendar invite");
  assert.deepEqual(confirm.headers, {}, "no unsubscribe header outside SEQ1/SEQ7");
});

/* ------------------------------------------------------- templates */

test("compiled templates match the source files (run `npm run edith:build` if this fails)", () => {
  const fresh = compile().ts;
  const onDisk = readFileSync(new URL("../../lib/edith/content.generated.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.equal(onDisk, fresh);
});
