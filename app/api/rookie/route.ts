import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { draftAgentEmail, sendQueuedEmail } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

// Rookie — the operator's OS copilot. Chat in, tool-calls out: every change he
// makes is a real Supabase write, echoed back with numbers and logged to sys.log.
// Operator-only (session-verified); NOT exempted in the proxy.

const MODEL = process.env.AGENT_MODEL || "claude-sonnet-5";
const STAGES = ["Lead", "Diagnostic Sent", "Diagnostic Done", "Proposal", "Signed", "Collected", "Lost"];

function weekKey(d = new Date()) {
  const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const w1 = new Date(t.getFullYear(), 0, 4);
  const wn = 1 + Math.round(((t.getTime() - w1.getTime()) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  return t.getFullYear() + "-W" + String(wn).padStart(2, "0");
}
const monthKey = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
const c2d = (c: number) => Math.round((c || 0) / 100);

const TOOLS = [
  { name: "get_board", description: "Read the live board: collected/signed/open pipeline, coverage, current-week Friday Five, counts.", input_schema: { type: "object", properties: {} } },
  { name: "list_clients", description: "List the client roster (name, contact, email, status). Use to answer 'what clients do we have' or to disambiguate a fuzzy client match.", input_schema: { type: "object", properties: {} } },
  { name: "log_friday_five", description: "Log/update this week's Friday Five. Only provided fields change. Dollar amounts in DOLLARS.", input_schema: { type: "object", properties: { calls: { type: "number" }, offers_out: { type: "number" }, signed: { type: "number" }, collected: { type: "number" }, founder_free_pct: { type: "number" } } } },
  { name: "add_deal", description: "Add a deal to the pipeline. Value in DOLLARS.", input_schema: { type: "object", properties: { name: { type: "string" }, offer: { type: "string" }, value: { type: "number" }, stage: { type: "string", enum: STAGES } }, required: ["name", "value"] } },
  { name: "update_deal_stage", description: "Move a deal to a new stage, matched by (partial) name.", input_schema: { type: "object", properties: { name: { type: "string" }, stage: { type: "string", enum: STAGES } }, required: ["name", "stage"] } },
  { name: "add_client", description: "Add a client/lead to the roster.", input_schema: { type: "object", properties: { name: { type: "string" }, contact: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, industry: { type: "string" }, status: { type: "string", enum: ["Lead", "Active", "Past"] } }, required: ["name"] } },
  { name: "update_client", description: "Update fields on an EXISTING client, matched by (partial) name/contact/email. Only provided fields change. Use notes_append to add to their notes without erasing anything.", input_schema: { type: "object", properties: { client_name: { type: "string", description: "Who to update (fuzzy match)" }, name: { type: "string" }, contact: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, industry: { type: "string" }, status: { type: "string", enum: ["Lead", "Active", "Past"] }, notes_append: { type: "string" } }, required: ["client_name"] } },
  { name: "add_expense", description: "Log an expense. Amount in DOLLARS. Date optional (YYYY-MM-DD, defaults today).", input_schema: { type: "object", properties: { vendor: { type: "string" }, amount: { type: "number" }, category: { type: "string", enum: ["Software", "Ads", "Contractors", "Gear", "Fees", "Other"] }, recurring: { type: "boolean" }, date: { type: "string" } }, required: ["vendor", "amount"] } },
  { name: "add_expenses_bulk", description: "Log MANY expenses at once (e.g. extracted from an uploaded receipt, statement, or CSV). Amounts in DOLLARS.", input_schema: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { vendor: { type: "string" }, amount: { type: "number" }, category: { type: "string", enum: ["Software", "Ads", "Contractors", "Gear", "Fees", "Other"] }, recurring: { type: "boolean" }, date: { type: "string" } }, required: ["vendor", "amount"] } } }, required: ["items"] } },
  { name: "set_sprint", description: "Change the mission-level sprint settings shown on the war board: the collected target (DOLLARS), sell-by date, deadline date, and/or THE ONE THING (title + supporting line). Only provided fields change.", input_schema: { type: "object", properties: { target: { type: "number" }, sellby_date: { type: "string" }, deadline_date: { type: "string" }, one_thing_title: { type: "string" }, one_thing_body: { type: "string" } } } },
  { name: "add_goal", description: "Add a goal to Founder OS.", input_schema: { type: "object", properties: { text: { type: "string" }, type: { type: "string", enum: ["business", "life"] }, target: { type: "number" } }, required: ["text"] } },
  { name: "complete_goal", description: "Mark a Founder OS goal done, matched by (partial) text.", input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } },
  { name: "set_strategy", description: "Replace the 'My Working Strategy' text on the Strategy tab.", input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } },
  { name: "set_kpi", description: "Set the current period's value for a KPI, matched by (partial) name.", input_schema: { type: "object", properties: { name: { type: "string" }, value: { type: "number" } }, required: ["name", "value"] } },
  { name: "add_work_item", description: "Add a work item to a client's dashboard board, matched by (partial) client name.", input_schema: { type: "object", properties: { client_name: { type: "string" }, title: { type: "string" }, type: { type: "string", enum: ["video", "ad", "doc", "web", "social", "strategy", "other"] } }, required: ["client_name", "title"] } },
  { name: "add_log", description: "Write a line to the sys.log feed.", input_schema: { type: "object", properties: { message: { type: "string" } }, required: ["message"] } },
  { name: "draft_client_email", description: "Have Anchor (the client producer) draft an email to a client, matched by (partial) client name. By DEFAULT it queues in the client's COMMS panel for the operator's approval. Set send_now=true ONLY when the operator explicitly said to send it without review (e.g. 'send it', 'send him an email now').", input_schema: { type: "object", properties: { client_name: { type: "string" }, instruction: { type: "string", description: "What the email should say / accomplish, in plain english." }, send_now: { type: "boolean" } }, required: ["client_name", "instruction"] } },
  { name: "send_pending_email", description: "Send a client's most recent PENDING draft (the one waiting for approval) — use when the operator approves a draft you already created (e.g. 'send it', 'looks good, send'). Does NOT write a new email.", input_schema: { type: "object", properties: { client_name: { type: "string" } }, required: ["client_name"] } },
  { name: "create_invoice", description: "DRAFT an invoice (never sends it). Provide either an amount (DOLLARS) or line items with unit prices; the amount is computed from items when given. Generates the invoice number and a secret pay link. Sending stays with a human — done from the Invoices tab.", input_schema: { type: "object", properties: { client_name: { type: "string", description: "Who it's for (fuzzy match). Optional." }, title: { type: "string" }, amount: { type: "number", description: "Total in DOLLARS; ignored if items are given." }, items: { type: "array", items: { type: "object", properties: { desc: { type: "string" }, qty: { type: "number" }, unit: { type: "number", description: "Unit price in DOLLARS." } }, required: ["desc"] } }, due_date: { type: "string", description: "YYYY-MM-DD, optional." }, notes: { type: "string" } } } },
  { name: "create_proposal", description: "DRAFT a proposal with e-sign link (never sends it). Provide amount (DOLLARS) or line items, optional intro and terms (contract language). Generates the number and a secret accept link. Sending stays with a human — done from the Proposals tab.", input_schema: { type: "object", properties: { client_name: { type: "string", description: "Who it's for (fuzzy match). Optional." }, title: { type: "string" }, intro: { type: "string" }, amount: { type: "number", description: "Total in DOLLARS; ignored if items are given." }, items: { type: "array", items: { type: "object", properties: { desc: { type: "string" }, qty: { type: "number" }, unit: { type: "number", description: "Unit price in DOLLARS." } }, required: ["desc"] } }, terms: { type: "string" } } } },
  { name: "update_booking", description: "Reschedule or cancel an UPCOMING booked call, matched by attendee name/email or client. Reschedule needs a new start time as an ISO timestamp WITH timezone offset (e.g. 2026-08-27T14:00:00-04:00 for 2pm Eastern). Cancel sets the call to cancelled and frees the slot; it does not itself email the client.", input_schema: { type: "object", properties: { who: { type: "string", description: "Attendee name/email or client name (fuzzy match)." }, action: { type: "string", enum: ["reschedule", "cancel"] }, start_at: { type: "string", description: "New start, ISO with tz offset. Required for reschedule." }, end_at: { type: "string", description: "New end, ISO. Optional — defaults to the original call length." } }, required: ["who", "action"] } },
];

