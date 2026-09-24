// Charlotte Spotlight engine (server-only).
//
// Source documents (Downloads, Aug 21 + Sep 19 2026): the V4 Canonical Kit, the
// Agreement Template, the Invoice Template, and the Call Script + Emails. The
// email copy below is the Sep 19 script's, verbatim except where noted.
//
// Everything money- or contract-shaped reads from the __spotlight config in
// app_state.ops, NEVER from constants here, because the source documents
// disagree on the offer (Aug 21: tiered $750-$1,750 paid in full; Sep 19: flat
// $997 with $250 deposit). Changing the offer is a settings edit, not a deploy.
//
// Guardrails carried over from the documents:
//  - No invented proof: any merge field we can't fill stays as a visible
//    [bracket] and the email refuses to send until a human fills it.
//  - The agreement can't be generated until the operator ticks "attorney
//    reviewed" (the template says: REQUIRED BEFORE FIRST USE).
//  - Cold touches are never sent automatically. The only automatic send is the
//    questionnaire, to someone who has already paid.
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail, personaFrom } from "@/lib/email";

type Admin = NonNullable<ReturnType<typeof getAdminClient>>;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://os.creativeimpactmedia.co";
const MODEL = process.env.AGENT_MODEL || "claude-sonnet-5";

export type Prospect = {
  id: string; user_id: string; client_id: string | null;
  business: string; owner_name: string | null; email: string | null; phone: string | null; website: string | null;
  vertical: string | null; suburb: string | null; reviews: number | null; years: number | null;
  video_situation: string | null; source: string | null;
  stage: string; stage_at: string; slot_month: string | null; film_date: string | null;
  quote_mentioned: string | null; season_named: string | null; not_now_month: string | null; notes: string | null;
  profile: Record<string, unknown>; seq_step: number; seq_last_at: string | null;
  deposit_invoice_id: string | null; balance_invoice_id: string | null; agreement_id: string | null;
  q_token: string; questions: Question[]; answers: Record<string, { a?: string; star?: boolean }>;
  q_sent_at: string | null; q_returned_at: string | null; member_at: string | null;
};
export type Question = { id: string; q: string; why?: string; core?: boolean };

// --- Stages -----------------------------------------------------------------
// "Member" = the slot is claimed (deposit paid). It's the trigger for the
// questionnaire. Closed means all three (script §4): form, deposit, pre-pro date.
export const STAGES = [
  { key: "prospect", label: "Prospect", hint: "On the list. Fill reviews + years before dialing." },
  { key: "contacted", label: "Contacted", hint: "In the call / email sequence." },
  { key: "call_booked", label: "Call booked", hint: "Fit call or second-call close on the calendar." },
  { key: "member", label: "Member", hint: "Slot claimed. Questions go out." },
  { key: "filming", label: "Filming set", hint: "Film date locked." },
  { key: "filmed", label: "Filmed", hint: "Footage in. Edit stack." },
  { key: "delivered", label: "Delivered", hint: "Cut sent for approval (5-day window)." },
  { key: "published", label: "Published", hint: "In the episode. Debrief follows." },
  { key: "not_now", label: "Not now", hint: "Named a month. Call then." },
  { key: "no", label: "No", hint: "Clean no. Archived, never re-added." },
] as const;
export const STAGE_KEYS = STAGES.map((s) => s.key) as string[];
const PRE_MEMBER = ["prospect", "contacted", "call_booked", "not_now"];

