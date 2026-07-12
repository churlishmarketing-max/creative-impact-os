# AUTHORITY DIAGNOSTIC — Creative Impact OS Build Spec

**Version 1.0 — July 7, 2026**
**For: Claude Code, building inside the Creative Impact OS repo (Next.js / Supabase / Claude Agent SDK / Stripe / Documenso / Postiz)**

Read this file first. Then read, in order: `scoring-engine.md`, `intake-form.md`, `report-blueprint.md`, `schema.sql`, `emails.md`. `README.md` has the build order and phase gates.

---

## 0. ASSUMPTIONS (Brandon: confirm or correct these — everything else is locked)

1. **Credit window:** The $750 Diagnostic credits toward the first month of Authority Engine or Authority System if the client signs within **90 days** of report delivery. (Sample report says "credits toward your first month" but no window — 90 days assumed.)
2. **Analysis trigger:** Agent analysis auto-fires when intake hits `intake_complete`. Nothing client-facing ships without Brandon's approval (HITL gate is hard-coded).
3. **Reasoning owner:** The diagnostic agent is a new OS-native agent job. If Brandon wants **Huntress** (Revenue Leak Sweep) to own this reasoning layer instead, the agent runner is a single module swap — the contract is identical.
4. **Phase 1 metric source is manual raw-number entry** (with screenshot upload as backup evidence). Meta API connection is Phase 3, not MVP.
5. **Delivery surface:** Report lives in the client dashboard (PWA) with PDF export. Email carries the link, not the PDF attachment.

---

## 1. WHAT THIS IS

The Authority Diagnostic is Creative Impact's $750 paid front-end offer: a written read on where a prospect's authority positioning and ad spend are leaking money, plus the prioritized fix. Price is public. No discovery call required. The report either converts them into Authority Engine ($3,500/mo, 4-mo min) or Authority System ($5,000/mo, 6-mo min) — or it stands alone and they walk with their money's worth. Both outcomes are wins; the report is the brand promise in physical form: **proof before promise, the problem named before the pitch.**

This build turns the Diagnostic from a hand-run engagement into a Creative Impact OS product line: checkout → intake → analysis → review → delivery → follow-up, with Brandon touching exactly one gate (report approval).

**The architectural law (do not violate):**
- **Creative Impact OS owns data** — intake payloads, raw metrics, computed scores, benchmark configs, report JSON, audit events. All in Supabase. Benchmarks are *rows, not code*.
- **EVE agents own reasoning** — the diagnostic agent (Claude Agent SDK) reads OS data + the scoring law and writes report JSON back. It never writes directly to a client-visible surface.
- **PWA surfaces own eyeballs** — the intake form, the admin pipeline board, the client report view. Surfaces render OS data; they contain zero scoring logic.

---

## 2. THE PIPELINE (status machine)

```
created → paid → intake_sent → intake_in_progress → intake_complete
        → analyzing → draft_ready → in_review → approved
        → delivered → follow_up → converted | closed
```

| Transition | Trigger | Side effects |
|---|---|---|
| created → paid | Stripe webhook `checkout.session.completed` | Create client record if new; send intake email (token link); status → intake_sent |
| intake_sent → intake_in_progress | First intake save | Autosave every step |
| intake_in_progress → intake_complete | Client submits final step | Validate; compute derived metrics (see `scoring-engine.md` §1); notify admin |
| intake_complete → analyzing | Auto (Assumption 2) | Enqueue agent run with `trace_id` |
| analyzing → draft_ready | Agent run returns valid report JSON | Notify Brandon (admin + optional Slack via existing OS notifier) |
| draft_ready → in_review | Brandon opens report editor | — |
| in_review → approved | Brandon clicks Approve | Lock report version; render PDF |
| approved → delivered | Delivery job | Client dashboard unlock + delivery email; start follow-up sequence; start 90-day credit clock |
| delivered → converted | Engine/System agreement signed (Documenso hook) | Apply $750 credit to first invoice line (see §6) |
| delivered → closed | 90-day clock expires or manual close | End sequence |

