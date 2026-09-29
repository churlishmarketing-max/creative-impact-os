// The Charlotte Spotlight cold-call script, inside the OS (Spotlight → Call
// Script, and EDITH's spotlight_call_script tool). Pure: no imports but the
// offer, so the cockpit and the server render it the same way.
//
// Source: charlotte-spotlight-call-script-and-emails.docx (Sep 19, v3 opener),
// uploaded by Brandon 2026-09-29. Changes from the document, all deliberate:
//   - Prices: the Aug 21 price board (Brandon 9/29: "You have the pricing
//     wrong") — spots are paid in full at booking. Every "$997 / $250 holds it
//     / $747 at filming" line now reads from the board in Spotlight → Settings.
//   - "A commercial you own forever / own outright" → "yours to run anywhere,
//     forever": the agreement (§7) grants a perpetual license; the Company
//     keeps the copyright. The script shouldn't promise more than the contract.
//   - New: Brandon's short opener (9/29), and the caller's name fills in.
//   - Section 9 (the cold emails) points to EDITH, who sends them now.
// Everything else is the document's own words.
import { money, spotTier } from "./spotlight-offer";

export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "say"; text: string; label?: string; byCaller?: Record<string, string> }
  | { t: "note"; text: string }
  | { t: "list"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "box"; title: string; text: string }
  | { t: "board" }
  | { t: "gaps" };
export type Section = { id: string; title: string; blocks: Block[] };

export const SCRIPT_SOURCE = "Sep 19 call script (v3 opener) · prices from the Aug 21 board · Brandon’s short opener (Sep 29)";

const say = (text: string, label?: string): Block => ({ t: "say", text, label });
const note = (text: string): Block => ({ t: "note", text });
const p = (text: string): Block => ({ t: "p", text });
const h = (text: string): Block => ({ t: "h", text });

