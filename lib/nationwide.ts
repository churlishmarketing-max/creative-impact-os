// NATIONWIDE LANE — Hardscape & Landscape client acquisition.
//
// Source: Downloads/CI_Client_Acquisition_Reworked.docx ("Client Acquisition,
// Reworked", Sep 19 2026). Content below is that document, structured —
// verbatim wherever it's copy that gets spoken, filmed, or pasted into Meta.
//
// PURE module (no server imports): the cockpit screen, the API route, and
// Jarvis all read the same source. The logic here is deterministic — lead
// grading, the Friday tracker math, the scaling rule, the fallbacks — so every
// number the OS shows traces to a row someone entered, never to a model.

// --- The offer & the assumptions -------------------------------------------------
export const LANE = {
  key: "hardscape",
  name: "Nationwide · Hardscape & Landscape",
  offer: "$3,000 a month — the client films on a phone; CI scripts, edits, and runs the ads. Ad spend separate.",
  goal: "$20K–$50K a month = 7 to 17 retainers",
  adAccount: "1488631013034003 (manual build)",
  prepared: "Saturday, September 19, 2026",
};
export const ASSUMPTIONS = [
  "The lane runs under Creative Impact. CI page, CI ad account, Emmanuel on camera in all fourteen cuts.",
  "The offer stands as launched on the card: $3,000 a month, the client films on a phone, CI scripts, edits, and runs the ads. Ad spend separate. No price appears in any ad.",
  "Register is Counsel, both cuts, per the August 8 ruling for Creative Impact. The doctor reading the chart, never the prosecutor.",
  "The qualifier is $500K+, spoken as \"half a million or better.\"",
  "Proof comes only from the closed proof bank, attributed as \"the system behind Creative Impact, built in Omaha.\" No client is named in anything cold.",
  "The planning numbers are mine, not benchmarks: $60 CPL, 40% pass the gate, 50% book, 65% show, 20% close, three onboards a month. Section 03 shows where your actuals replace them.",
];
export const ONE_THING = "By Monday, September 21: send Emmanuel Scripts 01, 02 and 04 and lock one 90-minute film block before September 28. Six takes. Everything else in this document waits on that footage.";
export const BRIEF = [
  "The card says Omaha is the ceiling. It is. But Omaha is not why nothing has stacked. Referrals, cold email, Meta, and the $750 Diagnostic each produced something, and none of them ever became a system that books calls on a schedule. Take the same leaks nationwide and they just get more expensive.",
  "So this lane is one niche, one offer, one face, and one number to watch each week. Creative Impact sells a $3,000-a-month remote ad engine to hardscape and landscape companies doing $500K or better. Emmanuel fronts every ad. The client films on a phone, so nobody ever boards a plane. The goal on the card is $20K to $50K a month. In this offer that is 7 to 17 retainers.",
  "Here is the part the card skipped. At a $50-a-day test budget and honest planning rates, these ads book about three calls a month, not three a week. Seven clients at that pace is next September. Seven clients by mid-January takes roughly $200 a day from late October, and that spend only gets approved by the numbers in Section 03. The plan below is built on that clock.",
];
export const CHANGES: { card: string; rework: string; why: string }[] = [
  { card: "Launch to all 50 states on day one", rework: "Open 15 year-round install states October 6. Open all 50 on January 4 behind the clock ad (Script 06).", why: "This lane has zero hardscape receipts. A Sun Belt client produces one in 30 days. A Minnesota client signed in November cannot produce one until April." },
  { card: "Target hardscaper and landscaper business pages", rework: "Broad targeting. The first three seconds of every script name the trade.", why: "Standing doctrine: broad plus specific copy beats interest stacking. The hook is the targeting." },
  { card: "Qualify on the lead form", rework: "Five questions, with the revenue gate on question two. Under $500K never sees a calendar.", why: "Section 06. \"Qualify them\" is a wish until the form enforces it." },
  { card: "(absent)", rework: "Exclude a 50-mile radius around Omaha when the map opens in January.", why: "GE Outdoors is an active landscaping client there, and the Churlish Omaha campaign bids in the same auction. Do not pitch a client's competitors or bid against yourself." },
  { card: "(absent)", rework: "Speed to lead: first call inside 5 minutes, then twice a day for three days.", why: "Section 07. A qualified lead called tomorrow is a cold lead." },
  { card: "(absent)", rework: "No dollar moves until the form is bound to every ad and a live test lead lands in Lead Center.", why: "$765.50 already went into a funnel with a dead form once. The gate is permanent." },
  { card: "Rework the pitch deck", rework: "A verbatim one-call close plus a seven-slide screen share.", why: "Section 08. The deck is a prop. The script is the asset." },
  { card: "Proof assets: done", rework: "Proof audit: one landscaper receipt from Omaha, zero hardscape, zero under Creative Impact.", why: "Law 9. Emmanuel says so out loud on the call. The first CI client result replaces the Omaha line in Script 01 first." },
  { card: "(absent)", rework: "Onboarding cap: three new companies a month.", why: "The ads say it on camera, so it has to be true. It also protects delivery while editing capacity is unproven." },
];

// --- 02 The plan ------------------------------------------------------------------
export type PlanTask = { id: string; title: string; detail: string; owner: string; due: string | null; dueLabel: string; doneWhen: string; priority: "HIGH" | "MEDIUM" | ""; carried?: boolean };
export const PLAN: PlanTask[] = [
  { id: "niche", title: "Finalize hardscaper/landscaper niche and run competitive research", detail: "Carried from the card. Done.", owner: "", due: null, dueLabel: "", doneWhen: "", priority: "", carried: true },
  { id: "offer", title: "Create and launch the $3K/month offer with proof assets", detail: "Carried from the card. Done, with one correction: the proof is landscaping, Omaha, and Churlish-built. It is attributed that way everywhere until Creative Impact earns its own.", owner: "", due: null, dueLabel: "", doneWhen: "", priority: "", carried: true },
  { id: "film1", title: "Film Wave 1: Scripts 01, 02, 04, two cuts each", detail: "Six takes in one 90-minute block. Script 04 is shot on Emmanuel's phone on purpose. Film Script 06 in the same block if there is light left, because fall color sells it and it does not publish until January.", owner: "Emmanuel", due: "2026-09-28", dueLabel: "Mon Sep 28", doneWhen: "six files are in the edit folder", priority: "HIGH" },
  { id: "form", title: "Build the qualifier form, bind it, and land a live test lead", detail: "Section 06, built exactly as written. Bind the form to every ad by hand. Submit a test lead from a real phone and confirm it shows in Lead Center with the ad chain attached, and that an under-$500K answer lands on the \"not yet\" ending.", owner: "Brandon or Viktor, manual in Ads Manager", due: "2026-09-30", dueLabel: "Wed Sep 30", doneWhen: "both test leads route correctly", priority: "HIGH" },
  { id: "speed", title: "Install speed-to-lead and the three show-rate texts", detail: "Section 07. Lead notification goes to Emmanuel's phone and one backup. The caller reads the form answers and opens the company's page before dialing.", owner: "Emmanuel (calls), Brandon (routing)", due: "2026-10-05", dueLabel: "Mon Oct 5", doneWhen: "a test lead gets a call inside 5 minutes and all three texts fire", priority: "HIGH" },
  { id: "launch1", title: "Launch Wave 1 on the Creative Impact account", detail: "Section 05. One campaign, one cold ad set, the three B cuts, $50 a day, 15 year-round install states. Tuesday launch keeps it clear of the October 1 Spotlight drop.", owner: "Brandon or Viktor", due: "2026-10-06", dueLabel: "Tue Oct 6", doneWhen: "all three ads are active with zero delivery errors", priority: "HIGH" },
  { id: "close", title: "Run the one-call close on every held call, and record all of them", detail: "Section 08, verbatim for the first ten. Emmanuel opens every call. Brandon runs discovery and the close on calls 1 through 5 with Emmanuel on the line. Emmanuel runs 6 through 10 with Brandon listening. From call 11 Emmanuel is solo. That costs Brandon about 2.5 hours a week for three weeks, then nothing.", owner: "Emmanuel and Brandon", due: null, dueLabel: "Starts: first held call", doneWhen: "call 11 happens without Brandon", priority: "HIGH" },
  { id: "tracker", title: "Update the constraint tracker every Friday and name one constraint", detail: "Section 09. The stage furthest below its line is the week's constraint. Fix that one. Leave the rest alone.", owner: "Brandon", due: "2026-10-09", dueLabel: "First update: Fri Oct 9", doneWhen: "", priority: "MEDIUM" },
  { id: "wave2", title: "First verdict at $750 delivered, then launch Wave 2", detail: "Verdicts at the ad-set level, $250 per ad minimum. Kill nothing before that. Wave 2 is Scripts 03, 05 and 07. Apply the scaling rule in Section 03 before adding a dollar.", owner: "Brandon", due: "2026-10-21", dueLabel: "Wed Oct 21", doneWhen: "", priority: "MEDIUM" },
  { id: "open50", title: "Open all 50 states and turn on the clock ad", detail: "Script 06 takes the single urgency slot. Omaha plus 50 miles excluded. By then the first Creative Impact receipt should exist, and it goes into Script 01.", owner: "Brandon", due: "2027-01-04", dueLabel: "Mon Jan 4, 2027", doneWhen: "", priority: "MEDIUM" },
];