// --- Verticals (script §7) ---------------------------------------------------
// gap = the caller's opener line; e1 = the same idea phrased to finish Email 1's
// first sentence (the script's example only fits HVAC); noun = [customer].
export const VERTICALS: Record<string, { label: string; gap: string; season: string; noun: string; e1: string }> = {
  hvac: { label: "HVAC / plumbing / electrical", gap: "…they still lose the call to the guy with the wrapped van, because people have seen him.", season: "before next summer (pitch Feb–Apr)", noun: "customer", e1: "the one with the wrapped truck is still the one people have seen" },
  roofing: { label: "Roofing", gap: "…the storm hits, everybody Googles, and the roofer with a face on the screen gets the call.", season: "spring / storm season", noun: "roof", e1: "when the storm hits, the roofer with a face on the screen still gets the call" },
  pest: { label: "Pest control", gap: "…everybody signs the quarterly contract with the company they've seen, not the one with the best reviews.", season: "before mosquito season (Feb–Mar)", noun: "contract", e1: "the quarterly contract still goes to the company people have seen" },
  landscaping: { label: "Landscaping", gap: "…people scroll for weeks before they call, and a photo gallery doesn't move.", season: "before spring (Feb–Mar)", noun: "customer", e1: "people still scroll for weeks, and a photo gallery doesn't move them" },
  builders: { label: "Builders / remodeling", gap: "…a hundred-thousand-dollar decision, and they're making it off your Houzz photos.", season: "spring–early summer", noun: "build", e1: "people are still making a six-figure decision off your photos" },
  auto: { label: "Auto repair", gap: "…everybody's scared of getting ripped off, and the honest shop they've actually seen wins.", season: "year-round", noun: "customer", e1: "the honest shop people have actually seen is still the one that wins" },
  medspa: { label: "Med spa / aesthetics", gap: "…before-and-afters on a screen beat before-and-afters in a brochure, every time.", season: "before the holidays (Q4) / spring", noun: "patient", e1: "before-and-afters on a screen still beat the ones in a brochure" },
  law: { label: "Law", gap: "…the attorney they've seen is the attorney they trust, and right now that isn't you.", season: "year-round; PI is storm/holiday driven", noun: "client", e1: "the attorney people have seen is still the one they trust" },
  insurance: { label: "Insurance / financial", gap: "…renewal walks out the door to the agent who's a face, not a policy number.", season: "Q1", noun: "client", e1: "renewals still walk out the door to the agent who's a face" },
  local: { label: "Restaurant / salon / gym", gap: "…the seats/chairs/memberships you fill are the ones people saw first.", season: "Q4 into January; shoulder seasons", noun: "customer", e1: "the seats people fill are still at the places they saw first" },
  other: { label: "Other", gap: "…the business people have actually seen is the one that gets the call.", season: "—", noun: "customer", e1: "the business people have actually seen is still the one that gets the call" },
};

// --- Config (app_state.ops.__spotlight) --------------------------------------
// Defaults are the NEWEST document (Sep 19 call script). The Aug 21 agreement
// and invoice templates describe a different offer — see HANDOFF.md.
export const DEFAULT_AGREEMENT = `CHARLOTTE SPOTLIGHT VIDEO SERIES AGREEMENT

This Agreement ("the Agreement") is entered into between Emmanuel Impressions ("the Company") and the client specified below ("the Client"). It contains the entire understanding between the Company and the Client. All prior agreements, understandings, and representations, whether oral or written, are superseded by this Agreement. This Agreement may not be modified or amended except in writing executed by both parties.

1. CLIENT & SPOT
Client business name: {{business}}
Client contact name: {{contact}}
Email / phone: {{emailPhone}}
Spot number (1–10): {{spot}}      Tier (Feature / Community): {{tier}}
Total fee (per the published board): {{fee}}      Film date (set at close): {{filmDate}}

2. SCOPE OF SERVICES
Feature spots (1–4) include: (a) a dedicated video of approximately one minute, produced from on-site filming including an owner interview, delivered as a standalone commercial; (b) a segment of approximately 20–25 seconds featuring the Client, included in the season episode; (c) one promoted-distribution week for the Client's dedicated video on Meta platforms, media cost included; (d) inclusion in the season's promoted-distribution month; and (e) one post-season debrief session reviewing the promotion's delivered metrics.

Community spots (5–10) include: (a) a produced segment of approximately 15–20 seconds featuring the Client (no interview), included in the season episode and delivered as a standalone cut; (b) inclusion in the season's promoted-distribution month; and (c) one post-season debrief session reviewing the promotion's delivered metrics.

The season episode will include up to ten (10) businesses. Promotion metrics (including reach) depend on platform delivery and are not guaranteed; the Company's promotion obligations are defined by the media budgets it commits, not by any audience outcome.

3. PAYMENT
The full fee is due at booking. The Client's spot is assigned upon payment in full; unpaid spots remain available to other businesses. Refund terms are governed exclusively by Section 6.

4. SCHEDULING & FILMING
The Client's film date is scheduled at booking, at a time mutually agreed. The Client will make the filming location and, for Feature spots, the interviewed owner or representative available on the scheduled date. If the Client reschedules within 48 hours of the scheduled film date more than once, the Company may charge a rescheduling fee of $150.

5. APPROVAL & REVISIONS
The Client's standalone cut(s) will be delivered for approval before episode assembly. The Client is entitled to one (1) round of revisions per video, requested within five (5) days of delivery, limited to factual corrections, requested trims, and on-screen text changes. If no revision is requested within five (5) days of delivery, the cut is deemed approved. After the episode is assembled, revisions apply to standalone cuts only; the published episode is final. Creative direction, structure, and final cut remain with the Company.

6. SEASON FLOOR, ROLLOVER & REFUNDS
Filming is scheduled per Client at booking. If fewer than three (3) businesses have been filmed by October 10, 2026, the season-one episode will not be assembled, and: (a) Community-spot Clients may elect in writing either to roll their paid spot to the next season at the same position and price, or to receive a full refund within five (5) business days of election; (b) Feature-spot Clients retain their delivered dedicated video and promoted week, and their episode segment will be included in the next season's episode at no additional charge. Once the Client's film date is calendared, payments are otherwise non-refundable. Before the Client's film date, the Client may transfer their spot to another business with written notice to the Company.

7. COPYRIGHT & LICENSE
The Company retains all copyright and ownership of the videos produced under this Agreement, including the episode and all raw footage. Upon payment in full, the Company grants the Client a perpetual, non-exclusive, royalty-free license to use the Client's produced video(s) — including, for Feature spots, both the dedicated video and the episode segment's standalone cut — for the Client's own business marketing across any channel, including paid advertising. No additional fee applies to the Client's use of their own video(s). All music and third-party assets in the Client's video(s) are licensed for this use. This license does not extend to the full episode or to other businesses' segments, and may not be sold or transferred to a third party.

8. RESULTS REFERENCE & BOARD DISPLAY
The Client grants the Company permission to display the Client's business name on the season board upon booking, and to reference the Client's feature and its campaign metrics in the Company's marketing and case studies. The Client may opt out of either use with written notice.

9. INDEMNIFICATION
The Client is responsible for the accuracy of all claims, statements, and materials about the Client's business supplied for or appearing in the Client's video(s), and shall indemnify and hold harmless the Company from third-party claims arising from them. The Company is responsible for its production, its licensing of music and stock assets, and delivery of the Services as described in this Agreement.

10. GENERAL TERMS
This Agreement is governed by and construed in accordance with the laws of the State of North Carolina, and any disputes arising out of it shall be resolved in the jurisdiction of the State of North Carolina. If any provision is held unenforceable, the remainder of the Agreement remains in effect. This Agreement may be executed electronically.

11. SIGNATURES
By signing, the Client affirms that they have read, understood, and agreed to the terms contained herein. Typing your name below and accepting constitutes your electronic signature.`;