export const SECTIONS: Section[] = [
  {
    id: "first", title: "0 · Read this first", blocks: [
      p("This is the Churlish cold-call system — the NEPQ opener, the engagement questions, the Clarify → Discuss → Diffuse objection format — ported onto one offer: Charlotte Spotlight. Same method, different city, one product. Register is call-out. The caller’s name fills in from the switch at the top; the lines are the same whoever dials."),
      { t: "box", title: "The goal of the cold call is the slot", text: "Default path is a one-shot close: engage, present, price, claim the slot on this call. The calendar is the fallback, not the plan — and it only comes out when an objection genuinely can't be resolved on the line (a partner who isn't there, a budget that needs checking, examples they need to see). When that happens you lock the second call on the calendar while they're still on the phone, send the package that answers the objection, and the second call is a close, not a conversation." },
      h("The offer in one breath"),
      p("We film ten Charlotte businesses a month for a local series. Each one walks away with a fully produced commercial that's theirs to run anywhere, forever, at a fraction of the $3,000–$5,000 solo-production quote, and the series puts it in front of the city. Fill out the form, meet the team, we film in two to four days. First episode drops {{episodeDate}}. Ten spots a month, filled in order."),
      h("Three rules that don't bend"),
      { t: "list", items: [
        "Price never leads, but it always arrives — and it's set. It's the price board: Community spots {{communityRange}}, Feature spots {{featureRange}}, paid in full at booking. It comes after the engagement questions and the trial close, then silence. Never lead a cold call with it, never discount it on the phone, and never quote add-ons cold — a second cut or a longer piece is a pre-production-call conversation.",
        "No invented proof. This is a new series — say so. The team behind Creative Impact has produced 500+ videos (that's a real, aggregate Churlish receipt). There is no Charlotte case study yet, and pretending otherwise is the fastest way to lose a call in a small market. 'We're proving this now, and the first ten are getting in while it's cheap' outsells a fake testimonial every time.",
        "No guarantees. Not lead counts, not results, not 'the city will see you.' The series runs the video — blog post, YouTube episode, Facebook ad — that's the promise. Anything stronger is the July Meta rejection all over again, in a human's memory this time.",
      ] },
      h("The price board"),
      p("The August 21 price board (the invoice template) — confirmed September 29, replacing the September 19 $997 / $250 / $747 model. Each spot is paid in full at booking; the spot is assigned when payment clears. Prices live in Spotlight → Settings."),
      { t: "board" },
      note("The season floor: if fewer than three businesses are filmed by {{floorDate}}, the episode doesn't assemble — Community spots choose a roll-over or a full refund; Feature spots keep their commercial and promoted week, and their segment rolls to the next season (agreement §6)."),
      h("Before you dial — the 90-second prep"),
      { t: "list", items: [
        "Open their card in the pipeline. You need three numbers in your head before the phone rings: years in business, Google review count, and their video situation (None / Minimal). If they're empty, fill them first — the entire opener runs on those three facts.",
        "Pull the vertical hook from section 7. Know what 'the gap' sounds like for a roofer versus a med spa.",
        "Tone: low-key, a little unsure, curious. Say your name twice. Slow down. You're calling to find out, not to tell.",
        "Have two calendar slots ready — a morning and an afternoon, different days. You'll offer them as 'which is worse.'",
      ] },
    ],
  },
  {
    id: "opener", title: "1 · The opener — conversational", blocks: [
      p("Four steps. The point is to earn a real conversation in the first thirty seconds, with the owner, not a gatekeeper. The identify line stays deliberately under-confident; everything after it is a person telling another person what they noticed about the city."),
      h("The short version (new — Sep 29)"),
      say("Hey, this is {{caller}} with Creative Impact. We're a production company moving into the Charlotte metro, and we're starting a new series that focuses on local businesses. I'm reaching out to see if you'd be interested in being featured on the show — or having your own commercial made as part of it."),
      note("Brandon's wording. Use it when the owner wants the point fast, or as the one line you give a gatekeeper — then go to Step 4's question: 'Can I ask you a couple of things about {{business}} to see where it'd fit?' ('An episode dedicated to you' became 'your own commercial made as part of it' — every business gets a segment, Feature spots get a commercial of their own; nobody gets a whole episode.)"),
      h("Step 1 — Get the owner on the phone"),
      say("Hey — is this {{firstName}}?", "IF YOU HAVE THE NAME"),
      say("Hey, quick one — who's the owner over there? … Is [Name] around?", "IF YOU DON'T"),
      say("We're a production company that just moved into Charlotte — we're filming ten local {{industry}} businesses for a series and {{business}} came up. Is [Name] the one who'd make that call?", "IF THE GATEKEEPER ASKS WHAT IT'S REGARDING"),
      note("Don't pitch anyone who can't say yes. Get the name and a time, and call back. A pitch to the front desk is a pitch that gets summarized wrong."),
      h("Step 2 — Identify yourself, low-key"),
      say("{{firstName}}... this is just {{caller}}... {{caller}} with Creative Impact here in Charlotte. I was wondering if you could help me out for a second?"),
      note("Slightly unsure, unhurried. Say the name twice. Then nothing — let them say 'sure, what's this about.' Do not fill the silence."),
      h("Step 3 — The thing we noticed"),
      say("Well — I'm not sure you can yet. Here's the deal. We're a film and production company. We built the business in Omaha, Nebraska, and we just expanded into Charlotte. And since we got out here, one thing keeps coming up: there are a lot of {{industry}} businesses around Charlotte with genuinely incredible reviews — I mean, {{business}} has {{reviews}} of them — and nobody knows they exist. Or the traffic's fine, it's just… average, when the reviews say it should be a lot more than average. Is that something you've noticed?"),
      note("The problem framed as an observation about the city, not an accusation about them. The review count is what makes it personal instead of a script — which is why it gets filled before you dial."),
      h("Step 4 — The story, with a check-in in the middle"),
      { t: "say", text: "Yeah. So quick background — I've been a photographer here in Charlotte about ten years, mostly families. My business partner Brandon works with businesses. And after talking to a lot of owners, the thing that stopped almost every one of them from doing a commercial was the price — it runs anywhere from three to ten grand depending on who you call. Which I get. But most small businesses don't have an extra five grand sitting around for a commercial. Sound about right?", byCaller: {
        Brandon: "Yeah. So quick background — my business partner Emmanuel has been a photographer here in Charlotte about ten years, mostly families. I'm the one who works with businesses. And after talking to a lot of owners, the thing that stopped almost every one of them from doing a commercial was the price — it runs anywhere from three to ten grand depending on who you call. Which I get. But most small businesses don't have an extra five grand sitting around for a commercial. Sound about right?",
        other: "Yeah. So quick background — Emmanuel, one of our founders, has been a photographer here in Charlotte about ten years, mostly families, and his partner Brandon works with businesses. And after talking to a lot of owners, the thing that stopped almost every one of them from doing a commercial was the price — it runs anywhere from three to ten grand depending on who you call. Which I get. But most small businesses don't have an extra five grand sitting around for a commercial. Sound about right?",
      } },
      note("Let them answer. Almost everyone says some version of 'yeah, I priced it once.' That's the quote in the inbox — log the number they say."),
      say("So we made the Charlotte Spotlight. Think Diners, Drive-Ins and Dives — but for businesses, not just restaurants. We film ten Charlotte businesses a month. Each one gets a fully produced commercial that's theirs to run anywhere, forever. And it doesn't just sit on your website — every episode goes out as a blog post, a YouTube video, and we run it as a Facebook ad so the whole city actually sees it. Because ten businesses share the shoot, spots start at {{minPrice}} instead of five grand."),
      say("There's a spot for every kind of business — we just do ten a month, so they go in order. Can I ask you a couple of things about {{business}} to see where it'd fit?"),
      note("That last question is the bridge into section 2. Permission-based, short, and 'where it'd fit' presumes there's a fit. 'A spot for every kind of business' reassures without removing the clock — do not say 'everyone has a spot.'"),
      { t: "box", title: "Why 'three to ten grand' and not 'five to ten'", text: "The ad, the emails, and the lead form all say $3,000–$5,000. A prospect who saw the video and then gets the call needs to hear the same story. 'Three to ten depending on who you call' contains the ad's number and is true." },
    ],
  },
  {
    id: "engage", title: "2 · Engagement — let them say the problem", blocks: [
      p("Three to four minutes, no more. Ask, then shut up. The owner should be doing eighty percent of the talking. Your job is to get them to describe the gap in their own words — because once they've said it, the offer is the obvious next sentence, not a pitch."),
      { t: "table", head: ["Stage", "Ask", "What you're listening for"], rows: [
        ["Situation", "\"How are most of your customers finding you right now?\"", "'Referrals' / 'word of mouth' = the gap. 'Google' = ask what they find there."],
        ["Situation", "\"Have you ever had a commercial or any real video made? What happened?\"", "The quote number. Almost always $3,000–$5,000, almost always still in an inbox."],
        ["Problem", "\"What's that costing you — the jobs that go to the one they've seen?\"", "A number, a competitor's name, or a story. Any of the three is gold."],
        ["Problem", "\"If somebody in {{suburb}} searched for you tomorrow, what would they find?\"", "Silence or 'not much' — that's the 'that's right' moment. Don't rescue them from it."],
        ["Solution", "\"If Charlotte actually knew who you were — what changes for you next [spring/January/Q1]?\"", "Tie to their season (section 7). Let them picture it."],
        ["Consequence", "\"What happens if another {{vertical}} company in {{suburb}} gets filmed for this and you don't?\"", "Ten slots, filled in order. They'll do the math themselves."],
        ["Qualifying", "\"Is getting in front of the city something you'd want to fix this fall — or is it more of a someday thing?\"", "'This fall' → section 3. 'Someday' → note the month, Not now lane."],
      ] },
      note("Two-question minimum, four-question maximum. If they're talking, don't interrupt to hit the next question. The list is a map, not a checklist."),
    ],
  },
  {
    id: "present", title: "3 · Transition and presentation — sixty seconds", blocks: [
      p("You only get here after two to four engagement questions. If they haven't described the gap in their own words yet, you're pitching, and pitching on a cold call is how you earn 'send me an email.'"),
      say("Based on what you've told me, here's how it works. We film ten businesses a month. You fill out a two-question form — I'll do it with you in a second — you meet the team, we tell you which spot fits, and we're in your business filming within two to four days."),
      say("You walk away with a fully produced commercial that's yours to run anywhere, forever — Meta, YouTube, your site, a billboard on 485 if you want. And the episode goes out three ways — a blog post, a YouTube video, and a Facebook ad we run — so the city actually sees it. First episode drops {{episodeDate}}. Ten spots, filled in order."),
      h("The honest new-series line — say it before they ask"),
      say("I'll be straight with you: it's a new series. Episode one's {{episodeDate}}. The ten businesses in it are getting in while it's cheap to get in, and they're the ten the whole city sees first."),
      note("Proof Law in one sentence. Own the newness and the 'who are you' objection mostly never comes."),
    ],
  },
  {
    id: "close", title: "4 · The one-shot close — the default", blocks: [
      p("Five moves, in order, no skipping. The trial close does the selling, the price is one sentence, and the lock happens while they're still on the phone. Slow down here — most one-shot closes are lost by the caller filling the silence after the number."),
      h("Move 1 — Trial close"),
      say("Do you feel like this could be the thing that finally gets {{business}} seen?"),
      say("Why do you feel that, though?"),
      note("The second question is the close. Their answer is them selling themselves — do not talk over it. If the answer is thin ('I guess, maybe'), you're not there yet: go back to one Consequence question, then try again."),
      h("Move 2 — The spot and the price"),
      say("Then here's your spot. It's Spot {{spotNo}}, a {{tier}} spot — {{fee}}, paid once at booking. {{tierPitch}}"),
      note("Pick the spot from the board before you say it (the spot switch at the top fills this in). Then nothing. Count to five in your head. Whoever speaks next is answering the other one's question, and you want it to be them. If they ask what else there is: \"That's the whole thing. If you want a second cut or a longer piece we'll talk about it on the pre-production call — nothing you have to decide today.\""),
      h("Move 3 — Lock it while they're on the line"),
      say("Two things and you're in. I'm texting you the form right now — two questions, sixty seconds, I'll wait. And the payment link — the spot's paid once, at booking, and that's what takes it off the board."),
      note("Stay on the phone through both. 'I'll do it after we hang up' is a slot that doesn't get claimed. If they hesitate on paying: \"Paying is what makes it yours instead of the next business's — that's the only thing it does.\" The payment link comes from Spotlight → Close a Spot: pick the spot, their details, Send — they get the invoice email with a Stripe pay button (or copy the pay link and text it while you're on the line)."),
      h("Move 4 — Filming date"),
      say("The team calls you [day] to lock the filming date — that's two to four days out. Is a morning shoot or an afternoon shoot worse for you?"),
      note("Get the preference now. It makes the pre-production call a confirmation instead of a negotiation."),
      h("Move 5 — Confirm and release"),
      say("Best email for the confirmation is {{email}}, and this is the number the team should call? … You're in. Watch for the email in the next hour — it's got the spot, the date the team calls, and what to have ready."),
      { t: "list", items: [
        "Send the confirmation email inside the hour (their card → Emails → Confirmation). Log: vertical, spot number, payment status, the quote number they mentioned, the season they named.",
        "Hand off to the pre-production call. That call is delivery, not sales — the sale is done.",
      ] },
      { t: "box", title: "Closed means all three", text: "Form submitted, the spot paid in full, and the pre-production call date set. Two out of three is a warm lead, not a slot. Log it that way." },
    ],
  },
  {
    id: "pivot", title: "5 · The pivot — when one call can't close", blocks: [
      p("Some objections resolve on the phone. Some can't, because the thing that would resolve them isn't on the call — a spouse, a bank balance, a video they haven't watched. The mistake is treating those the same. Resolve the first kind and go back to Move 1. For the second kind, do not keep selling: pivot to the calendar immediately, while they're warm, and make the second call the close."),
      h("Which objections pivot"),
      { t: "table", head: ["Objection", "Lane", "Why"], rows: [
        ["Not interested / busy / send an email", "Resolve on the call", "These are reflexes, not decisions. One question each (section 8) and you're back in the engagement."],
        ["How much? · Referrals carry us · Burned before · Not good on camera · Who are you?", "Resolve on the call", "Each has a one-paragraph answer. Answer it, then return to Move 1."],
        ["Talk to my partner / spouse", "PIVOT", "The decision-maker isn't on the line. You cannot close a person who isn't there."],
        ["Need to see examples first", "PIVOT", "They need to watch something you can't play over the phone. Send it, then close on what they saw."],
        ["Need to check the budget / cash flow this month", "PIVOT", "A number they need to look up. Book the call for after they've looked."],
        ["Let me think about it — after one real answer", "PIVOT", "You've answered the stated objection and there's still hesitation. That's an unstated one, and it needs a second conversation, not a third paragraph."],
      ] },
      h("The pivot script — lock the calendar while they're on the phone"),
      say("That makes sense — sounds like [the partner needs to be in the room / you want to see the work first / the timing needs a look]. Here's what I'd do. Rather than you chasing me or me chasing you, let's put fifteen minutes on the calendar right now, and between now and then I'll send you [the thing that answers it]. Tuesday at ten or Thursday at two — which one's worse?"),
      note("Label the objection back to them, propose the call as a favour to them, offer two specific times. Never 'when works for you' — that's a call that doesn't happen."),
      say("Good. [Day] at [time]. Invite's going to {{email}} while we're talking — tell me when it lands."),
      note("Send it on the call. Confirmed receipt is the commitment."),
      say("One thing so it's fair to you: I'll hold the {{vertical}} slot until we talk [day]. After that it goes to the next one on the list — not pressure, just how the ten fill."),
      note("Pre-frame the second call as the decision. They now know what the call is for, and you've earned the right to close on it."),
      h("What goes in the pre-call package (send within the hour)"),
      { t: "table", head: ["They pivoted on", "Send", "Line in the email"], rows: [
        ["Partner / spouse", "The post-call email with the offer in three lines, the price, and the two-question form", "\"Forward this to [partner] — it's the whole thing in three lines so you're not translating it.\""],
        ["Examples", "The crew reel link, plus the Episode 1 link once it exists", "\"This is the team. The Charlotte episode drops {{episodeDate}} — you'd be in the ten the city sees first.\""],
        ["Budget / timing", "The price of the spot you talked about, paid once at booking, and the filming window", "\"{{fee}} for the spot, paid once at booking, and filming is two to four days from the form.\""],
        ["Think about it", "The three-line offer and one question: \"What's the part that isn't sitting right?\"", "Asked in writing, they'll often answer in writing — which means you walk into the second call knowing the real objection."],
      ] },
    ],
  },
  {
    id: "second", title: "6 · The second call — the close", blocks: [
      p("This call has one job. They already know the offer, the price, and that the slot is being held for them. Do not re-pitch. Recap in their words, put the parked objection on the table, answer it, trial close, lock. Twelve minutes, not fifteen."),
      h("Opening"),
      say("{{firstName}} — {{caller}}. Good to be back on. Since we talked, what's changed?"),
      note("Open question, then silence. Three things can come back: 'we're in' (go straight to Move 3), a new objection (handle it, section 8), or 'nothing really' (continue)."),
      h("Recap — their words, not yours"),
      say("Just so we're on the same page — when we talked you said [most of your work is referrals / people don't know you're there / you priced a commercial at four grand and it's still in the inbox]. And that if Charlotte actually knew who you were, [what changes for them next spring]. Still true?"),
      note("Every bracket is something THEY said on call one. That's why you logged it. Hearing their own diagnosis read back is the 'that's right' moment — it re-opens the gap you're about to close."),
      h("Put the parked objection on the table"),
      say("Last time the thing that needed a look was [the partner / the examples / the budget / whatever wasn't sitting right]. Where did that land?"),
      note("Then handle exactly that objection with the section 8 response — nothing else. If they raise a second one, you've found the real one; label it and answer it."),
      say("[Partner], {{firstName}} gave me the short version last week — I'd rather you hear it from me and ask what you'd ask. Three things: ten businesses a month, a commercial that's yours to run anywhere, forever, filmed in a few days. What's the question I should be answering?", "IF A PARTNER IS ON THE CALL"),
      h("Trial close, price, lock — same five moves as section 4"),
      say("So — do you feel like this is the thing that gets {{business}} seen? … Why do you feel that?"),
      say("Then let's make it yours. Spot {{spotNo}}, {{fee}}. I'm texting the payment link now — and the form if you haven't done it. I'll wait."),
      note("Same silence rule. Same 'closed means all three' rule. Confirmation email inside the hour."),
      h("If it's still not a yes"),
      say("Sounds like something's still not sitting right. What is it?"),
      say("Fair enough. Here's the honest version — I've been holding the {{vertical}} slot and I've got the next one on the list waiting. Have you given up on getting {{business}} in front of Charlotte this fall?"),
      note("The Voss no-oriented question. A 'no, I haven't' is a yes with one more question behind it — ask what would need to be true. A 'yes, for now' gets a clean release: \"Understood. I'll call you when Episode 1 is live so you can see it. Take care.\" Log the month they named. Do not offer a third call."),
      { t: "box", title: "Do not turn the second call into a third", text: "If the second call ends without a slot, it ends. Release them, keep the month they named, and let Episode 1 do the selling on {{episodeDate}}. A third scheduled sales call on a cold prospect is a slot you'll never fill, and the time comes out of the next cold call." },
    ],
  },
  {
    id: "gaps", title: "7 · What 'the gap' sounds like by vertical", blocks: [
      p("Swap the bracketed lines in the opener with these. The sentence has to sound like the owner's own complaint, not ours."),
      { t: "gaps" },
      { t: "box", title: "The LTV line — use it, don't fake it", text: "For high-LTV verticals you can say: \"One new {{customer}} is worth roughly $[LTV] to a {{vertical}} business over the relationship — industry average, not your books — and the spot is {{fee}}, less than one of them.\" Say 'industry average' every time. Never imply you know their numbers." },
    ],
  },
  {
    id: "objections", title: "8 · Objections — Clarify, Discuss, Diffuse", blocks: [
      p("Every response opens by agreeing with them. 'That's not a problem at all' costs nothing and removes the fight. Then a label or a calibrated question, then the reframe. Never argue. Each one is tagged with its lane — resolve it and return to the trial close, or pivot to the calendar (section 5)."),
      h("\"I'm not interested.\" — Resolve"),
      say("That's not a problem at all. Can I ask — is it because you're already doing video, or is it more of a timing thing?"),
      note("If they engage, continue with whichever they picked. If they shut down:"),
      say("Totally fair. If you ever want the city to know who you are, you've got my number. Take care."),
      h("\"I'm busy right now.\" — Resolve"),
      say("Not a problem. Two quick things — what's the best number to catch you on, and is tomorrow morning or afternoon worse for you?"),
      note("Book a specific time. 'Call me back whenever' is a no wearing a coat. This is a callback, not the second-call close — when you reach them, start from the opener."),
      h("\"Just send me an email.\" — Resolve"),
      say("Happy to. So I send the right thing and not a brochure — what would you want it to answer? The cost, how the filming works, or who else is in the series?"),
      note("Their answer tells you the real objection. Send the post-call email inside the hour with a call time inside it."),
      h("\"How much is it?\" — Resolve"),
      say("It depends on the spot — they're on a public board. Community spots are {{communityRange}}; Feature spots, with a one-minute commercial of your own, are {{featureRange}} — paid once, at booking. Either way it's a fraction of the five grand you'd be quoted for a solo shoot."),
      note("Silence. If they came in asking price before engagement, answer it once and go straight back to the engagement: \"When you priced it before, what was the number that made you close the tab?\""),
      h("\"We get all our business from referrals.\" — Resolve"),
      say("Sounds like the referrals have carried you a long way."),
      say("How many of those referrals go and look you up before they call — and what do they find?"),
      say("That's the gap. The commercial's for the ones who look before they call. The referral gets you the search; the video gets you the call."),
      h("\"We tried marketing before. An agency burned us.\" — Resolve"),
      say("Sounds like you paid for something and got a report instead of customers."),
      say("This isn't that. There's no retainer — it's a commercial that's yours to keep running, filmed in a few days, and a series that runs it. Nothing to renew. Nothing to cancel."),
      h("\"I'm not good on camera.\" — Resolve"),
      say("Neither is anybody for the first ten minutes. That's why you meet the team before we film — by the time the camera's on, you've told the story twice and it's just talking."),
      h("\"Who are you? Never heard of Creative Impact.\" — Resolve"),
      say("Fair — we're new to Charlotte, and that's honest. The team behind it has produced over five hundred videos for businesses like yours, and Charlotte Spotlight is the reason we're here. Episode one's {{episodeDate}}. You'd be in the first ten the city sees."),
      note("Five hundred is the real, aggregate number. Don't round it up, don't attach a client name."),
      h("\"Let me think about it.\" — Resolve once, then PIVOT"),
      say("Sure. Sounds like something's not sitting right — what is it?"),
      note("If they name it, answer it and return to the trial close. If it's a second 'I just need to think,' that's an unstated objection:"),
      say("Fair. The one thing I can't do is hold the slot while you think without a date on it. Let's put fifteen minutes on the calendar — Tuesday at ten or Thursday at two, which is worse? I'll hold it until then."),
      h("\"I need to talk to my partner / spouse.\" — PIVOT"),
      say("Of course. What do you think they'll ask?"),
      say("Let's get you both on for fifteen minutes so you're not the one translating it. Is a morning or an evening worse for the two of you? … I'll send the whole thing in three lines so you can forward it before we talk."),
      h("\"Send me some examples first.\" — PIVOT"),
      say("I'll send you the team's work within the hour. Straight answer though: the Charlotte episode doesn't exist yet — it drops {{episodeDate}} — so you'd be looking at the crew, not the series. Let's put fifteen minutes on after you've watched it — Tuesday or Thursday, which is worse? I'll hold the slot till then."),
      h("\"I need to check the budget this month.\" — PIVOT"),
      say("Makes sense — it's a real number. When will you know? … Then let's talk [the day after]. I'll send the price for the spot we talked about so you're looking at the right figure, and I'll hold the slot till we talk."),
    ],
  },
  {
    id: "emails", title: "9 · The cold emails", blocks: [
      p("EDITH sends the cold emails now: three touches over about a week, signed as EDITH (Creative Impact's AI assistant) from hello@, to every cold prospect with an email, under the daily cap. Any reply, booking, or unsubscribe stops her. Spotlight → EDITH · Email shows who's queued, sent, and held."),
      p("The script's own five-touch emails (from {{caller}}) are still on every prospect's card under Emails, for one-off sends after a real conversation — the post-call email, the confirmation, and the rest."),
    ],
  },
  {
    id: "replies", title: "10 · Reply lanes", blocks: [
      p("Every reply lands in one of four lanes. Answer inside the hour — speed-to-lead is the highest-ROI behavior in the whole operation."),
      { t: "table", head: ["Lane", "They said", "You do"], rows: [
        ["Interested", "'October' / 'math' / 'next ten' / anything with a question mark", "Call inside the hour and run the one-shot close from the opener — a reply is a warm cold call. No number? Reply with two times — 'Tuesday 10am or Thursday 2pm — which is worse?' — and the form link."],
        ["Objection", "Price, referrals, burned, camera, 'who are you'", "The matching snippet below. Under 150 words. Label first, reframe second, one question at the end."],
        ["Not now", "'Not this month' / 'after the holidays' / 'spring'", "\"Which month?\" — get a specific one, log it (stage Not now + the month), set the call."],
        ["No", "'No' / 'remove me' / 'not interested'", "\"Understood — thanks for telling me.\" Stage No. Do not re-add. A clean no protects the sender domain and the brand."],
      ] },
      h("Objection snippets — email versions"),
      { t: "box", title: "Price", text: "Fair. It's a fraction of the $3,000–$5,000 solo quote, and the exact number depends on which spot fits — which takes ten minutes on the phone, not a paragraph in an email. When you priced this before, what was the number that made you close the tab? Tuesday or Thursday — which is worse?" },
      { t: "box", title: "Referrals", text: "Sounds like referrals have carried you a long way. Here's the question: how many of them look you up before they call — and what do they find? The referral gets you the search. The commercial gets you the call. Ten minutes to see if a spot fits?" },
      { t: "box", title: "Burned before", text: "Sounds like you paid for something and got a report instead of customers. This isn't a retainer. It's a commercial that's yours to keep running, filmed in a few days, and a series that runs it — nothing to renew. If that's the difference that matters, which day this week is worse for fifteen minutes?" },
      { t: "box", title: "Who are you", text: "Fair — we're new to Charlotte. The team behind Creative Impact has produced over five hundred videos for businesses like yours; Charlotte Spotlight is why we're here. Episode one drops {{episodeDate}} and you'd be in the first ten the city sees. Ten minutes to see if it fits?" },
      { t: "box", title: "Examples first", text: "Here's the crew's work: {{crewReel}}. Straight answer — the Charlotte episode drops {{episodeDate}}, so you're looking at the team, not the series. The ten in episode one are the ones who didn't wait for the example. Want a spot held while you look?" },
      h("Voicemails"),
      say("{{firstName}}, {{caller}} with Creative Impact here in Charlotte. We're filming ten Charlotte {{vertical}} businesses for a series that starts {{episodeDate}}, and {{business}} came up. Call me at {{callerPhone}} — {{caller}}, {{callerPhone}}.", "VM 1 — FIRST ATTEMPT (12 SECONDS)"),
      say("{{firstName}}, {{caller}} again. The spots fill in order and I didn't want {{business}} finding out about this after the first ten are gone. {{callerPhone}}.", "VM 2 — SECOND ATTEMPT (10 SECONDS)"),
      note("Two voicemails, then email only. A third voicemail is a telemarketer."),
    ],
  },
  {
    id: "clock", title: "11 · The clock, and what expires", blocks: [
      { t: "table", head: ["Line", "Where", "Expires", "Swap to"], rows: [
        ["\"First episode drops October 1\"", "Opener, presentation, VM 1", "Oct 1", "\"Episode 1 is live — we're picking the next ten now\" (update the episode date in Settings)"],
        ["\"October slot\"", "The manual emails 1 and 5 (on each card)", "Oct 1", "\"November slot\" — and roll the month forward every 30 days (Settings → Month being sold)"],
        ["\"There's no Charlotte case study yet\"", "Section 3, examples objection", "Oct 1", "Replace with the Episode 1 link. This objection dies the day it posts."],
        ["\"We're new to Charlotte\"", "'Who are you' objection", "After Ep. 2 (Nov 1)", "\"You've seen the series\" — by episode two you're a local show, not a stranger"],
      ] },
      { t: "box", title: "The one thing to do first", text: "Fill the review counts for the top ten prospects. The opener runs on the review count — 'I mean, [Business] has [N] of them' — and an opener with a blank where the number goes is a telemarketer script. Ten verified rows and the first ten calls are personal." },
    ],
  },
];

