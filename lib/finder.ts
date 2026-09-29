// EDITH's finder (server-only): go find businesses for the Charlotte Spotlight,
// check each one against its own website, and bring them back to the team in
// Discord for a yes or no. Nothing is emailed until a person approves it.
//
//   start   /find in Discord, or "find 10 HVAC companies in Charlotte" to EDITH
//           → a row in prospect_hunts (status queued)
//   search  one web search pass (Anthropic's web_search tool) → candidates,
//           minus anyone already in the pipeline
//   enrich  three a minute: read each one's own site (importWebsite — facts
//           only), check the email's domain takes mail, add it to Spotlight
//           tagged `found`, post a card with Approve / Call list / Skip
//   done    a summary post
// The clock is pg_cron's finder-tick (supabase/26), which only fires while a
// hunt is open — each step fits inside one 60-second function.
//
// Guardrails: never guesses an email or a fact (a business with no public
// email goes to the call list); no scraping of Google Maps, Yelp, or LinkedIn;
// at most HUNTS_PER_DAY hunts a day and MAX_COUNT businesses a hunt, because
// every search costs money.
import type { getAdminClient } from "@/lib/supabase/admin";
import { VERTICALS, importWebsite } from "@/lib/spotlight";
import { toVertical } from "@/lib/sheet-map";
import { mailServer } from "@/lib/spotlight-import";
import { edithEmit, getEdithConfig } from "@/lib/edith/server";
import { discordSay, GOLD, GREEN, type DMessage } from "@/lib/discord";

type Admin = NonNullable<ReturnType<typeof getAdminClient>>;
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const MODEL = process.env.AGENT_MODEL || "claude-sonnet-5";
export const HUNTS_PER_DAY = 6;
export const MAX_COUNT = 25;
const PER_TICK = 3;
const HUNTS_MISSING = "The finder's table doesn't exist yet — run supabase/26_close_release_finder.sql in the Supabase SQL editor.";

export type Candidate = {
  business: string; website: string | null; phone: string | null; area: string | null; note: string | null;
  status: "pending" | "posted" | "dupe" | "failed"; reason?: string; prospect_id?: string; email?: boolean;
};

