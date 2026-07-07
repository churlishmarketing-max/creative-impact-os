# Handoff: Creative Impact OS — Broadcast Edition

## Overview

**Creative Impact OS** is the internal business operating system for Creative Impact (creativeimpactmedia.co) — a Charlotte, NC marketing partnership between Emmanuel Bibbs (Emmanuel Impressions, visual director) and Brandon King (Churlish Media, creative director / Authority Engine).

The OS is a single-screen web app the two founders live in daily. It tracks one number ($100,000 collected by Dec 31, signed by Oct 31) and everything that feeds it: sales pipeline, the free Authority Audit call, monthly capture-day (shoot) scheduling, content deliverables, a fleet of 6 AI agents, and founder wellbeing.

The visual language is **live sports broadcast**: scorebug header, bottomline ticker, "going live" countdown boot, drive meter, box scores, lower-thirds. Dark navy + gold + white, with red reserved for LIVE/alerts.

## About the Design Files

The files in this bundle are **design references created in HTML** — working prototypes that show intended look and behavior, not production code to copy directly. `Creative Impact OS - Broadcast.dc.html` runs on a small custom template runtime (`support.js`); open it in a browser to use the working prototype.

**Your task is to recreate this design in the target codebase's environment** using its established patterns and libraries. If no codebase exists yet (this is the expected case), the recommended stack is:

- **React + Vite** (or Next.js) — the prototype is already structured as one React-style component tree with a `renderVals()` data layer, so translation is mechanical.
- **A real database** (e.g. Supabase/Postgres) replacing localStorage — see *State Management → Suggested schema*. This is the piece that lets the agent fleet ("Scout", "Anchor", etc., running elsewhere) read/write the same data the founders see.
- Plain CSS-in-JS or Tailwind — all styling in the prototype is inline styles with CSS variables, so tokens map 1:1.

## Fidelity

**High-fidelity.** Colors, typography, spacing, copy, and interactions are final design intent. Recreate pixel-perfectly. All copy in the prototype is real (client names in the pipeline are placeholder Charlotte-flavored businesses — swap for real CRM data at integration time).

## Design Tokens

Defined as CSS variables on the root element:

| Token | Value | Use |
|---|---|---|
| `--navy` | `#0a1322` | App background |
| `--deep` | `#060c17` | Header, wells, inset panels |
| `--panel` | `#101d33` | Cards / module panels |
| `--panel2` | `#16263f` | Chips, nested surfaces, active tabs |
| `--line` | `#24385c` | All borders and dividers |
| `--gold` | `#ffb81c` | Primary accent: numbers, CTAs, active states |
| `--gold2` | `#ffd06a` | Gold hover / secondary gold text |
| `--golddark` | `#1a1608` | Text on gold surfaces |
| `--white` | `#f4f7fc` | Primary text |
| `--muted` | `#8ea3c4` | Secondary text |
| `--dim` | `#5c7096` | Tertiary text, labels |
| `--live` | `#ff3040` | LIVE bug, flags, alerts |
| `--good` | `#2ee06f` | Success / floors hit / BOOKED |

**Typography** (Google Fonts):
- `Oswald` (500/600/700) — `--num`: all large numerals, H1s (uppercase, 52px/0.98), stat values (36–46px), scorebug numbers (27px), stage names.
- `Archivo` (400–900) — `--sans`: everything else. Labels are 8–10px, weight 800, letter-spacing .12–.26em, uppercase. Body 11.5–13px. Card titles 15px/900/.1em.

**Other values**: border-radius 2–4px (max 12px, logo tiles only); borders 1px `--line`; card top-accent 4px solid; section padding `28px 26px 96px`; content max-width 1240px centered; grid gaps 10–20px; buttons: gold bg, `--golddark` text, 900 weight, 10.5–11.5px, .12–.16em tracking, radius 3px.

## App Chrome (persistent on every screen)

1. **Scorebug header** (sticky top, `--deep`, 3px gold bottom border, 62px tall):
   - Logo tile (38px, radius 6) + "CREATIVE IMPACT" / "IMPACT SPORTS NET · CLT".
   - Score: `CI {collected, e.g. 18.4K}` (gold, Oswald 27px) `VS` `GOAL 100K` (white).
   - Period cells: `Q3` (quarter of calendar year), days `TO SIGN-BY` (gold), days `TO FINAL`.
   - Right: live clock `HH:MM:SS` (ticks every second) + date, and a red `LIVE · CLT` bug with pulsing white dot.
