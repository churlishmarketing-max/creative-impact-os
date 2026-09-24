# EDITH — THE CHARLOTTE SPOTLIGHT EMAIL SYSTEM
Creative Impact OS · Automated sequences · Prepared September 24, 2026

EDITH is the Creative Impact assistant who signs every automated email that leaves the OS. Emmanuel is the human every email points back to. The companion files are `edith-automations.yaml` (the machine manifest) and `CLAUDE_CODE_BUILD_PROMPT.md` (the build instruction).

---

## 0. EDITH — VOICE AND HOUSE RULES

**Who she is.** Warm, direct, brief. She sounds like the sharpest assistant in a small shop — never a marketing department. She labels what the reader is probably feeling, asks one calibrated question, and asks for one thing. She never pushes, never discounts, never holds a spot, never projects a number.

**Sender:** `EDITH at Creative Impact <edith@creativeimpactmedia.co>` · Reply-to: Emmanuel's inbox. Every reply is read by a human within the same business day.

**Signature (every email, verbatim):**
```
EDITH
Creative Impact · Emmanuel's assistant — the AI kind. A human reads every reply.
hello@creativeimpactmedia.co
```
The disclosure line is not optional. It reads as honest and it pre-empts the "is this a bot" reply; that reply becomes "ha — okay, tell Emmanuel…" instead of a delete.

**Laws that travel with every email:**
- One CTA per email. One question per email.
- Plain text. No images in sequence emails. The only link is the CTA.
- Subject lines under 50 characters, honest preview of the email.
- Prices: never in cold outreach or the inbound sequence — the board page carries them. Post-call and client emails may name $997 and the $250 deposit.
- Numbers are receipts or spends. The Omaha line is always "22,000+ locals on its first $77" — never a projection for Charlotte.
- Send window 8:00 AM–6:00 PM ET, Monday–Saturday. No Sundays.
- Any reply stops the sequence and routes to Emmanuel. Any booking, deposit, or "stop" stops it.
- "Within a few days" is the only speed language allowed. Never a hard number of days in writing.

**Merge fields used:** `{{first_name}}` `{{business_name}}` `{{neighborhood}}` `{{years_in_business}}` `{{specific_detail}}` `{{q5_answer}}` `{{booking_link}}` `{{board_link}}` `{{call_time}}` `{{call_link}}` `{{spot_number}}` `{{deposit_link}}` `{{balance_link}}` `{{film_date}}` `{{cut_link}}` `{{episode_number}}` `{{episode_link}}` `{{reach_screenshot}}` `{{reach_number}}` `{{debrief_link}}` `{{spots_remaining}}` `{{rebook_link}}`

A cold email with an empty `{{specific_detail}}` does not send. It holds for a human.

---

## SEQUENCE 1 — COLD FIRST TOUCH (the templated outreach)
**Trigger:** Contact added with tag `cold_prospect` and `specific_detail` filled.
**Exit:** reply · booking · tag `do_not_contact` · after 1-3.
**Cadence:** Day 0 → Day 3 → Day 7 → stop. Three touches, then the file closes.

### EMAIL 1-1 — Cold open
```
Trigger:      Day 0, within the send window
Subject line: {{business_name}} and the Charlotte Spotlight
Preview text: One question, then I'll get out of your way.
```
Hi {{first_name}} — quick one, and then I'll get out of your way.

{{specific_detail}} That's how {{business_name}} ended up on our list.

Emmanuel Bibbs — ten years shooting Charlotte — is filming the Charlotte Spotlight this fall: a monthly series of short films about the people behind up to ten local businesses. Every business keeps a produced commercial to run anywhere, forever, and we put the episode in front of the city.

One question: when someone in {{neighborhood}} finds out about you for the first time, what do they usually say?

If it's some version of "I didn't know you were here," fifteen minutes with Emmanuel is worth it. He walks the board with you and tells you straight whether there's a spot that fits — or that there isn't.

{{booking_link}}