Every transition writes a `diagnostic_events` row with `trace_id`, actor (`client` / `agent` / `brandon` / `system`), and payload snapshot. This is the same contract standard as the rest of the EVE fleet: HITL gates + trace IDs, no silent state changes.

**Kill-state honesty rule (Fable Law 9):** If intake data is too thin to diagnose (e.g., no ad account, no spend history), the agent does NOT fabricate a read. It returns `status: insufficient_data` with the specific gaps, and the admin board surfaces a "Partial Diagnostic" path: Brandon decides whether to request more data or deliver a positioning-only report at the same price with the ads section explicitly marked "no ad history to read — here's what we'd measure first."

---

## 3. SURFACES

### 3.1 Public offer page — `/diagnostic`
Not a marketing site rebuild — one page in the OS PWA (or linked from creativeimpactmedia.co) with:
- The offer in call-out voice (see `report-blueprint.md` §5 for voice law)
- **The price on the page. $750. No call required to find out the price. This is the price.**
- The sample report (the Summit Comfort PDF) embedded/linked as proof
- One CTA (approved pattern, see `scoring-engine.md` §5): **"Get the read on your ad account — $750, report in your hands in 5 business days."**
- Stripe checkout button → `POST /api/diagnostic/checkout`

### 3.2 Intake form — `/diagnostic/[id]/intake?token=…`
Token-gated (single-use signed token from the intake email; no login required — friction kills paid intakes). Full spec in `intake-form.md`. Multi-step, autosaving, mobile-first. Raw numbers only — the OS computes every ratio.

### 3.3 Admin pipeline board — `/admin/diagnostics`
Kanban by status. Card = business name, days in status, CPL headline once computed, trace link. Detail view:
- Intake payload (readable, not raw JSON)
- Computed metrics vs. benchmark (the §02 table pre-rendered)
- **Report editor:** block-based (reuse the Creative Impact OS block editor) — every report section is editable before approval. Approve button = the HITL gate.
- Event timeline (audit trail)

### 3.4 Client report view — `/dashboard/diagnostic/[id]`
Renders approved report JSON as the branded HTML report (visual tokens in `report-blueprint.md` §6). PDF download button (server-rendered from the same JSON — one source of truth, two renders). Below the report: the two-ways-forward block with the Engine/System paths and the live credit-window countdown.

---

## 4. THE AGENT RUN (Claude Agent SDK)

One job: `runDiagnostic(diagnosticId, traceId)`.

**Inputs (assembled by the OS, passed as structured context):**
1. Intake payload (normalized)
2. Computed metrics (OS-calculated — the agent never computes ratios itself; Fable Law 6, denominators must match)
3. Benchmark config row (default or industry override) — from `benchmark_configs`
4. The scoring law — `scoring-engine.md` contents (ship it as an agent resource file)
5. The report contract — `report-blueprint.md` contents
6. Fetched website copy: the OS fetches the client's homepage + landing page server-side and passes extracted text (standing rule: fetch client URLs before building)

**Agent responsibilities:**
1. Score the Authority Score rubric (5 factors × 20, anchored — `scoring-engine.md` §3) with a one-line justification per factor
2. Place the account on both diagnostic matrices; apply the frequency override
3. Write every report section per the blueprint contract — including the before/after opening-line rewrite and the projection math with stated assumptions
4. Run the adversary pass on its own draft (Fable Law 3): one paragraph of "what a skeptical owner would push back on," attached as an internal note for Brandon, not in the client report
5. Flag every claim that lacks intake evidence (`confidence: low`) so Brandon sees soft spots in review

**Output:** `report JSON` conforming to the schema in `report-blueprint.md` §7, plus `internal_notes`, `data_gaps[]`, `confidence_flags[]`. Validate against the JSON schema before writing `draft_ready`; a malformed return re-runs once, then fails loudly to the admin board.

