# Authority Diagnostic — Claude Code Build Package

Drop this folder into the Creative Impact OS repo at `docs/authority-diagnostic/` and also drop the sample PDF at `docs/authority-diagnostic/reference/Authority_Diagnostic_Sample.pdf` (the agent and the report renderer both use it as the canonical reference).

## Kickoff prompt for Claude Code

> Read everything in `docs/authority-diagnostic/` — SPEC.md first, then scoring-engine.md, intake-form.md, report-blueprint.md, schema.sql, emails.md, clarity-engine-integration.md. Build Phase 1 of the Authority Diagnostic per SPEC.md, inside the existing Creative Impact OS conventions (existing block editor, existing client/auth model, existing mailer, existing admin shell). Confirm the assumptions in SPEC.md §0 with me before writing the Stripe or credit code. The Definition of Done in SPEC.md §8 is the acceptance test — including the Summit Comfort fixture.

## Build order (Phase 1 — MVP)

1. **Schema + seed** — run `schema.sql`, wire to existing `clients`. Benchmark configs seeded.
2. **Metric engine** — pure functions: raw → computed → ratings → matrix cells → action. Unit-test against the Summit Comfort fixture (spend 3000, leads 21, impressions/reach/plays derived to hit 16% hook, 0.6% link CTR, 4.2 frequency, 22% opt-in → expect CPL 142.86, Matrix 1 fair-hook × poor-efficiency, freq override TRUE, action REFRESH).
3. **Stripe** — product, checkout route, webhook → `paid` → intake email E1.
4. **Intake form** — per intake-form.md. Token flow, autosave, soft validation, submit → compute → enqueue.
5. **Agent runner** — Claude Agent SDK job per SPEC.md §4. Resources: scoring-engine.md + report-blueprint.md shipped verbatim. Output validated (zod schema from blueprint §7) + banned-word/banned-CTA validator.
6. **Admin board + report editor** — pipeline kanban, detail view, block-editing of report JSON, Approve gate.
7. **Client report view + PDF** — one JSON, two renders, visual tokens per blueprint §6V.
8. **Delivery + events** — E4 on deliver, credit clock, full audit trail.
9. **Reminder/follow-up jobs** — E2/E3/E5/E6/E7 on schedule; day-10 admin flag.
10. **Clarity Engine hookup** — per clarity-engine-integration.md: introspect the live Lovable schema FIRST, confirm the field map with Brandon, then `clarity_sessions` + sync (Option A or B) + email match at checkout + opt-in prefill + E0 + upsell block on the Clarity results page. Step 2 raw metrics never prefill.

## Phase 2
- Port the Clarity Engine into the OS PWA at `/clarity`; retire Lovable, 301 the domain; funnel scoreboard tile (clarity-engine-integration.md §6–7)
- Screenshot metric extraction (vision pass over intake uploads → prefill raw fields for admin confirmation — never auto-trusted)
- Benchmark override editor in admin
- Documenso webhook → auto `converted` + Stripe credit line item
- Partial-diagnostic (insufficient-data) admin path per SPEC §2

## Phase 3
- Meta Marketing API connection for direct metric pulls
- Public `/diagnostic` offer page with embedded sample report
- Postiz content-idea prompt on ship (internal, anonymized, opt-in per report)

## What Claude Code must NOT do
- Compute ratios anywhere except the metric engine (one implementation, unit-tested)
- Let any agent output reach a client surface without `is_approved = true`
- Hardcode a benchmark number — they're rows
- Ship any CTA or copy containing the banned lists (validators in scoring-engine.md §5 and report-blueprint.md §5V run in CI)
- Use brandon@ anywhere, or the words Dynamic Edge anywhere