```
CTA:           Book the 15-minute fit call
Internal note: {{specific_detail}} is one sentence a human wrote after looking at the business (a review, a detail from their page, their location). Empty = hold, don't send.
```

### EMAIL 1-2 — The receipt
```
Trigger:      Day 3
Subject line: 22,000 people for $77
Preview text: Not a projection. A screenshot.
```
{{first_name}} — it seems like the first note landed in a busy week, which is fair.

Here's the one number worth your thirty seconds: the Omaha Spotlight reached more than 22,000 locals on its first $77 of promotion. Charlotte is the second city.

Ten spots per episode. Each business gets its own film, a commercial cut, and the episode promoted across the metro — and Emmanuel tells you which spot fits {{business_name}} in fifteen minutes.

Would it be a bad idea to grab that call before the board fills?

{{booking_link}}

```
CTA:           Book the fit call
Internal note: The "would it be a bad idea" question is Voss — a "no" is a yes. Keep it.
```

### EMAIL 1-3 — Close the file
```
Trigger:      Day 7
Subject line: Should I close the file, {{first_name}}?
Preview text: No hard feelings either way.
```
{{first_name}} — I don't want to keep landing in your inbox if this isn't the season for {{business_name}}.

Should I close your file? A one-word reply is fine either way, and if the timing's just off, say "later" and I'll check back when the next board opens.

{{booking_link}}

```
CTA:           Reply (or book)
Internal note: Any reply routes to Emmanuel. "Later" = tag `nurture`, enroll in Sequence 7. No reply = tag `cold_closed`, no further sends.
```

---

## SEQUENCE 2 — INBOUND LEAD, NO CALL BOOKED
**Trigger:** Form submitted (`lead.form_submitted`), no booking within 10 minutes.
**Exit:** booking · reply · deposit · after 2-5.
**Cadence:** Immediately → Day 1 → Day 3 → Day 6 → Day 10.

### EMAIL 2-1 — Speed to lead
```
Trigger:      Within 5 minutes of form submission
Subject line: Got your form — next step takes 2 minutes
Preview text: Emmanuel may also call you today.
```
{{first_name}} — got it. Thanks for filling that out.

You wrote: "{{q5_answer}}" That's exactly the kind of thing the Spotlight is built to say for you.

Next step is a fifteen-minute fit call with Emmanuel. He'll ask about the business, walk the board with you, and tell you straight which spot fits — or if none does. Prices are already public on the board, so nothing on the call will surprise you: {{board_link}}

Grab a time here: {{booking_link}}

Emmanuel may also just call you today. If a Charlotte number rings, that's him.

```
CTA:           Book the fit call
Internal note: {{q5_answer}} = their answer to "What would you want Charlotte to finally understand about your business?" Trigger a task for Emmanuel: call within the hour.
```

### EMAIL 2-2 — The one question
```
Trigger:      Day 1
Subject line: The one question Emmanuel will ask you
Preview text: It decides which spot — if any.
```
{{first_name}} — it seems like you're wondering whether this actually works for a business like {{business_name}}.

Fair. So here's the question Emmanuel asks on every call: who's the face of the business, and are they willing to sit down for twenty minutes and talk about it?

If the answer is you — even reluctantly — you're a fit for a feature. If nobody wants to be on camera, there's still a spot; the film just gets built from the work itself.

Either way, the call is where you find out. {{booking_link}}

```
CTA:           Book the fit call
```

### EMAIL 2-3 — Proof
```
Trigger:      Day 3
Subject line: What the Omaha episode actually did
Preview text: Watch it — then decide.
```
{{first_name}} — before you decide anything, watch the original.

The Omaha Spotlight is the same format we're bringing to Charlotte: short films about the people behind everyday businesses. That first episode reached more than 22,000 locals on its first $77 of promotion. Not a projection — a screenshot Emmanuel will show you.

Here's the episode: {{episode_link}}

If you'd want that for {{business_name}}, the fit call is fifteen minutes: {{booking_link}}

```
CTA:           Book the fit call
Internal note: {{episode_link}} = the Omaha original (https://youtu.be/wNylbkgS1mQ) until Charlotte Episode 1 exists, then Episode 1.
```

