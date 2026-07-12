# Systems & Protocols — Verification Loop · Goal Runner · Session Handoff

These three are **your own operating practices**, not CRM-attached agents.
They don't run on schedules and they don't watch business data — they govern
HOW you build and run everything else in this pack. Registered on the roster
(`loc: CC`, division `systems`) so the org chart is honest about what exists.

---

## Verification Loop (`verification-loop`) — "Ship With Receipts"

Before any flagship build (an agent, a client deliverable, an OS change) is
called done:
1. Write the **Definition of Done** as a checklist BEFORE building — what,
   verifiably, must be true.
2. Attach **evidence per item** — a run output, a screenshot, a test result.
   "It should work" is not evidence.
3. **Stress the edges** — empty inputs, wrong secret, huge payload, the
   Monday-morning case. One honest attempt to break it.
4. Anything unproven ships labeled as unproven, or doesn't ship.

Report home when used on a flagship build:
`agent: "verification-loop"` · `"DoD 9/9 verified — <build name>"`.

## Goal Runner (`goal-runner`) — "The Build Rig"

For large multi-deliverable builds (e.g., "stand up three agents this week"):
1. Break the goal into independent work units; run them with parallel
   sub-agents where they don't collide.
2. Every unit's output is **graded by a separate reviewer pass** (The Watcher
   pattern) — never self-approved by the sub-agent that produced it.
3. The run ends with a single consolidated report: shipped / failed / parked,
   with evidence links.

Report home: `agent: "goal-runner"` · `"Build run — 3 shipped, 1 parked"`.

## Session Handoff (`session-handoff`) — "The Relay"

When a working session hits context limits, runs long, or switches models:
1. Package state: what was the goal, what's done (with file paths / links),
   what's mid-flight, exact next step, and every gotcha learned this session.
2. Write it somewhere durable (a HANDOFF.md in the working repo), not just
   in chat.
3. The next session starts by reading the handoff — never by re-deriving.

Report home: only when a handoff closes out a multi-day build thread.

---

**Why these are in the pack:** the proven fleet's biggest failures were never
bad agents — they were unverified ships and lost context. These three
protocols are the immune system. Adopt them before building agent #2.