export type SpotlightConfig = {
  price: number; deposit: number; balance: number; perMonth: number;
  month: string;          // the slot month the sequence sells ("October"); roll forward each month
  episodeDate: string;    // spoken form, e.g. "October 1"
  episodeUrl: string;     // Email 6 + the examples objection, once it exists
  crewReelUrl: string;
  caller: string;         // who signs the emails and takes the calls
  callerPhone: string;
  autoSendQuestions: boolean;
  attorneyReviewed: boolean;
  agreementTemplate: string;
};
export const DEFAULT_CONFIG: SpotlightConfig = {
  price: 997, deposit: 250, balance: 747, perMonth: 10,
  month: "October", episodeDate: "October 1", episodeUrl: "", crewReelUrl: "",
  caller: "Emmanuel", callerPhone: "",
  autoSendQuestions: true, attorneyReviewed: false,
  agreementTemplate: DEFAULT_AGREEMENT,
};

export async function getConfig(admin: Admin, userId: string) {
  const { data } = await admin.from("app_state").select("ops").eq("user_id", userId).maybeSingle();
  const ops = (data?.ops || {}) as Record<string, unknown>;
  return { ...DEFAULT_CONFIG, ...((ops.__spotlight as Partial<SpotlightConfig>) || {}) } as SpotlightConfig;
}
export async function saveConfig(admin: Admin, userId: string, patch: Partial<SpotlightConfig>) {
  const { data } = await admin.from("app_state").select("ops").eq("user_id", userId).maybeSingle();
  const ops = (data?.ops || {}) as Record<string, unknown>;
  const next = { ...DEFAULT_CONFIG, ...((ops.__spotlight as object) || {}), ...patch };
  await admin.from("app_state").upsert({ user_id: userId, ops: { ...ops, __spotlight: next } }, { onConflict: "user_id" });
  return next as SpotlightConfig;
}

// --- Merge fields --------------------------------------------------------------
const money = (n: number) => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
const firstName = (p: Prospect) => (p.owner_name || "").trim().split(/\s+/)[0] || "";
const withArticle = (w: string) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w;