export const FALLBACKS = [
  { id: "fb1", when: "Fewer than 6 leads at $500K+ from the first $750 (Oct 21)", then: "Swap in the alternate hooks and move the revenue question to position one. Do not touch the price, the niche, or the targeting." },
  { id: "fb2", when: "Zero closes after 10 held calls", then: "Freeze spend where it is. Run all ten recordings through the sales call review and fix the script before buying another call." },
  { id: "fb3", when: "Qualified CPL over $200 on two straight reads", then: "Creative or form problem. New hooks first, form order second. Budget does not move." },
  { id: "fb4", when: "Fewer than 2 signed companies by Fri Nov 20", then: "The lane goes to the JSA with the tracker attached. One question: is it the offer or the niche. The data picks." },
];
export const DECISIONS = [
  { id: "split", title: "The split on this lane", detail: "The card's $20K is your number, and this revenue lands in a joint venture. At a 50/50 split, your $20K is 14 companies, not 7 (Section 03). Put the split and who funds the ad spend on the record before October 6." },
  { id: "term", title: "Minimum term", detail: "The call script never states one, because none is on the record for this offer. Say yours when you quote the number." },
  { id: "cap", title: "The cap of three a month", detail: "Emmanuel says it on camera in Scripts 04 and 06. Change the number if you want. Just keep it true." },
  { id: "editor", title: "Who edits at company four", detail: "Seven companies is 21 ad edits a month plus seven ad accounts. Name the Cutting Room Floor seat now, or the cap becomes the ceiling." },
];

// --- 03 The math ---------------------------------------------------------------------
export const PLANNING = { cpl: 60, pass: 0.4, book: 0.5, show: 0.65, close: 0.2 };
export const SCALING_RULE = [
  "$50 a day until $750 is delivered. No verdicts before that.",
  "Qualified CPL under $200 means a company costs less to acquire than its first month pays. Step to $100 a day. Hold seven days.",
  "Still under $200? Step to $200 a day. Never more than double in one step.",
  "Over $200 on two straight reads: the budget freezes and the creative gets fixed. A bigger budget on a broken ad just buys the same problem faster.",
  "Frequency at 3 or higher on any ad set is an automatic creative refresh. Wave 2 exists for this.",
];
export const MATH_NOTE = "Read the first row twice. $50 a day is a test budget, not a growth budget. It exists to buy real numbers for the right-hand column. Thirteen held calls a month is your three-a-week floor, and at these rates only $200 a day reaches it. Until the numbers justify that spend, outbound has to carry the other two calls a week.";

export type Rates = typeof PLANNING;
export function budgetRow(daily: number, r: Rates, target = 7) {
  const leads = (daily * 30) / r.cpl;
  const held = leads * r.pass * r.book * r.show;
  const closes = held * r.close;
  return { daily, leads, held, closes, months: closes > 0 ? target / closes : Infinity };
}
export function per100(r: Rates) {
  const q = 100 * r.pass, b = q * r.book, h = b * r.show, c = h * r.close;
  const spend = 100 * r.cpl;
  return { spend, qualified: q, booked: b, held: h, closed: c, qualifiedCpl: q ? spend / q : 0, costPerCompany: c ? spend / c : 0 };
}