/* ------------------------------------------------------------- filling in */

export type ScriptProspect = { business?: string | null; owner_name?: string | null; first_name?: string | null; email?: string | null; phone?: string | null; vertical?: string | null; suburb?: string | null; reviews?: number | null; years?: number | null; spot_number?: number | null };
export type ScriptOffer = { prices: number[]; featureSpots: number; floorDate: string; episodeDate?: string; crewReelUrl?: string; callerPhone?: string };
export type Vertical = { label: string; gap: string; season: string; noun: string };

// What an unfilled token shows as — the document's own brackets.
const BRACKET: Record<string, string> = {
  firstName: "[First name]", business: "[Business]", reviews: "[N]", years: "[X]", industry: "[industry]", vertical: "[vertical]", suburb: "[suburb]",
  email: "[email]", phone: "[phone]", callerPhone: "[phone]", spotNo: "[spot #]", tier: "[Feature / Community]", fee: "[the spot's price]",
  tierPitch: "[what the spot includes — see the board]", customer: "[customer]", crewReel: "[crew reel link]", episodeDate: "[episode date]",
};

const range = (xs: number[]) => {
  const v = xs.filter((x) => x > 0);
  if (!v.length) return "";
  const lo = Math.min(...v), hi = Math.max(...v);
  return lo === hi ? money(lo) : `${money(lo)} to ${money(hi)}`;
};

