import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { CONTENT } from "@/lib/edith/content.generated";
import { renderEmail, findDef, runDue, FIELD_LABELS, type Config } from "@/lib/edith/engine";
import {
  EDITH_MIGRATION, missingTable, getEdithConfig, saveEdithConfig, edithEnv, edithEmit, edithTouch, edithRetryAll,
  edithSettle, spotsRemaining, sendDigest,
} from "@/lib/edith/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Operator-only EDITH API (session required; NOT in proxy's public list).
// The clock (/api/edith/tick) and the unsubscribe endpoint are the public ones.

async function auth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { error: "not_configured" as const };
  const cookieStore = await cookies();
  const sb = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "unauthorized" as const };
  const admin = getAdminClient();
  if (!admin) return { error: "no_service_role" as const };
  return { user, admin };
}
const fail = (error: string | undefined, status = 400) => NextResponse.json({ ok: false, error: error || "error" }, { status });
const str = (v: unknown, n = 500) => (v == null ? "" : String(v).trim().slice(0, n));

// The copy, read-only: edits go through the source files, never the UI.
const TEMPLATES = Object.values(CONTENT.templates).map((t) => ({ id: t.template_id, title: t.title, trigger: t.trigger, subject: t.subject, preview: t.preview_text, body: t.body, cta: t.cta, note: t.internal_note, fields: t.merge_fields_used }));
const SEQUENCES = CONTENT.manifest.sequences.map((s) => ({ id: s.id, name: s.name, enroll_on: s.enroll_on.event, exit_on: s.exit_on || [], steps: s.steps.map((x) => ({ step: x.step, template_id: x.template_id, when: x.delay ? `${x.delay} after enroll` : x.at ? x.at : x.on_event ? `on ${x.on_event}` : "" })) }));

export async function GET(req: Request) {
  const a = await auth();
  if ("error" in a) return fail(a.error, a.error === "unauthorized" ? 401 : 400);
  const uid = a.user.id;
  const cfg = await getEdithConfig(a.admin, uid);
  const base = { ok: true, config: cfg, templates: TEMPLATES, sequences: SEQUENCES, warnings: CONTENT.warnings, source_hash: CONTENT.source_hash, tasksForHumans: CONTENT.manifest.tasks_for_humans, labels: FIELD_LABELS };

  // ?prospect=<id> narrows everything to one contact (the Spotlight drawer).
  const pid = new URL(req.url).searchParams.get("prospect") || "";
  const scope: Record<string, string> = pid ? { user_id: uid, prospect_id: pid } : { user_id: uid };
  const [queue, log, tasks, enr, rt, names] = await Promise.all([
    a.admin.from("edith_steps").select("id,prospect_id,enrollment_id,seq,step,template_id,kind,status,due_at,anchor,hold_reason").match(scope).in("status", ["scheduled", "waiting", "held", "sending"]).order("due_at", { ascending: true, nullsFirst: false }).limit(300),
    a.admin.from("edith_steps").select("id,prospect_id,seq,step,template_id,kind,status,to_email,subject,body,sent_at,hold_reason,error,updated_at").match(scope).in("status", ["sent", "logged", "failed", "skipped", "cancelled", "done"]).order("updated_at", { ascending: false }).limit(150),
    a.admin.from("ops_tasks").select("id,prospect_id,key,title,detail,due_at,created_at").match(scope).eq("status", "open").order("due_at", { ascending: true, nullsFirst: false }).limit(200),
    a.admin.from("edith_enrollments").select("id,prospect_id,seq,status,enrolled_at,ended_at,end_reason").match(scope).order("enrolled_at", { ascending: false }).limit(300),
    a.admin.from("edith_runtime").select("last_tick_at,digest_sent_on").eq("user_id", uid).maybeSingle(),
    a.admin.from("spotlight_prospects").select("id,business,email,tags,do_not_contact,episode_number,member_at,stage").eq("user_id", uid),
  ]);
  const err = queue.error || log.error || tasks.error || enr.error || names.error;
  if (err) {
    if (missingTable(err.message) || /column/i.test(err.message)) return NextResponse.json({ ...base, needsMigration: true, hint: EDITH_MIGRATION, queue: [], log: [], tasks: [], enrollments: [], contacts: [] });
    return fail(err.message, 500);
  }
  return NextResponse.json({
    ...base,
    queue: queue.data, log: log.data, tasks: tasks.data, enrollments: enr.data,
    clock: { last_tick_at: rt.data?.last_tick_at || null, digest_sent_on: rt.data?.digest_sent_on || null, runtime_row: !!rt.data },
    spots_remaining: await spotsRemaining(a.admin, uid),
    contacts: names.data,
  });
}