### EMAIL 2-4 — The board is filling
```
Trigger:      Day 6
Subject line: {{spots_remaining}} spots left on the board
Preview text: Spots assign at payment. Nobody holds one.
```
{{first_name}} — straight update: {{spots_remaining}} of the ten spots are still open for this episode.

Spots assign the moment a deposit clears, and Emmanuel doesn't hold them — for anyone. When this board fills, the next one opens next month, and the businesses on it get filmed then.

What would need to be true for you to grab fifteen minutes this week? {{booking_link}}

```
CTA:           Book the fit call
Internal note: {{spots_remaining}} pulls live from the board. If 0, the engine sends 2-4-full instead.
```

### EMAIL 2-4-full — Variant: board is full
```
Trigger:      Day 6, only when spots_remaining = 0
Subject line: This board's full — next one opens {{next_board_date}}
Preview text: You're first in line if you want it.
```
{{first_name}} — straight update: this episode's board filled.

The next one opens {{next_board_date}}, and the businesses on it get filmed that month. If you want {{business_name}} on it, grab fifteen minutes with Emmanuel now and you're first in line when it opens: {{booking_link}}

```
CTA:           Book the fit call
```

### EMAIL 2-5 — Graceful exit
```
Trigger:      Day 10
Subject line: Have you given up on this?
Preview text: Honest answer wanted. No pitch attached.
```
{{first_name}} — have you given up on the Spotlight for {{business_name}}?

That's a real question, not a guilt trip. If the answer is yes, reply "yes" and I'll stop. If it's "not yet, just busy," reply that and I'll check back when the next board opens.

If it's "actually, let's talk" — {{booking_link}}

```
CTA:           Reply
Internal note: Exit ramp. No reply = tag `nurture`, enroll in Sequence 7. Any reply = Emmanuel.
```

---

## SEQUENCE 3 — BOOKED → SHOW
**Trigger:** `call.booked`.
**Exit:** call completed · call cancelled · no-show (→ Sequence 4).

### EMAIL 3-1 — Confirmation
```
Trigger:      Immediately on booking
Subject line: You're on Emmanuel's calendar — {{call_time}}
Preview text: Fifteen minutes. Nothing to prepare.
```
{{first_name}} — locked in: {{call_time}} with Emmanuel.

What it is: fifteen minutes. He asks about {{business_name}}, walks the board with you, and tells you straight which spot fits — or if none does.

Prices are already on the board, so there are no surprises on the call: {{board_link}}

Nothing to prepare. Join here: {{call_link}}

```
CTA:           Add to calendar / join link
Internal note: Attach the .ics.
```

### EMAIL 3-2 — 24-hour reminder
```
Trigger:      24 hours before call_time
Subject line: Tomorrow at {{call_time}} — one thing to have ready
Preview text: Just one.
```
{{first_name}} — tomorrow at {{call_time}}.

One thing to have ready: the answer to "what do you want Charlotte to finally understand about {{business_name}}?" You already wrote a version — Emmanuel will build from it.

Join here: {{call_link}}

If you need to move it, reply and I'll reschedule you.

```
CTA:           Show up (link)
```

### EMAIL 3-3 — One-hour reminder
```
Trigger:      60 minutes before call_time
Subject line: In an hour — here's your link
Preview text: {{call_time}} with Emmanuel.
```
{{first_name}} — {{call_time}}, one hour out. Here's the link: {{call_link}}

See you shortly.

```
CTA:           Join
```

---

## SEQUENCE 4 — NO-SHOW
**Trigger:** `call.no_show` (marked by Emmanuel or auto after 15 min).
**Exit:** rebooking · reply · after 4-3.

### EMAIL 4-1 — No stress
```
Trigger:      Within 1 hour of no-show
Subject line: Missed you — no stress
Preview text: Grab another time whenever works.
```
{{first_name}} — life happens; Emmanuel's run a business long enough to know.

Here's the calendar whenever it works: {{rebook_link}}