export function scriptFields(o: { prospect?: ScriptProspect | null; caller: string; spot?: number | null; offer: ScriptOffer; verticals: Record<string, Vertical> }): Record<string, string> {
  const pr = o.prospect || {};
  const v = pr.vertical ? o.verticals[pr.vertical] : null;
  const vShort = v && pr.vertical !== "other" ? v.label.split(" /")[0].toLowerCase() : "";
  const prices = o.offer.prices || [];
  const fs = Number(o.offer.featureSpots) || 0;
  const n = Number(o.spot || pr.spot_number) || 0;
  const price = n >= 1 ? prices[n - 1] : 0;
  const tier = n >= 1 ? spotTier(n, fs) : "";
  const first = String(pr.first_name || String(pr.owner_name || "").trim().split(/\s+/)[0] || "").trim();
  return {
    caller: o.caller || "Emmanuel",
    firstName: first, business: pr.business || "", reviews: pr.reviews != null ? String(pr.reviews) : "", years: pr.years != null ? String(pr.years) : "",
    industry: vShort, vertical: vShort, suburb: pr.suburb || "", email: pr.email || "", phone: pr.phone || "",
    customer: v ? v.noun : "",
    spotNo: n ? String(n) : "", tier, fee: price ? money(price) : "",
    tierPitch: tier === "Feature"
      ? "That's the shoot, a one-minute commercial of your own, your segment in the episode, a promoted week on Facebook and Instagram, and the season's promotion month."
      : tier === "Community" ? "That's the shoot, your segment in the episode — cut so you can run it on its own — and the season's promotion month." : "",
    communityRange: range(prices.slice(fs)), featureRange: range(prices.slice(0, fs)), minPrice: prices.length ? money(Math.min(...prices.filter((x) => x > 0))) : "",
    floorDate: o.offer.floorDate || "", episodeDate: o.offer.episodeDate || "", crewReel: o.offer.crewReelUrl || "", callerPhone: o.offer.callerPhone || "",
  };
}