// --- 04 The ad scripts ------------------------------------------------------------------
export const AD_RULES = [
  "Counsel register. Warm, specific, unhurried. He is explaining what happened to them, not what they did wrong.",
  "No prices in any ad. \"$500K\" is a qualifier, not a price. The $3,000 lives on the call.",
  "One CTA per ad: the form. Button is always Apply Now. Four closer patterns rotate. The \"we will tell you straight\" line appears twice in the whole book, in 01 and 05.",
  "Every angle has one home. The dismissal beat (\"every agency says the same sentence\") lives in 05 only. The $21,000 receipt lives in 05 only. The 250-plus leads line lives in 03 only. The three-a-month cap is spoken in 04 and 06 only.",
  "One clock ad, ever. Script 06 is the only urgency ad, and it does not publish until January 4.",
  "\"Authority\" appears in no hook and no headline. Lead-site names appear nowhere.",
  "Emmanuel never claims the Omaha work as his own. The line is always \"the system behind Creative Impact.\"",
];
export const WAVES = [
  { wave: "Wave 1", scripts: "01 Three-Bid · 02 Referrals · 04 Shot on a Phone", live: "Tue Oct 6", why: "Problem, problem, mechanism. Three different doors into the same offer, so the first read tells you which pain this market answers to." },
  { wave: "Wave 2", scripts: "03 Shared Lead · 05 Agency Report · 07 Backyard", live: "Wed Oct 21", why: "The proof ad (05) enters once there is a warm audience to show it to. Doubles as the refresh when Wave 1 hits frequency 3." },
  { wave: "Held", scripts: "06 April Is Decided in January", live: "Mon Jan 4", why: "The clock ad. Opens with the 50-state map." },
];
type Beat = [string, string];
export type AdScript = { n: string; title: string; wave: string; live: string; job: string; shoot: string; A: Beat[]; B: Beat[]; hooks: Beat[]; captions: string; primary: string[]; headline: string; description: string };
export const SCRIPTS: AdScript[] = [
  {
    n: "01", title: "The Three-Bid Problem", wave: "Wave 1", live: "Oct 6",
    job: "Anchor ad. Names the real enemy: being a stranger.",
    shoot: "Emmanuel to camera, standing on any finished paver surface (a public plaza works). Eye-level, natural light. Name super: Emmanuel Bibbs — Creative Impact.",
    A: [
      ["HOOK", "If you build patios and outdoor living for a living, this is about the three-bid problem."],
      ["CALL-OUT", "A homeowner wants a sixty-thousand-dollar backyard. So they call three companies. Yours. One about as good as yours. And a guy with a skid steer and a logo he made last week. Three numbers get lined up on a kitchen counter, and one gets picked. Not the best builder. The lowest number."],
      ["PIVOT", "That is not a pricing problem. It is a stranger problem. When all three of you are strangers, price is the only thing they can compare. The company that wins without being cheapest is the one they felt like they knew before the estimate."],
      ["MECHANISM", "That is what we build at Creative Impact. You film your jobs and your crew on your phone. We write what to say, cut it, and run it in your market, every month. So when you pull in the driveway, you are not bid number two. You are the one they were hoping would call back."],
      ["CTA", "If your company does half a million or better, tap Apply. Two-minute form, and we will tell you straight whether it fits."],
    ],
    B: [
      ["HOOK", "Hardscapers. The three-bid problem."],
      ["BODY", "Homeowner calls three companies. Lines up three numbers. Picks the lowest. Not because you are not better. Because all three of you are strangers, and strangers only get compared on price."],
      ["TURN", "We fix the stranger part. You film your jobs on your phone. We script it, cut it, and run it in your market every month, so you walk into the estimate as the company they already trust."],
      ["CTA", "Half a million or better? Tap Apply. Two-minute form."],
    ],
    hooks: [["Provocative question", "When did the guy with a skid steer and a Canva logo start setting your prices?"], ["Specific picture", "Somewhere tonight, your estimate is sitting on a kitchen counter next to two cheaper ones."]],
    captions: "THREE BIDS · LOWEST NUMBER · STRANGER PROBLEM · BEFORE THE ESTIMATE",
    primary: ["Three bids on a kitchen counter. The lowest number usually wins. Not the best builder.", "That is not a pricing problem. It is a stranger problem. When a homeowner does not know any of you, price is the only thing left to compare.", "Creative Impact turns the jobs already on your phone into ads that run in your market every month, so you walk into the estimate as the company they already trust.", "Hardscape and landscape companies doing $500K or better: tap Apply Now. Five questions, two minutes."],
    headline: "Stop being bid number two.", description: "Hardscape & landscape, $500K+",
  },
  {
    n: "02", title: "Referrals Don't Have a Dial", wave: "Wave 1", live: "Oct 6",
    job: "For the owner who grew on word of mouth and hit the ceiling. Respects the referral, then shows its limit.",
    shoot: "Walk-and-talk down a residential street with good yards, or seated outdoors. Warm, unhurried. No proof line in this one by design.",
    A: [
      ["HOOK", "The best salesman at most landscape companies does not work there. It is a neighbor leaning over a fence saying, you should call these guys."],
      ["CALL-OUT", "And that is a good sign. It means the work is good. But a referral has no dial. You cannot turn it up in March when you have a crew to keep busy. You cannot point it at the neighborhoods with the bigger backyards. It shows up when it shows up. So you end up running an eight hundred thousand dollar company on a lead source you do not control."],
      ["PIVOT", "Referrals close because trust got there before you did. Somebody trusted you on somebody else's word. An ad can do that same job, if the ad is actually you. Your jobs. Your crew. Your face, explaining why the base prep matters more than the pavers."],
      ["MECHANISM", "That is what we do at Creative Impact. You shoot it on your phone. We script it, edit it, and run it. Trust, with a dial on it."],
      ["CTA", "Tap Apply and answer five questions. If it fits, we will map your first ninety days of ads, on your jobs, in your market."],
    ],
    B: [
      ["HOOK", "Your best salesman is somebody's neighbor. Call these guys."],
      ["BODY", "That is trust arriving before you do, and it is why referrals close. The problem is a referral has no dial. You cannot turn it up in March. You cannot aim it at bigger backyards."],
      ["TURN", "We build the version with a dial. Your jobs, your crew, your face, shot on your phone. Scripted, edited, and run as ads in your market."],
      ["CTA", "Hardscape or landscape, half a million or better: tap Apply and we will map your first ninety days."],
    ],
    hooks: [["If / then", "If word of mouth is your whole pipeline, you do not have a pipeline. You have good neighbors."], ["Uncomfortable truth", "You cannot turn up a referral in March."]],
    captions: "SOMEBODY'S NEIGHBOR · NO DIAL · TRUST GOT THERE FIRST · YOUR FACE",
    primary: ["Your best salesman is somebody's neighbor leaning over a fence. \"Call these guys.\"", "That is trust showing up before you do, and it is why referrals close. But a referral has no dial. You cannot turn it up in March or aim it at the neighborhoods with bigger backyards.", "Creative Impact builds the version with a dial: your jobs, your crew, your face, shot on your phone. We script it, edit it, and run it in your market every month.", "Doing $500K or better in hardscape or landscape? Tap Apply Now and we will map your first ninety days."],
    headline: "Referrals don't have a dial.", description: "See if your company fits",
  },
  {
    n: "03", title: "The Lead Somebody Else Bought Too", wave: "Wave 2", live: "Oct 21",
    job: "For the owner paying lead sites. Dialogue stays name-free so one take survives platform flags.",
    shoot: "Seated, desk or truck tailgate, phone in hand as a prop. Lead-site names live nowhere in the dialogue, captions, or primary text.",
    A: [
      ["HOOK", "That lead you paid for this morning? You are not the only company that bought it."],
      ["CALL-OUT", "That is how the lead sites work. One homeowner fills out one form, and it gets sold to whoever is paying. You, and usually a few others. So now it is a race. Whoever calls first gets the conversation, and whoever quotes lowest usually gets the job. You can win that race and still lose money on it."],
      ["PIVOT", "The problem is not that you are slow. It is that the homeowner never picked you. They picked a landscaper. Any landscaper. You were a name on a list somebody else built."],
      ["MECHANISM", "Ads built on your own work flip that. The homeowner watches your crew lay out a patio. Hears you explain drainage in plain English. Then fills out your form. Nobody else's. That lead was never for sale."],
      ["PROOF", "The system behind Creative Impact has brought in more than two hundred fifty leads for local service companies, and every one belonged to the company that paid for it."],
      ["CTA", "If you are tired of bidding against the cheapest guy in town, tap Apply. Two minutes. No pitch until we know it fits."],
    ],
    B: [
      ["HOOK", "That lead you paid for this morning? You are not the only company that bought it."],
      ["BODY", "One form, sold to everybody. So it is a race, and the lowest quote usually wins it. The homeowner never picked you. They picked a landscaper. Any landscaper."],
      ["TURN", "Ads built on your own jobs flip that. They watch your crew, hear you explain the work, and fill out your form. Nobody else's. That lead was never for sale."],
      ["CTA", "Tired of racing the cheapest guy in town? Tap Apply. Two minutes."],
    ],
    hooks: [["Direct call-out", "You are not buying leads. You are buying a seat in a race to the lowest quote."], ["Reframe", "The homeowner did not pick you. They picked \"a landscaper,\" and you happened to be on the list."]],
    captions: "NOT THE ONLY ONE WHO BOUGHT IT · A RACE · NEVER PICKED YOU · NEVER FOR SALE",
    primary: ["That lead you paid for this morning? You are not the only company that bought it.", "One homeowner, one form, sold to everyone who is paying. So it turns into a race, and the lowest quote usually wins it. You can win that race and still lose money.", "Ads built on your own jobs flip it. The homeowner watches your crew, hears you explain the work, and fills out your form. Nobody else's. That lead was never for sale.", "Hardscape and landscape companies doing $500K or better: tap Apply Now. Two minutes."],
    headline: "That lead was never just yours.", description: "Two-minute application",
  },
  {
    n: "04", title: "Shot on a Phone", wave: "Wave 1", live: "Oct 6",
    job: "The demonstration ad. Kills the \"I need a film crew\" objection by being the proof.",
    shoot: "Shot on Emmanuel's phone, handheld, vertical, outdoors, no gimbal, no lav if the phone audio is clean. It must look like a phone. If it looks produced, the ad is lying.",
    A: [
      ["HOOK", "This ad was shot on a phone. On purpose."],
      ["CALL-OUT", "Because the number one reason good hardscape companies do not run video ads is they think it takes a film crew, a free Saturday, and a personality they do not have. It does not. Homeowners are not looking for a commercial. They want to see who is going to be in their backyard for three weeks. Thirty seconds of you walking a finished job, saying what you built and why, beats anything a production company can stage."],
      ["PIVOT", "What it does take is knowing what to say, cutting it so people keep watching, and getting it in front of the right homeowners every month. That is the part nobody has time for in the middle of the season."],
      ["MECHANISM", "That is our part. We send you the script and a shot list. You film it on the job and send it over. We edit it, build the ads, run them, and show you every lead on a scoreboard you can actually read."],
      ["CTA", "We bring on three companies a month so the work stays good. Tap Apply and see if there is a seat open."],
    ],
    B: [
      ["HOOK", "This ad was shot on a phone. On purpose."],
      ["BODY", "You do not need a film crew to run video ads. Homeowners are not looking for a commercial. They want to see who is going to be in their backyard for three weeks."],
      ["TURN", "We send the script and the shot list. You film it on the job. We edit it, run it, and show you every lead on one page."],
      ["CTA", "Three new companies a month. Tap Apply and see if there is a seat open."],
    ],
    hooks: [["Pattern interrupt", "No crew. No lights. No script in my hand. This is the whole production."], ["Objection-first", "You do not need to be good on camera. You need to be standing on a job you built."]],
    captions: "SHOT ON A PHONE · NOT A COMMERCIAL · WHO IS IN MY BACKYARD · A SCOREBOARD YOU CAN READ",
    primary: ["This ad was shot on a phone. On purpose.", "Good hardscape companies skip video ads because they think it takes a film crew and a free Saturday. It does not. Homeowners want to see who is going to be in their backyard for three weeks.", "Creative Impact sends the script and the shot list. You film it on the job. We edit it, run it, and show you every lead on one page you can actually read.", "We bring on three companies a month. Tap Apply Now and see if there is a seat open."],
    headline: "This ad was shot on a phone.", description: "Three new companies a month",
  },
  {
    n: "05", title: "The Agency Report", wave: "Wave 2", live: "Oct 21",
    job: "For the owner who already paid an agency. The doctor reading the chart. Sole home of the dismissal beat and the $21,000 receipt.",
    shoot: "Seated, calm, close framing. This is the most Counsel of the seven. No sarcasm toward the old agency. Explain, do not prosecute.",
    A: [
      ["HOOK", "If you already paid a marketing agency and all you got was a report, I want to explain what happened."],
      ["CALL-OUT", "They ran ads with a stock photo of somebody else's patio. Every month a PDF showed up full of impressions and clicks. And when you asked how many jobs it turned into, the room got quiet. That is not because ads do not work for landscapers. It is because those ads could have been for anybody."],
      ["PIVOT", "Every agency says the same sentence. We script, edit, and run your ads. Fine. So do we. That is not the part that matters. What matters is whether a homeowner finishes the video feeling like they know you. If they do not, you are just another estimate."],
      ["PROOF", "The system behind Creative Impact was built in Omaha. One landscaper there closed twenty-one thousand dollars off the first ad. And it was not the ad. People felt like they knew the company before the truck pulled up."],
      ["CTA", "You will not get a PDF of impressions from us. You get one page: leads, estimates, signed jobs. Half a million or better, tap Apply, and we will tell you straight whether this fits."],
    ],
    B: [
      ["HOOK", "Paid an agency and all you got was a report? Here is what happened."],
      ["BODY", "Stock photos. A drone shot. A PDF full of impressions. Those ads could have been for anybody, so nobody felt like they knew you."],
      ["PROOF", "The system behind Creative Impact was built in Omaha, where one landscaper closed twenty-one thousand dollars off the first ad. It was not the ad. People felt like they knew the company before the truck pulled up."],
      ["CTA", "One page from us: leads, estimates, signed jobs. Half a million or better, tap Apply."],
    ],
    hooks: [["Label the feeling", "It sounds like the last agency sold you ads and delivered a PDF."], ["Specific picture", "A stock photo of somebody else's patio is not an ad for your company."]],
    captions: "ALL YOU GOT WAS A REPORT · COULD HAVE BEEN FOR ANYBODY · BUILT IN OMAHA · $21,000 · LEADS, ESTIMATES, SIGNED JOBS",
    primary: ["Paid a marketing agency and all you got was a report? Here is what happened.", "Stock photos of somebody else's patio. A monthly PDF full of impressions. Those ads could have been for anybody, so no homeowner ever felt like they knew you.", "The system behind Creative Impact was built in Omaha, where one landscaper closed $21,000 off the first ad. It was not the ad. People felt like they knew the company before the truck pulled up.", "From us you get one page: leads, estimates, signed jobs. Doing $500K or better? Tap Apply Now."],
    headline: "You paid for a report. Not jobs.", description: "Leads. Estimates. Signed jobs.",
  },
  {
    n: "06", title: "April Is Decided in January", wave: "Held", live: "Jan 4",
    job: "The only clock ad in the book. One urgency ad live at a time. The clock is the calendar, never the price.",
    shoot: "Film now while leaves are turning, publish in January. Outdoors, jacket on. Dialogue is date-free so the take survives a slipped launch.",
    A: [
      ["HOOK", "The landscape companies that are booked solid in April did not get that way in April."],
      ["CALL-OUT", "They got that way in January. While the ground was frozen and the phones were quiet, they were putting their best jobs from last season in front of every homeowner in their market. So when the first warm weekend hit and everybody suddenly wanted a patio, those homeowners had already been looking at one company for weeks."],
      ["PIVOT", "Spring demand is going to show up whether you advertise or not. The only question is whose name is already in their head when it does."],
      ["MECHANISM", "You have a whole season of finished work sitting on your phone right now. Send it to us. We script it, cut it, and run it through the winter, so the spring calls come to you first, not to whoever is cheapest."],
      ["CTA", "We bring on three companies a month, and the ones who start now are the ones who are ready by March. Tap Apply. Two-minute form."],
    ],
    B: [
      ["HOOK", "The companies booked solid in April did not get that way in April."],
      ["BODY", "They got that way in January. Ground frozen, phones quiet, and their best jobs from last season running in front of every homeowner in their market."],
      ["TURN", "You have a season of finished work on your phone right now. Send it to us. We script it, cut it, and run it through the winter so spring calls you first."],
      ["CTA", "Three companies a month. Start now, ready by March. Tap Apply."],
    ],
    hooks: [["Calendar truth", "The first warm Saturday of the year, every homeowner in your market decides they want a patio. Who are they going to call?"], ["Reframe the off-season", "Winter is not your slow season. It is your advertising season."]],
    captions: "BOOKED SOLID IN APRIL · STARTED IN JANUARY · WHOSE NAME IS ALREADY THERE · A SEASON ON YOUR PHONE",
    primary: ["The landscape companies booked solid in April did not get that way in April. They got that way in January.", "While the ground was frozen and the phones were quiet, their best jobs from last season were running in front of every homeowner in their market.", "You have a whole season of finished work sitting on your phone. Creative Impact scripts it, cuts it, and runs it through the winter, so spring calls you first and not whoever is cheapest.", "We bring on three companies a month. Start now, ready by March. Tap Apply Now."],
    headline: "April gets decided in January.", description: "Start now. Ready by March.",
  },
  {
    n: "07", title: "The Backyard Nobody Saw", wave: "Wave 2", live: "Oct 21",
    job: "Pride ad. Speaks to the craftsman whose best work is invisible. Ends on a ninety-second action he can picture.",
    shoot: "If a Spotlight buyer has a finished outdoor job, film here with written consent. Otherwise any public hardscape. Slow push-in on the hook.",
    A: [
      ["HOOK", "You built a backyard last month that belongs in a magazine. The only ones who have seen it are the homeowner and their dog."],
      ["CALL-OUT", "Think about what that job took. The design. The grading. Pallets of stone set by hand. Then you packed up, took two photos for a page nobody checks, and drove to the next one. Your best sales tool is sitting behind a privacy fence."],
      ["PIVOT", "Homeowners cannot hire a company they have never seen. And the outfit doing half your quality but posting every single job looks busier, bigger, and safer than you do. That is not fair. It is just how it works."],
      ["MECHANISM", "So before you leave the next job, take ninety seconds with your phone. Walk it. Say what you built. Send it to us. We turn it into an ad and put it in front of the homeowners in your market who have the backyard, and the budget, for the same thing."],
      ["CTA", "Tap Apply and answer five questions. If it fits, we will show you what that looks like for your company."],
    ],
    B: [
      ["HOOK", "You built a backyard last month that belongs in a magazine. The only ones who saw it are the homeowner and their dog."],
      ["BODY", "Your best sales tool is sitting behind a privacy fence. Meanwhile the outfit doing half your quality posts every job, and looks busier and safer than you."],
      ["TURN", "Before you leave the next job, take ninety seconds with your phone. Walk it. Say what you built. Send it to us. We turn it into an ad in front of the homeowners with the budget for the same thing."],
      ["CTA", "Tap Apply. Five questions."],
    ],
    hooks: [["Math", "Three weeks of work. Two photos. Zero people who saw them."], ["Comparison", "The company posting every mediocre job looks bigger than you. It is not. It is just visible."]],
    captions: "BELONGS IN A MAGAZINE · BEHIND A PRIVACY FENCE · LOOKS BUSIER · NINETY SECONDS",
    primary: ["You built a backyard last month that belongs in a magazine. The only ones who saw it are the homeowner and their dog.", "Your best sales tool is sitting behind a privacy fence. Meanwhile the outfit doing half your quality posts every job, and looks busier and safer than you do.", "Before you leave the next job, take ninety seconds with your phone. Walk it. Say what you built. Creative Impact turns it into an ad in front of the homeowners with the budget for the same thing.", "Hardscape and landscape companies doing $500K or better: tap Apply Now. Five questions."],
    headline: "Your best job is behind a fence.", description: "See if your company fits",
  },
];