```
CTA:           Rebook
```

### EMAIL 4-2 — What you'd have heard
```
Trigger:      Day 2
Subject line: What you'd have heard on the call
Preview text: Fifteen minutes, one straight answer.
```
{{first_name}} — quick version of what the call is, in case it helps decide whether to rebook:

Emmanuel asks about {{business_name}}, shows you the board, and tells you which spot fits — or that none does. Owners leave with a straight answer either way. Last week one of them left with a film date instead.

{{rebook_link}}

```
CTA:           Rebook
Internal note: The "last week" line must be true. If it isn't yet, delete the sentence.
```

### EMAIL 4-3 — Close the file
```
Trigger:      Day 5
Subject line: Should I close your file?
Preview text: One word either way is fine.
```
{{first_name}} — it seems like now might not be the right time. Should I close your file?

If the timing's just off, reply "later" and I'll check back when the next board opens.

{{rebook_link}}

```
CTA:           Reply
Internal note: No reply = tag `nurture`. "Later" = Sequence 7.
```

---

## SEQUENCE 5 — POST-CALL, UNDECIDED
**Trigger:** `call.completed` with outcome `undecided` (Emmanuel tags it: recommended spot + "thinking about it").
**Exit:** deposit paid · reply · outcome changed · after 5-3.

### EMAIL 5-1 — Recap, same day
```
Trigger:      2 hours after call end
Subject line: Recap from today — Spot {{spot_number}}
Preview text: What Emmanuel recommended, in writing.
```
{{first_name}} — good talking with Emmanuel today. Here's the recap so you're not working from memory.

His read: {{business_name}} is a Spot {{spot_number}}. What that includes — your own film, your commercial cut, your place in the episode, the season promoted across the metro, and a walk-through of the numbers afterward.

The spot is $997: a $250 deposit claims it, the balance on film day. Spots assign at payment and nobody holds one — if it's gone when you're ready, the next open position is the offer.

And the safety line: if the episode doesn't reach its filming floor, you choose — roll to the next season at the same spot and price, or every dollar back. It's in the agreement.

Deposit here when you're ready: {{deposit_link}}

```
CTA:           Pay the deposit
Internal note: {{spot_number}} from Emmanuel's call outcome. If he recommended "not a fit," Sequence 5b fires instead.
```

### EMAIL 5-2 — What would need to be true
```
Trigger:      Day 2
Subject line: What would need to be true?
Preview text: One honest question.
```
{{first_name}} — it seems like you're weighing whether the Spotlight is the right spend for {{business_name}} right now.

So — what would need to be true for it to make sense?

If the hesitation is "that's a lot for a short segment," the reframe Emmanuel would give you: you're not buying seconds. You're buying position in a season the city sees, a produced commercial you own and run as your own ad, and someone showing you afterward what the attention did.

If the hesitation is something else, reply and tell me — that's what I'm here for.

{{deposit_link}}

```
CTA:           Reply (or deposit)
```

### EMAIL 5-3 — Different direction?
```
Trigger:      Day 5
Subject line: Different direction?
Preview text: Either answer helps us plan the board.
```
{{first_name}} — have you decided to go a different direction on Spot {{spot_number}}?

Either way, I'd like to know so Emmanuel can plan the board. If it's a yes, the deposit link still works: {{deposit_link}}

If it's a no, thanks for the time — and I'll let you know when the next board opens.

```
CTA:           Reply
Internal note: No reply = tag `nurture`, spot released to the board. Any reply = Emmanuel.
```

### EMAIL 5b-1 — Not a fit (Sequence 5b, one email)
**Trigger:** `call.completed` with outcome `not_fit`.
```
Trigger:      2 hours after call end
Subject line: Straight answer, as promised
Preview text: Why, and what would change it.
```
{{first_name}} — Emmanuel said he'd give you a straight answer, so here it is in writing: {{business_name}} isn't a fit for this board.

The reason: {{not_fit_reason}}

What would change it: {{what_would_change}}