2. **Channel-tab nav** under scorebug: 9 tabs `01 COMMAND … 09 PLANS`. Active = white text + 3px gold underline; inactive = `--dim`; hover = white.
3. **Drive meter** below nav on every screen: "THE DRIVE TO 100K" — field-position bar (34px tall, `--deep`, 10% yard ticks, gold END ZONE right segment at 91–100%, gold fill to `pct`, oval gold ball marker at `pct`). Captions: `OWN {pct} YARD LINE` / `{pct}% OF THE FIELD COVERED`.
4. **Bottomline ticker** (fixed bottom): gold `CI WIRE` chip + infinitely scrolling agent-status marquee (30s linear loop, duplicated span technique).
5. **Toast**: gold pill, fixed bottom-center (above ticker), appears 2.2s on actions.
6. **Boot overlay** ("GOING LIVE"): full-screen `--deep`, SMPTE-style 5-color bar strip on top edge, logo, then giant Oswald countdown `3 → 2 → 1` (170px gold, pop-in animation, 950ms per digit), then red `WE'RE LIVE` bug; auto-dismisses 3.6s later. Skippable via click, ESC/Enter/Space, or `[ESC] SKIP →` button. Shows once per browser session (sessionStorage flag `ci_booted_broadcast`).

## Screens / Views

All views swap inside the same chrome (client-side view state, no routing needed — but real app should use routes `/command`, `/pipeline`, …).