// --- 05 The build sheet ----------------------------------------------------------------
export const BUILD: [string, string, string][] = [
  ["Campaign", "Objective · name", "Leads  ·  CI | NATL | Hardscape-Landscape | Leads"],
  ["Ad set: Cold", "Budget · conversion location", "$50 a day  ·  Instant forms"],
  ["", "Locations (Phase 1)", "FL, GA, SC, NC, TN, AL, MS, LA, TX, OK, AR, AZ, NM, NV, CA"],
  ["", "Locations (Phase 2, Jan 4)", "United States, excluding Omaha, NE plus 50 miles"],
  ["", "Audience", "Broad. Age 28 to 65+. Advantage+ audience on. No interest stacking, no job-title stacks."],
  ["", "Placements", "Advantage+ placements. Every cut is 9:16 with burned-in captions."],
  ["", "Ads", "01-B, 02-B, 04-B. One form bound to all three."],
  ["Ad set: Warm", "Opens when", "The 50% video-viewer audience passes 1,000 people"],
  ["", "Budget · audience", "$15 a day  ·  50% viewers of any cut, last 30 days, excluding leads"],
  ["", "Ads", "01-A, 02-A, 04-A. Frequency cap 2 per 7 days."],
  ["Naming", "Every ad", "CI-HL | script number | cut | hook (main, alt1, alt2)"],
];
export const GATES = [
  { id: "g1", text: "The form is bound to every ad, by hand, and you checked each one twice." },
  { id: "g2", text: "A live test lead from a real phone shows in Lead Center with the ad chain attached." },
  { id: "g3", text: "An under-$500K test answer lands on the \"not yet\" ending and does not reach the calendar." },
];
export const BUILD_NOTE = "Account 1488631013034003 is manual-build. Paste this into Ads Manager line by line. Video uploads go through the Media Library first. Form binding is done by hand on every ad.";
export const JUDGMENT = "Judgment law after launch: read metric pairs, never singles. Hook Rate with Hook-to-Lead. CPL with qualified rate. And never over-tune a winner.";