You'll hear from me when the next board opens. In the meantime, thanks for the fifteen minutes — you were straight with us too.

```
CTA:           None
Internal note: Both merge fields come from Emmanuel's outcome note. Empty = hold for human. Tag `nurture`.
```

---

## SEQUENCE 6 — CLIENT LIFECYCLE
**Trigger:** `deposit.paid`.
**Exit:** none — this runs to the debrief. Steps are event-anchored, not day-counted.

### EMAIL 6-1 — Welcome + timeline
```
Trigger:      Immediately on deposit
Subject line: Spot {{spot_number}} is yours — the whole timeline
Preview text: Film date, delivery, episode, promotion, numbers.
```
{{first_name}} — welcome to the season. Spot {{spot_number}} is yours; {{business_name}} is on the board.

Here's the whole timeline in one place:
- Film day: {{film_date}} — the $747 balance is due that day
- Your cut delivered: within a few days of filming. You get five days for one round of tweaks
- Episode {{episode_number}} releases, then the season promotion runs for a month
- Your numbers: I'll send them mid-flight, and Emmanuel walks you through the full picture afterward

Next thing you'll get from me: the prep note a few days before film day.

```
CTA:           None
Internal note: Attach the agreement countersigned copy. film_date from Emmanuel's close notes.
```

### EMAIL 6-2 — Prep note
```
Trigger:      3 days before film_date
Subject line: Film day {{film_date}} — what to expect
Preview text: Give the team a heads-up. Cameras make people weird.
```
{{first_name}} — film day is {{film_date}}.

What to expect: Emmanuel is on site about a morning. Give the team a heads-up — cameras make people weird for ten minutes and then everyone forgets he's there.

Wear what you'd wear on your best workday; solid colors beat patterns. Have the space looking like you'd want the city to see it.

You'll sit down for about twenty minutes of conversation — no memorizing anything, just you talking about {{business_name}}.

```
CTA:           None
```

### EMAIL 6-3 — Day-before
```
Trigger:      1 day before film_date
Subject line: Tomorrow — balance link and one reminder
Preview text: $747 due on film day. Team heads-up done?
```
{{first_name}} — tomorrow's the day.

The $747 balance is due on film day; here's the link so it's one less thing: {{balance_link}}

One reminder: tell the team a camera's coming. It goes better when nobody's surprised.

```
CTA:           Pay the balance
Internal note: If balance.paid was already seen, the engine sends 6-3-paid instead.
```

### EMAIL 6-3-paid — Variant: balance already paid
```
Trigger:      1 day before film_date, only when balance.paid seen
Subject line: Tomorrow — you're all set
Preview text: One reminder for the team.
```
{{first_name}} — tomorrow's the day, and you're paid up. Nothing to do.

One reminder: tell the team a camera's coming. It goes better when nobody's surprised.

```
CTA:           None
```

### EMAIL 6-4 — Cut delivered
```
Trigger:      Event `cut.delivered`
Subject line: Your cut is ready — 5 days for tweaks
Preview text: One round. Factual fixes, trims, on-screen text.
```
{{first_name}} — your cut is ready: {{cut_link}}

You have five days for one round of tweaks — factual corrections, trims, on-screen text. Reply with them in one list and Emmanuel handles it.

If I don't hear from you in five days, it's approved as-is and heads into the episode. Kindly said: silence is a yes.

```
CTA:           Reply with revisions (or nothing)
Internal note: Approval window = 5 days from send. Reply = task for Emmanuel. No reply at day 5 = auto-approve, tag `cut_approved`.
```

### EMAIL 6-5 — Last day for tweaks
```
Trigger:      Day 4 after 6-4, only if no reply
Subject line: Last day for tweaks
Preview text: Tomorrow it locks.
```
{{first_name}} — tomorrow your cut locks and goes into the episode.

If there's anything to fix, reply today in one list. If it's good as-is, do nothing — that's a yes.

{{cut_link}}

```
CTA:           Reply (or nothing)
```