### 01 · Command — "The Big Board"
Purpose: the daily screen. Layout, top to bottom:
1. Kicker chip `SEGMENT 01 — THE SCREEN YOU LIVE IN` + H1 `THE BIG BOARD` + subline; gold `↻ NEW WEEK` button right (resets this week's box score after confirm-less click; shows toast).
2. **Stat tiles** — 4-col grid: COLLECTED (gold), SIGNED · IN-YEAR, OPEN PIPELINE, COVERAGE (red styling when < 3×, green when healthy). Values computed from deals data.
3. **Drive chart** (Authority Engine board) — 4 columns `1ST · AUDIT / 2ND · CAPTURE / 3RD · DEPLOY / 4TH · LOOP` (CAPTURE + DEPLOY have gold headers), each with client chips (name + gold value, 3px gold left border).
4. **Box score** (Friday Five) + **Keys to the Game** — 2-col row (1.15fr/1fr). Box score: 5 numeric inputs (Calls held floor 3, Audits delivered floor 2, $ signed/wk, $ collected/wk, Clips shipped floor 8); border/floor label turns green when floor hit, red when missed. Below: red `⚑ FLAG` tripwire bar when pipeline coverage < 3× gap. Keys: 5-item checklist (first 3 auto-derived from box score, last 2 manually toggleable) + `SCORING CHANCES · RED ZONE` list (top 5 open deals by date; click → Pipeline).
5. **Broadcast schedule — July** — 4 shoot cards (JUL 09/14/18 booked/confirmed = green status; JUL 25 OPEN = gold dashed treatment, "TICKETS AVAILABLE").
6. **The One Thing** lower-third: red flag cell + gold banner `SELL OUT AUGUST'S FOUR CAPTURE DAYS` + `01` end cell.

### 02 · Pipeline — "The Standings"
4 stat tiles (Weighted pipeline = Σ value × stage probability; Live deals; Signed — gold; Win rate = signed ÷ closed). Then a 6-column kanban: `LEAD → AUDIT BOOKED → AUDIT DONE → PROPOSAL → SIGNED → COLLECTED`, column sums in header, deal cards (name / offer / gold value, gold border on hover). Stage probabilities: .1 / .3 / .5 / .7 / .95 / 1.

### 03 · Audits — "The Audit Booth"
The free 30-minute Authority Audit call script. Two modes toggled by top-right button (`OBJECTION HANDLING →` / `← BACK TO RUNDOWN`):
- **Rundown mode**: left rail (250px) of 6 segment buttons (01 Open/Disarm, 02 Situation, 03 Problem Awareness, 04 Consequence, 05 The Plan, 06 Commit; active = gold left bar) + right **prompter panel**: red `PROMPTER` chip + goal line, then blocks: *say* (gold left bar, white 14.5px), *alternate read* (grey bar, muted), *producer note* (gold `PRODUCER NOTE ·` prefix), *question lists* (gold `›` bullets). BACK / NEXT SEGMENT buttons.
- **Objections mode**: 7 `<details>` accordions ("We tried an agency before…", "I get all my business from referrals.", "I don't have time…", "Thumbtack/Angi…", "What does it cost?", "I need to think about it.", "I'm not good on camera.") — each with a strategy label + scripted turn.
Bottom (both modes): **The Ladder** — 3 offer cards (Authority Audit FREE·30 MIN / Authority Engine $3,500/mo·3-mo min / Market Domination $6,000/mo) + gold `PRICE INTEGRITY` bar.

### 04 · Shoots — "The Production Line"
1. **July** panel: same 4 shoot cards as Command.
2. **August** panel (gold border): 4 dashed gold "TICKETS AVAILABLE" open slots (AUG 06/12/20/27) — ties to the One Thing.
3. Bottom 2-col: **Run Sheet** (gold chip + 5-step ordered list for the half-day capture: pre-pro T-3, AM Authority Video interview, midday b-roll, PM photography, same-week selects → Splice) + **Deliverables Tracker** (per live client: `n/12 CLIPS` with progress bar — green ≥ 8, gold below — and meta line: photos, ads live, next milestone).

### 05 · Agent Fleet — "The Control Room"
1. **Daily loop** chip row: Scout → Anchor → Booked audit → Pipeline → Splice + Gaffer → Showrunner.
2. Left column: 6 agent rows styled as broadcast sources (`SRC 1…6` under initials): Scout (lead research, gold), Anchor (outreach/booking, green), Splice (short-form edit), Darkroom (photo pipeline), Gaffer (ads, gold), Showrunner (supervisor). Each: role line, cadence, status dot + `ON AIR TODAY / IDLE`, `MARK RUN / RESET` toggle (persisted per day-agnostic key).
3. Right column: **The Wire** — live feed panel (`--deep`) with timestamped agent log lines; a new ambient line is appended every ~4.6s from a rotating pool (max 9 kept). Plus **Today's Operating Checklist** (6 toggleable items).

### 06 · Partners — "The Talent"
Two-founder wellbeing desk (replaces single "Founder OS").
1. **Partner tabs**: EB Emmanuel Bibbs (Visual Director · CLT) / BK Brandon King (Creative Director · Engine). Active = gold border. All check-in data below is per-partner, per-day.
2. Left card **Today's Check-in**: Energy 1–5 segmented buttons (gold when selected), Sleep 5–9, four toggles (EB: Trained / Deep-work / Shot something / Ate right; BK: Trained / Deep-work / 3 conversations / Ate right), free-text "how's the head today" textarea.
3. Right card: **Last 7 days** strip (energy number per day: green ≥ 4, gold ≥ 2, red < 2; two activity dots) + **Non-negotiable habits** with owner chips (EB/BK/BOTH), day-streak counters, check toggles, `+ ADD HABIT` (prompt).
4. Full-width **Goals** card: checkbox, text, BUSINESS/LIFE chip, owner chip; the $100K goal shows a gold progress bar fed by collected total; `+ ADD GOAL` (prompt; auto-classifies life vs business by keyword).

### 07 · Documents — "Tape Library"
4 categories (STRATEGY / SALES / BRAND / PRODUCTION), 2-col grid of document rows: format chip (PDF/DOC/SHEET/PNG/FIG/CSV), name, meta line, optional gold tag (CORE/LIVE/HOT). Click = toast (real app: open the document).

### 08 · Strategy — "The Game Plan"
1. **Thesis banner** (gold-tinted, 5px gold left bar, ghost ★): "Local beats loud…"
2. 3 **pillar cards**: THE WEDGE (free audit that's actually a plan) / THE MOAT (Charlotte-native, two operators) / THE TARGET (service businesses that already work).
3. 2-col: **The Three Bets** (gold `›` list) / **What We Don't Do** (red `✕` list on `--deep`).

### 09 · Plans — "The Season"
1. Two countdown cards: days to sign ($100K contracted · Oct 31, gold) / days to collect (Dec 31).
2. **The Four Quarters** rows: Q1 Sell Out August (ACTIVE, gold) / Q2 Fill the Funnel (NEXT, white) / Q3 Sign $100K (QUEUED) / Q4 Collect & Renew (QUEUED) — each with when-chip and description.
3. **This Week's Moves · Q1**: 5 toggleable checklist items (persisted).

## Interactions & Behavior

- Tab switching is instant (no transition). All module hovers: border color → gold, 120–150ms ease.
- Clock ticks 1s; wire log appends ~4.6s; ticker marquee 30–32s linear infinite; LIVE dot pulse 1.4s.
- Box-score inputs accept free numeric text; derived checklist items and floor colors update live.
- `NEW WEEK` clears only the current ISO-week's box score (weeks are keyed `YYYY-Wnn`, so history is preserved).
- Toasts: 2.2s, gold, bottom-center.
- Boot: countdown 950ms/digit → WE'RE LIVE → auto-enter after 3.6s; any click/ESC/Enter/Space skips; once per session.
- Prompt-based inputs (`+ ADD HABIT`, `+ ADD GOAL`) use `window.prompt` in the prototype — replace with proper inline inputs/modals in production.
- Deals are click-through only in the prototype (Scoring Chances → Pipeline view). Production should support add/edit/move-stage on deals (this is the core CRUD).

## State Management

Prototype state (translate to your store + DB):

- `view` — active section id.
- `deals[]` — `{ name, offer, value, stage, date? }`. **All money figures on Command/Pipeline/scorebug derive from this array**: collected = Σ Collected; signed = Σ Signed+Collected; open = not Signed/Collected/Lost; weighted = Σ value × STAGEPROB[stage]; coverage = open ÷ (100000 − collected).
- `weeks{ 'YYYY-Wnn': { calls, audits, signed, collected, clips, manual:{invites, proof} } }` — box score per ISO week.
- `ops{ key: bool }` — agent runs (`agent:Scout`), ops checklist (`ops:0…5`), plan moves (`plan:0…4`).
- `partner` — 'EB' | 'BK'; `founder{ 'EB|YYYY-MM-DD': { energy, sleep, workout, deep, calls/camera, ate, note } }` — per-partner daily check-ins.
- `habits[]` — `{ id, name, owner, days:{date:true} }` (streak = consecutive days back from today).
- `goals[]` — `{ id, text, type: business|life, owner, target, done }`; goal g1 progress = collected total.
- `log[]` — wire feed entries (ephemeral).
- Persistence: everything except `log`/`view` saved to `localStorage['ci.os.broadcast.v1']` (and `window.storage` when present). Boot flag in `sessionStorage['ci_booted_broadcast']`.

**Suggested production schema** (Supabase/Postgres) — one table per concept: `deals`, `weekly_scores`, `ops_checks`, `partner_checkins`, `habits`, `habit_days`, `goals`, `shoots` (capture days incl. open slots), `deliverables` (clips/photos/ads per client per month), `wire_events` (agent activity log — this is the table the agent fleet writes to). The OS UI then reads live; agents (Scout, Anchor, Splice, Darkroom, Gaffer, Showrunner) authenticate via service keys and write leads, bookings, clip counts, and wire events.

## Business Data (canonical numbers in the prototype)

- Goal: **$100,000**; sign-by **2026-10-31**; collect-by **2026-12-31**.
- Seed pipeline: 17 deals (4 Collected = $18,400; 2 Signed = $8,500; 11 open = $80,100). Client names are fictional Charlotte businesses; Elite Sales Training is the real testimonial client from the website.
- Offers: Authority Audit (free), Story Capture Pilot ($2,400), Authority Engine ($3,500/mo, 3-mo term = $10,500), Market Domination ($6,000/mo).
- Weekly floors: 3 calls · 2 audits · 8 clips; monthly: 8–12 clips per client, 4 capture days.

## Assets

- `brand/ci-mark.png` — the Creative Impact shutter/play logo (white hexagonal shutter + red play on black square). Used in scorebug (38px tile, radius 6) and boot (84px, radius 12). Source: client-provided. Keep on dark surfaces or inside a dark tile; there is no transparent or light-background variant in this bundle.
- Fonts: Google Fonts `Oswald` + `Archivo` (see tokens).
- No other imagery. Icons are typographic (●, ▸, ›, ✕, ⚑, ↻) — no icon library needed.

## Files

- `Creative Impact OS - Broadcast.dc.html` — the complete hi-fi prototype (all 9 screens, chrome, boot, logic). Template (markup) is in `<x-dc>`; all data arrays and behavior are in the `Component` class in the trailing script — **every piece of copy lives there** (SCRIPT, OBJECTIONS, LADDER, STRATEGY, PLANS, DOCS, FLEET, SEED…). Treat those arrays as the content source of truth.
- `support.js` — prototype-only template runtime (do NOT port; it exists so the HTML opens in a browser).
- `brand/ci-mark.png` — logo asset.

Alternate art directions (not for implementation, kept for reference in the parent project): `Creative Impact OS - Phantom.dc.html`, `Creative Impact OS - Darkroom.dc.html`.