const label = (v: string) => (VERTICALS[v]?.label || v).split(" /")[0];
const clean = (s: unknown, n = 300) => (s == null ? "" : String(s).trim().slice(0, n));
const normName = (s: unknown) => String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(/\b(the|inc|llc|pllc|co|company|corp|corporation|ltd)\b/g, " ").replace(/\s+/g, " ").trim();
const hostOf = (u: unknown) => { try { return new URL(/^https?:\/\//i.test(String(u)) ? String(u) : "https://" + String(u)).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
const digits = (s: unknown) => String(s || "").replace(/\D/g, "").slice(-10);
const todayStartET = () => {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  return new Date(`${d}T00:00:00-05:00`).toISOString(); // close enough for a daily count (DST shifts it an hour)
};

/* ----------------------------------------------------------------- start */

export async function startHunt(admin: Admin, uid: string, o: { vertical: string; area?: string; count?: number; requestedBy?: string; channelId?: string | null }) {
  const vertical = VERTICALS[String(o.vertical || "").toLowerCase()] ? String(o.vertical).toLowerCase() : toVertical(String(o.vertical || ""), VERTICALS);
  if (!vertical || vertical === "other") return { ok: false as const, error: `I don't have "${o.vertical}" as a vertical. Try one of: ${Object.keys(VERTICALS).filter((k) => k !== "other").join(", ")}.` };
  const count = Math.max(1, Math.min(MAX_COUNT, Math.round(Number(o.count) || 10)));
  const area = clean(o.area, 80) || "Charlotte, NC";
  const { count: today, error: cErr } = await admin.from("prospect_hunts").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("created_at", todayStartET());
  if (cErr) return { ok: false as const, error: /does not exist|schema cache/i.test(cErr.message) ? HUNTS_MISSING : cErr.message };
  if ((today || 0) >= HUNTS_PER_DAY) return { ok: false as const, error: `That's ${HUNTS_PER_DAY} hunts today — the daily limit that keeps search costs in check. Tomorrow, or raise HUNTS_PER_DAY in lib/finder.ts.` };
  const { data, error } = await admin.from("prospect_hunts").insert({ user_id: uid, vertical, area, count, requested_by: clean(o.requestedBy, 80) || null, channel_id: o.channelId || null }).select("id").maybeSingle();
  if (error || !data) return { ok: false as const, error: error?.message || "Couldn't start the hunt." };
  await admin.from("log_entries").insert({ user_id: uid, tag: "ED", color: "var(--gold)", message: `EDITH · finder: ${count} ${label(vertical)} in ${area}${o.requestedBy ? ` (for ${o.requestedBy})` : ""}`.slice(0, 200) });
  return { ok: true as const, id: data.id as string, vertical, area, count, message: `On it — finding ${count} ${label(vertical)} businesses in ${area}. I'll post each one as I check its website (three a minute), with buttons to approve, call, or skip.` };
}

/* ----------------------------------------------------------------- search */

async function knownBusinesses(admin: Admin, uid: string) {
  const { data } = await admin.from("spotlight_prospects").select("business,website,email,phone,vertical").eq("user_id", uid);
  const rows = data || [];
  return {
    names: new Set(rows.map((r) => normName(r.business)).filter(Boolean)),
    hosts: new Set(rows.map((r) => hostOf(r.website)).filter(Boolean)),
    emails: new Set(rows.map((r) => String(r.email || "").toLowerCase()).filter(Boolean)),
    phones: new Set(rows.map((r) => digits(r.phone)).filter((p) => p.length === 10)),
    byVertical: (v: string) => rows.filter((r) => r.vertical === v).map((r) => String(r.business)).slice(0, 150),
  };
}

async function webSearch(system: string, user: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: "ANTHROPIC_API_KEY isn't set in Vercel." };
  const messages: Array<{ role: string; content: unknown }> = [{ role: "user", content: user }];
  let text = "";
  for (let turn = 0; turn < 3; turn++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 3000, system, messages,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5, user_location: { type: "approximate", city: "Charlotte", region: "North Carolina", country: "US", timezone: "America/New_York" } }],
      }),
    });
    const j = await r.json().catch(() => ({ error: { message: `Anthropic answered ${r.status}` } }));
    if (j.error) return { ok: false, error: /web.?search/i.test(String(j.error.message)) ? `Web search isn't available on the Anthropic account (${j.error.message}). An admin can enable it in the Anthropic Console.` : String(j.error.message || "search failed") };
    text += (j.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    if (j.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: j.content }); continue; }
    break;
  }
  return { ok: true, text };
}

export function parseCandidates(text: string): Candidate[] {
  const block = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1] || (/\[[\s\S]*\]/.exec(text) || [])[0] || "";
  let arr: unknown;
  try { arr = JSON.parse(block); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => x && typeof x === "object" && (x as Row).business).map((x) => {
    const r = x as Row;
    const site = clean(r.website, 300);
    return { business: clean(r.business, 160), website: site && hostOf(site) ? (/^https?:\/\//i.test(site) ? site : "https://" + site) : null, phone: clean(r.phone, 40) || null, area: clean(r.area, 80) || null, note: clean(r.note, 240) || null, status: "pending" as const };
  });
}

async function searchStep(admin: Admin, uid: string, h: Row) {
  const known = await knownBusinesses(admin, uid);
  const want = Math.min(MAX_COUNT + 3, Number(h.count) + 3);
  const exclude = known.byVertical(h.vertical);
  const r = await webSearch(
    "You research local businesses for the Charlotte Spotlight — a local video series from Creative Impact that features independent businesses in the Charlotte area. Use web search to find real businesses. Facts only: every value you return must come from a search result or a page you saw. Never invent a business, a website, a phone number, or a detail.",
    `Find ${want} independent, locally owned ${VERTICALS[h.vertical]?.label || h.vertical} businesses that serve ${h.area}.
Good fits: owner-operated, established, with their own website.
Skip: national chains and franchise corporate pages, directories and lead-gen sites (Yelp, Angi, HomeAdvisor, BBB, Thumbtack and the like), and businesses outside the area.
Already on our list — don't return these: ${exclude.length ? exclude.join("; ") : "none yet"}.
For each business give: business (the name they use), website (their own site's homepage, or null), phone (only if a result shows it, else null), area (city or neighborhood if shown, else null), note (one short factual line a source supports, e.g. "family-owned since 1987", else null).
Return ONLY a JSON array in a \`\`\`json block — no other text.`,
  );
  if (!r.ok) return { ok: false as const, error: r.error };
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of parseCandidates(r.text)) {
    const n = normName(c.business), host = hostOf(c.website), ph = digits(c.phone);
    const dup = known.names.has(n) || (host && known.hosts.has(host)) || (ph.length === 10 && known.phones.has(ph)) || seen.has(n) || (host && seen.has(host));
    seen.add(n); if (host) seen.add(host);
    if (dup) continue;
    out.push(c);
    if (out.length >= Number(h.count)) break;
  }
  return { ok: true as const, candidates: out };
}