// Unfilled fields render as a visible [bracket]; send refuses while any remain.
export function mergeFields(p: Prospect, cfg: SpotlightConfig): Record<string, string> {
  const v = VERTICALS[p.vertical || ""] || null;
  const month = p.slot_month || cfg.month;
  return {
    firstName: firstName(p) || "[First name]",
    business: p.business || "[Business]",
    reviews: p.reviews != null ? String(p.reviews) : "[N]",
    years: p.years != null ? String(p.years) : "[X]",
    vertical: v && p.vertical !== "other" ? v.label.split(" /")[0].toLowerCase() : "[vertical]",
    suburb: p.suburb || "[suburb]",
    customer: v ? v.noun : "[customer]",
    e1Line: v ? v.e1 : "[the gap line for their vertical]",
    month, aMonth: withArticle(month),
    episodeDate: cfg.episodeDate || "[episode date]",
    episodeUrl: cfg.episodeUrl || "[episode link]",
    crewReelUrl: cfg.crewReelUrl || "[crew reel link]",
    price: money(cfg.price), deposit: money(cfg.deposit), balance: money(cfg.balance),
    caller: cfg.caller || "Emmanuel",
    callerPhone: cfg.callerPhone || "[phone]",
    ltv: "[LTV — from the Benchmarks tab; say 'industry average']",
    releaseDate: "[date you release the slot]",
    callDay: "[day the team calls]",
    shootPref: "[morning/afternoon]",
    callTime: "[day, time of the second call]",
    packageLine: "[the line for what they pivoted on — forward this / here's the team's work / here's the structure]",
    qLink: `${SITE}/spotlight/q/${p.q_token}`,
  };
}
export function fill(tpl: string, f: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in f ? f[k] : `[${k}]`));
}
export const unresolved = (s: string) => Array.from(new Set((s.match(/\[[^\]\n]{1,90}\]/g) || [])));

// --- Email templates -------------------------------------------------------------
// kind: cold = the 5-touch + episode arc (never auto-sent); warm = after a live
// conversation; member = transactional, to someone who has paid.
export type Template = { key: string; label: string; when: string; day?: number; kind: "cold" | "warm" | "member"; subject: string; body: string };
export const TEMPLATES: Template[] = [
  {
    key: "e1", label: "Email 1 — the gap", when: "Day 0", day: 0, kind: "cold",
    subject: "{{business}} — {{years}} years, no video",
    body: `{{firstName}} —

{{business}} has {{reviews}} Google reviews and {{years}} years in Charlotte, and {{e1Line}}. That's the gap Charlotte Spotlight exists for.

We film ten Charlotte businesses a month for a local series. Each one walks away with a fully produced commercial they own forever — a fraction of the $3,000–$5,000 you'd be quoted solo — and the series puts it in front of the city. First episode drops {{episodeDate}}.

Spots fill in order. If {{aMonth}} slot matters to {{business}}, reply "{{month}}" and I'll hold it for a fifteen-minute call.

— {{caller}}
Creative Impact · Charlotte`,
  },
  {
    key: "e2", label: "Email 2 — the quote in the inbox", when: "Day 3", day: 3, kind: "cold",
    subject: "The $4,000 quote you didn't answer",
    body: `Sounds like you've priced a commercial before — most owners with your reviews have. Somewhere there's a $3,000–$5,000 quote nobody acted on.

Here's why this one's different: ten businesses share the shoot week, so nobody pays the solo price. You get your own cut, fully produced, yours to run on Meta, YouTube, your site, a billboard on 485 if you want.

It usually runs about a thousand dollars — {{deposit}} holds a slot. Two to four days from the form to filming. No retainer. Nothing to renew.

Want the {{vertical}} slot for {{month}}? Reply "{{month}}" and I'll call you to hold it.

— {{caller}}`,
  },
  {
    key: "e3", label: "Email 3 — what the first ten get", when: "Day 7", day: 7, kind: "cold",
    subject: "What the first ten businesses get",
    body: `Straight answer, because you'd find out anyway: there is no Charlotte case study yet. Episode one drops {{episodeDate}}.

What that means for the ten businesses in it: they're the first ones the city sees, and they're getting in at the price that exists before the series has a track record. The team behind Creative Impact has produced over five hundred videos — this is the first time ten businesses can share one production.

Have you given up on getting {{business}} in front of Charlotte this year?

— {{caller}}`,
  },
  {
    key: "e4", label: "Email 4 — the math on one customer", when: "Day 10", day: 10, kind: "cold",
    subject: "The math on one new {{customer}}",
    body: `One new {{customer}} is worth roughly {{ltv}} to a {{vertical}} business over the life of the relationship. Industry average — not your books — but it's the right order of magnitude.

The commercial is about a thousand dollars — less than one of them. And it doesn't stop running after one.

That's the whole argument. Not 'exposure,' not 'brand awareness' — one customer who saw you before they called, and then another one.

Reply "math" and I'll send the {{vertical}} numbers and the slot that fits.

— {{caller}}`,
  },
  {
    key: "e5", label: "Email 5 — closing your slot", when: "Day 14", day: 14, kind: "cold",
    subject: "Giving your slot to the next {{vertical}}",
    body: `It seems like now isn't the time, and that's fine.

I'm giving the {{month}} {{vertical}} slot to the next business on the list on {{releaseDate}} unless I hear from you. Not a guilt trip — it's just how the ten fill.

If it's a no, reply "no." Genuinely useful; I'll stop. If it's "not {{month}}," tell me which month and I'll write it down and call you then.

— {{caller}}`,
  },
  {
    key: "e6", label: "Email 6 — Episode 1 is live", when: "When the episode posts", kind: "cold",
    subject: "Episode 1 is live — the first ten",
    body: `Episode 1 is live: {{episodeUrl}}

These are the ten who didn't wait. Next ten are being picked now — filming in {{month}}.

Still no? Reply "no." Worth a look? Reply "next ten."

— {{caller}}`,
  },
  {
    key: "postcall", label: "Post-call — after a pivot", when: "Within the hour of a live conversation", kind: "warm",
    subject: "{{business}} — what we covered",
    body: `Good talking, {{firstName}}. The whole thing in three lines: ten Charlotte businesses a month, you own the commercial forever, filmed two to four days from the form. {{price}} — {{deposit}} holds the slot, {{balance}} at filming.

{{packageLine}}

Our fifteen minutes: {{callTime}}. I'm holding the {{vertical}} slot until then.

— {{caller}}`,
  },
  {
    key: "confirm", label: "Confirmation — you're in", when: "Within the hour of a claimed slot", kind: "member",
    subject: "{{business}} — you're in",
    // Script line "Receipt attached." dropped — the OS doesn't attach one, and
    // saying so would be a false claim.
    body: `{{firstName}} — you're in. The {{vertical}} slot for {{month}} is yours.

What happens next: the team calls you {{callDay}} to lock the filming date — two to four days out, {{shootPref}} as you asked. Have three things ready: the story of how you started, the job you're proudest of, and the one thing customers say about you.

Deposit received: {{deposit}}. Balance at filming: {{balance}}.

— {{caller}}`,
  },
  {
    key: "questions", label: "Questions — before we film", when: "Automatically, when they become a member", kind: "member",
    subject: "{{business}} — before we film",
    body: `{{firstName}} —

You're in, and film day is coming. Think Diners, Drive-Ins and Dives: before the cameras walk in, we'd like to know the stories worth telling.

A handful of questions, no essays — a sentence or two each is plenty. Star the ones you'd most like to talk about on camera. Those are the ones we'll ask on film day, so nothing catches you off guard.

Your questions: {{qLink}}

Ten minutes now makes film day feel like a conversation instead of an interview.

— {{caller}}
Creative Impact · Charlotte`,
  },
];
export const templateByKey = (k: string) => TEMPLATES.find((t) => t.key === k);

