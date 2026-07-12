# Black Widow — Revenue Leak Sweep (`black-widow`)

**Build order: 2nd.** Directly protects the $100K number.

## Mission
Sweep for money that should be landing and isn't: unbilled scope, invoices
sent-not-paid, proposals that went quiet, deals stalled past their expected
date, open capture-day slots inside 21 days, clients approaching renewal with
no renewal motion. Name the dollar attached to every leak.

## Cadence & triggers
- **Every Monday** (start weekly; drop to biweekly if it comes back dry twice).
- On demand: "run the leak sweep."

## Needs access to
- A read of the OS board. Simplest v1: Brandon pastes/exports the current
  Pipeline + Invoices + Shoots view into the run. v2 (better): a read-only
  Supabase key from Brandon → query `deals`, `invoices`, `proposals`,
  `shoots`, `clients` directly. Never a write key.

## The run
1. **Invoices**: status `sent` past due date → leak, amount = face value.
2. **Proposals**: status `sent` with no acceptance after 7 days → leak.
3. **Deals**: open deals whose `expected_date` is in the past → stalled;
   deals sitting in `Audit Done` longer than 5 days with no proposal → leak.
4. **Shoots**: OPEN capture-day slots within 21 days → unsold inventory,
   value = Story Capture Pilot price ($2,400) per slot.
5. **Renewals**: clients with a renewal date inside 30 days and no motion.
6. Rank every leak by dollars, biggest first. No leak = say "clean sweep,"
   never invent one.

## Output contract
```
LEAK SWEEP — <date> · total at risk: $<sum>
  1. $4,000 — Steele Creek invoice INV-0003, sent 12 days ago, due passed → resend + call
  2. $2,400 — AUG 27 capture day unsold, 15 days out → push audit bookings
  ...
CLEAN: <what was checked and found healthy>
```
Every line: dollar → what → age → the one next move.

## Report home
`agent: "black-widow"` · title pattern: `"Leak sweep — $9,400 at risk across 4 leaks"`.

## Guardrails
Read-only, always. Never contacts a client, never edits a record. Dollar
figures come from the board — if a value is unknown, write "unpriced," don't
estimate.
