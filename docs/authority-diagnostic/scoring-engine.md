# Authority Diagnostic — Scoring Engine (the law)

This file is the single source of truth for how the Diagnostic scores an account. It is both a build spec (implement §1 as pure functions in the OS) and an agent resource (ship §2–§6 to the diagnostic agent verbatim). Benchmarks live in the `benchmark_configs` table as data; the defaults below seed that table. **Calibrated for local high-ticket service businesses on Meta; industry overrides are config rows, never code forks.**

---

## §1. DERIVED METRICS — computed by the OS, never by the agent, never by the client

The intake collects raw counts only. The OS computes (guard every division against zero; store nulls for missing inputs, never zeros):

| Metric | Formula |
|---|---|
| CPL | spend ÷ leads |
| Video Hook Rate | 3-sec plays ÷ impressions |
| Hold Rate | 50%+ views ÷ impressions *(optional input)* |
| Hook-to-Lead Efficiency | leads ÷ 3-sec plays |
| Link CTR | link clicks ÷ impressions |
| CTR (All) | total clicks ÷ impressions |
| Opt-in Rate | leads ÷ link clicks |
| CPC (Link) | spend ÷ link clicks |
| CPC (All) | spend ÷ total clicks |
| CPM | (spend ÷ impressions) × 1,000 |
| Frequency | impressions ÷ reach |

**Denominator law (hard rule):** a ratio only exists if both raw inputs exist for the same date range and same campaign scope. Mixed-scope inputs invalidate the ratio — flag, don't fudge.

---

## §2. BENCHMARK THRESHOLDS (default config — seed `benchmark_configs` row `default_local_service_meta`)

| Metric | Excellent | Good | Fair/Poor | Bad |
|---|---|---|---|---|
| CPL | $0–$30 | $31–$50 | $51–$80 | $81+ |
| Hook-to-Lead Efficiency | 50%+ | **40–49% (sweet spot)** | 30–39% good / 20–29% fair | <20% |
| Video Hook Rate | 30%+ | 20–29% | 10–19% | <10% |
| Link CTR | 1.2%+ | 0.8–1.19% | 0.5–0.79% | <0.5% |
| CTR (All) | 2.5%+ | 1.5–2.49% | 1.0–1.49% | <1.0% |
| Opt-in Rate | 20%+ | 10–19% | 5–9% | <5% |
| CPC (Link) | ≤$1.50 | $1.51–$3.00 | $3.01–$5.00 | >$5.00 |
| CPC (All) | ≤$0.50 | $0.51–$1.50 | $1.51–$3.00 | >$3.00 |
| CPM | <$10 | $10–$20 | $20–$40 | >$40 |
| Frequency | 1–2 optimal | 2–3 caution | 3–5 high risk | 5+ fatigue |

**Industry overrides:** a `benchmark_configs` row may override any band per industry (e.g., HVAC healthy CPL $35–$75, hook target 25–30% — how the Summit Comfort sample reads). The report always states which benchmark set was used. Overrides are Brandon-editable in admin (Phase 2 UI; Phase 1 = seeded rows).

**Core operating principle:** the sweet spot is **40–49% Hook-to-Lead Efficiency with ~18% Video Hook Rate.** A high hook rate with low efficiency is traffic without conversions — eyeballs aren't revenue. **Never diagnose from a single metric. Read pairs.**

---

## §3. THE TWO DIAGNOSTIC MATRICES (prescription drivers)

### Matrix 1 — Video Hook Rate × Hook-to-Lead Efficiency (primary)

| Hook Rate ↓ \ Efficiency → | Great (50%+) | Okay (40–49%) | Bad (<40%) |
|---|---|---|---|
| **Great (20–30%+)** | 🚀 Scale hard. Don't touch. | Hook loved, drop-off after. Fix CTA + form friction. | Hook attracts unqualified people. Refine targeting/qualification. |
| **Okay (10–19%)** | Small hook tweaks toward 20% without breaking efficiency. | ✅ **SWEET SPOT — don't break it.** | No engagement, no conversion. Rework hook AND CTA. |
| **Bad (<10%)** | Engagement, no action — wrong audience. Tweak audience + messaging. | Audience doesn't resonate; pain points missing. | 🔥 Kill. Restart with new creative. |

### Matrix 2 — Link CTR × CTR (All) (refines: creative problem vs. CTA problem)

| CTR All ↓ \ Link CTR → | Great (1.0%+) | Okay (0.7–0.9%) | Bad (<0.7%) |
|---|---|---|---|
| **Great (2.0%+)** | 🔥 Ideal — scale. | Engagement strong, link CTA weak. Stronger CTA. | Engagement bait, no intent. Strip fluff, direct CTA. |
| **Okay (1.0–1.9%)** | Direct-response winner. | Balanced, underperforming. New hooks + urgency. | Blending into feed. New creative — colors, hook, motion. |
| **Bad (<1.0%)** | Hidden winner — niche + qualified. Check lead quality before touching. | Weak ad. Rework first 3 seconds + CTA. | 🔥 Kill. Start fresh. |

