# Authority Clarity Engine ⇄ Authority Diagnostic — Integration Spec

Addendum to SPEC.md. The Authority Clarity Engine (free, React/Supabase, board-of-four interview, PDF output, live at cmclarityengine.lovable.app) becomes the top rung of the ladder this build monetizes:

**FREE — Clarity Engine** (names the positioning problem, qualitatively)
→ **$750 — Authority Diagnostic** (prices the leak against the real ad account, prescribes the fix)
→ **RETAINER — Authority Engine $3,500/mo / Authority System $5,000/mo** (builds it; Diagnostic credits toward month one)

Pricing law holds at every rung: the Clarity Engine never discounts or credits into the Diagnostic. It's free because it's marketing; the Diagnostic is $750 flat because the report is the deal.

---

## §0. DECISIONS FOR BRANDON (confirm before Claude Code wires anything)

1. **Where the Clarity Engine lives.** Recommended: **Phase 1 — keep the Lovable app live, sync its sessions into the OS** (webhook or repointed Supabase, §2). **Phase 2 — port it into the OS PWA at `/clarity`** and 301 the Lovable domain. Reason: OS-owns-data can't tolerate the top of the funnel living in a database the OS can't see, but porting the UI shouldn't block Diagnostic MVP.
2. **The free read stays qualitative.** The Clarity Engine gives the board's read in band language only — it never prints the 0–100 Authority Score. The number is paid. If the free tool hands out the score, Section 01 of the paid report loses its punch. Confirm this is the intended split.
3. **Prefill is opt-in, matched on email.** When a Diagnostic buyer's email matches a Clarity session, the intake offers: "We found your Clarity Engine answers — prefill?" Never silent, never assumed (people's positioning answers go stale, and a stale prefill poisons the report).

---

## §1. DATA MODEL (add to schema.sql)

```sql
create table clarity_sessions (
  id                       uuid primary key default gen_random_uuid(),
  email                    text,                    -- normalized lowercase; nullable if tool allows anonymous runs
  answers                  jsonb not null,          -- full interview payload from the board-of-four
  board_read               jsonb,                   -- the generated read/result the tool produced
  pdf_path                 text,
  source                   text not null default 'lovable',  -- 'lovable' | 'os_pwa' (Phase 2)
  external_id              text unique,             -- the Lovable-side session id, for idempotent sync
  converted_diagnostic_id  uuid references diagnostics(id),
  created_at               timestamptz not null default now()
);
create index on clarity_sessions (lower(email));

alter table diagnostics add column clarity_session_id uuid references clarity_sessions(id);
```

Funnel events land in the existing events pattern: `clarity_completed`, `clarity_upsell_click`, `clarity_prefill_offered`, `clarity_prefill_accepted`.

## §2. SYNC (Phase 1 — Claude Code picks A or B after inspecting the Lovable project)

- **Option A (preferred if clean):** repoint the Lovable app's Supabase client at the Creative Impact OS Supabase project, writing straight into `clarity_sessions`. One database, zero sync code.
- **Option B (fallback):** `POST /api/clarity/ingest` on the OS — signed webhook from the Lovable app on session completion, idempotent on `external_id`. Backfill existing sessions with a one-time export script.
- **First Claude Code task either way:** introspect the live Clarity Engine schema, produce the concrete field map (their answer keys → `answers` jsonb shape → intake prefill targets in §3), and confirm the map with Brandon before wiring. **Do not guess the board-of-four's field names — read them.**

## §3. INTAKE PREFILL (the completion-rate lever)

Intake completion is the funnel's one number to watch; prefill is how we move it. On intake load, if `diagnostics.clarity_session_id` is set (matched at checkout by email):

| Intake field | Prefill from Clarity session |
|---|---|
| Step 1 — business name, industry, market, website | direct map |
| Step 3 — current opening line, current CTA | map if the interview captured them |
| Step 4 — "why pick us," proof points, ideal customer, biggest objection | map from the board interview (these are its core questions) |
| **Step 2 — ad account raw numbers** | **NEVER prefills.** Metrics must be fresh, same date range, same scope. No exceptions. |

Prefilled fields render with a tag — *"From your Clarity Engine session on [date] — edit anything that's changed"* — and count as untouched until the client confirms the step. Expected effect: intake drops from ~12 min to ~6–7 for Clarity-sourced buyers. Track `clarity_prefill_accepted` vs. edited-rate per field; heavily-edited fields mean the Clarity interview question needs sharpening.

## §4. AGENT ENRICHMENT

When a linked session exists, the diagnostic agent receives it as additional context: the raw interview answers AND the board's read. Uses:
- **Authority Score evidence** — the interview answers are direct evidence for factors 1–4 (problem-first, proof, swap test, offer friction). Richer evidence, tighter scores.
- **Continuity beats** — the report may reference the free read where it earns trust: *"When you ran the Clarity Engine in March, the board flagged that your positioning leaned on years-in-business. Your ad account confirms what that costs: a 16% hook rate."* Free read → paid proof is the brand promise compounding.
- **Contradiction flags** — where intake answers contradict the Clarity session (positioning changed, new offer), the agent notes it in `internal_notes` for Brandon, not the client report.

## §5. UPSELL SURFACES (where the free tool sells the paid one)

One CTA per surface, approved patterns only, price on the page.

**A. Clarity Engine results screen + final PDF page** — after the board's read:

> **The board just told you what's off. The Diagnostic tells you what it's costing.**
> The Clarity Engine reads your positioning from what you told us. The Authority Diagnostic reads your actual ad account against benchmark — every metric, the leak located, the fixes in priority order, and the math on what fixing it is worth. In writing, for $750. No call required to find out the price. This is the price.
> **→ Get the read on your ad account — $750, report in your hands in 5 business days.** [CHECKOUT_LINK]

**B. Post-Clarity email (E0 — fires on `clarity_completed`, +24h):**

> **Subject:** Your Clarity read is the diagnosis. Here's the price tag on the disease.
>
> Yesterday the board gave you the read on your positioning. Fair warning about what usually happens next: nothing. The read gets filed, the same ads keep running, and the same leak keeps draining.
>
> Here's the alternative. The Authority Diagnostic takes what the board saw and runs it against your actual ad account — your spend, your hook rate, your cost per lead, read against benchmark. You get the leak located, the fixes ranked by impact per dollar, and the math on what the fix is worth. In writing, $750, no discovery call standing between you and the price.
>
> Everything in the report is yours to run with — plenty of people take it and never talk to us again. That was the deal.
>
> **→ Turn the read into the fix list — $750, report in 5 business days.** [CHECKOUT_LINK]
>
> — Brandon · Creative Impact · hello@creativeimpactmedia.co

**C. Reverse direction:** the Diagnostic offer page links the free Clarity Engine for cold traffic that isn't ready for $750 — the ladder works both ways, but the page never leads with the free tool (don't downsell the visitor who arrived ready to buy).

## §6. FUNNEL SCOREBOARD (admin dashboard tile)

- Clarity sessions completed /mo
- Clarity → Diagnostic checkout % (the new top-of-funnel number)
- Prefill acceptance % and per-field edit rate
- Diagnostic → retainer conversion % inside the credit window

## §7. PHASE PLACEMENT

- **Phase 1 additions:** `clarity_sessions` table + sync (A or B) + email match at checkout + prefill + E0 + upsell block on the Lovable results page (copy above, minimal edit to the Lovable app).
- **Phase 2:** port the Clarity Engine UI into the OS PWA at `/clarity`, retire Lovable, 301 the domain; agent enrichment continuity beats; funnel scoreboard tile.