export function render(p: Prospect, cfg: SpotlightConfig, key: string) {
  const t = templateByKey(key);
  if (!t) return null;
  const f = mergeFields(p, cfg);
  const subject = fill(t.subject, f);
  const body = fill(t.body, f);
  return { key, label: t.label, kind: t.kind, subject, body, unresolved: unresolved(subject + "\n" + body) };
}

// Next cold touch and when it's due, from the last touch sent (day offsets are
// relative to Email 1, per the script).
export function nextTouch(p: Prospect) {
  const cold = TEMPLATES.filter((t) => t.kind === "cold" && t.day != null);
  const next = cold[p.seq_step] || null; // seq_step = how many sent
  if (!next) return null;
  if (p.seq_step === 0 || !p.seq_last_at) return { key: next.key, label: next.label, due: null as string | null };
  const last = cold[p.seq_step - 1];
  const dueMs = new Date(p.seq_last_at).getTime() + ((next.day || 0) - (last.day || 0)) * 86400000;
  return { key: next.key, label: next.label, due: new Date(dueMs).toISOString().slice(0, 10) };
}

// --- The questionnaire (Diners, Drive-Ins and Dives, for businesses) ----------
export function coreQuestions(business: string): Question[] {
  const b = business || "the business";
  return [
    { id: "c1", core: true, q: `How did ${b} start — what was the moment you decided to do this yourself?`, why: "The origin story. Every feature opens here." },
    { id: "c2", core: true, q: "What's the job you're proudest of? Walk us through it like you're telling a friend.", why: "Your signature dish — the story the commercial is built around." },
    { id: "c3", core: true, q: "What do customers say about you that you'd never say about yourself?", why: "Proof in their words, not ours." },
    { id: "c4", core: true, q: "What happens behind the scenes that customers never get to see?", why: "The kitchen-door moment — the footage worth watching." },
    { id: "c5", core: true, q: "Who's on your team, and who should we meet on film day?", why: "Faces make it real. Tells us who belongs on camera." },
    { id: "c6", core: true, q: "What's one thing about your business most of Charlotte doesn't know yet?", why: "The line that makes a stranger stop scrolling." },
    { id: "c7", core: true, q: "If someone's on the fence about calling you, what should they know?", why: "The close of your commercial, in your words." },
  ];
}