### Overrides and verdicts
1. Locate Matrix 1 → primary prescription. 2. Locate Matrix 2 → refine (creative vs. CTA). 3. Cross-check singles for Poor/Bad (CPL, CPM, Frequency). 4. **Frequency ≥3 fires an automatic creative-refresh regardless of matrix position** (exception: retargeting campaigns — intake asks). 5. Verdict is exactly one of: **SCALE / TWEAK / REFRESH / KILL.** 6. Flag the trade-off if a fix risks another metric (e.g., chasing hook rate at efficiency's expense). 7. **Don't over-optimize a winner** — if the account sits in the sweet spot, the report says so and prescribes protection, not surgery.

---

## §4. AUTHORITY SCORE — 0–100, five factors × 20 points

Scored by the agent from intake positioning answers + fetched website/ad copy. Each factor scores 0 / 5 / 10 / 15 / 20 against anchors. Every factor score ships with a one-line quoted-evidence justification.

**1. Problem-First Messaging (20)** — Does the opening line of the ad/page name the *viewer's* problem?
- 20: First line names a specific, felt problem in the prospect's own words. · 10: Problem appears but after company intro. · 0: Opens with company name, years in business, or "quality service."

**2. Verifiable Proof (20)** — Is there a number/name/result a stranger can believe?
- 20: Specific figures ("1,900 systems serviced in Sarpy County last year"), named results, real timelines. · 10: Testimonials without specifics. · 0: "Trusted," "quality," adjectives only.

**3. The Swap Test / Differentiation (20)** — Replace their name with a competitor's. Does anything break?
- 20: Positioning only they can claim. · 10: Some distinct angle, weakly stated. · 0: Interchangeable with every competitor in the metro.

**4. Offer & CTA Friction (20)** — Is there a low-friction first step, or does the CTA demand commitment cold?
- 20: Value-first entry offer (guide, free check, diagnostic) with an approved-pattern CTA. · 10: Discount-led or vague offer. · 0: "Call now to schedule" at a cold audience.

**5. Creative Depth (20)** — Is there a bench, or one tired ad carrying the account?
- 20: 3–5 angles in rotation, frequency <2.5, refresh cadence. · 10: 2 creatives, aging. · 0: One creative, 6+ weeks, frequency 3+.

**Bands:** 0–39 **NEEDS WORK** · 40–59 **UNSTABLE** · 60–74 **SOLID** · 75–89 **STRONG** · 90–100 **AUTHORITY**. Band label prints on the snapshot card (Summit Comfort: 38 → NEEDS WORK).

---

## §5. CTA LAW (validates every CTA in the report, the fixes, the emails, the offer page)

**Every shipped CTA carries all four:** Benefit-led · Urgency-loaded · Qualifier-baked · Effort-light.

**Banned (validator rejects, build fails):** "Book a call with me" · "Schedule a call" · "Learn more" · "Click here" · "Click here to book" · "Want to chat?" · "Let's talk" · "Hop on a call" · "Call me to learn more" · "Get in touch" · "Contact us today" · "Sign up."

**Approved patterns (use, customize brackets, or match structure):**
- Let's map out your game plan — grab a free call today.
- Struggling with [pain]? Let's solve it in 15 minutes.
- Claim your free [benefit] session — limited spots available.
- Apply now — we only take [criteria] this quarter.
- 15-min call → custom [outcome] roadmap.
- Get your [specific deliverable] in [timeframe].

**Hard rules:** one CTA per asset, never two. CTA must match a concrete offer. When the report's Fix 03 rewrites the client's CTA, show before/after and say why the original failed.

---

## §6. PROJECTION MATH (report section 05 — conservative, assumptions stated)

Same budget, same downstream rates. The model moves ONE lever — hook rate — into range and lets it pull the chain:

```
projected_hook_rate = clamp(config.projection_target, current+0.05 … 0.27)   // default target 0.27
uplift              = projected_hook_rate ÷ current_hook_rate
projected_leads_low  = current_leads × uplift                 // pure linear
projected_leads_high = current_leads × uplift × 1.15          // frequency-relief bonus
projected_leads_high = min(projected_leads_high, current_leads × 2.5)   // conservatism cap
projected_CPL_range  = spend ÷ projected_leads_high … spend ÷ projected_leads_low
```

The report must print the assumptions in plain language ("conservative estimate, same budget, downstream rates held flat") and never promise the projection. Fable Law 6: the denominator in the headline is the denominator in the math. If current hook rate is already ≥ target, skip the projection and diagnose the real leak instead — never invent upside.

**Fixture check (Summit Comfort):** 16% → 27% = 1.69×; 21 leads → 35–41 range; CPL $142 → ~$73–$85 linear. The sample's 43–50 / $60–$70 assumed a secondary opt-in lift — the engine stays more conservative than the sample on purpose. Under-promise in writing.
