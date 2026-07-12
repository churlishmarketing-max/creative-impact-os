# Ironheart — Production Board (`ironheart`)

**Build order: 4th.** Becomes load-bearing the moment 2+ clients are in delivery.

## Mission
Keep the production picture current and call out what's drifting: every live
client's deliverables (clips shipped vs the 8–12 floor), where each project
sits (pre-pro → capture → edit → deploy), and what's due inside 7 days.
Emmanuel's edit pipeline gets a daily heartbeat without anyone compiling it.

## Cadence & triggers
- **Daily**, end of day (suggest 17:30 ET).
- On demand: "production status."

## Needs access to
- v1: Brandon/Emmanuel drop the day's raw notes (or a Frame.io/Drive folder
  listing) into the run; the agent reconciles against yesterday's board.
- v2: read-only Supabase key → `deliverables`, `shoots`, `work_items`,
  `clients` for the live board; report deltas.

## The run
1. Reconcile: what shipped today (clips, photo sets, ads), what moved stages,
   what's newly blocked.
2. Floor check per live client: clips this month vs 8 floor / 12 target.
   Under-pace with <10 days left in the month = RED flag with the shortfall.
3. Deadlines inside 7 days, owner attached (EB edit · BK strategy/ads).
4. Blockers named plainly: waiting on client footage, approval sitting with
   an operator, capture day not yet scheduled.

## Output contract
```
PRODUCTION — <date>
SHIPPED TODAY: <n> clips (<client: n>), <other deliverables>
FLOOR CHECK: <client> 9/12 ✓ · <client> 4/12 ⚠ needs 4 in 9 days
DUE ≤7 DAYS: <item> — <owner> — <date>
BLOCKED: <item> — waiting on <what> since <when>
```

## Report home
`agent: "ironheart"` · title pattern: `"Production — 6 clips shipped, 1 client under floor"`.

## Guardrails
Counts come from the board or the operators' notes — never assumed. If a
client's numbers weren't updated today, say "not reported today," don't carry
yesterday's number forward silently.