// --- 06 The form + grading ------------------------------------------------------------------
export const FORM = {
  name: "CI | NATL | Hardscape-Landscape | Qualifier v1", type: "Higher intent (review screen on)",
  intro: ["See if your company fits.", "For hardscape and landscape companies doing $500K or better.", "Five questions. About two minutes.", "If it fits, you pick a time on the next screen. If it does not, we will tell you."],
  questions: [
    { n: 1, q: "What does your company mostly install?", answers: "Hardscape / outdoor living · Landscape design-build · Both · Mowing and maintenance only", for: "Maintenance only = D lead. Wrong buyer for a trust-driven ad engine." },
    { n: 2, q: "Company revenue, last 12 months?", answers: "Under $250K · $250K–$500K · $500K–$1M · $1M–$3M · $3M+", for: "THE GATE. Set the form's lead filter here. Under $500K lands on the \"not yet\" ending and never sees a calendar." },
    { n: 3, q: "Are you the owner?", answers: "Yes · No, I run marketing for the owner · No", for: "\"No\" = D lead. \"Runs marketing\" = the owner joins the call or the call does not happen." },
    { n: 4, q: "What are you spending on ads a month right now?", answers: "$0 · Under $1,000 · $1,000–$3,000 · $3,000+", for: "Not a filter. It tells the caller which story they are walking into: never tried, tried small, or burned." },
    { n: 5, q: "Company name and website or Instagram", answers: "Short answer", for: "The caller opens it before dialing. One specific job gets mentioned in the first thirty seconds." },
  ],
  footer: "Full name · phone · email (prefilled by Meta). State comes through on the lead record.",
  endings: [
    { who: "$500K+ and owner", headline: "You are in range. Pick a time.", note: "Button: View website → the booking calendar. Meta fixes the button label; the headline does the work." },
    { who: "$250K–$500K", headline: "Not yet. And that is fine.", note: "Body: \"We are built for companies a little further along. Reapply when you cross half a million.\" No link. No calendar." },
    { who: "Under $250K, maintenance only, or not the owner", headline: "Thanks for raising your hand.", note: "Same \"not yet\" body. Filtered leads do not enter follow-up. Nobody calls them." },
  ],
  grades: [
    { g: "A", who: "$1M+ · owner · hardscape or design-build", what: "Call inside 5 minutes. Brandon on the close.", cal: "Calendar inside 48 hours" },
    { g: "B", who: "$500K–$1M · owner · install work", what: "Call inside 5 minutes.", cal: "Calendar inside 48 hours" },
    { g: "C", who: "$250K–$500K", what: "No call. One email: \"reapply at half a million.\"", cal: "Never sees a calendar" },
    { g: "D", who: "Under $250K · maintenance only · not the owner", what: "Nothing. Filtered at the form.", cal: "Never enters follow-up" },
  ],
  rule: "The rule that makes the card's last task real: no calendar link is ever sent to a company under $500K. No exceptions for nice people. A pleasant 45-minute call with a $300K company is how the three-a-week floor turns into zero closes.",
};
export const INSTALL = [["hardscape", "Hardscape / outdoor living"], ["designbuild", "Landscape design-build"], ["both", "Both"], ["maintenance", "Mowing and maintenance only"]] as const;
export const REVENUE = [["under250", "Under $250K"], ["250to500", "$250K–$500K"], ["500to1m", "$500K–$1M"], ["1mto3m", "$1M–$3M"], ["3mplus", "$3M+"]] as const;
export const OWNER = [["yes", "Yes"], ["marketing", "No, I run marketing for the owner"], ["no", "No"]] as const;
export const ADSPEND = [["0", "$0"], ["under1k", "Under $1,000"], ["1kto3k", "$1,000–$3,000"], ["3kplus", "$3,000+"]] as const;