async function boardSummary(admin: NonNullable<ReturnType<typeof getAdminClient>>, uid: string) {
  const wk = weekKey();
  const [dealsR, weekR, clientsR, kpisR] = await Promise.all([
    admin.from("deals").select("value_cents,stage").eq("user_id", uid),
    admin.from("weeks").select("*").eq("user_id", uid).eq("week_key", wk).maybeSingle(),
    admin.from("clients").select("id", { count: "exact", head: true }).eq("user_id", uid),
    admin.from("kpis").select("name,cadence,target,unit").eq("user_id", uid),
  ]);
  const deals = dealsR.data || [];
  const sum = (f: (d: { stage: string }) => boolean) => c2d(deals.filter(f).reduce((s, d: { value_cents?: number; stage: string }) => s + (Number((d as { value_cents?: number }).value_cents) || 0), 0));
  const collected = sum((d) => d.stage === "Collected");
  const signed = sum((d) => d.stage === "Signed" || d.stage === "Collected");
  const open = sum((d) => !["Collected", "Signed", "Lost"].includes(d.stage));
  const goal = 150000;
  const gap = Math.max(0, goal - collected);
  const w = weekR.data;
  return {
    week: wk,
    goal, collected, signed_in_year: signed, open_pipeline: open,
    coverage: gap ? +(open / gap).toFixed(2) : null,
    friday_five: w ? { calls: w.calls, offers_out: w.offers_out, signed: c2d(w.signed_cents), collected: c2d(w.collected_cents), founder_free_pct: w.founder_free_pct } : "not logged yet",
    open_deals: deals.filter((d) => !["Collected", "Signed", "Lost"].includes(d.stage)).length,
    clients: clientsR.count || 0,
    kpis: (kpisR.data || []).map((k) => `${k.name} (${k.cadence}${k.target != null ? `, target ${k.target}${k.unit === "%" ? "%" : ""}` : ""})`),
  };
}