export function fillScript(text: string, f: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => (f[k] ? f[k] : BRACKET[k] || `[${k}]`));
}

// The line a caller reads — their own version of the story line when there is one.
export function sayText(b: Extract<Block, { t: "say" }>, caller: string): string {
  if (!b.byCaller) return b.text;
  const c = String(caller || "").trim().toLowerCase();
  if (c === "emmanuel") return b.text;
  if (c === "brandon") return b.byCaller.Brandon || b.text;
  return b.byCaller.other || b.text;
}

// Plain text for EDITH: the sections whose words match the topic (or all).
export function scriptAsText(o: { topic?: string; fields: Record<string, string>; caller: string; offer: ScriptOffer; verticals: Record<string, Vertical> }): string {
  const t = String(o.topic || "").toLowerCase().trim();
  const render = (s: Section) => [s.title.toUpperCase(), ...s.blocks.map((b) => {
    if (b.t === "p") return fillScript(b.text, o.fields);
    if (b.t === "h") return `— ${b.text}`;
    if (b.t === "say") return `${b.label ? b.label + ": " : ""}"${fillScript(sayText(b, o.caller), o.fields)}"`;
    if (b.t === "note") return `▸ ${fillScript(b.text, o.fields)}`;
    if (b.t === "list") return b.items.map((x) => `• ${fillScript(x, o.fields)}`).join("\n");
    if (b.t === "table") return [b.head.join(" | "), ...b.rows.map((r) => r.map((c) => fillScript(c, o.fields)).join(" | "))].join("\n");
    if (b.t === "box") return `[${b.title}] ${fillScript(b.text, o.fields)}`;
    if (b.t === "board") return o.offer.prices.map((x, i) => `Spot ${i + 1} · ${spotTier(i + 1, o.offer.featureSpots)} · ${money(x)}`).join("\n");
    if (b.t === "gaps") return Object.values(o.verticals).map((v) => `${v.label}: "${v.gap}" (season: ${v.season})`).join("\n");
    return "";
  })].join("\n");
  if (!t) return SECTIONS.map(render).join("\n\n");
  const words = t.split(/\W+/).filter((w) => w.length > 2);
  // An objection: just its heading and the lines under it.
  const obj = SECTIONS.find((s) => s.id === "objections")!;
  const heads = obj.blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.t === "h");
  const hit = heads.find(({ b }) => words.some((w) => (b as { text: string }).text.toLowerCase().includes(w)));
  if (hit) {
    const next = heads.find(({ i }) => i > hit.i)?.i ?? obj.blocks.length;
    return render({ ...obj, title: "8 · Objection", blocks: obj.blocks.slice(hit.i, next) });
  }
  const scored = SECTIONS.map((s) => ({ s, n: words.filter((w) => (s.title + JSON.stringify(s.blocks)).toLowerCase().includes(w)).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  return (scored.length ? scored.slice(0, 2).map((x) => x.s) : SECTIONS).map(render).join("\n\n");
}