export type Grade = "A" | "B" | "C" | "D" | null;
// Section 06, deterministic. Unanswered gate questions => null (ungraded), never a guess.
export function gradeLead(l: { q_install?: string | null; q_revenue?: string | null; q_owner?: string | null }): Grade {
  if (l.q_install === "maintenance" || l.q_owner === "no" || l.q_revenue === "under250") return "D";
  if (!l.q_revenue) return null;
  if (l.q_revenue === "250to500") return "C";
  if (!l.q_install || !l.q_owner) return null;
  if (l.q_revenue === "1mto3m" || l.q_revenue === "3mplus") return "A";
  if (l.q_revenue === "500to1m") return "B";
  return null;
}
export const callable = (g: Grade) => g === "A" || g === "B";
export const adspendStory: Record<string, string> = { "0": "never tried", under1k: "tried small", "1kto3k": "burned, probably", "3kplus": "burned, probably" };

// --- 07 Speed to lead ---------------------------------------------------------------------
export const SPEED_INTRO = "Every A and B lead gets a call inside five minutes. Emmanuel makes it, because his is the face they just watched.";
export const SPEED_CALL: Beat[] = [
  ["OPEN", "Hi, is this {first name}? This is Emmanuel with Creative Impact. You just filled out our form about ads for {company}. Did I catch you on a job site?"],
  ["PERMISSION", "This takes about two minutes. I just want to make sure we are worth each other's time before anybody puts anything on a calendar. Fair?"],
  ["ONE SPECIFIC", "I pulled up your page before I called. That {specific job from their site or Instagram} is a serious piece of work. Is that the kind of job you want more of?"],
  ["CONFIRM THE GATE", "On the form you put revenue around {their answer}. Is that about right for the last twelve months? And you are the owner?"],
  ["THE WHY", "What made you fill that out today instead of scrolling past it?"],
  ["DECISION MAKERS", "When you make a decision on marketing, is that just you, or is there a partner or spouse who weighs in? Let us get them on the call too, so you do not have to repeat all of it."],
  ["BOOK IT", "I have {two specific times inside 48 hours}. It is forty-five minutes on Zoom. Which one works? Do one thing for me before then: look up where your last ten jobs came from. We will use it on the call."],
  ["LOCK IT", "You will get a text from me in the next minute with the link. What time did we say again?"],
];
export const LADDER: Beat[] = [
  ["No answer, minute 5", "Hi {first name}, Emmanuel with Creative Impact. You just asked about ads for {company}. I tried you a second ago. Calling again at {time}, or text me a better one."],
  ["Days 1–3", "Two calls a day, one morning, one evening. One text per day, never the same text twice. Six calls, three texts, then the lead is closed out in the tracker."],
  ["On booking (T1)", "Locked in: {day} at {time}. Here is the Zoom link: {link}. Bring where your last ten jobs came from. I will bring the rest."],
  ["Evening before (T2)", "Tomorrow at {time}. I looked through {company}'s work again tonight. I have two specific ideas for that {specific job}. Talk then."],
  ["60 minutes before (T3)", "See you at {time}. Same link: {link}. If something blew up on a job site, tell me now and we will move it. No hard feelings."],
];

// --- 08 The one-call close ------------------------------------------------------------------
export const CLOSE_INTRO = "Forty-five minutes on Zoom. The skeleton is the course's one-call structure. The questions are rebuilt for hardscape, the register is Counsel, and every \"bro\" is gone. Run it verbatim for ten calls before changing a word.";
export const CLOSE_STAGES: { n: number; title: string; min: string; note: string; lines: string[] }[] = [
  { n: 0, title: "Before you dial", min: "5 min", note: "Read the form. Open their site and Instagram. Find one specific job. Open HoneyBook with the smart file ready: agreement and invoice, one send.", lines: [] },
  { n: 1, title: "Open and frame", min: "2 min", note: "Emmanuel opens every call, so the face on the Zoom matches the face in the ad.", lines: ["Thanks for making the time. I know it is coming out of a job site somewhere.", "Here is how I run these. First I want to understand your company: where jobs come from, what is working, what is not. If I think we can help, I will walk you through exactly how. If I do not, I will tell you that too, and point you somewhere better. Either way you leave with something useful. Does that work?"] },
  { n: 2, title: "Situation", min: "8 min", note: "Facts only. Write the numbers down. They become slide one.", lines: ["Walk me through the company. How many crews, and how far out are you booked right now?", "What does an average job run? And what does a great one run?", "Out of your last ten jobs, where did they come from?", "When you give ten estimates, how many sign?", "What are you doing for marketing today, and who is doing it?"] },
  { n: 3, title: "Problem and cost", min: "8 min", note: "NEPQ. Let them say it. Do not diagnose for them.", lines: ["When you lose an estimate, what do you usually hear back?", "How often is it price?", "What does it do to the schedule when referrals go quiet for a month?", "If you signed two more of your great jobs every month, what would that be worth over a season?", "How long has it been running this way?"] },
  { n: 4, title: "What they already tried", min: "4 min", note: "Find the scar before you pitch, so the pitch does not sound like the thing that burned them.", lines: ["Have you worked with a marketing company before? What did you like about it? What did you get at the end of each month?", "What stopped you from figuring this out in-house?"] },
  { n: 5, title: "Why now", min: "4 min", note: "If there is no why-now, there is no close today. Find it or schedule nothing.", lines: ["You have built this to {their revenue} without this. Why look at it now?", "What is the plan if nothing changes between now and spring?", "Are you willing to settle for that? ... Why not?"] },
  { n: 6, title: "The plan (screen share)", min: "8 min", note: "Three steps, in their numbers, using their words from stages 2–5.", lines: ["Based on what you told me, there are three things we would do. Got something to write on?", "One. We make you the company they already know. You film your jobs and your crew on your phone, from a script and a shot list we send. We cut it and run it as ads in {their market} every month. You told me price is what you hear when you lose. This is how that stops.", "Two. We filter before your phone rings. Every lead answers questions about project type and budget first, and we set up the follow-up so a good lead gets a call in five minutes instead of tomorrow.", "Three. One page, every week. Leads, estimates, signed jobs. You said the last agency sent a PDF you could not read. You will be able to read this one from the truck.", "How does that sit with you? ... What part matters most?", "SAY THIS BEFORE THEY ASK: Our receipts come from landscaping, out of the system our partner built in Omaha. You would be one of the first hardscape companies on it under Creative Impact. That is exactly why we cap it at three new companies a month."] },
  { n: 7, title: "Temperature check", min: "2 min", note: "Do not quote a price to anyone under an 8.", lines: ["Before we talk investment: on a scale of one to ten, where ten is \"this is exactly what we need\" and one is \"get me off this Zoom,\" where are you? And you cannot say seven.", "Eight or higher: What makes it a {their number} and not a five?", "Six or lower: What is missing that would move it closer to a ten?"] },
  { n: 8, title: "The number", min: "1 min", note: "Say it once. Then stop talking. The next person who speaks owns the objection.", lines: ["It is three thousand a month. Ad spend is separate, and it goes straight to Meta, not to us. The floor on that is five hundred a month. For hardscape I would start you closer to fifteen hundred."] },
  { n: 9, title: "Close on the call", min: "3 min", note: "One-call close means the agreement is signed and the invoice is paid before the Zoom ends.", lines: ["I am sending the agreement and the invoice to your email right now. Open it while I am here, so if anything in it is unclear, you are not decoding it alone tonight.", "While that loads, let us pick your kickoff. I have {two times next week}.", "First homework is simple: before you leave your next job, ninety seconds on your phone. Walk it. Say what you built."] },
];
export const OBJECTIONS = [
  { say: "I need to think about it.", label: "It sounds like something is not sitting right yet.", ask: "What part would you be thinking through? ... If that part were handled, is there anything else?", hold: "Never chase. If the real objection will not surface, book the second call before hanging up: \"Let us put fifteen minutes on Thursday so this does not die in your inbox.\"" },
  { say: "It is almost winter. Call me in spring.", label: "It sounds like paying for ads while the ground is frozen feels backwards.", ask: "When do the homeowners who sign with you in April usually start looking?", hold: "If they start in March, their first ad goes live about the time a competitor's tenth does. Winter is when the footage from this season gets put to work. Never offer a delayed start at a lower rate." },
  { say: "That is a lot of money.", label: "It sounds like you have paid for marketing before and did not get it back.", ask: "What is one of your great jobs worth to the company? ... So how many of those would this have to help sign in a year to be a good decision?", hold: "They do the math out loud, not you. Never promise a return. Never drop the number. If three thousand is truly out of reach, they are not a fit and you say so kindly." },
  { say: "Can you guarantee leads?", label: "It sounds like somebody guaranteed you something once.", ask: "What happened with that guarantee?", hold: "\"No. And I would be careful with anyone who does. Nobody controls the auction. What I can promise is what we control: the scripts, the edits, the ads, and a page every week that shows you exactly what happened with your money.\"" },
  { say: "I need to talk to my wife / partner.", label: "It sounds like this is a decision you make together, which is how it should be.", ask: "What do you think they will want to know?", hold: "This objection is lost at booking, not on the call. The speed-to-lead script asks for the other decision maker up front. If it still happens: book all three of you inside 48 hours. Do not send a proposal into a conversation you are not in." },
];
export const SLIDES = [
  { n: 1, title: "Your numbers", body: "Filled in live from stage 2: crews, average job, great job, estimates that sign, where the last ten came from. Nothing about us yet." },
  { n: 2, title: "The three-bid problem", body: "Three strangers on a kitchen counter. Price is the only thing left to compare. Scent-matches Script 01." },
  { n: 3, title: "The engine, in three steps", body: "Known before the estimate · filtered before the phone rings · one page every week." },
  { n: 4, title: "Who does what", body: "Two columns. You: ninety seconds on your phone per job. Us: script, shot list, edit, ads, form, follow-up, scoreboard." },
  { n: 5, title: "The scoreboard", body: "A sample of the one-page weekly: leads, estimates, signed jobs. Blank numbers. It is their future page, not our past." },
  { n: 6, title: "The receipt, and the gap", body: "One landscaper in Omaha, $21,000 off the first ad, built on the system behind Creative Impact. Then the honest line: you would be one of our first hardscape companies." },
  { n: 7, title: "Investment and kickoff", body: "$3,000 a month. Ad spend separate, to Meta. Two kickoff dates. This slide stays hidden until they score an 8." },
];