// Match a client by name, contact, or email (fuzzy). Returns rows.
async function matchClients(admin: NonNullable<ReturnType<typeof getAdminClient>>, uid: string, term: unknown) {
  const t = String(term || "").replace(/[,()%]/g, " ").trim();
  if (!t) return [];
  const { data } = await admin
    .from("clients")
    .select("id,name,contact_name,email")
    .eq("user_id", uid)
    .or(`name.ilike.%${t}%,contact_name.ilike.%${t}%,email.ilike.%${t}%`);
  return data || [];
}
const clientLabel = (c: { name: string; contact_name?: string | null }) => c.name + (c.contact_name ? ` (${c.contact_name})` : "");

async function runTool(admin: NonNullable<ReturnType<typeof getAdminClient>>, uid: string, name: string, input: Record<string, unknown>): Promise<string> {
  const log = async (msg: string) => { await admin.from("log_entries").insert({ user_id: uid, tag: "RK", color: "var(--cream)", message: msg }); };
  const num = (v: unknown) => (v == null || v === "" ? null : Number(v));

  if (name === "get_board") return JSON.stringify(await boardSummary(admin, uid));

  if (name === "list_clients") {
    const { data } = await admin.from("clients").select("name,contact_name,email,status").eq("user_id", uid).order("created_at", { ascending: false }).limit(50);
    if (!data?.length) return "Roster is empty.";
    return data.map((c) => `${c.name} · ${c.contact_name || "—"} · ${c.email || "no email"} · ${c.status}`).join("\n");
  }

  if (name === "log_friday_five") {
    const wk = weekKey();
    const { data: cur } = await admin.from("weeks").select("*").eq("user_id", uid).eq("week_key", wk).maybeSingle();
    const row = {
      user_id: uid, week_key: wk,
      calls: num(input.calls) ?? cur?.calls ?? 0,
      offers_out: num(input.offers_out) ?? cur?.offers_out ?? 0,
      signed_cents: input.signed != null ? Math.round(Number(input.signed) * 100) : cur?.signed_cents ?? 0,
      collected_cents: input.collected != null ? Math.round(Number(input.collected) * 100) : cur?.collected_cents ?? 0,
      founder_free_pct: num(input.founder_free_pct) ?? cur?.founder_free_pct ?? null,
      manual: cur?.manual || {},
    };
    const { error } = await admin.from("weeks").upsert(row, { onConflict: "user_id,week_key" });
    if (error) return "ERROR: " + error.message;
    await log(`friday five updated · ${row.calls} calls · ${row.offers_out} offers · $${c2d(row.signed_cents)} signed · $${c2d(row.collected_cents)} collected`);
    return `Logged for ${wk}: calls ${row.calls}, offers ${row.offers_out}, signed $${c2d(row.signed_cents)}, collected $${c2d(row.collected_cents)}, founder-free ${row.founder_free_pct ?? "—"}%`;
  }

  if (name === "add_deal") {
    const stage = STAGES.includes(String(input.stage)) ? String(input.stage) : "Lead";
    const { error } = await admin.from("deals").insert({ user_id: uid, name: String(input.name), offer: String(input.offer || ""), value_cents: Math.round(Number(input.value) * 100), stage });
    if (error) return "ERROR: " + error.message;
    await log(`deal added · ${input.name} · $${input.value} · ${stage}`);
    return `Deal added: ${input.name} at $${input.value} (${stage}).`;
  }

  if (name === "update_deal_stage") {
    const { data: matches } = await admin.from("deals").select("id,name,stage,value_cents").eq("user_id", uid).ilike("name", `%${input.name}%`);
    if (!matches?.length) return `No deal matching "${input.name}".`;
    if (matches.length > 1) return `Ambiguous — matches: ${matches.map((m) => m.name).join(", ")}. Which one?`;
    const { error } = await admin.from("deals").update({ stage: String(input.stage) }).eq("id", matches[0].id);
    if (error) return "ERROR: " + error.message;
    await log(`deal moved · ${matches[0].name} → ${input.stage}`);
    return `${matches[0].name} ($${c2d(matches[0].value_cents)}) moved: ${matches[0].stage} → ${input.stage}.`;
  }

  if (name === "add_client") {
    const { error } = await admin.from("clients").insert({ user_id: uid, name: String(input.name), contact_name: (input.contact as string) || null, email: (input.email as string) || null, phone: (input.phone as string) || null, industry: (input.industry as string) || null, status: STAGES.includes(String(input.status)) ? "Lead" : String(input.status || "Lead"), source: "Jarvis" });
    if (error) return "ERROR: " + error.message;
    await log(`client added · ${input.name}`);
    return `Client added: ${input.name}${input.email ? " (" + input.email + ")" : ""}.`;
  }

  if (name === "update_client") {
    const matches = await matchClients(admin, uid, input.client_name);
    if (!matches.length) return `No client matching "${input.client_name}". Use list_clients to see the roster.`;
    if (matches.length > 1) return `Ambiguous — matches: ${matches.map(clientLabel).join(", ")}. Which one?`;
    const patch: Record<string, unknown> = {};
    if (input.name) patch.name = String(input.name);
    if (input.contact) patch.contact_name = String(input.contact);
    if (input.email) patch.email = String(input.email);
    if (input.phone) patch.phone = String(input.phone);
    if (input.industry) patch.industry = String(input.industry);
    if (input.status && ["Lead", "Active", "Past"].includes(String(input.status))) patch.status = String(input.status);
    if (input.notes_append) {
      const { data: cur } = await admin.from("clients").select("notes").eq("id", matches[0].id).maybeSingle();
      patch.notes = ((cur?.notes ? cur.notes + "\n" : "") + String(input.notes_append)).slice(0, 8000);
    }
    if (!Object.keys(patch).length) return "Nothing to change — provide at least one field (email, phone, contact, industry, status, notes_append, name).";
    const { error } = await admin.from("clients").update(patch).eq("id", matches[0].id);
    if (error) return "ERROR: " + error.message;
    await log(`client updated · ${matches[0].name} · ${Object.keys(patch).join(", ")}`);
    return `Updated ${clientLabel(matches[0])}: ${Object.keys(patch).join(", ")}.`;
  }

  if (name === "add_expense") {
    const spent = /^\d{4}-\d{2}-\d{2}$/.test(String(input.date || "")) ? String(input.date) : new Date().toISOString().slice(0, 10);
    const { error } = await admin.from("expenses").insert({ user_id: uid, vendor: String(input.vendor), amount_cents: Math.round(Number(input.amount) * 100), category: String(input.category || "Other"), recurring: !!input.recurring, spent_on: spent });
    if (error) return "ERROR: " + error.message;
    await log(`expense logged · ${input.vendor} · $${input.amount}${input.recurring ? " /mo" : ""}`);
    return `Expense logged: ${input.vendor} $${input.amount}${input.recurring ? " (recurring monthly)" : ""} on ${spent}.`;
  }

  if (name === "add_expenses_bulk") {
    const items = Array.isArray(input.items) ? (input.items as Record<string, unknown>[]) : [];
    if (!items.length) return "No items provided.";
    const rows = items.filter((it) => it.vendor && it.amount != null).map((it) => ({
      user_id: uid,
      vendor: String(it.vendor),
      amount_cents: Math.round(Number(it.amount) * 100),
      category: String(it.category || "Other"),
      recurring: !!it.recurring,
      spent_on: /^\d{4}-\d{2}-\d{2}$/.test(String(it.date || "")) ? String(it.date) : new Date().toISOString().slice(0, 10),
    }));
    const { error } = await admin.from("expenses").insert(rows);
    if (error) return "ERROR: " + error.message;
    const total = rows.reduce((s, r) => s + r.amount_cents, 0);
    await log(`expenses imported · ${rows.length} items · $${c2d(total)} total`);
    return `Logged ${rows.length} expenses totaling $${c2d(total)}: ${rows.map((r) => `${r.vendor} $${c2d(r.amount_cents)}`).join(", ")}.`;
  }

  if (name === "set_sprint") {
    const { data: cur } = await admin.from("sprint").select("*").eq("user_id", uid).maybeSingle();
    const row: Record<string, unknown> = { user_id: uid };
    if (input.target != null) row.target_cents = Math.round(Number(input.target) * 100);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(input.sellby_date || ""))) row.sellby_date = input.sellby_date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(input.deadline_date || ""))) row.deadline_date = input.deadline_date;
    if (input.one_thing_title) row.one_thing_title = String(input.one_thing_title).slice(0, 140);
    if (input.one_thing_body != null) row.one_thing_body = String(input.one_thing_body).slice(0, 400);
    if (Object.keys(row).length === 1) return "Nothing to change — provide at least one field.";
    const { error } = await admin.from("sprint").upsert({ ...(cur || {}), ...row }, { onConflict: "user_id" });
    if (error) return "ERROR: " + error.message;
    const parts = [];
    if (row.target_cents != null) parts.push(`target $${c2d(row.target_cents as number)}`);
    if (row.sellby_date) parts.push(`sell-by ${row.sellby_date}`);
    if (row.deadline_date) parts.push(`deadline ${row.deadline_date}`);
    if (row.one_thing_title) parts.push(`ONE THING: "${row.one_thing_title}"`);
    await log(`sprint updated · ${parts.join(" · ")}`);
    return `Sprint updated — ${parts.join(", ")}. (Refresh shows it on the war board.)`;
  }

  if (name === "add_goal") {
    const { data: st } = await admin.from("app_state").select("goals").eq("user_id", uid).maybeSingle();
    const goals = Array.isArray(st?.goals) ? st.goals : [];
    goals.push({ id: "g" + Date.now(), text: String(input.text), type: input.type === "life" ? "life" : "business", target: Number(input.target) || 0, done: false });
    const { error } = await admin.from("app_state").upsert({ user_id: uid, goals }, { onConflict: "user_id" });
    if (error) return "ERROR: " + error.message;
    await log(`goal added · ${input.text}`);
    return `Goal added: "${input.text}" (${input.type === "life" ? "life" : "business"}).`;
  }

  if (name === "complete_goal") {
    const { data: st } = await admin.from("app_state").select("goals").eq("user_id", uid).maybeSingle();
    const goals: { id: string; text: string; done?: boolean }[] = Array.isArray(st?.goals) ? st.goals : [];
    const q = String(input.text).toLowerCase();
    const matches = goals.filter((g) => (g.text || "").toLowerCase().includes(q) && !g.done);
    if (!matches.length) return `No open goal matching "${input.text}".`;
    if (matches.length > 1) return `Ambiguous — matches: ${matches.map((g) => g.text).join(" | ")}. Which one?`;
    matches[0].done = true;
    const { error } = await admin.from("app_state").upsert({ user_id: uid, goals }, { onConflict: "user_id" });
    if (error) return "ERROR: " + error.message;
    await log(`goal completed · ${matches[0].text}`);
    return `Goal completed: "${matches[0].text}".`;
  }

  if (name === "set_strategy") {
    const { data: st } = await admin.from("app_state").select("ops").eq("user_id", uid).maybeSingle();
    const ops = { ...(st?.ops || {}), __strategy: String(input.text) };
    const { error } = await admin.from("app_state").upsert({ user_id: uid, ops }, { onConflict: "user_id" });
    if (error) return "ERROR: " + error.message;
    await log("working strategy updated");
    return "Working Strategy updated (Strategy tab).";
  }

  if (name === "set_kpi") {
    const { data: matches } = await admin.from("kpis").select("id,name,cadence").eq("user_id", uid).ilike("name", `%${input.name}%`);
    if (!matches?.length) return `No KPI matching "${input.name}".`;
    if (matches.length > 1) return `Ambiguous — matches: ${matches.map((m) => m.name).join(", ")}. Which one?`;
    const k = matches[0];
    const period = k.cadence === "monthly" ? monthKey() : weekKey();
    const { error } = await admin.from("kpi_entries").upsert({ user_id: uid, kpi_id: k.id, period_key: period, value: Number(input.value) }, { onConflict: "kpi_id,period_key" });
    if (error) return "ERROR: " + error.message;
    await log(`kpi set · ${k.name} = ${input.value} (${period})`);
    return `${k.name} set to ${input.value} for ${period}.`;
  }

  if (name === "add_work_item") {
    const matches = await matchClients(admin, uid, input.client_name);
    if (!matches.length) return `No client matching "${input.client_name}".`;
    if (matches.length > 1) return `Ambiguous — matches: ${matches.map(clientLabel).join(", ")}. Which one?`;
    const { error } = await admin.from("work_items").insert({ user_id: uid, client_id: matches[0].id, title: String(input.title), type: String(input.type || "other"), status: "in_progress" });
    if (error) return "ERROR: " + error.message;
    await log(`work item added · ${matches[0].name} · ${input.title}`);
    return `Work item added to ${matches[0].name}: ${input.title}.`;
  }

  if (name === "add_log") {
    await log(String(input.message));
    return "Logged.";
  }

  if (name === "draft_client_email") {
    const matches = await matchClients(admin, uid, input.client_name);
    if (!matches.length) return `No client matching "${input.client_name}" (searched names, contacts, and emails). Use list_clients to see the roster.`;
    if (matches.length > 1) return `Ambiguous — matches: ${matches.map(clientLabel).join(", ")}. Which one?`;
    const client = matches[0];
    if (!client.email) return `${client.name} has no email on file — add one on their client record first.`;

    const draft = await draftAgentEmail({ userId: uid, clientId: client.id, kind: "manual", task: String(input.instruction) });
    if (!draft.ok || !draft.id) return "ERROR: draft failed (" + (draft.error || "unknown") + ").";

    if (input.send_now) {
      const sent = await sendQueuedEmail(draft.id, uid);
      if (!sent.ok) return `Draft created ("${draft.subject}") but SEND FAILED (${sent.error}) — it's waiting in ${client.name}'s COMMS panel instead.`;
      await log(`email sent · ${client.name} · ${draft.subject}`);
      return `SENT to ${client.name} (${client.email}) as Anchor — "${draft.subject}":\n\n${draft.body}`;
    }
    await log(`email drafted · ${client.name} · ${draft.subject}`);
    return `Draft queued for approval in ${client.name}'s COMMS panel (their dashboard) — "${draft.subject}":\n\n${draft.body}\n\nSay "send it" and I'll push it out, or approve it from the dashboard.`;
  }

  if (name === "send_pending_email") {
    const matches = await matchClients(admin, uid, input.client_name);
    if (!matches.length) return `No client matching "${input.client_name}".`;
    if (matches.length > 1) return `Ambiguous — matches: ${matches.map(clientLabel).join(", ")}. Which one?`;
    const { data: pending } = await admin.from("email_log").select("id,subject").eq("user_id", uid).eq("client_id", matches[0].id).eq("status", "draft_pending_approval").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!pending) return `No pending draft for ${matches[0].name}.`;
    const sent = await sendQueuedEmail(pending.id, uid);
    if (!sent.ok) return `SEND FAILED (${sent.error}) — still queued in their COMMS panel.`;
    await log(`email sent · ${matches[0].name} · ${pending.subject}`);
    return `SENT: "${pending.subject}" to ${matches[0].name} (${matches[0].email}).`;
  }

  // Build [{desc, qty, unit_cents}] line items and a cents total from tool input.
  const lineItems = (raw: unknown) => {
    const arr = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    const items = arr.filter((it) => it.desc).map((it) => ({ desc: String(it.desc), qty: Number(it.qty) || 1, unit_cents: Math.round(Number(it.unit || 0) * 100) }));
    const total = items.reduce((s, it) => s + it.qty * it.unit_cents, 0);
    return { items, total };
  };
  const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://os.creativeimpactmedia.co";

  if (name === "create_invoice") {
    let clientId: string | null = null, clientName = "";
    if (input.client_name) {
      const m = await matchClients(admin, uid, input.client_name);
      if (!m.length) return `No client matching "${input.client_name}". Add the client first, or omit the client.`;
      if (m.length > 1) return `Ambiguous — matches: ${m.map(clientLabel).join(", ")}. Which one?`;
      clientId = m[0].id; clientName = m[0].name;
    }
    const { items, total } = lineItems(input.items);
    let amount_cents = total || (input.amount != null ? Math.round(Number(input.amount) * 100) : 0);
    if (!amount_cents) return "Provide an amount (dollars) or line items with unit prices.";
    const { count } = await admin.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", uid);
    const number = "INV-" + String((count || 0) + 1).padStart(4, "0");
    const due = /^\d{4}-\d{2}-\d{2}$/.test(String(input.due_date || "")) ? String(input.due_date) : null;
    const { data: inv, error } = await admin.from("invoices").insert({ user_id: uid, client_id: clientId, number, title: String(input.title || ""), items, amount_cents, status: "draft", due_date: due, notes: input.notes ? String(input.notes) : null }).select("token").maybeSingle();
    if (error) return "ERROR: " + error.message;
    await log(`invoice drafted · ${number} · ${clientName || "no client"} · $${c2d(amount_cents)}`);
    return `Invoice ${number} drafted${clientName ? " for " + clientName : ""}: $${c2d(amount_cents)} (status: draft). Pay link: ${siteUrl()}/pay/${inv?.token}. NOT sent — review it on the Invoices tab and send from there.`;
  }

  if (name === "create_proposal") {
    let clientId: string | null = null, clientName = "";
    if (input.client_name) {
      const m = await matchClients(admin, uid, input.client_name);
      if (!m.length) return `No client matching "${input.client_name}". Add the client first, or omit the client.`;
      if (m.length > 1) return `Ambiguous — matches: ${m.map(clientLabel).join(", ")}. Which one?`;
      clientId = m[0].id; clientName = m[0].name;
    }
    const { items, total } = lineItems(input.items);
    let amount_cents = total || (input.amount != null ? Math.round(Number(input.amount) * 100) : 0);
    if (!amount_cents) return "Provide an amount (dollars) or line items with unit prices.";
    const { count } = await admin.from("proposals").select("id", { count: "exact", head: true }).eq("user_id", uid);
    const number = "PRO-" + String((count || 0) + 1).padStart(4, "0");
    const { data: prop, error } = await admin.from("proposals").insert({ user_id: uid, client_id: clientId, number, title: String(input.title || ""), intro: input.intro ? String(input.intro) : null, items, amount_cents, terms: input.terms ? String(input.terms) : null, status: "draft" }).select("token").maybeSingle();
    if (error) return "ERROR: " + error.message;
    await log(`proposal drafted · ${number} · ${clientName || "no client"} · $${c2d(amount_cents)}`);
    return `Proposal ${number} drafted${clientName ? " for " + clientName : ""}: $${c2d(amount_cents)} (status: draft). Accept link: ${siteUrl()}/proposal/${prop?.token}. NOT sent — review it on the Proposals tab and send from there.`;
  }

  if (name === "update_booking") {
    const term = String(input.who || "").trim();
    const { data: all } = await admin.from("bookings").select("id,name,email,start_at,end_at,status,client_id").eq("user_id", uid).eq("status", "booked").gte("start_at", new Date().toISOString()).order("start_at", { ascending: true });
    let matches = all || [];
    if (term) {
      const tl = term.toLowerCase();
      matches = matches.filter((b) => (b.name || "").toLowerCase().includes(tl) || (b.email || "").toLowerCase().includes(tl));
      if (!matches.length) {
        const cm = await matchClients(admin, uid, term);
        const ids = new Set(cm.map((c) => c.id));
        matches = (all || []).filter((b) => b.client_id && ids.has(b.client_id));
      }
    }
    if (!matches.length) return `No upcoming booked call matching "${term}".`;
    if (matches.length > 1) return `Multiple upcoming calls match: ${matches.map((m) => `${m.name || m.email} (${new Date(m.start_at).toUTCString()})`).join("; ")}. Which one?`;
    const bk = matches[0];
    if (input.action === "cancel") {
      const { error } = await admin.from("bookings").update({ status: "cancelled" }).eq("id", bk.id);
      if (error) return "ERROR: " + error.message;
      await log(`call cancelled · ${bk.name || bk.email || "guest"}`);
      return `Cancelled the call with ${bk.name || bk.email || "guest"} (was ${new Date(bk.start_at).toUTCString()}). The slot is open again on the booker. The client was not emailed — tell me if you want a note drafted.`;
    }
    const start = String(input.start_at || "");
    if (!/\dT\d/.test(start) || isNaN(new Date(start).getTime())) return "To reschedule, give the new start time as an ISO timestamp with timezone offset (e.g. 2026-08-27T14:00:00-04:00).";
    const durMs = new Date(bk.end_at).getTime() - new Date(bk.start_at).getTime();
    const endIso = /\dT\d/.test(String(input.end_at || "")) && !isNaN(new Date(String(input.end_at)).getTime())
      ? new Date(String(input.end_at)).toISOString()
      : new Date(new Date(start).getTime() + (durMs > 0 ? durMs : 30 * 60000)).toISOString();
    const { error } = await admin.from("bookings").update({ start_at: new Date(start).toISOString(), end_at: endIso }).eq("id", bk.id);
    if (error) return "ERROR: " + error.message;
    await log(`call rescheduled · ${bk.name || bk.email || "guest"} → ${new Date(start).toUTCString()}`);
    return `Rescheduled the call with ${bk.name || bk.email || "guest"} to ${new Date(start).toUTCString()}. The client was not emailed — tell me if you want a note drafted.`;
  }

  return "Unknown tool.";
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  if (!apiKey) return NextResponse.json({ ok: false, error: "no_api_key" }, { status: 400 });

  const cookieStore = await cookies();
  const sb = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "no_service_role" }, { status: 400 });

  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const history: { role: string; content: unknown }[] = Array.isArray(body.messages) ? body.messages.slice(-14) : [];
  if (!history.length) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

  // Persona voice: prefer a "Jarvis" agent row, fall back to the legacy
  // "Showrunner" row so an existing seed still supplies the voice.
  let { data: agent } = await admin.from("agents").select("voice_prompt").eq("user_id", user.id).eq("name", "Jarvis").maybeSingle();
  if (!agent) ({ data: agent } = await admin.from("agents").select("voice_prompt").eq("user_id", user.id).eq("name", "Showrunner").maybeSingle());
  const board = await boardSummary(admin, user.id);
  const system = `${agent?.voice_prompt || "You are Jarvis, the Creative Impact OS operator copilot."}\n\nYou are Jarvis. You are an AI and say so plainly if asked; you never pose as Brandon, Emmanuel, or a client.\n\nLIVE BOARD CONTEXT (as of this message):\n${JSON.stringify(board)}\n\nToday: ${new Date().toDateString()}. Current ISO week: ${weekKey()}.\n\nCAPABILITIES NOTE: You can change mission-level settings (set_sprint: target, dates, THE ONE THING), manage Founder OS goals (add_goal/complete_goal), rewrite the working strategy (set_strategy), set KPIs, and ingest uploaded receipts/statements/CSVs — extract each line item and log via add_expenses_bulk (use the document's dates; ask before logging if any line is unreadable or ambiguous). Changing the sprint target or dates is a big lever — restate the change and act only when the instruction is explicit.\n\nINVOICES & PROPOSALS: create_invoice and create_proposal DRAFT the document and generate its client link — they never email the client. Sending an invoice or proposal is an outbound, money-adjacent action that stays with a human: after drafting, show the operator the number, amount, and link, and tell them to send it from the Invoices/Proposals tab. Do not claim anything was sent.\n\nCALLS: update_booking reschedules or cancels an upcoming booked call. Rescheduling needs an explicit new start time. Cancelling frees the slot on the public booker; restate the call before cancelling.\n\nCLIENT EMAIL: draft_client_email hands the writing to Anchor (the client producer) — client-facing mail is his voice, not yours. Drafts queue for approval by default; pass send_now=true ONLY on an explicit send order. When the operator approves a draft you just showed them ("send it"), use send_pending_email — never redraft. Show the operator the draft body after creating it. Use list_clients to see or disambiguate the roster; client matching covers names, contact names, and emails.\n\nYou can add and update, but you NEVER delete anything, and you never send an invoice, proposal, or client email without the operator's explicit go-ahead.`;

  const convo: { role: string; content: unknown }[] = history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

  // Optional attachment (receipt/statement image, PDF, or CSV/text) — merged
  // into the latest user message so Rookie can read it and extract expenses.
  const file = body.file as { name?: string; kind?: string; media_type?: string; data?: string; text?: string } | undefined;
  if (file && convo.length) {
    const last = convo[convo.length - 1];
    if (last.role === "user" && typeof last.content === "string") {
      const caption = { type: "text", text: (last.content || "Process this file.") + `\n\n[Attached file: ${file.name || "upload"}]` };
      if (file.kind === "image" && file.data) {
        if (file.data.length > 5_000_000) return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 413 });
        last.content = [caption, { type: "image", source: { type: "base64", media_type: file.media_type || "image/png", data: file.data } }];
      } else if (file.kind === "pdf" && file.data) {
        if (file.data.length > 5_000_000) return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 413 });
        last.content = [caption, { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.data } }];
      } else if (file.kind === "text" && file.text) {
        last.content = [{ type: "text", text: caption.text + "\n\n```\n" + file.text.slice(0, 60000) + "\n```" }];
      }
    }
  }
  const actions: string[] = [];
  let finalText = "";

  for (let i = 0; i < 6; i++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, system, tools: TOOLS, messages: convo }),
    });
    const j = await r.json();
    if (j.error) return NextResponse.json({ ok: false, error: j.error.message || "api_error" }, { status: 502 });

    const blocks: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[] = j.content || [];
    const toolUses = blocks.filter((b) => b.type === "tool_use");
    const texts = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n");

    if (j.stop_reason !== "tool_use" || !toolUses.length) { finalText = texts; break; }

    convo.push({ role: "assistant", content: blocks });
    const results = [];
    for (const t of toolUses) {
      const out = await runTool(admin, user.id, t.name!, t.input || {});
      if (!out.startsWith("ERROR") && t.name !== "get_board") actions.push(`${t.name}: ${out}`);
      results.push({ type: "tool_result", tool_use_id: t.id, content: out });
    }
    convo.push({ role: "user", content: results });
  }

  return NextResponse.json({ ok: true, reply: finalText || "Done.", actions });
}
