# Roadmap — what's left, in order

Ordered by leverage against the number: **$100K collected by Dec 31, signed by
Oct 31.** The One Thing: sell out August's four capture days.

Reality check on the math: four capture days at $2,400 = **$9,600**. The $100K
needs roughly **ten signed Authority Engine retainers** ($10,500 each over the
3-month term). Capture days are the wedge, not the number.

---

## THIS WEEK — nothing here is blocked, all of it is Brandon

**1. Enter August's four capture days as real inventory** · 15 min
The One Thing is to sell them, but the shoots table is empty — so the board
can't count them, flag them unsold, or sell against them. Tab **04 SHOOTS →
+ CAPTURE DAY** for each August Saturday, status OPEN.

**2. Turn on the public Audit booker and publish the link** · 30–45 min
The free 30-min Authority Audit fills those capture days. The booking engine is
built and public, but availability was never configured and the link has never
been shared. *Caveat: until email is live (#3), you must check the OS by hand
for new bookings.*

**3. Stand up email — new Resend account + DNS** · 1–2 hrs + propagation
**The biggest silent failure in the system.** Today a prospect can book and no
human is told. It also kills signed-proposal alerts, onboarding auto-responses,
the 3-day nudge, and every Anchor draft. Must be a **new** Resend account —
free tier allows one custom domain and Churlish used theirs. Needs whoever
controls `creativeimpactmedia.co` DNS.

**4. Create the `hello@creativeimpactmedia.co` mailbox** · 30–60 min
Every notification and Anchor send BCCs it by default. It doesn't exist, so
those copies go nowhere. Also the hard blocker on the Maria Hill agent. Both
founders need access. May need a paid Google Workspace/Zoho seat — unbudgeted.

**5. Load the real pipeline** · 2–3 hrs, then ongoing
The board ships empty on purpose, which means *every* derived number — coverage
ratio, the Tripwire flag, % of target, the gap math — is currently meaningless.
Until real deals are in, the cockpit is a beautiful zero.

**6. Confirm the seeded ladder and pricing with Emmanuel** · 1 hr
The database was seeded with Pilot $2,400 / Engine $3,500-mo 3-mo min /
Domination $6,000-mo. Those drive every proposal and onboarding form. **I chose
those defaults — you two have never ratified them.** Do it before a proposal
goes out.

**7. Add `ANTHROPIC_API_KEY` in Vercel + redeploy** · 15 min
Cheapest unlock in the build: turns on Anchor's drafting and the Showrunner
console (tab 16), both already coded and dark. Bill it to Creative Impact.

**8. Get Emmanuel actually logged in** · 30 min
Single shared login (never a second user). Half the product — the Partner Desk,
EB/BK check-ins, owner chips — is inert until he signs in.

**9. Commit to the weekly rhythm** · 30 min setup, ~20 min/week
Coverage, Tripwire, % of target all compute from numbers a human enters weekly.
An OS nobody updates is a dashboard of stale lies.

---

## MOVING THE BUILD

**10. Migrate to the new PC** · 1–2 hrs → see `NEW-PC-SETUP.md`
Everything engineering below happens from a working dev machine.

**11. Start entity + business bank account paperwork NOW** · days-to-weeks wait
The goal is *collected*, not just signed. Money needs somewhere to land, and
partnership bank accounts need an EIN and an operating agreement. **Longest
lead time on this list — start it before you need it.** Gates Stripe (#17).

---

## THE FLEET (Ja'Rel)

**12. Set `FLEET_INGEST_SECRET` + redeploy + bridge test** · 15 min · Brandon
One missing variable blocks the contractor's entire workstream. See
`docs/agent-pack/BRIDGE-CALL-WALKTHROUGH.md`.

**13. Stand up the CI Claude account + Ja'Rel's Windows user** · 45 min
Walls off Churlish, keeps agent ownership with Brandon, clean CI expense.
*Needs the CI mailbox (#4) to exist for signup and recovery mail.*

**14. Build Jessica Jones (Intel Brief) FIRST — not Maria Hill** · 2–4 hrs
⚠️ **This corrects the agent pack.** The pack says Maria Hill first, but she's
the only agent blocked on infrastructure that doesn't exist (the mailbox).
Jessica Jones needs only web search — fastest end-to-end proof the bridge works.

**15. Build Black Widow (Revenue Leak Sweep)** · 3–5 hrs
The agent that most directly defends the number. *Needs real data first — a
leak sweep over an empty board correctly reports nothing, which will look
broken and get "fixed."*

**16. Build Maria Hill (Comms Triage)** · 3–4 hrs · needs mailbox (#4)

**21. Ironheart + Speed (production board, publish queue)** · 3–4 hrs each
Deliberately premature until 2+ clients are in delivery.

**22. Commit every built agent back to `docs/agent-pack/built/`** · 20 min each
Otherwise the fleet lives only in a Claude account and evaporates if the
account, plan, or contractor changes.

---

## AFTER THE BANK ACCOUNT

**17. Wire Stripe** · 1–2 hrs · gated entirely on the bank account
Turns the OS from tracker into collector. Separate Stripe account from
Churlish. Use the **`sk_live_`** secret key — **not** an `mk_` management key
(that mistake cost Churlish a full day).

**18. Verify the daily cron does something** · 30 min · needs email
Vercel fires the sweep daily at 14:00 UTC and it currently completes having
done nothing visible — every branch ends in an email that silently no-ops.

**19. Ship the Authority Diagnostic as the paid front-end** · 1–2 days
The $750 teardown that credits into the retainer. **Do not assume the build
steps in `docs/authority-diagnostic/README.md` are still to-do — most are
already built. Audit the code first.**

**20. Inbound client email threads** · 1 hr · needs Resend
Replies file into the client's CRM thread. MX record must be exactly
`inbound-smtp.us-east-1.amazonaws.com` priority 10, lowercase, on a separate
subdomain.

**23. Wire the Clarity Engine (Lovable)** · half a day
OS half is built. *The Lovable schema must be introspected and the field map
confirmed — guessing silently corrupts lead data.*

---

## PARKED — deliberately, revisit when the trigger fires

| Item | Trigger |
|---|---|
| War Machine (ad monitor) | First live ad account |
| Trish Walker (episode kit) | A recurring show exists |
| Facebook lead import | A CI Facebook page + CI's own Meta app (**note: `FB_APP_ID` currently falls back to a different project's app ID**) |
| Android APK | Wanting a phone app. Save the signing keystore. `/.well-known/assetlinks.json` 404s today — the route needs building, the env var alone won't fix it |