### EMAIL 6-6 — You're live
```
Trigger:      Event `episode.published`
Subject line: You're live — Episode {{episode_number}}
Preview text: Watch, share, and run your commercial.
```
{{first_name}} — Episode {{episode_number}} is live, and {{business_name}} is in it: {{episode_link}}

Two things worth doing today:
1. Share the episode — tag Creative Impact and we'll push it from our side.
2. Run your commercial cut. It's yours; your page, your ads, your website. The businesses that get the most out of this are the ones whose cut is already running when the promotion starts.

The season promotion runs for the next month. I'll send your numbers mid-flight.

```
CTA:           Watch/share the episode
```

### EMAIL 6-7 — Mid-flight numbers
```
Trigger:      Day 15 of the promotion window
Subject line: Mid-season numbers, straight from the dashboard
Preview text: Reach so far, screenshot attached.
```
{{first_name}} — mid-flight, straight from the dashboard: the season has reached {{reach_number}} people so far. Screenshot attached: {{reach_screenshot}}

Full walk-through with Emmanuel once the month closes. Nothing to do today.

```
CTA:           None
Internal note: reach_number and screenshot come from the Friday receipt pull. Empty = hold.
```

### EMAIL 6-8 — Debrief invite
```
Trigger:      Event `promo.ended`
Subject line: Your numbers are in — 20 minutes with Emmanuel
Preview text: The real picture, and one recommendation.
```
{{first_name}} — the promotion month is done and your numbers are in.

Emmanuel does a twenty-minute debrief with every business on the board: what the season reached, what it did for {{business_name}}, and one recommendation for what to run next. No pitch — a recommendation.

Grab a time: {{debrief_link}}

```
CTA:           Book the debrief
Internal note: If not booked in 5 days, the engine sends 6-8-reminder once, then stops.
```

### EMAIL 6-8-reminder — Debrief, one reminder
```
Trigger:      5 days after 6-8, only if debrief not booked
Subject line: Twenty minutes — still open
Preview text: Your season numbers, walked through.
```
{{first_name}} — Emmanuel's debrief slots for this season close soon, and yours is still open.

Twenty minutes: what the season reached, what it did for {{business_name}}, one recommendation. {{debrief_link}}

If you'd rather skip it, no problem — your cut is yours to run either way.

```
CTA:           Book the debrief
```

---

## SEQUENCE 7 — MONTHLY NURTURE (episode drops)
**Trigger:** `episode.published` → everyone tagged `nurture`, `cold_closed` (opted in), or past clients not in an active sequence.
**Cadence:** Once per episode. One email.

### EMAIL 7-1 — Episode drop
```
Trigger:      Day of episode publish
Subject line: Episode {{episode_number}} is live — {{featured_count}} Charlotte businesses
Preview text: Watch it. The next board is open.
```
{{first_name}} — Episode {{episode_number}} of the Charlotte Spotlight just dropped: {{featured_count}} local businesses, the people behind them, and the reasons their regulars already know.

Watch it here: {{episode_link}}

The next board is open. If {{business_name}} should be in the next one, fifteen minutes with Emmanuel is where that starts: {{booking_link}}

```
CTA:           Watch (booking link secondary — the only exception to one-link, because the watch IS the value)
Internal note: Unsubscribe footer required on this one; it's list mail.
```

---

## QUALITY GATE (run before any sequence goes live)
- [ ] Every email: one CTA, one question, under 50-char subject, first line labels the reader's situation
- [ ] No prices in Sequences 1–4. $997 / $250 / $747 appear only in 5 and 6
- [ ] The Omaha line reads as a receipt everywhere; no Charlotte reach projections anywhere
- [ ] No hard number of days for filming speed anywhere
- [ ] Merge-field holds: `specific_detail`, `q5_answer`, `not_fit_reason`, `reach_number` — empty means hold, never send blank
- [ ] Reply/booking/deposit/stop exits wired on every sequence
- [ ] Sequence 7 carries an unsubscribe footer; Sequence 1 carries a physical address line (CAN-SPAM)
- [ ] Banned words scan: clean