/* ----------------------------------------------------------------- enrich */

async function enrichOne(admin: Admin, uid: string, h: Row, c: Candidate, i: number, total: number): Promise<Candidate> {
  let pr: Row = {};
  if (c.website) {
    const r = await importWebsite(c.website);
    if (r.ok) pr = r.profile as Row;
  }
  const known = await knownBusinesses(admin, uid);
  const business = clean(pr.business_name, 160) || c.business;
  let email = clean(pr.email, 200).toLowerCase().replace(/^mailto:/, "");
  if (email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) email = "";
  if (email && known.emails.has(email)) return { ...c, status: "dupe", reason: "already in the pipeline (same email)" };
  if (known.names.has(normName(business))) return { ...c, status: "dupe", reason: "already in the pipeline" };
  const notes: string[] = [`Found by EDITH's finder (${label(h.vertical)} · ${h.area}, ${new Date().toISOString().slice(0, 10)})${c.note ? ` — ${c.note}` : ""}.`];
  if (email) {
    const bad = await mailServer(email.split("@")[1]);
    if (bad) { notes.push(`Their site lists ${email}, but ${bad.replace("that email's", "its")}.`); email = ""; }
  }
  if (!c.website) notes.push("No website found — details are from search results only.");
  else if (!Object.keys(pr).length) notes.push(`Couldn't read ${c.website} (it may block automated visits).`);
  const years = Number(pr.years_in_business) || (Number(pr.founded_year) > 1800 ? new Date().getFullYear() - Number(pr.founded_year) : null);
  const row = {
    user_id: uid, stage: "prospect", source: "finder", tags: ["found"],
    business, owner_name: clean(pr.owner_name, 120) || null, email: email || null,
    phone: clean(pr.phone, 40) || c.phone || null, website: c.website, vertical: h.vertical,
    suburb: clean(pr.city_or_suburb, 80) || c.area || null, years: years && years > 0 && years < 200 ? years : null,
    profile: Object.keys(pr).length ? pr : {}, notes: notes.join(" "),
  };
  const { data, error } = await admin.from("spotlight_prospects").insert(row).select("*").maybeSingle();
  if (error || !data) return { ...c, status: "failed", reason: error?.message || "couldn't save" };
  await discordSay(admin, uid, findCard(data, { hunt: `${label(h.vertical)} · ${h.area} · ${i}/${total}` }), h.channel_id || undefined);
  return { ...c, business, status: "posted", prospect_id: data.id, email: !!email };
}