async function claude(system: string, user: string, maxTokens = 900): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    const j = await r.json();
    if (j.error) { console.error("spotlight claude error", j.error); return null; }
    return (j.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
  } catch (e) { console.error("spotlight claude failed", e); return null; }
}
const firstJson = (s: string | null) => {
  if (!s) return null;
  const m = s.match(/[\[{][\s\S]*[\]}]/);
  try { return m ? JSON.parse(m[0]) : null; } catch { return null; }
};

// Core questions always; up to three tailored ones when we know something real
// about the business. Tailored questions may only lean on facts from the
// website profile or the operator's own notes — never on guesses.
export async function draftQuestions(p: Prospect): Promise<Question[]> {
  const core = coreQuestions(p.business);
  const facts = {
    business: p.business, vertical: VERTICALS[p.vertical || ""]?.label || p.vertical, suburb: p.suburb,
    years: p.years, notes: p.notes, website_profile: p.profile && Object.keys(p.profile).length ? p.profile : null,
  };
  if (!facts.website_profile && !p.notes) return core;
  const out = firstJson(await claude(
    `You write pre-shoot questions for Charlotte Spotlight, a local video series shot like Diners, Drive-Ins and Dives but for service businesses. You will be given what we know about one business. Write 3 short, warm, specific questions a host would ask this owner on camera — the kind that pull out a story, a process, or a point of pride. RULES: only reference facts present in the input; if a fact isn't there, don't imply it. No yes/no questions. No marketing jargon. Each under 25 words. Do not repeat these existing questions: ${core.map((c) => c.q).join(" | ")}. Return ONLY JSON: [{"q": "...", "why": "one short line on what this pulls out"}]`,
    JSON.stringify(facts),
    700,
  ));
  const tailored: Question[] = Array.isArray(out)
    ? out.filter((x) => x && typeof x.q === "string").slice(0, 3).map((x, i) => ({ id: `t${i + 1}`, q: String(x.q).slice(0, 240), why: x.why ? String(x.why).slice(0, 160) : "Specific to this business." }))
    : [];
  return [...core, ...tailored];
}

// --- Website import -------------------------------------------------------------
// Operator-only (the API route is session-gated). Blocks obvious internal
// targets; this is not a full SSRF defence (no DNS-rebinding check), which is
// acceptable for a single-operator tool behind login.
const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd][0-9a-f]{2}:|\[?fe80:)/i;
function safeUrl(raw: string): URL | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (PRIVATE_HOST.test(u.hostname) || !u.hostname.includes(".")) return null;
  return u;
}
async function fetchPage(u: URL): Promise<{ url: string; html: string } | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(u.toString(), { signal: ctl.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (CreativeImpactOS spotlight import)", accept: "text/html" } });
    const final = safeUrl(r.url || u.toString());
    if (!r.ok || !final) return null;
    const buf = await r.arrayBuffer();
    return { url: final.toString(), html: Buffer.from(buf.slice(0, 1_500_000)).toString("utf8") };
  } catch { return null; } finally { clearTimeout(t); }
}
function htmlToText(html: string) {
  const meta = (name: string) => (html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)`, "i")) || [])[1] || "";
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
  const body = html
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|&apos;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  return `TITLE: ${title.trim()}\nDESCRIPTION: ${meta("description") || meta("og:description")}\nSITE NAME: ${meta("og:site_name")}\n\n${body}`.slice(0, 22000);
}

export async function importWebsite(raw: string) {
  const u = safeUrl(raw);
  if (!u) return { ok: false as const, error: "That doesn't look like a public website address." };
  const home = await fetchPage(u);
  if (!home) return { ok: false as const, error: "Couldn't load that site (it may block automated visits, or be down)." };
  const pages = [home];
  // One more page if there's an obvious About/Story/Team link on the same host.
  const host = new URL(home.url).hostname;
  const link = Array.from(home.html.matchAll(/href=["']([^"'#]+)["'][^>]*>([\s\S]{0,80}?)<\/a>/gi))
    .map((m) => { try { return { url: new URL(m[1], home.url), text: m[2] }; } catch { return null; } })
    .find((l) => l && l.url.hostname === host && /about|story|who-we-are|our-team|meet/i.test(l.url.pathname + " " + l.text));
  if (link) { const about = await fetchPage(link.url); if (about) pages.push(about); }

  const text = pages.map((p) => `=== ${p.url} ===\n${htmlToText(p.html)}`).join("\n\n");
  const out = firstJson(await claude(
    `Extract facts about a local business from its own website text. Return ONLY JSON with these keys: business_name, owner_name, vertical (one of: hvac, roofing, pest, landscaping, builders, auto, medspa, law, insurance, local, other), services (array of short strings), city_or_suburb, founded_year (number or null), years_in_business (number or null), phone, email, story_hooks (array: things a documentary host would ask about — origin, family, milestones, specialties), notable_facts (array: awards, certifications, community work, numbers stated on the site), summary (2 sentences). RULES: use null or [] when the site doesn't say it. Never guess or infer beyond the text. Owner name only if the site names the owner/founder.`,
    text, 1200,
  ));
  if (!out || typeof out !== "object") return { ok: false as const, error: "Loaded the site but couldn't read it (is ANTHROPIC_API_KEY set?)." };
  return { ok: true as const, profile: { ...out, source_urls: pages.map((p) => p.url), imported_at: new Date().toISOString() } };
}