// Events a human can log from the cockpit. Each is something that really
// happened (a call, a reply that landed in Emmanuel's inbox, a delivered cut) —
// the OS has no other way to know. Nothing here fakes an event.
const HUMAN_EVENTS = ["call.completed", "call.no_show", "call.cancelled", "email.replied", "cut.delivered", "debrief.booked"];

export async function POST(req: Request) {
  const a = await auth();
  if ("error" in a) return fail(a.error, a.error === "unauthorized" ? 401 : 400);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return fail("bad request"); }
  const op = String(b.op || "");
  const uid = a.user.id;
  const admin = a.admin;

  if (op === "save_config") {
    const p = (b.patch || {}) as Record<string, unknown>;
    const next: Partial<Config> = {};
    if ("edith_live" in p) {
      // Going live is deliberate: the UI must send the typed confirmation.
      if (p.edith_live && b.confirm !== "EDITH LIVE") return fail("To turn EDITH on, type EDITH LIVE to confirm.");
      next.edith_live = !!p.edith_live;
    }
    for (const k of ["from", "reply_to", "digest_to", "physical_address", "booking_link", "board_link", "call_link", "debrief_link", "episode_link", "next_board_date"] as const) if (k in p) next[k] = str(p[k], 400);
    if ("digest" in p) next.digest = !!p.digest;
    if ("current_episode" in p) next.current_episode = Math.max(1, Math.round(Number(p.current_episode)) || 1);
    if ("paused" in p && p.paused && typeof p.paused === "object") next.paused = Object.fromEntries(Object.entries(p.paused as Record<string, unknown>).filter(([k]) => /^SEQ\w+$/.test(k)).map(([k, v]) => [k, !!v]));
    for (const k of ["from", "reply_to", "digest_to"] as const) if (next[k] && !/@[\w.-]+\.\w+/.test(next[k]!)) return fail(`${k} needs to be an email address.`);
    const before = await getEdithConfig(admin, uid);
    const cfg = await saveEdithConfig(admin, uid, next);
    if ("next_board_date" in next && next.next_board_date !== before.next_board_date) {
      await edithEmit(admin, uid, { prospect_id: null, type: "board.updated", payload: { next_board_date: cfg.next_board_date, spots_remaining: await spotsRemaining(admin, uid) }, source: "operator" });
    }
    await edithRetryAll(admin, uid); // a filled link or an un-paused sequence releases its holds
    return NextResponse.json({ ok: true, config: cfg });
  }

  if (op === "run_now") {
    const env = await edithEnv(admin, uid);
    return NextResponse.json({ ok: true, ran: await runDue(env, { limit: 60 }) });
  }
  if (op === "digest_now") {
    return NextResponse.json({ ok: true, ...(await sendDigest(admin, uid, await getEdithConfig(admin, uid))) });
  }

  if (op === "task_done") {
    const { error } = await admin.from("ops_tasks").update({ status: "done", done_at: new Date().toISOString() }).eq("user_id", uid).eq("id", str(b.id, 64));
    return error ? fail(error.message) : NextResponse.json({ ok: true });
  }

  if (op === "step_skip" || op === "step_retry" || op === "preview") {
    const { data: s } = await admin.from("edith_steps").select("*").eq("user_id", uid).eq("id", str(b.id, 64)).maybeSingle();
    if (!s) return fail("step not found");
    if (op === "step_skip") {
      if (!["scheduled", "waiting", "held"].includes(s.status)) return fail("Only a pending email can be skipped.");
      await admin.from("edith_steps").update({ status: "skipped", hold_reason: "skipped by a human" }).eq("id", s.id);
      await admin.from("ops_tasks").update({ status: "done", done_at: new Date().toISOString() }).eq("user_id", uid).eq("key", `hold:${s.id}`).eq("status", "open");
      await edithSettle(admin, uid, s.enrollment_id);
      return NextResponse.json({ ok: true });
    }
    if (op === "step_retry") {
      if (s.status !== "held") return fail("Only a held email can be retried.");
      await admin.from("edith_steps").update({ status: "scheduled", due_at: new Date().toISOString() }).eq("id", s.id);
      await runDue(await edithEnv(admin, uid), { contactId: s.prospect_id });
      const { data: after } = await admin.from("edith_steps").select("status,hold_reason").eq("id", s.id).maybeSingle();
      return NextResponse.json({ ok: true, status: after?.status, hold_reason: after?.hold_reason });
    }
    // preview: what this email would say right now, with today's data.
    const env = await edithEnv(admin, uid);
    const c = await env.store.getContact(s.prospect_id);
    const e = await env.store.getEnrollment(s.enrollment_id);
    if (!c || !e) return fail("contact or enrollment missing");
    const def = findDef(env, s.seq, s.step);
    const tpl = s.template_id || def?.template_id || "";
    if (!tpl) return fail("internal step — nothing to preview");
    const r = renderEmail(env, tpl, s.seq, c, e.context, await env.spotsRemaining());
    return NextResponse.json({ ok: true, template_id: tpl, to: c.email, subject: r.subject, preview: r.preview, text: r.text, missing: r.missing.map((k) => FIELD_LABELS[k] || k), variantNote: def?.variant ? `Variant ${def.variant.template_id} replaces this when ${JSON.stringify(def.variant.when)}.` : null });
  }

  if (op === "episode") {
    const n = Math.max(1, Math.round(Number(b.episode_number)) || 0);
    if (!n) return fail("Which episode number?");
    const action = String(b.action || "");
    const cfg = await getEdithConfig(admin, uid);
    const ep = { ...(cfg.episodes?.[String(n)] || {}) };
    const now = new Date().toISOString();
    if (action === "published") {
      const link = str(b.link, 400);
      if (!/^https?:\/\//.test(link)) return fail("The episode link (https://…) is required — it's in 6-6 and 7-1.");
      const { data: members } = await admin.from("spotlight_prospects").select("id,stage").eq("user_id", uid).eq("episode_number", n).not("member_at", "is", null);
      const featured = Math.max(0, Math.round(Number(b.featured_count)) || (members || []).length);
      if (!featured) return fail("How many businesses are in the episode? (No members are assigned to this episode yet.)");
      Object.assign(ep, { link, featured_count: featured, published_at: now });
      await saveEdithConfig(admin, uid, { episodes: { ...cfg.episodes, [String(n)]: ep } });
      const ids = (members || []).filter((m) => ["member", "filming", "filmed", "delivered"].includes(m.stage)).map((m) => m.id);
      if (ids.length) await admin.from("spotlight_prospects").update({ stage: "published", stage_at: now }).in("id", ids);
      const r = await edithEmit(admin, uid, { prospect_id: null, type: "episode.published", payload: { episode_number: n, episode_link: link, featured_count: featured }, source: "operator" });
      return r.ok ? NextResponse.json({ ok: true, episode: ep }) : fail(r.error);
    }
    if (action === "promo_started") {
      Object.assign(ep, { promo_started_at: now, promo_end_date: str(b.promo_end_date, 20) || ep.promo_end_date });
      await saveEdithConfig(admin, uid, { episodes: { ...cfg.episodes, [String(n)]: ep } });
      const r = await edithEmit(admin, uid, { prospect_id: null, type: "promo.started", payload: { episode_number: n, promo_end_date: ep.promo_end_date || null }, source: "operator" });
      return r.ok ? NextResponse.json({ ok: true, episode: ep }) : fail(r.error);
    }
    if (action === "promo_ended") {
      Object.assign(ep, { promo_ended_at: now });
      await saveEdithConfig(admin, uid, { episodes: { ...cfg.episodes, [String(n)]: ep } });
      const r = await edithEmit(admin, uid, { prospect_id: null, type: "promo.ended", payload: { episode_number: n }, source: "operator" });
      return r.ok ? NextResponse.json({ ok: true, episode: ep }) : fail(r.error);
    }
    if (action === "reach") {
      if ("reach_number" in b) ep.reach_number = str(b.reach_number, 40);
      if ("reach_screenshot" in b) ep.reach_screenshot = str(b.reach_screenshot, 400);
      await saveEdithConfig(admin, uid, { episodes: { ...cfg.episodes, [String(n)]: ep } });
      if (ep.reach_number && ep.reach_screenshot) await admin.from("ops_tasks").update({ status: "done", done_at: now }).eq("user_id", uid).eq("key", `reach:${n}`).eq("status", "open");
      await edithRetryAll(admin, uid);
      return NextResponse.json({ ok: true, episode: ep });
    }
    return fail("unknown episode action");
  }

  if (op === "inbound_form") {
    // A Spotlight interest form that arrived outside the OS (the public form
    // isn't built yet — see TODO in HANDOFF). Logged by a human, so it's real.
    const email = str(b.email, 200).toLowerCase();
    if (!/@/.test(email)) return fail("An email address is required.");
    const q5 = str(b.q5_answer, 1000);
    let { data: p } = await admin.from("spotlight_prospects").select("id,tags").eq("user_id", uid).ilike("email", email).limit(1).maybeSingle();
    if (!p) {
      const ins = await admin.from("spotlight_prospects").insert({
        user_id: uid, business: str(b.business, 200) || email, owner_name: str(b.owner_name, 200) || null, email, phone: str(b.phone, 40) || null,
        suburb: str(b.neighborhood, 120) || null, years: Number(b.years) >= 0 && str(b.years) ? Math.round(Number(b.years)) : null,
        source: "form", stage: "prospect", tags: ["inbound"], q5_answer: q5 || null,
      }).select("id,tags").maybeSingle();
      if (ins.error) return fail(missingTable(ins.error.message) || /column/i.test(ins.error.message) ? EDITH_MIGRATION : ins.error.message);
      p = ins.data;
      if (p) await edithEmit(admin, uid, { prospect_id: p.id, type: "contact.created", payload: {}, source: "form" });
    } else if (!(p.tags || []).includes("inbound")) {
      await admin.from("spotlight_prospects").update({ tags: [...(p.tags || []), "inbound"] }).eq("id", p.id);
    }
    if (!p) return fail("Could not save the contact.");
    const r = await edithEmit(admin, uid, { prospect_id: p.id, type: "lead.form_submitted", payload: { q5_answer: q5 || null, business_name: str(b.business, 200) || null, neighborhood: str(b.neighborhood, 120) || null, years_in_business: str(b.years, 4) || null, owner: b.owner !== false }, source: "operator" });
    return r.ok ? NextResponse.json({ ok: true, id: p.id }) : fail(r.error);
  }

  // Everything below acts on one contact (a Spotlight prospect).
  const { data: p, error: pErr } = await admin.from("spotlight_prospects").select("*").eq("user_id", uid).eq("id", str(b.id, 64)).maybeSingle();
  if (pErr) return fail(missingTable(pErr.message) ? EDITH_MIGRATION : pErr.message);
  if (!p) return fail("contact not found");

  if (op === "contact") {
    const f = (b.fields || {}) as Record<string, unknown>;
    const row: Record<string, unknown> = {};
    for (const k of ["first_name", "specific_detail", "q5_answer", "call_link", "cut_link", "not_fit_reason", "what_would_change"]) if (k in f) row[k] = str(f[k], 1000) || null;
    for (const k of ["spot_number", "episode_number"]) if (k in f) row[k] = str(f[k]) === "" ? null : Math.max(0, Math.round(Number(f[k]))) || null;
    if ("cold_prospect" in b) {
      const tags = new Set<string>(p.tags || []);
      if (b.cold_prospect) tags.add("cold_prospect"); else tags.delete("cold_prospect");
      row.tags = [...tags];
    }
    if (Object.keys(row).length) {
      const { error } = await admin.from("spotlight_prospects").update(row).eq("id", p.id);
      if (error) return fail(/column/i.test(error.message) ? EDITH_MIGRATION : error.message);
    }
    if (b.do_not_contact === true && !p.do_not_contact) {
      const r = await edithEmit(admin, uid, { prospect_id: p.id, type: "contact.unsubscribed", payload: { via: "operator" }, source: "operator" });
      if (!r.ok) return fail(r.error);
    }
    await edithTouch(admin, uid, p.id);
    return NextResponse.json({ ok: true });
  }

  if (op === "event") {
    const type = String(b.type || "");
    if (!HUMAN_EVENTS.includes(type)) return fail("That event can't be logged by hand.");
    const pl = (b.payload || {}) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};
    if (type === "call.completed") {
      const outcome = String(pl.outcome || "");
      if (!["undecided", "not_fit", "closed"].includes(outcome)) return fail("Outcome must be undecided, not a fit, or closed.");
      payload.outcome = outcome;
      if (str(pl.spot_number)) payload.spot_number = Math.round(Number(pl.spot_number)) || null;
      if (outcome !== "not_fit" && !payload.spot_number) return fail("Which spot did Emmanuel recommend? (5-1 and 6-1 quote it.)");
      if (outcome === "not_fit") { payload.not_fit_reason = str(pl.not_fit_reason, 600); payload.what_would_change = str(pl.what_would_change, 600); }
    }
    if (type === "email.replied") {
      const kw = String(pl.keyword || "other");
      payload.keyword = ["later", "yes", "stop", "other"].includes(kw) ? kw : "other";
      payload.text = str(pl.text, 2000);
    }
    if (type === "cut.delivered") {
      const link = str(pl.cut_link, 400);
      if (!/^https?:\/\//.test(link)) return fail("The cut link (https://…) is required — it's the whole point of 6-4.");
      payload.cut_link = link;
      await admin.from("spotlight_prospects").update({ stage: "delivered", stage_at: new Date().toISOString() }).eq("id", p.id).in("stage", ["member", "filming", "filmed"]);
    }
    const r = await edithEmit(admin, uid, { prospect_id: p.id, type, payload, source: "operator" });
    return r.ok ? NextResponse.json({ ok: true }) : fail(r.error);
  }

  return fail("unknown op");
}