// The card EDITH posts for one found business — rebuilt after a button click
// with the outcome and without buttons.
export function findCard(p: Row, o: { hunt?: string; outcome?: string } = {}): DMessage {
  const pr = (p.profile || {}) as Row;
  const services = Array.isArray(pr.services) ? pr.services.slice(0, 4).join(" · ") : "";
  const inBiz = p.years ? `${p.years} years` : pr.founded_year ? `since ${pr.founded_year}` : "—";
  const fields = [
    { name: "Phone", value: p.phone || "—", inline: true },
    { name: "Email", value: p.email || "none public → call list", inline: true },
    { name: "Owner", value: p.owner_name || "not named on their site", inline: true },
    { name: "Area", value: p.suburb || "—", inline: true },
    { name: "In business", value: inBiz, inline: true },
    ...(services ? [{ name: "Services", value: services.slice(0, 1000), inline: false }] : []),
    ...(o.outcome ? [{ name: "Status", value: o.outcome.slice(0, 1000), inline: false }] : []),
  ];
  const embed = {
    title: String(p.business || "Business").slice(0, 256), url: p.website || undefined,
    description: String(pr.summary || "").slice(0, 1500) || undefined,
    color: o.outcome ? 0x5c7096 : p.email ? GREEN : GOLD, fields,
    footer: { text: `${o.hunt ? "Hunt: " + o.hunt + " · " : ""}facts from their own website — EDITH never guesses an email` },
  };
  if (o.outcome) return { embeds: [embed], components: [] };
  const buttons: Row[] = [
    { type: 2, style: 3, label: "Approve — EDITH emails them", custom_id: `fnd:e:${p.id}`, disabled: !p.email },
    { type: 2, style: 1, label: "Call list", custom_id: `fnd:c:${p.id}` },
    { type: 2, style: 2, label: "Skip", custom_id: `fnd:s:${p.id}` },
  ];
  if (p.website && /^https?:\/\//.test(p.website)) buttons.push({ type: 2, style: 5, label: "Website", url: String(p.website).slice(0, 512) });
  return { embeds: [embed], components: [{ type: 1, components: buttons }] };
}

/* ------------------------------------------------------------------ clock */

export async function huntTick(admin: Admin, uid: string) {
  const { data: hunts, error } = await admin.from("prospect_hunts").select("*").eq("user_id", uid).in("status", ["queued", "enriching"]).order("created_at").limit(1);
  if (error) return { ran: "error", error: error.message };
  const h = hunts?.[0];
  if (!h) return { ran: "idle" };
  // One worker per hunt: a step that started under 100 seconds ago is still running.
  if (h.step_started_at && Date.now() - new Date(h.step_started_at).getTime() < 100e3) return { ran: "busy" };
  const attempts = Number(h.attempts) + 1;
  await admin.from("prospect_hunts").update({ step_started_at: new Date().toISOString(), attempts, updated_at: new Date().toISOString() }).eq("id", h.id);
  const done = (patch: Row) => admin.from("prospect_hunts").update({ ...patch, step_started_at: null, updated_at: new Date().toISOString() }).eq("id", h.id);
  const say = (m: DMessage) => discordSay(admin, uid, m, h.channel_id || undefined);

  if (h.status === "queued") {
    const r = await searchStep(admin, uid, h);
    if (!r.ok) {
      if (attempts >= 3) { await done({ status: "failed", error: r.error }); await say({ content: `⚠️ The ${label(h.vertical)} hunt in ${h.area} failed: ${r.error}` }); return { ran: "failed" }; }
      await done({ error: r.error });
      return { ran: "retry" };
    }
    if (!r.candidates.length) { await done({ status: "done", candidates: [] }); await say({ content: `🔎 ${label(h.vertical)} in ${h.area}: I didn't find anyone new — everyone I found is already in the pipeline.` }); return { ran: "done" }; }
    await done({ status: "enriching", candidates: r.candidates, attempts: 0, error: null });
    await say({ content: `🔎 **${label(h.vertical)} in ${h.area}** — ${r.candidates.length} new businesses to check. Reading each one's website now; cards coming in three a minute.` });
    return { ran: "searched", found: r.candidates.length };
  }

  // enriching
  const cands = (h.candidates || []) as Candidate[];
  const idx = cands.map((c, i) => ({ c, i })).filter((x) => x.c.status === "pending").slice(0, PER_TICK);
  // The same batch keeps getting cut off (a site that never answers): skip it, move on.
  if (attempts > 3) {
    idx.forEach(({ i }) => { cands[i] = { ...cands[i], status: "failed", reason: "their website kept timing out" }; });
    await done({ candidates: cands, attempts: 0 });
    return { ran: "skipped a stuck batch" };
  }
  const results = await Promise.all(idx.map(({ c, i }) => enrichOne(admin, uid, h, c, i + 1, cands.length).catch((e) => ({ ...c, status: "failed" as const, reason: String((e as Error)?.message || e) }))));
  idx.forEach(({ i }, k) => { cands[i] = results[k]; });
  const left = cands.filter((c) => c.status === "pending").length;
  if (left) { await done({ candidates: cands, attempts: 0 }); return { ran: "enriched", left }; }
  await done({ status: "done", candidates: cands });
  const posted = cands.filter((c) => c.status === "posted");
  const withEmail = posted.filter((c) => c.email).length;
  const dupes = cands.filter((c) => c.status === "dupe").length, failed = cands.filter((c) => c.status === "failed").length;
  await say({ embeds: [{ title: `Hunt done — ${label(h.vertical)} in ${h.area}`, color: GOLD, description: `${posted.length} posted above: ${withEmail} with a public email, ${posted.length - withEmail} phone-only.${dupes ? ` ${dupes} turned out to be in the pipeline already.` : ""}${failed ? ` ${failed} couldn't be saved.` : ""}\n\n**Approve** = EDITH sends her three cold emails (under the daily cap). **Call list** = it shows first in Spotlight → Call Script. **Skip** = never found again.\nThey're all in Spotlight → Prospects too, tagged *found*.`, footer: { text: "EDITH's finder" } }] });
  return { ran: "done" };
}

/* ---------------------------------------------------------------- decide */

// Approve (EDITH emails them), call list, or skip — from a Discord button or
// from EDITH herself. Returns the line that goes on the card.
export async function finderAct(admin: Admin, uid: string, prospectId: string, action: "e" | "c" | "s", by: string) {
  const { data: p } = await admin.from("spotlight_prospects").select("*").eq("user_id", uid).eq("id", prospectId).maybeSingle();
  if (!p) return { ok: false as const, error: "That business isn't in the pipeline any more.", card: null };
  const tags = ((p.tags || []) as string[]).filter((t) => t !== "found");
  let outcome = "";
  if (action === "e") {
    if (!p.email) return { ok: false as const, error: `${p.business} has no email on file — use Call list.`, card: findCard(p) };
    if (p.do_not_contact) return { ok: false as const, error: `${p.business} is marked do-not-contact.`, card: findCard(p) };
    await admin.from("spotlight_prospects").update({ tags: tags.includes("cold_prospect") ? tags : [...tags, "cold_prospect"] }).eq("id", p.id);
    await edithEmit(admin, uid, { prospect_id: p.id, type: "contact.created", source: "finder" }, { run: false });
    const cfg = await getEdithConfig(admin, uid);
    outcome = `✅ Approved by ${by} — EDITH's first email is queued (next send window${cfg.cold_daily_cap ? `, up to ${cfg.cold_daily_cap} new a day` : ""}).`;
    if (!String(cfg.physical_address || "").trim()) outcome += " ⚠️ It's holding until the mailing address is set (EDITH → Settings).";
    if (!cfg.edith_live) outcome += " EDITH is OFF — she'll log it, not send it.";
  } else if (action === "c") {
    await admin.from("spotlight_prospects").update({ tags: tags.includes("call_list") ? tags : [...tags, "call_list"] }).eq("id", p.id);
    outcome = `📞 On the call list — ${by}. It's in Spotlight → Call Script.`;
  } else {
    await admin.from("spotlight_prospects").update({ stage: "no", stage_at: new Date().toISOString(), tags: [...tags, "passed"], notes: [p.notes, `Passed on in Discord by ${by} — not contacted.`].filter(Boolean).join(" ").slice(0, 4000) }).eq("id", p.id);
    outcome = `⏭️ Skipped by ${by} — it won't be found again.`;
  }
  await admin.from("log_entries").insert({ user_id: uid, tag: "ED", color: "var(--gold)", message: `finder · ${p.business}: ${outcome.replace(/[^\w\s.,'—-]/g, "").trim()}`.slice(0, 200) });
  return { ok: true as const, outcome, card: findCard(p, { outcome }) };
}

// What's waiting on a decision (for EDITH's finder_review tool).
export async function pendingFinds(admin: Admin, uid: string) {
  const { data } = await admin.from("spotlight_prospects").select("id,business,email,phone,website,suburb,owner_name,vertical,created_at").eq("user_id", uid).contains("tags", ["found"]).neq("stage", "no").order("created_at", { ascending: false }).limit(60);
  return data || [];
}