**Hard rules for the agent (embed in the system prompt):**
- Every finding carries a number, a range, or a date. A finding without a number gets cut or quantified.
- Read metric pairs, never single metrics. The matrices drive the prescription.
- No fabricated proof, no invented client results, no guessed industry stats. Missing data is named as missing.
- All copy passes the voice law (banned words, banned CTAs, call-out arc). If a generated CTA is on the banned list, the run fails validation.
- The report should hurt a little and help a lot. If nothing stings, the analysis failed; if nothing is actionable Monday morning, it also failed.

---

## 5. STRIPE

- One-time Product: **Authority Diagnostic — $750**. Metadata: `product=authority_diagnostic`.
- Checkout Session via `POST /api/diagnostic/checkout` (collect name, email, business name in Stripe or on a pre-checkout step — pre-checkout preferred so the OS owns the record before payment).
- Webhook (`checkout.session.completed`) is the *only* writer of `paid` status.
- **Credit mechanic:** on conversion, the first Engine/System invoice gets a line item `Authority Diagnostic credit — −$750`, referencing the diagnostic ID. Standing rules still apply: **never discount month one** (this is a credit for money already paid, not a discount — keep that language exact everywhere), and **ad spend is separate, $500/mo minimum**, never creditable.
- Refund path: manual only, admin action, writes an event, closes the diagnostic.

## 6. DOCUMENSO + POSTIZ HOOKS

- **Documenso:** when an Engine/System agreement referencing a diagnostic ID completes, fire `delivered → converted` and the credit line. Phase 2 wiring; Phase 1 is a manual "Mark converted" admin button.
- **Postiz:** none in the client pipeline. Optional Phase 3: an internal prompt when a report ships — "anonymized finding worth a content post?" — feeding the Creative Impact content engine. Never auto-post client data; standing rule: no client names externally without explicit permission.

## 7. NON-NEGOTIABLES (carry into every file, every prompt, every template)

- Contact email everywhere: **hello@creativeimpactmedia.co** — never brandon@.
- Pricing law: Diagnostic $750 · Lite $1,750/mo (3-mo min) · Engine $3,500/mo (4-mo min) · System $5,000/mo (6-mo min). Never discount first month. Ad spend separate, $500/mo min.
- Visual law: cream `#F0EDE8` backgrounds, teal `#007A87` workhorse accent, red `#C41E3A` **single use per composition**, gold `#C8960A` dividers, Barlow Condensed 900 display (web), Arial Black (docx).
- Voice law + banned words + banned CTAs: `report-blueprint.md` §5 and `scoring-engine.md` §5. These validate at build time, not just in review.
- EVE branding: Creative Impact only. Never Dynamic Edge.
- No placeholders in anything client-visible. The system either has the content or names the gap honestly.

## 8. DEFINITION OF DONE (Phase 1)

- [ ] Stripe checkout → paid diagnostic record → intake email, end to end on test mode
- [ ] Intake form completes on mobile, autosaves, computes all 10 derived metrics correctly against a hand-checked fixture (use the Summit Comfort numbers: spend $3,000, 21 leads → CPL $142; 16% hook; 9% hold; 0.6% link CTR; 4.2 freq; 22% opt-in)
- [ ] Agent run on the Summit Comfort fixture produces a report that Brandon reads as "I could send this" — matrix placement correct (Hook Rate *Fair* × Efficiency *Poor* → rework hook AND CTA; frequency 4.2 → refresh override fires)
- [ ] HITL gate blocks delivery pre-approval — verified by attempting to hit the client report URL pre-approval (must 404/403)
- [ ] PDF renders from approved JSON with correct visual tokens
- [ ] Delivery email sends with approved CTA, hello@ signature
- [ ] Every state transition writes an event with trace_id
- [ ] Banned-word/banned-CTA validator rejects a seeded bad report in tests