// --- Money, paper, membership ---------------------------------------------------------
export async function ensureClient(admin: Admin, p: Prospect) {
  if (p.client_id) return p.client_id;
  let id: string | null = null;
  if (p.email) {
    const { data } = await admin.from("clients").select("id").eq("user_id", p.user_id).ilike("email", p.email).limit(1).maybeSingle();
    id = data?.id || null;
  }
  if (!id) {
    const { data } = await admin.from("clients").insert({
      user_id: p.user_id, name: p.business || p.owner_name || "Spotlight prospect", contact_name: p.owner_name, email: p.email, phone: p.phone,
      industry: VERTICALS[p.vertical || ""]?.label || p.vertical, status: "Lead", source: "Charlotte Spotlight",
      notes: p.website ? `Website: ${p.website}` : null,
    }).select("id").maybeSingle();
    id = data?.id || null;
  }
  if (id) await admin.from("spotlight_prospects").update({ client_id: id }).eq("id", p.id);
  return id;
}

export async function createInvoice(admin: Admin, p: Prospect, cfg: SpotlightConfig, kind: "deposit" | "balance") {
  const amount = kind === "deposit" ? cfg.deposit : cfg.balance;
  if (!(amount > 0)) return { ok: false as const, error: `No ${kind} amount set in Spotlight settings.` };
  const clientId = await ensureClient(admin, p);
  const { count } = await admin.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", p.user_id);
  const number = "INV-" + String((count || 0) + 1).padStart(4, "0");
  const title = `Charlotte Spotlight — ${p.business} — ${kind === "deposit" ? "slot deposit" : "balance at filming"}`;
  const desc = kind === "deposit" ? `Charlotte Spotlight slot deposit — holds the ${p.slot_month || cfg.month} slot` : `Charlotte Spotlight — balance due at filming`;
  const { data, error } = await admin.from("invoices").insert({
    user_id: p.user_id, client_id: clientId, number, title,
    items: [{ desc, qty: 1, unit_cents: Math.round(amount * 100) }],
    amount_cents: Math.round(amount * 100), status: "sent",
    notes: `Charlotte Spotlight ${kind}. Total slot price ${money(cfg.price)}.`,
  }).select("id,token").maybeSingle();
  if (error || !data) return { ok: false as const, error: error?.message || "invoice failed" };
  await admin.from("spotlight_prospects").update(kind === "deposit" ? { deposit_invoice_id: data.id } : { balance_invoice_id: data.id }).eq("id", p.id);
  return { ok: true as const, number, link: `${SITE}/pay/${data.token}` };
}

export function agreementText(p: Prospect, cfg: SpotlightConfig) {
  const f: Record<string, string> = {
    business: p.business || "[Business]",
    contact: p.owner_name || "[Contact name]",
    emailPhone: [p.email, p.phone].filter(Boolean).join(" / ") || "[Email / phone]",
    fee: money(cfg.price),
    filmDate: p.film_date || "[Film date]",
    month: p.slot_month || cfg.month,
    deposit: money(cfg.deposit), balance: money(cfg.balance),
  };
  const text = fill(cfg.agreementTemplate || DEFAULT_AGREEMENT, f);
  return { text, unresolved: unresolved(text) };
}

export async function createAgreement(admin: Admin, p: Prospect, cfg: SpotlightConfig) {
  if (!cfg.attorneyReviewed) return { ok: false as const, error: "The agreement template hasn't been marked attorney-reviewed. Your own template says: REQUIRED BEFORE FIRST USE. Tick it in Spotlight → Settings once the NC attorney pass is done." };
  const { text, unresolved: missing } = agreementText(p, cfg);
  if (missing.length) return { ok: false as const, error: `The agreement still has blanks it can't fill: ${missing.join(", ")}. Fill them on the prospect (e.g. film date) or update the template in Settings.` };
  const clientId = await ensureClient(admin, p);
  const { count } = await admin.from("proposals").select("id", { count: "exact", head: true }).eq("user_id", p.user_id);
  const number = "PRO-" + String((count || 0) + 1).padStart(4, "0");
  const { data, error } = await admin.from("proposals").insert({
    user_id: p.user_id, client_id: clientId, number,
    title: `Charlotte Spotlight — ${p.business}`,
    intro: `Your Charlotte Spotlight agreement for the ${p.slot_month || cfg.month} slot. Read it through, then type your name to sign.`,
    items: [{ desc: `Charlotte Spotlight — ${p.slot_month || cfg.month} slot`, qty: 1, unit_cents: Math.round(cfg.price * 100) }],
    amount_cents: Math.round(cfg.price * 100), terms: text, status: "sent",
  }).select("id,token").maybeSingle();
  if (error || !data) return { ok: false as const, error: error?.message || "agreement failed" };
  await admin.from("spotlight_prospects").update({ agreement_id: data.id }).eq("id", p.id);
  return { ok: true as const, number, link: `${SITE}/proposal/${data.token}` };
}