// --- 09 The constraint tracker -------------------------------------------------------------------
// One row a week (Friday). Raw inputs come from Ads Manager + the lead log;
// the OS computes the metrics, finds the stage furthest below its line, and
// names the fix — "fix that one thing and leave everything else alone".
export type Week = {
  week_of: string;           // the Friday, YYYY-MM-DD
  spend?: number; impressions?: number; views3s?: number; frequency?: number;
  leads?: number; qualified?: number; booked?: number; held?: number; closed?: number;
  median_call_min?: number;
  note?: string;
};
export type MetricKey = "hook" | "qualRate" | "qualCpl" | "speed" | "book" | "show" | "close" | "cpc" | "freq";
export const TRACKER: { key: MetricKey; label: string; how: string; line: string; dir: "min" | "max"; target: number; fix: string; fmt: "pct" | "money" | "num" }[] = [
  { key: "hook", label: "Video Hook Rate", how: "3-second views ÷ impressions", line: "18% or better", dir: "min", target: 0.18, fmt: "pct", fix: "The first three seconds. Swap in the alternate hooks. Nothing else." },
  { key: "qualRate", label: "Qualified rate", how: "$500K+ leads ÷ all leads", line: "40% or better", dir: "min", target: 0.4, fmt: "pct", fix: "The hook is not naming the buyer hard enough, or the revenue question sits too late. Never fix this with interest targeting." },
  { key: "qualCpl", label: "Qualified CPL", how: "spend ÷ $500K+ leads", line: "$200 or less", dir: "max", target: 200, fmt: "money", fix: "This is the scaling gate. Over the line twice, budget freezes." },
  { key: "speed", label: "Speed to lead", how: "median minutes to first call", line: "5 or less", dir: "max", target: 5, fmt: "num", fix: "Notification routing. Add the backup caller." },
  { key: "book", label: "Book rate", how: "booked ÷ qualified", line: "50% or better", dir: "min", target: 0.5, fmt: "pct", fix: "Almost always speed. Check the median before blaming the script." },
  { key: "show", label: "Show rate", how: "held ÷ booked", line: "65% or better", dir: "min", target: 0.65, fmt: "pct", fix: "Texts T1 to T3 are not firing, or calls are being booked more than 48 hours out." },
  { key: "close", label: "Close rate", how: "closed ÷ held", line: "20% or better, after 10 calls", dir: "min", target: 0.2, fmt: "pct", fix: "Call review before any ad change. The ads did their job. The call did not." },
  { key: "cpc", label: "Cost per company", how: "spend ÷ closes", line: "$3,000 or less", dir: "max", target: 3000, fmt: "money", fix: "One month of retainer. Above it, find which stage above is dragging." },
  { key: "freq", label: "Frequency", how: "per ad set, 7-day", line: "under 3", dir: "max", target: 2.999, fmt: "num", fix: "Automatic creative refresh. Pull from the next wave." },
];
const n = (x: unknown) => (x == null || x === "" || isNaN(Number(x)) ? null : Number(x));
const div = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : a / b);

export function computeWeek(w: Week, cumHeldBefore = 0) {
  const v: Record<MetricKey, number | null> = {
    hook: div(n(w.views3s), n(w.impressions)),
    qualRate: div(n(w.qualified), n(w.leads)),
    qualCpl: div(n(w.spend), n(w.qualified)),
    speed: n(w.median_call_min),
    book: div(n(w.booked), n(w.qualified)),
    show: div(n(w.held), n(w.booked)),
    // "after 10 calls" — close rate isn't judged until 10 held calls exist.
    close: cumHeldBefore + (n(w.held) || 0) >= 10 ? div(n(w.closed), n(w.held)) : null,
    cpc: n(w.closed) ? div(n(w.spend), n(w.closed)) : null,
    freq: n(w.frequency),
  };
  const rows = TRACKER.map((t) => {
    const val = v[t.key];
    if (val == null) return { ...t, value: null as number | null, ok: null as boolean | null, gap: 0 };
    const ok = t.dir === "min" ? val >= t.target : val <= t.target;
    // How far below the line, as a fraction of the line — comparable across metrics.
    const gap = ok ? 0 : t.dir === "min" ? (t.target - val) / t.target : (val - t.target) / t.target;
    return { ...t, value: val, ok, gap };
  });
  const worst = rows.filter((r) => r.ok === false).sort((a, b) => b.gap - a.gap)[0] || null;
  return { rows, constraint: worst };
}

export function cumulative(weeks: Week[]) {
  const s = (k: keyof Week) => weeks.reduce((a, w) => a + (n(w[k]) || 0), 0);
  return { spend: s("spend"), leads: s("leads"), qualified: s("qualified"), booked: s("booked"), held: s("held"), closed: s("closed") };
}
// Your actuals replace the planning rates once there's data behind them.
export function actualRates(weeks: Week[]): Partial<Rates> {
  const c = cumulative(weeks);
  const out: Partial<Rates> = {};
  if (c.leads && c.spend) out.cpl = c.spend / c.leads;
  if (c.leads) out.pass = c.qualified / c.leads;
  if (c.qualified) out.book = c.booked / c.qualified;
  if (c.booked) out.show = c.held / c.booked;
  if (c.held >= 10) out.close = c.closed / c.held;
  return out;
}

