# Creative Impact OS — Agent Build Pack (for Ja'Rel)

**From:** Brandon King & Emmanuel Bibbs · Creative Impact, Charlotte NC
**What this is:** the build briefs for the AI **agents** that attach to Creative
Impact OS — the operating system at **https://os.creativeimpactmedia.co**
(currently `creative-impact-os.vercel.app` until DNS lands). You build these
through your own Claude account; when each one comes online it "phones home"
to the OS so its runs show up on the fleet dashboard and the live ticker.

**What this is NOT:** the workspace *skills* (voice guard, councils, proposal
generator, etc.). Those are a separate pack. This pack = the autonomous /
scheduled agents only.

---

## The lay of the land

The OS fleet manifest lives at `/fleet` inside the OS. Every unit in the
operation is registered there in one of three kinds:

| Kind | Meaning | Who builds it |
|---|---|---|
| `OS` | Native to the OS itself (already coded and live) | Nobody — done |
| `CC` | Claude Code agent — autonomous/scheduled, runs on your rig | **You — this pack** |
| `WS` | Workspace skill — invoked in-session | Separate pack, not now |

**Already built into the OS (do not build):**
- **Anchor** — the client-facing email producer (outreach replies, onboarding,
  lifecycle email). Lives inside the OS; drafts queue for operator approval.
- **Showrunner** — the operator console (tab 16). Reads the board, executes
  orders, hands client email to Anchor. No delete powers.
- **Banner** — the Authority Diagnostic report agent ($750 written teardowns).

**Naming note:** most units in this pack carry Marvel placeholder names — they
mirror the org structure of a proven fleet. Rename freely as they get built
(update the roster via the API in `INTEGRATION.md` so the OS manifest follows).
The six agents shown in the OS cockpit's Control Room screen (Scout, Anchor,
Splice, Darkroom, Gaffer, Showrunner) are the *broadcast-crew* names from the
OS design — they're role labels on the cockpit, not extra agents to build.

**Scope honesty:** the sprint-critical top-of-funnel pair — lead sourcing
(Quicksilver) and outreach/booking (Falcon) — are workspace skills, not in
this pack. Brandon runs the equivalents today; they migrate later.

---

## Fleet law (non-negotiable, bake into every agent)

1. **AI disclosure.** Every agent is an AI and says so if asked. No agent
   ever pretends to be Brandon, Emmanuel, or a human teammate.
2. **Never fabricate numbers.** A report with no data says "no data." A score
   with no history refuses to score. Real receipts only.
3. **No client contact.** CC agents report to the operators only. All
   client-facing email belongs to Anchor inside the OS, where drafts queue
   for human approval.
4. **No delete powers.** Agents add and update; they never destroy.
5. **Report home every run** (see `INTEGRATION.md`) — title carries a number,
   summary is the real report. A run that doesn't report didn't happen.
6. **Voice:** plainspoken, zero corporate gloss, no hype words, no
   exclamation points. If a sentence could sit in any agency's deck, rewrite it.

---

## What's in this pack

```
START-HERE.md          this file
INTEGRATION.md         how agents connect to the OS (endpoints, secret, tests)
ROSTER.md              the full 44-unit org map for context
agents/
  jessica-jones.md     The Intel Brief — weekly Friday           (build 1st)
  black-widow.md       Revenue Leak Sweep — periodic             (build 2nd)
  maria-hill.md        Comms Triage — daily inbox brief          (build 3rd)
  ironheart.md         Production Board — daily                  (build 4th)
  speed.md             Publish Queue — daily                     (build 5th)
  war-machine.md       Ad Monitor — daily        (PARKED until ads are live)
  trish-walker.md      Episode Kit — per episode (PARKED until a show exists)
  systems-protocols.md Verification Loop · Goal Runner · Session Handoff
                       (your own build practices, not CRM-attached)
```

Ship one agent end-to-end (including its report-home step) before starting
the next.

**Build order — note the correction.** The individual briefs say Maria Hill is
"build 1st"; **that is superseded.** Maria Hill is the one agent blocked on
infrastructure that does not exist yet (the `hello@creativeimpactmedia.co`
mailbox). Build in this order instead:

1. **Jessica Jones** — needs only web search. Zero dependencies, so it is the
   fastest end-to-end proof that the bridge works.
2. **Black Widow** — defends the $100K number most directly. ⚠️ It correctly
   reports *nothing* against an empty board, so real deals/invoices/shoots must
   be entered first — otherwise a working agent looks broken and gets "fixed."
3. **Maria Hill** — the moment the mailbox exists and read access is granted.

## Before you can start (Brandon's two prerequisites)

1. **The bridge secret.** Brandon sets `FLEET_INGEST_SECRET` (a long random
   string) in Vercel → creative-impact-os → Settings → Environment Variables →
   redeploy — then shares that value with you via a password manager. Never
   in chat or email.
2. **Access per agent.** Each brief lists what the agent needs to see (inbox,
   ad account, channels). Brandon/Emmanuel grant those as each agent gets built.
