# Authority Diagnostic — Intake Form Spec

Route: `/diagnostic/[id]/intake?token=…` — single-use signed token from the intake email, no login. Mobile-first, one question block per screen, autosave on every field (status → `intake_in_progress` on first save). Progress bar. A client should finish in **10–15 minutes** with their Ads Manager open in another tab.

**Design law:** the form asks for RAW NUMBERS only — plays, clicks, spend, leads. It never asks for a rate or percentage the OS can compute. Every metric screen shows a small "where to find this in Ads Manager" helper line. Every numeric field allows **"I don't have this"** — a null, never a zero. Nulls become named data gaps in the report, not fabricated reads.

**Form voice:** direct, zero corporate filler. Field labels sound like a person asking, not a government form. Examples below are the actual copy — use them.

---

## STEP 1 — The business (2 min)

| Field | Type | Required | Notes |
|---|---|---|---|
| Business name | text | ✓ | Prefilled from checkout |
| Industry | select + free text | ✓ | Drives `benchmark_configs` selection; list: HVAC, roofing/exteriors, med spa/aesthetics, fitness, legal, dental, home services, coaching/consulting, other |
| Market / metro | text | ✓ | "Where do your customers actually live?" |
| Website URL | url | ✓ | OS fetches homepage server-side post-submit |
| Ad landing page URL | url | — | "The page your ads send people to. If it's just your homepage, say so." Fetched too |
| Average customer value | currency | ✓ | "What's one new customer worth to you, first year? Ballpark is fine." |
| Primary offer in the ads | textarea | ✓ | "What are you actually advertising right now — in one or two sentences." |

## STEP 2 — The ad account, raw numbers (5 min)

Header copy: *"Open Ads Manager, set the date range to the last 30 days (or the life of your main campaign if it's younger), and copy the numbers straight across. Don't calculate anything — that's our job."*

| Field | Type | Required |
|---|---|---|
| Platform(s) running | multiselect: Meta, YouTube, TikTok, Google, other | ✓ |
| Date range used | date range picker | ✓ |
| Amount spent | currency | ✓ |
| Impressions | number | ✓ |
| Reach | number | ✓ |
| 3-second video plays | number | video ads only |
| 50%+ video views (ThruPlay/50% watched) | number | — |
| Link clicks | number | ✓ |
| Clicks (all) | number | — |
| Leads (form fills / calls / bookings from ads) | number | ✓ |
| Monthly ad budget going forward | currency | ✓ |
| Is this a retargeting campaign? | yes/no/mixed | ✓ (frequency-override exception) |
| Screenshot upload (Ads Manager view) | file, multi | strongly encouraged — "Screenshots beat memory. Drop them here and we read against the real thing." |

Validation: warn (don't block) on impossible ratios (plays > impressions, leads > link clicks, reach > impressions). Warnings surface to admin as intake anomalies.

## STEP 3 — The creative (3 min)

| Field | Type | Required |
|---|---|---|
| Current ad opening line | textarea | ✓ — "Type the first sentence of your main ad, word for word. This matters more than anything else on this form." |
| Full ad copy / script | textarea or file | ✓ |
| Ad video/creative links or uploads | url list / file | — |
| How many creatives are live right now | number | ✓ |
| Age of the oldest live creative | select: <2wk, 2–4wk, 1–2mo, 2mo+ | ✓ |
| Current CTA, word for word | text | ✓ |

## STEP 4 — Positioning & proof (3 min)

| Field | Type | Required |
|---|---|---|
| "Finish this: people should pick us over the other guys because…" | textarea | ✓ |
| Proof you can put a number on | textarea | ✓ — "Jobs completed, years of same-day callbacks, customers in a named neighborhood — anything specific and true. If you don't have one, say 'none yet.' Honest beats impressive here." |
| Best review or client result, verbatim | textarea | — |
| Who's the customer you most want more of | textarea | ✓ |
| Biggest objection you hear before people buy | textarea | ✓ |

## STEP 5 — Confirm & submit

Summary screen of everything entered → submit → status `intake_complete`, derived metrics computed, agent run enqueued. Confirmation copy:

> **Got it. The read is underway.**
> Your report lands in your dashboard within 5 business days. You'll get an email the moment it's ready. No call, no pitch meeting — the report is the deliverable. Questions in the meantime: hello@creativeimpactmedia.co.

---

## Reminder automation
- No save within 48h of intake email → reminder 1. Day 5 → reminder 2. Day 10 → admin flag for a personal nudge from Brandon. (Copy in `emails.md`.)
