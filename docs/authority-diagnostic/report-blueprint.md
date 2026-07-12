# Authority Diagnostic — Report Blueprint

The content contract for every generated report. The Summit Comfort sample (in `/reference/Authority_Diagnostic_Sample.pdf`) is the canonical rendering of this contract — match its structure, density, and voice exactly. Six sections, no more, no less. The report should hurt a little and help a lot: if nothing stings, the analysis failed; if nothing is doable Monday morning, it also failed.

---

## §1–§6. THE SIX SECTIONS

### 01 / SNAPSHOT — "Where You Stand Today"
- Four scorecards: **Authority Score** (n/100 + band label + 1-line reason), **Hook Rate**, **Link CTR**, **Cost Per Lead** — each with the target range and a ≤15-word read.
- **The One-Line Verdict** — the whole report in one sentence, red-accented, pain-forward. Pattern: name what they're paying for a problem that costs less to fix. (Sample: "You're paying $142 a lead for a problem that costs $0 to diagnose.")
- One short paragraph: where the account is actually losing (not where it looks like it's losing) + the promise that detail follows. Pattern: "isn't losing in X. It's losing in Y."

### 02 / THE NUMBERS — "Your Ad Account, Read Against Benchmark"
- Full metric table: metric · their number · healthy range (from the benchmark config used, named) · **The Read** (≤10 words per row, plain verdict — "Fine. You're not overpaying for reach." / "The leak starts here.").
- Rows ordered top-of-funnel → bottom so the leak's position is visible: CPM → Hook Rate → Hold Rate → Link CTR → Frequency → Opt-in → CPL.
- **THE DIAGNOSIS** paragraph: clear what's fine before what's broken (diagnose the system, not the part — if the page converts and CPM is normal, say so first, then name the true leak). Must trace cause → compounding effect → symptom. Every claim numbered.
- Missing metrics get an honest line: "You didn't have [X] handy — here's what it would tell us and why to pull it."

### 03 / THE GAP — "Why The Creative Falls Flat"
- Framing line: *"A weak hook is a positioning problem wearing a creative costume."* (Keep — it's canon.)
- 3–5 named gaps, each: **bold call-out header** (second person, accusatory-but-on-their-side: "You lead with yourself, not the viewer") + 2–4 sentences quoting THEIR actual copy from intake, explaining why it fails, and gesturing at the fix. Every gap must quote or cite something real from their intake/site — no generic gaps.
- This section is where the five Authority Score factors get their evidence. Each factor scored below 15 should map to a gap here.

### 04 / THE FIX — "What To Change, In Order"
- 3–5 fixes, **ranked by impact per dollar**, Fix 01 labeled BIGGEST LEVER. Each: imperative title (2–4 words), ≤45 words of instruction, concrete enough to hand to whoever runs their ads.
- **THE REWRITE — Before & After:** their actual opening line verbatim, then the rewritten version — problem-first, one hard proof point from THEIR intake, low-friction CTA passing the CTA law. If they gave no proof point, the rewrite holds labeled space: *"[your number here — the first thing to go earn]"* — never invent one.
- Every CTA in this section validates against the banned list. Build fails otherwise.

### 05 / THE MATH — "What The Fix Is Worth"
- Projection table per `scoring-engine.md` §6: current budget (unchanged) → leads today @ CPL → hook rate current → projected → projected CPL range → projected leads range → net effect in one plain line.
- Assumptions printed: "Conservative estimate, same budget, downstream rates held flat."
- **THE POINT OF THE $750** box: the report pays for itself the first month CPL drops. No hype, arithmetic.

### 06 / NEXT — "Two Ways Forward"
- **DO IT YOURSELF:** "Everything above is yours… Plenty of people take the report and never call us again. That's fine. The report was the deal." (Canon — keep this posture; it's the whole brand.)
- **HAND IT TO US:** Authority Engine / Authority System named, Diagnostic credits toward first month, credit-window date printed. One approved-pattern CTA, exactly one.
- **THE CREATIVE IMPACT PROMISE** closer: "We tell you what's wrong before we sell you the fix." + the proof-before-promise paragraph from the sample.
- Footer every page: CREATIVE IMPACT MEDIA — THE AUTHORITY DIAGNOSTIC · CREATIVE IMPACTMEDIA.COM · 402-819-8168 · hello@creativeimpactmedia.co.

---

## §7. REPORT JSON SCHEMA (agent output → OS storage → both renders)

```jsonc
{
  "diagnostic_id": "uuid",
  "trace_id": "string",
  "benchmark_config": "default_local_service_meta | industry key",
  "snapshot": {
    "authority_score": { "value": 38, "band": "NEEDS_WORK",
      "factors": [ { "name": "problem_first", "score": 0, "evidence": "quoted line" }, /* ×5 */ ],
      "read": "≤20 words" },
    "cards": [ { "metric": "hook_rate", "value": 0.16, "target": "0.20–0.30", "read": "≤15 words" } ],
    "verdict_line": "string",
    "verdict_paragraph": "string"
  },
  "numbers": {
    "rows": [ { "metric": "cpm", "value": 19, "healthy": "$10–$25", "read": "string", "rating": "good" } ],
    "diagnosis": "string",
    "data_gaps": [ { "metric": "hold_rate", "why_it_matters": "string" } ]
  },
  "gap": { "framing": "string", "items": [ { "header": "string", "body": "string", "evidence_quote": "string", "maps_to_factor": "verifiable_proof" } ] },
  "fix": {
    "items": [ { "rank": 1, "biggest_lever": true, "title": "Rewrite the hook", "body": "≤45 words" } ],
    "rewrite": { "before": "verbatim from intake", "after": "string", "proof_point_source": "intake field | LABELED_SPACE" }
  },
  "math": { "rows": [...], "assumptions": "string", "point_of_750": "string", "skipped": false },
  "next": { "credit_deadline": "ISO date", "cta": "approved-pattern string" },
  "matrix_positions": { "m1": "okay_hook__bad_efficiency", "m2": "...", "frequency_override": true, "action": "REFRESH" },
  "internal_notes": "adversary-pass paragraph — Brandon only, never rendered client-side",
  "confidence_flags": [ { "path": "gap.items[2]", "note": "thin evidence" } ]
}
```

Validate with zod before `draft_ready`. `internal_notes` and `confidence_flags` render only in admin.

---

## §5V. VOICE LAW (embed verbatim in the agent system prompt)

**The voice in one sentence:** a sharp, confident friend who knows more about marketing than anyone you've met — and tells you what's actually wrong before selling the fix.

1. **Direct over diplomatic.** Open with the problem, never the pleasantry. The reader feels seen — and slightly called out — inside two sentences.
2. **Conversational authority.** Contractions, "you/your," rhetorical questions across a table — never boardroom. The authority is the numbers, not the attitude.
3. **Proof before promise.** Never a claim without a number, name, or date. "We get results" is meaningless; "47 leads in 21 days" is a weapon.
4. **Tension before resolution.** Problem (make them feel it) → Pivot (why it exists — the status quo's fault, not theirs) → Proof → Offer. Let the problem breathe.
5. **Anti-corporate.** If a sentence could sit in any agency's deck unchanged, it isn't Creative Impact.

**Banned everywhere (validator list):** leverage (verb), synergy/synergistic, move the needle, touch base, circle back, best-in-class, cutting-edge, end-to-end solution, holistic approach, thought leader (say "authority"), disrupt/disruptive, empower (unless followed by a specific outcome), at the end of the day, it goes without saying, in today's competitive landscape, take your business to the next level.

**Swaps:** leverage→use/put to work · optimize→fix/tighten up · ROI→the dollar amount · engagement→people actually watching/clicking/buying · scalable→what actually happens when they grow.

**Final test:** read it out loud. LinkedIn-agency post → rewrite. Something Brandon would say leaning forward on a podcast → ship it.

---

## §6V. VISUAL TOKENS (HTML report + PDF render — both from the same JSON)

- Background: cream `#F0EDE8`. Body text near-black.
- Display type: **Barlow Condensed 900**, uppercase, letterspaced section labels ("01 / SNAPSHOT"). Body: clean sans.
- **Teal `#007A87`** = workhorse: table header rows (white text), section tags, score-card accents, links.
- **Red `#C41E3A`** = punctuation, **single use per composition** — the One-Line Verdict owns it. Nothing else on the page is red.
- **Gold `#C8960A`** = thin section dividers only.
- Score cards: 4-up grid (2×2 mobile), big number, small target line, one-line read.
- Metric table: teal header, zebra cream rows, "The Read" column italic.
- Fix cards: numbered row, Fix 01 visually heavier + BIGGEST LEVER tag.
- Before/After rewrite: two stacked blocks, BEFORE muted, AFTER teal-bordered.
- Two-ways-forward: side-by-side cards; the promise closer full-width on cream with the gold rule.
- PDF: same tokens; running footer with contact line; Barlow Condensed embedded (fallback Arial Black per docx law).
- Reuse the `churlish-master-plan-style` component patterns already in the OS design system where they exist (cards, callouts, metric tables) — don't rebuild primitives.