async function logLine(admin: Admin, userId: string, message: string) {
  await admin.from("log_entries").insert({ user_id: userId, tag: "CS", color: "var(--gold)", message: message.slice(0, 200) });
}

export async function sendTemplate(admin: Admin, p: Prospect, cfg: SpotlightConfig, key: string, subject: string, body: string) {
  if (!p.email) return { ok: false as const, error: `${p.business} has no email on file.` };
  const missing = unresolved(subject + "\n" + body);
  if (missing.length) return { ok: false as const, error: `Fill these before sending: ${missing.join(", ")}` };
  const r = await sendEmail({ to: p.email, from: personaFrom(cfg.caller), subject, text: body });
  if (!r.ok) return { ok: false as const, error: ("error" in r && r.error) || ("skipped" in r ? "Email isn't configured (RESEND_API_KEY)." : "Send failed.") };
  const t = templateByKey(key);
  const patch: Record<string, unknown> = {};
  if (t?.kind === "cold" && t.day != null) {
    const idx = TEMPLATES.filter((x) => x.kind === "cold" && x.day != null).findIndex((x) => x.key === key);
    patch.seq_step = Math.max(p.seq_step, idx + 1);
    patch.seq_last_at = new Date().toISOString();
    if (p.stage === "prospect") { patch.stage = "contacted"; patch.stage_at = new Date().toISOString(); }
  }
  if (key === "questions") patch.q_sent_at = new Date().toISOString();
  if (Object.keys(patch).length) await admin.from("spotlight_prospects").update(patch).eq("id", p.id);
  await logLine(admin, p.user_id, `spotlight · ${t?.label || key} → ${p.business}`);
  return { ok: true as const };
}

// Becoming a member: stamp it, draft the questions if there aren't any, and —
// if the toggle is on — send them. Safe to call more than once.
export async function makeMember(admin: Admin, p: Prospect) {
  const cfg = await getConfig(admin, p.user_id);
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { stage: "member", stage_at: now };
  if (!p.member_at) patch.member_at = now;
  let questions = p.questions;
  if (!questions || !questions.length) { questions = await draftQuestions(p); patch.questions = questions; }
  await admin.from("spotlight_prospects").update(patch).eq("id", p.id);
  await logLine(admin, p.user_id, `spotlight · ${p.business} is a MEMBER`);
  const fresh = { ...p, ...patch, questions } as Prospect;
  if (cfg.autoSendQuestions && p.email && !p.q_sent_at) {
    const r = render(fresh, cfg, "questions");
    if (r && !r.unresolved.length) return { member: true, questions: await sendTemplate(admin, fresh, cfg, "questions", r.subject, r.body) };
    return { member: true, questions: { ok: false as const, error: r ? `Questions not sent — fill: ${r.unresolved.join(", ")}` : "no template" } };
  }
  return { member: true, questions: null };
}

// Hook for /api/confirm: a paid Spotlight deposit makes them a member.
export async function onInvoicePaid(admin: Admin, invoiceToken: string) {
  const { data: inv } = await admin.from("invoices").select("id").eq("token", invoiceToken).maybeSingle();
  if (!inv) return;
  const { data: rows, error } = await admin.from("spotlight_prospects").select("*").eq("deposit_invoice_id", inv.id);
  if (error || !rows?.length) return; // not a Spotlight deposit, or migration 22 not run
  for (const p of rows as Prospect[]) if (PRE_MEMBER.includes(p.stage)) await makeMember(admin, p);
}

// Belt-and-braces for a missed redirect: promote anyone whose deposit is paid.
export async function reconcilePaidDeposits(admin: Admin, userId: string, rows: Prospect[]) {
  const ids = rows.filter((p) => p.deposit_invoice_id && PRE_MEMBER.includes(p.stage)).map((p) => p.deposit_invoice_id as string);
  if (!ids.length) return 0;
  const { data: paid } = await admin.from("invoices").select("id").in("id", ids).eq("status", "paid");
  const set = new Set((paid || []).map((x) => x.id));
  let n = 0;
  for (const p of rows) if (p.deposit_invoice_id && set.has(p.deposit_invoice_id) && PRE_MEMBER.includes(p.stage)) { await makeMember(admin, p); n++; }
  return n;
}