export function scalingVerdict(weeks: Week[]) {
  const sorted = [...weeks].sort((a, b) => a.week_of.localeCompare(b.week_of));
  const c = cumulative(sorted);
  const cpls = sorted.map((w) => div(n(w.spend), n(w.qualified))).filter((x): x is number => x != null);
  const lastFreq = n(sorted[sorted.length - 1]?.frequency);
  if (lastFreq != null && lastFreq >= 3) return { tone: "stop", text: `Frequency ${lastFreq.toFixed(1)} — automatic creative refresh. Pull from the next wave.` };
  if (c.spend < 750) return { tone: "watch", text: `$${Math.round(c.spend).toLocaleString()} of $750 delivered. $50 a day, no verdicts before $750.` };
  const last2 = cpls.slice(-2);
  if (last2.length === 2 && last2.every((x) => x > 200)) return { tone: "stop", text: `Qualified CPL over $200 two straight reads ($${Math.round(last2[0])}, $${Math.round(last2[1])}). Budget freezes; fix the creative — new hooks first, form order second.` };
  const last = cpls[cpls.length - 1];
  if (last == null) return { tone: "watch", text: "$750 delivered but no qualified leads logged — a qualified CPL can't be read yet." };
  if (last <= 200) return { tone: "good", text: `Qualified CPL $${Math.round(last)} — under $200. Step up one notch ($50 → $100 → $200), never more than double, hold seven days.` };
  return { tone: "watch", text: `Qualified CPL $${Math.round(last)} — over $200 on one read. One more read over the line freezes the budget.` };
}

export function fallbackStatus(weeks: Week[], today = new Date().toISOString().slice(0, 10)) {
  const sorted = [...weeks].sort((a, b) => a.week_of.localeCompare(b.week_of));
  const c = cumulative(sorted);
  const cpls = sorted.map((w) => div(n(w.spend), n(w.qualified))).filter((x): x is number => x != null);
  const res: Record<string, { state: "clear" | "watching" | "TRIPPED"; why: string }> = {};
  res.fb1 = c.spend < 750
    ? { state: "watching", why: `$${Math.round(c.spend)} of $750 delivered; ${c.qualified} qualified so far.` }
    : c.qualified < 6 ? { state: "TRIPPED", why: `$${Math.round(c.spend)} delivered, only ${c.qualified} leads at $500K+.` } : { state: "clear", why: `${c.qualified} qualified from the first $750+.` };
  res.fb2 = c.held < 10 ? { state: "watching", why: `${c.held} of 10 held calls.` } : c.closed === 0 ? { state: "TRIPPED", why: `${c.held} held calls, zero closes.` } : { state: "clear", why: `${c.closed} close${c.closed === 1 ? "" : "s"} from ${c.held} held.` };
  const last2 = cpls.slice(-2);
  res.fb3 = last2.length === 2 && last2.every((x) => x > 200) ? { state: "TRIPPED", why: `Last two reads $${Math.round(last2[0])} and $${Math.round(last2[1])}.` } : { state: cpls.length ? "clear" : "watching", why: cpls.length ? `Last read $${Math.round(cpls[cpls.length - 1])}.` : "No qualified-CPL reads yet." };
  res.fb4 = today < "2026-11-20" ? { state: "watching", why: `${c.closed} signed; the check is Fri Nov 20.` } : c.closed < 2 ? { state: "TRIPPED", why: `Nov 20 passed with ${c.closed} signed.` } : { state: "clear", why: `${c.closed} signed by Nov 20.` };
  return res;
}

// --- Merge fields for the call + texts -------------------------------------------------------------
export type Lead = {
  id?: string; full_name?: string | null; company?: string | null; web?: string | null; state?: string | null;
  q_install?: string | null; q_revenue?: string | null; q_owner?: string | null; q_adspend?: string | null;
  specific_job?: string | null; call_time?: string | null; call_day?: string | null; zoom_link?: string | null;
};
export function mergeLead(text: string, l: Lead) {
  const first = String(l.full_name || "").trim().split(/\s+/)[0];
  const rev = REVENUE.find(([k]) => k === l.q_revenue)?.[1];
  const map: Record<string, string | undefined> = {
    "first name": first || undefined,
    company: l.company || undefined,
    "their answer": rev,
    "their revenue": rev,
    "specific job from their site or Instagram": l.specific_job || undefined,
    "specific job": l.specific_job || undefined,
    time: l.call_time || undefined,
    day: l.call_day || undefined,
    link: l.zoom_link || undefined,
    "their market": l.state || undefined,
  };
  return text.replace(/\{([^}]+)\}/g, (m, k) => map[String(k).trim()] ?? `{${k}}`);
}

// --- Lead Center CSV import (Meta exports are tab- or comma-separated) ------------------------
function splitRow(line: string, d: string) {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === d && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}
const norm = (s: string) => s.toLowerCase().replace(/[_\s]+/g, " ").replace(/[^a-z0-9$+ ]/g, "").trim();
function pick<T extends readonly (readonly [string, string])[]>(val: string, opts: T, rules: [RegExp, string][]): string | null {
  const v = norm(val);
  if (!v) return null;
  for (const [re, key] of rules) if (re.test(v)) return key;
  const hit = opts.find(([, label]) => norm(label) === v);
  return hit ? hit[0] : null;
}
export function parseLeadsCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [] as Record<string, string | null>[], unmapped: [] as string[] };
  const d = lines[0].includes("\t") ? "\t" : ",";
  const head = splitRow(lines[0], d).map(norm);
  // Most specific pattern first, across ALL headers, before trying the next —
  // Meta's question columns contain words like "company" ("what does your
  // company mostly install?"), so a loose first-match grabs the wrong column.
  const col = (...res: RegExp[]) => { for (const r of res) { const i = head.findIndex((h) => r.test(h)); if (i >= 0) return i; } return -1; };
  const idx = {
    created: col(/created time/, /^created/, /date/),
    name: col(/full name/, /^name$/),
    phone: col(/phone/),
    email: col(/email/),
    state: col(/^state/, /province/, /region/),
    install: col(/mostly install/, /install/),
    revenue: col(/revenue/),
    owner: col(/owner/),
    adspend: col(/spending on ads/, /ad spend/, /spending/),
    company: col(/company name/, /website or instagram/, /company/),
    ad: col(/^ad name/, /ad name/),
  };
  const unmapped = Object.entries(idx).filter(([, i]) => i < 0).map(([k]) => k);
  const get = (cells: string[], i: number) => (i >= 0 ? cells[i] || "" : "");
  const rows = lines.slice(1).map((line) => {
    const c = splitRow(line, d);
    const created = get(c, idx.created);
    const companyRaw = get(c, idx.company);
    const url = (companyRaw.match(/(https?:\/\/\S+|[a-z0-9-]+\.[a-z]{2,}\S*|@[a-z0-9_.]+)/i) || [])[0] || null;
    return {
      lead_at: created && !isNaN(new Date(created).getTime()) ? new Date(created).toISOString() : null,
      full_name: get(c, idx.name) || null,
      phone: get(c, idx.phone).replace(/^p:/i, "") || null,
      email: get(c, idx.email) || null,
      state: get(c, idx.state) || null,
      company: companyRaw.replace(url || "", "").replace(/[,·|-]+\s*$/, "").trim() || companyRaw || null,
      web: url,
      ad: get(c, idx.ad) || null,
      q_install: pick(get(c, idx.install), INSTALL, [[/maint|mow/, "maintenance"], [/both/, "both"], [/design/, "designbuild"], [/hardscape|outdoor/, "hardscape"]]),
      q_revenue: pick(get(c, idx.revenue), REVENUE, [[/under.?250/, "under250"], [/250.*500/, "250to500"], [/500.*1m|500k.*1/, "500to1m"], [/1m.*3m/, "1mto3m"], [/3m/, "3mplus"]]),
      q_owner: pick(get(c, idx.owner), OWNER, [[/market/, "marketing"], [/^yes/, "yes"], [/^no/, "no"]]),
      q_adspend: pick(get(c, idx.adspend), ADSPEND, [[/^\$?0$/, "0"], [/under/, "under1k"], [/1000.*3000|1k.*3k/, "1kto3k"], [/3000|3k/, "3kplus"]]),
    };
  }).filter((r) => r.full_name || r.email || r.phone);
  return { rows, unmapped };
}
