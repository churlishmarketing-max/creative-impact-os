'use client';
/* ============================================================================
 * Churlish OS — Command Center cockpit.
 * Ported VERBATIM from the Claude Design mockup (Churlish OS.html):
 *   - logic class (state + compute) is the original DCLogic "Component", unchanged
 *   - render() is a mechanical conversion of the <x-dc> template
 *     (sc-if -> ternary, sc-for -> .map, {{ }} -> {expr}, style-hover -> <Hover>)
 * Do not redesign. Only the data layer (loadStore/saveStore) is meant to change.
 * ========================================================================== */
import React from 'react';
import { store } from '@/lib/store';

// Reproduces DC's style-hover: merge hover styles on pointer enter/leave so they
// win over the element's inline base styles (a CSS :hover class would not).
function Hover({ as: Tag = 'div', baseStyle, hoverStyle, children, ...rest }) {
  const [h, setH] = React.useState(false);
  let style = baseStyle;
  if (h) {
    style = { ...baseStyle, ...hoverStyle };
    // Avoid React's shorthand/longhand conflict: if hover sets borderColor but
    // the base used the `border` shorthand, split the shorthand into longhands.
    if (style.borderColor && style.border) {
      const p = String(style.border).split(/\s+/);
      delete style.border;
      style.borderWidth = p[0];
      style.borderStyle = p[1];
    }
  }
  return (
    <Tag
      style={style}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      {...rest}
    >
      {children}
    </Tag>
  );
}


class Cockpit extends React.Component {
  GOAL = 150000;
  SELLBY = '2026-08-31';
  DEADLINE = '2026-12-31';
  ONE_TITLE = 'PUBLISH THE $750 AUTHORITY DIAGNOSTIC';
  ONE_BODY = "One page, sample report attached, in front of the cold list. Until it's live, nothing else on this screen matters.";
  KEY = 'churlish.os.terminal.v1';

  BOOT = [
    { text: 'CHURLISH//OS  v1.4.0  — BOOTLOADER', color: 'var(--cream)' },
    { text: '> POST .............................. OK', color: 'var(--muted)' },
    { text: '> MOUNT /layer1  COMMAND ........... OK', color: 'var(--muted)' },
    { text: '> MOUNT /layer2  AGENT_FLEET ....... OK', color: 'var(--muted)' },
    { text: '> MOUNT /layer3  SOP+SALES ......... OK', color: 'var(--muted)' },
    { text: '> MOUNT /layer4  FOUNDER_OS ........ OK', color: 'var(--muted)' },
    { text: '> AGENT FLEET .... 6 UNITS ONLINE', color: 'var(--muted)' },
    { text: '> LEDGER SYNC .... $150,000 TARGET LOCKED', color: 'var(--muted)' },
    { text: '> CLOCK .......... AUG 31 / DEC 31 ARMED', color: 'var(--muted)' },
    { text: '> ENCRYPTION ..... AES-256 // SECURE', color: 'var(--muted)' },
    { text: '> ALL SYSTEMS NOMINAL. READY.', color: '#3fb97a' }
  ];

  SECTIONS = [
    { num: '01', label: 'Command', id: 'command' },
    { num: '02', label: 'Pipeline', id: 'pipeline' },
    { num: '03', label: 'Clients', id: 'clients' },
    { num: '04', label: 'Invoices', id: 'invoices' },
    { num: '05', label: 'Proposals', id: 'proposals' },
    { num: '06', label: 'Scheduling', id: 'scheduling' },
    { num: '07', label: 'KPIs', id: 'kpis' },
    { num: '08', label: 'Expenses', id: 'expenses' },
    { num: '09', label: 'Diagnostic', id: 'script' },
    { num: '10', label: 'Playbook', id: 'playbook' },
    { num: '11', label: 'Agent Fleet', id: 'agents' },
    { num: '12', label: 'Founder OS', id: 'founder' },
    { num: '13', label: 'Documents', id: 'docs' },
    { num: '14', label: 'Strategy', id: 'strategy' },
    { num: '15', label: 'Plans', id: 'plans' },
    { num: '16', label: 'Rookie', id: 'rookie' }
  ];

  SEED = [
    { name: 'Cornerstone Plumbing', offer: 'Authority Diagnostic', value: 750, stage: 'Collected' },
    { name: 'Vela Roofing', offer: 'Ad Creative Tournament', value: 2500, stage: 'Collected' },
    { name: 'Brightline Dental', offer: '48-Hour Tool Sprint', value: 5000, stage: 'Collected' },
    { name: 'Maple & Co Realty', offer: 'Authority Engine', value: 3500, stage: 'Collected' },
    { name: 'Ironside Fitness', offer: 'Authority System', value: 5000, stage: 'Collected' },
    { name: 'Northstar HVAC', offer: 'Authority Launchpad', value: 2500, stage: 'Collected' },
    { name: 'Harbor & Vine Law', offer: 'Authority Diagnostic', value: 750, stage: 'Collected' },
    { name: 'Cedar Park Dental', offer: 'CRF Subscription', value: 2400, stage: 'Collected' },
    { name: 'Atlas Moving', offer: 'Ad Creative Tournament', value: 2500, stage: 'Collected' },
    { name: 'Summit Realty', offer: 'Authority System', value: 5000, stage: 'Collected' },
    { name: 'Forge Athletics', offer: '48-Hour Tool Sprint', value: 5000, stage: 'Collected' },
    { name: 'Delta Signs', offer: 'Authority Diagnostic', value: 750, stage: 'Signed' },
    { name: 'Quill & Co', offer: 'Ad Creative Tournament', value: 2500, stage: 'Signed' },
    { name: 'Tower Electric', offer: '48-Hour Tool Sprint', value: 5000, stage: 'Signed' },
    { name: 'Lumen Studios', offer: 'Authority Diagnostic', value: 750, stage: 'Diagnostic Sent', date: '2026-07-01' },
    { name: 'Riverside Roofing', offer: 'Authority Diagnostic', value: 750, stage: 'Lead', date: '2026-07-02' },
    { name: 'Granite Law', offer: 'Authority Diagnostic', value: 750, stage: 'Diagnostic Sent', date: '2026-07-03' },
    { name: 'Vertex HVAC', offer: 'Authority Engine', value: 3500, stage: 'Diagnostic Done', date: '2026-07-04' },
    { name: 'Peak Dental', offer: 'Ad Creative Tournament', value: 2500, stage: 'Lead', date: '2026-07-05' },
    { name: 'Beacon Realty', offer: 'Authority System', value: 5000, stage: 'Proposal', date: '2026-07-06' },
    { name: 'Cobalt Realty', offer: 'Authority Diagnostic', value: 750, stage: 'Diagnostic Sent', date: '2026-07-08' },
    { name: 'Oak & Iron', offer: 'Authority Launchpad', value: 2500, stage: 'Proposal', date: '2026-07-09' },
    { name: 'Anchor Marine', offer: 'Authority System', value: 5000, stage: 'Diagnostic Done', date: '2026-07-10' }
  ];

  LOGSEED = [
    { t: '07:42', tag: 'KF', color: 'var(--red)', msg: 'sourced 18 prospects · roofing / NE metro' },
    { t: '08:05', tag: 'BB', color: '#3fb97a', msg: 'sequence dispatched · 14 sends, 0 bounces' },
    { t: '09:18', tag: 'BB', color: '#3fb97a', msg: 'booked call · Lumen Studios · 15:00' },
    { t: '10:30', tag: 'RR', color: 'var(--cream)', msg: 'rendered 6 ad variants · Vela tournament' },
    { t: '11:02', tag: 'WT', color: 'var(--muted)', msg: 'fleet audit · all units on-brand · green' },
    { t: '12:15', tag: 'EV', color: 'var(--red)', msg: 'ledger reconciled · collected +$5,000' },
    { t: '13:40', tag: 'KF', color: 'var(--red)', msg: 'tiered list updated · 142 active leads' }
  ];

  AMB = [
    { tag: 'BB', color: '#3fb97a', msg: 'reply received · Granite Law · positive' },
    { tag: 'RR', color: 'var(--cream)', msg: 'clip batch queued · short-form #31' },
    { tag: 'WT', color: 'var(--muted)', msg: 'heartbeat · 6/6 agents responding' },
    { tag: 'KF', color: 'var(--red)', msg: 'new prospect tier-1 · HVAC · scored 0.91' },
    { tag: 'EV', color: 'var(--red)', msg: 'coverage check · advisory issued' },
    { tag: 'BB', color: '#3fb97a', msg: 'follow-up scheduled · Peak Dental · +2d' }
  ];

  STAGES = ['Lead', 'Diagnostic Sent', 'Diagnostic Done', 'Proposal', 'Signed', 'Collected'];
  STAGEPROB = { 'Lead': .1, 'Diagnostic Sent': .3, 'Diagnostic Done': .5, 'Proposal': .7, 'Signed': .95, 'Collected': 1 };

  FLEET = [
    { init: 'KF', name: 'Kid Flash', role: 'Lead research — sources, qualifies and tiers prospect lists from Apollo.', cad: 'Every morning', accent: 'var(--red)' },
    { init: 'BB', name: 'Blue Beetle', role: 'Outreach — works the email + LinkedIn sequences, books the 15-minute calls.', cad: 'Daily', accent: '#3fb97a' },
    { init: 'RR', name: 'Red Robin', role: 'Short-form + ad creative — turns footage into a wall of clips and ad variants.', cad: 'Daily', accent: 'var(--cream)' },
    { init: 'AL', name: 'Alfred', role: 'Long-form editor brain — storyboards and animates YouTube / client video.', cad: 'Per project', accent: 'var(--cream)' },
    { init: 'WT', name: 'Watchtower', role: 'Supervisor — verifies every agent ran clean and on-brand before it costs you.', cad: 'Midday', accent: 'var(--muted)' },
    { init: 'EV', name: 'EVE', role: 'Executive operator — routes work and runs the goal ledger. Capped at 5 hrs/wk.', cad: 'On call', accent: 'var(--red)' }
  ];
  LOOP = ['Kid Flash', 'Blue Beetle', 'Booked call', 'Pipeline', 'Red Robin', 'Watchtower'];
  OPSLIST = [
    'Watchtower report reviewed — fleet green',
    'Kid Flash list approved → handed to Blue Beetle',
    '3 discovery calls held (the floor)',
    'New deals + stage moves logged in Pipeline',
    'Red Robin proof asset reviewed / scheduled',
    'Founder OS check-in done'
  ];

  LADDER = [
    { n: 'Authority Diagnostic', p: '$750 PIF · 48 HRS', d: 'The paid first yes. A scored teardown that writes the retainer proposal for you.', accent: 'var(--red)' },
    { n: 'Ad Creative Tournament', p: '$2,500 PIF', d: 'Variants judged overnight by persona panels. First 3 @ $1,500 (case-study exchange).', accent: 'var(--cream)' },
    { n: '48-Hour Tool Sprint', p: '$5,000 FLAT', d: 'Interview to a working internal tool in two days. Same cold list, second offer.', accent: 'var(--red)' }
  ];
  SOPS = [
    { t: 'Authority Diagnostic', p: '$750 · 48-HOUR TURNAROUND', steps: ['Take payment + intake (Pipeline → Diagnostic Sent).', 'Pull their funnel: site, ads, socials, lead path, follow-up.', 'Run the avatar + ad / funnel read; score authority 1–10.', 'Write the teardown: 3 ranked fixes, each with a dollar number.', 'Deliver PDF + 15-min walkthrough → pitch Engine / System.'], out: 'Output: scored report + a warm proposal conversation.' },
    { t: 'Ad Creative Tournament', p: '$2,500 · FIRST 3 @ $1,500', steps: ['Intake their best customer language + current ads.', 'Generate N variants across hooks / angles.', 'Score with persona panels built from real customer voice.', 'Deliver kill list + launch list + scoreboard with reasons.', 'Hand winners to Red Robin to produce.'], out: 'Output: a ranked ad scoreboard. Re-price to $3,500 after 3 case studies.' },
    { t: '48-Hour Tool Sprint', p: '$5,000 · 50% UPFRONT', steps: ['Interview: find the spreadsheet / group-text they live in.', 'Spec the tool in one page; confirm scope.', 'Build the working internal tool in two days.', 'Write the plain-English handoff guide.', 'Deliver + 30-min training. +$1,500/day if it grows.'], out: 'Output: a tool they actually use. Opens the retainer door.' },
    { t: 'Renewal & Expansion', p: 'THE LEAK THE WAR ROOM FLAGGED', steps: ['Day 60: expansion conversation — show results, name the next tier.', 'Day 75: renewal motion — re-sign before the term lapses.', 'Any account quiet 14 days → renewal call that week.', 'Capture a testimonial + proof asset at every win.', 'Churn budget: ≤1 account per quarter.'], out: 'Output: protected base. One saved account = a month of diagnostics.', danger: true }
  ];

  SCRIPT = [
    { n: '01', l: 'Open / Disarm', goal: 'Lower the guard. You’re not a salesperson today — you’re the person who already knows what’s wrong.', blocks: [
      { t: 'say', text: '“Hey [Name] — appreciate you grabbing 15 minutes. I’ll be straight: I’m not here to pitch you a retainer. I do a paid teardown of where a service business is actually leaking money and attention — and before either of us talks about working together, you should just see it. Fair?”' },
      { t: 'note', text: 'Voss tone: late-night-FM, slow, no upward inflection. You’re the calm one. Let them talk first.' },
      { t: 'q', items: ['“Before I dig in — what made you take the call?” (let the real reason surface)', 'Mirror the last three words of whatever they say. Then stay quiet.'] }
    ] },
    { n: '02', l: 'Situation', goal: 'Get the lay of the land. Facts, not pain yet — build the map you’ll diagnose against.', blocks: [
      { t: 'q', items: ['“Walk me through how someone finds you right now — start to booked job.”', '“Roughly how many new leads a month, and where do most come from?”', '“What are you spending on marketing right now — ads, content, an agency, all of it?”', '“When someone reaches out but doesn’t buy — what happens to them?”'] },
      { t: 'note', text: 'That last one is the trap door. Most have no answer. Don’t react — just write it down and nod.' }
    ] },
    { n: '03', l: 'Problem Awareness', goal: 'Make them say the problem out loud. Your job is questions; their job is realizing.', blocks: [
      { t: 'q', items: ['“When you look at that lead-to-customer path — where do you think it’s breaking?”', '“How long has it been running like that?”', '“What have you already tried to fix it? And how’d that go?”'] },
      { t: 'sayalt', text: '“So if I’m hearing you right — the work is good, the jobs are good, but the thing between ‘they hear about you’ and ‘they hire you’ is basically held together with hope. Is that fair, or am I overstating it?”' },
      { t: 'note', text: 'Labeling (Voss): “It sounds like…” / “It seems like…”. Let them correct you — correction is engagement.' }
    ] },
    { n: '04', l: 'Consequence', goal: 'Let the gap breathe. What does leaving it broken cost — in dollars and in their head. Don’t rush to the fix.', blocks: [
      { t: 'q', items: ['“If nothing changes in the next 6–12 months, where does that leave you?”', '“What’s a single closed job worth to you, on average?”', '“So if even a handful of warm leads are slipping every month — you’ve got a rough number for what this is already costing, right?”'] },
      { t: 'note', text: 'Stay silent after the cost question. The number landing in their own head does more than any slide could.' }
    ] },
    { n: '05', l: 'The Diagnostic', goal: 'Present the $750 paid teardown as the obvious next step — not a sales call, a deliverable.', blocks: [
      { t: 'say', text: '“Here’s what I’d do. Before anyone talks about a monthly anything, I run an Authority Diagnostic. It’s $750, it takes 48 hours, and you get a written, scored teardown: where your authority’s thin, where the funnel leaks, and the three highest-leverage fixes — ranked by what they’re worth. You keep it whether or not we ever work together.”' },
      { t: 'sayalt', text: '“Think of it like a contractor who walks the job before quoting. I’m not going to guess at your business for free and call it a strategy — that’s what the cheap guys do. I’ll show you exactly what’s wrong, with a number next to it. Then you decide if you want me to fix it.”' },
      { t: 'q', items: ['“Want me to send the sample report so you can see the format?” (always have it ready)', '“Anything you’d want me to look hardest at?”'] }
    ] },
    { n: '06', l: 'Commit', goal: 'Ask for the small yes. Calibrated questions hand them control while moving forward.', blocks: [
      { t: 'say', text: '“So here’s the only question that matters today: do you want to keep guessing at where this is leaking — or do you want it on paper, with numbers, in 48 hours?”' },
      { t: 'q', items: ['“How do you want to handle the $750 — card now, or invoice today?”', '“What’s the best email for the report and the receipt?”', '“If the teardown shows something worth fixing — are you the one who’d make that call, or is there someone else in it with you?”'] },
      { t: 'note', text: 'The second they say yes: open Pipeline → add the deal at Diagnostic Sent, $750. Don’t trust your memory after the call.' }
    ] }
  ];
  OBJECTIONS = [
    { q: '“It’s just you? How do I know you can handle this?”', lab: 'Reframe the objection into the offer', a: '“It’s me plus a system I built that does the work a six-person team used to. That’s the whole point — you get a three-person studio’s overhead with a forty-person studio’s output, and one person who actually answers the phone. You’re not paying for a building full of account managers. You’re paying for the work.”' },
    { q: '“$750 for a report? Just tell me what you’d charge to do it.”', lab: 'Hold the frame — the diagnostic IS the value', a: '“I could throw a number at you, but I’d be guessing — and you’d be right not to trust it. The $750 is what makes the recommendation real instead of a sales pitch. It’s also the cheapest way to find out if I’m full of it. If the teardown’s not worth more than $750 to you, you definitely shouldn’t hire me for the monthly.”' },
    { q: '“I need to think about it.”', lab: 'Label it, then ask what’s really underneath', a: '“Totally fair — sounds like something specific is giving you pause. Usually when someone says that, it’s one of three things: the money, the timing, or they’re not sure it’ll actually be different this time. Which one’s closest?” Then handle the real one. Don’t argue the stall — find the lock.' },
    { q: '“Can you just send me your pricing?”', lab: 'Pricing without diagnosis is how the cheap guys lose', a: '“I can — but a price list without knowing what’s actually broken in your funnel is how you end up overpaying for stuff you don’t need. That’s exactly what the $750 teardown prevents. Let me show you what’s wrong first; then the price answers itself because you’ll know what it’s fixing.”' },
    { q: '“We tried an agency before and it didn’t work.”', lab: 'Agree, then separate yourself with proof', a: '“Good — then you already know what bad looks like, which makes this easier. Most agencies sell you content and call activity a result. I sell you a number — booked jobs, leads, dollars. The teardown will show you exactly where the last one failed you, on paper. That alone is worth the $750.”' },
    { q: '“It’s not the right time / things are busy.”', lab: 'Use their own consequence number', a: '“That’s usually exactly when the leak is costing the most — busy means leads are coming in and slipping out while you’re heads-down on the work. The teardown takes nothing from you but a 30-minute call and 48 hours of my time. Worst case, you’ve got a scored to-do list for when things calm down.”' },
    { q: '“Let me talk to my partner / spouse.”', lab: 'Help them sell it, set the next step', a: '“Smart — this should be a both-of-you decision. Let me send you the sample report and a two-line summary of what we covered, so you’re not relaying it from memory. Then what day this week works to get the three of us on for ten minutes?” Always pin the next calendar moment before you hang up.' }
  ];

  DOCS = [
    { cat: 'STRATEGY', items: [
      { name: 'Churlish OS Blueprint', fmt: 'PDF', meta: 'Master spec · the whole operating system', tag: 'CORE' },
      { name: '90-Day Sprint Plan', fmt: 'DOC', meta: '$150K signed by Aug 31, collected by Dec 31' },
      { name: 'Positioning & Moat', fmt: 'DOC', meta: 'Become the authority · one-operator studio' }
    ] },
    { cat: 'SALES', items: [
      { name: 'Diagnostic Call Script', fmt: 'DOC', meta: 'NEPQ spine + Voss · 6 steps', tag: 'LIVE' },
      { name: 'Authority Diagnostic — Sample Report', fmt: 'PDF', meta: 'Send it before the call', tag: 'HOT' },
      { name: 'Objection Handling', fmt: 'DOC', meta: 'The seven you’ll actually hear' },
      { name: 'Offer Ladder & Pricing', fmt: 'SHEET', meta: 'Fixed · never discount month one' }
    ] },
    { cat: 'BRAND', items: [
      { name: 'Logo & Film-Strip Mark', fmt: 'SVG', meta: 'Primary + red-on-black variants' },
      { name: 'Color & Type System', fmt: 'DOC', meta: 'Red-pure · Barlow Condensed / JetBrains' },
      { name: 'Ad Templates — Vol. 002', fmt: 'FIG', meta: 'Save this · send to your marketing guy' }
    ] },
    { cat: 'OPERATIONS', items: [
      { name: 'Agent Fleet SOPs', fmt: 'DOC', meta: '6 units · run order + handoffs' },
      { name: 'Cold List — Apollo Export', fmt: 'CSV', meta: '142 active leads, tiered', tag: 'LIVE' },
      { name: 'Contract + Invoice Templates', fmt: 'DOC', meta: 'PIF / 50% upfront language' }
    ] }
  ];
  STRATEGY = {
    thesis: 'Sell the first yes for $750 — not the retainer. The Authority Diagnostic is the wedge; the ladder is the climb; the agent fleet is the margin.',
    pillars: [
      { k: 'THE WEDGE', t: 'A paid diagnostic, not a free audit', d: '$750 buys a scored teardown with a dollar on every fix. It pre-qualifies, it pays, and it writes the retainer proposal for you. Free audits attract tire-kickers — a paid first yes attracts buyers.' },
      { k: 'THE MOAT', t: 'One operator, studio output', d: 'A six-person team’s work from a single founder plus a six-unit agent fleet. Forty-studio output at three-person overhead — and one person who actually answers the phone.' },
      { k: 'THE TARGET', t: 'Service businesses that already work', d: 'Roofers, dentists, HVAC, law, fitness, realty — good work, broken funnel. The gap between “hear about you” and “hire you” is held together with hope. We sell the fix, with a number on it.' }
    ],
    bets: [
      'Publish the $750 Diagnostic and put it in front of the cold list — the one thing.',
      'Stack the ladder: Diagnostic → Tournament → Tool Sprint → retainer. Never discount month one.',
      'Run the fleet so the funnel is founder-free — hands stay on sales and the lens.'
    ],
    antigoals: ['No free strategy calls.', 'No retainers before a paid diagnostic.', 'No bundled ad spend — always separate, $500/mo min.', 'No week-5 burnout — Founder OS is load-bearing.']
  };
  PLANS = [
    { n: 'P1', t: 'Publish the Wedge', when: 'THIS WEEK', d: 'Ship the $750 Authority Diagnostic page with the sample report attached. Until it’s live, nothing else on the board counts.', state: 'ACTIVE' },
    { n: 'P2', t: 'Fill the Funnel', when: 'WEEKS 1–4', d: 'Kid Flash + Blue Beetle run the cold list. Hold the floor: 3 discovery calls a week, 2 offers out.', state: 'NEXT' },
    { n: 'P3', t: 'Sign $150K', when: 'BY AUG 31', d: 'Diagnostics convert to proposals convert to contracts. Keep pipeline coverage ≥3× the gap, always.', state: 'QUEUED' },
    { n: 'P4', t: 'Collect & Renew', when: 'BY DEC 31', d: 'Deliver, collect, and run the expansion play at day 60 / renewal at day 75. Protect the base.', state: 'QUEUED' }
  ];
  PLANMOVES = ['Diagnostic landing page live', 'Sample report PDF attached', 'Cold list segmented — top 50', 'Blue Beetle sequence pointed at the page', 'First 3 diagnostics pitched to the list'];

  constructor(props) {
    super(props);
    const booted = (() => { try { return sessionStorage.getItem('churlish_booted') === '1'; } catch (e) { return false; } })();
    const bootOn = (props.bootSequence ?? true) && !booted;
    const wk = this.weekKey();
    this.state = {
      booting: bootOn,
      bootIdx: bootOn ? 0 : this.BOOT.length,
      view: 'command',
      now: Date.now(),
      // Real (Supabase) mode starts EMPTY and loads from the DB — no phantom
      // seed deals or Friday Five numbers. The seeds are local-dev demo only.
      deals: store.enabled ? [] : this.SEED.map((d, i) => Object.assign({ id: 'seed' + i }, d)),
      clients: [],
      invoices: [],
      proposals: [],
      bookings: [],
      expenses: [],
      kpis: [],
      kpiEntries: {},
      weeks: store.enabled ? {} : { [wk]: { calls: 4, proposals: 3, signed: 8250, collected: 5000, founderFree: 38, manual: { pitch: true } } },
      ops: {},
      step: 0,
      showObj: false,
      dealModal: null,
      docModal: null,
      clientModal: null,
      invoiceModal: null,
      proposalModal: null,
      intakeModal: null,
      expenseModal: null,
      kpiModal: null,
      emailModal: null,
      rookieMsgs: [],
      rookieInput: '',
      rookieBusy: false,
      rookieFile: null,
      founder: {},
      habits: [{ id: 'h1', name: '3 sales conversations', days: {} }, { id: 'h2', name: 'Move my body', days: {} }, { id: 'h3', name: 'Camera on something', days: {} }],
      goals: [{ id: 'g1', text: '$150K collected by Dec 31', type: 'business', target: 150000, done: false }, { id: 'g2', text: 'Publish the $750 Diagnostic this week', type: 'business', target: 0, done: false }, { id: 'g3', text: 'Protect health through the sprint — no week-5 wall', type: 'life', target: 0, done: false }],
      log: this.LOGSEED.slice(),
      toast: ''
    };
  }

  componentDidMount() {
    this.loadStore();
    // Returning from the Connect Facebook flow
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('fb') === 'connected') {
        this.setState({ view: 'clients' });
        this.flash('FACEBOOK CONNECTED ✓ · LEADS WILL FLOW IN', 5000);
        window.history.replaceState({}, '', '/');
      }
    } catch (e) {}
    this.clock = setInterval(() => this.setState({ now: Date.now() }), 1000);
    this.logTimer = setInterval(() => this.pushLog(), 4200);
    window.addEventListener('keydown', this.onKey);
    if (this.state.booting) {
      this.bootTimer = setInterval(() => {
        this.setState(s => {
          if (s.bootIdx >= this.BOOT.length) { clearInterval(this.bootTimer); return null; }
          const idx = s.bootIdx + 1;
          if (idx >= this.BOOT.length) { clearInterval(this.bootTimer); this.autoDismiss = setTimeout(() => this.dismiss(), 5000); }
          return { bootIdx: idx };
        });
      }, 240);
    }
  }
  componentWillUnmount() {
    clearInterval(this.clock); clearInterval(this.logTimer); clearInterval(this.bootTimer);
    clearTimeout(this.autoDismiss); clearTimeout(this.toastT); clearTimeout(this._saveT);
    window.removeEventListener('keydown', this.onKey);
  }

  onKey = (e) => {
    if (!this.state.booting) return;
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') { e.preventDefault(); this.dismiss(); }
  };
  dismiss = () => {
    clearInterval(this.bootTimer); clearTimeout(this.autoDismiss);
    try { sessionStorage.setItem('churlish_booted', '1'); } catch (e) {}
    this.setState({ booting: false, bootIdx: this.BOOT.length });
  };

  // Data layer: load everything from the store (Supabase in real mode).
  async loadStore() {
    try {
      const d = await store.loadAll();
      if (!d) return;
      const patch = {};
      if (d.sprint) {
        this.GOAL = d.sprint.target; this.SELLBY = d.sprint.sellby; this.DEADLINE = d.sprint.deadline;
        if (d.sprint.oneThingTitle) this.ONE_TITLE = d.sprint.oneThingTitle;
        if (d.sprint.oneThingBody) this.ONE_BODY = d.sprint.oneThingBody;
      }
      const app = d.app || {};

      // When connected to Supabase, the database is the SINGLE source of truth for
      // the pipeline — even when it's empty. No auto-seed: a deal you delete stays
      // deleted, and an empty board stays empty until you add your own.
      if (store.enabled) {
        patch.deals = Array.isArray(d.deals) ? d.deals : [];
      } else if (Array.isArray(d.deals) && d.deals.length) {
        patch.deals = d.deals; // local-dev fallback only
      }
      // Real mode: the DB's weeks ARE the weeks (an unlogged week is blank, not
      // demo numbers). Local dev keeps the old merge behavior.
      if (store.enabled) patch.weeks = (d.weeks && Object.keys(d.weeks).length) ? d.weeks : {};
      else if (d.weeks && Object.keys(d.weeks).length) patch.weeks = Object.assign({}, this.state.weeks, d.weeks);
      if (app) {
        if (app.founder) patch.founder = app.founder;
        if (app.ops) patch.ops = app.ops;
        if (app.habits && app.habits.length) patch.habits = app.habits;
        if (app.goals && app.goals.length) patch.goals = app.goals;
      }
      if (Array.isArray(d.log) && d.log.length) patch.log = d.log;
      if (store.enabled) patch.clients = Array.isArray(d.clients) ? d.clients : [];
      else if (Array.isArray(d.clients) && d.clients.length) patch.clients = d.clients;
      if (store.enabled) patch.invoices = Array.isArray(d.invoices) ? d.invoices : [];
      else if (Array.isArray(d.invoices) && d.invoices.length) patch.invoices = d.invoices;
      if (store.enabled) patch.proposals = Array.isArray(d.proposals) ? d.proposals : [];
      else if (Array.isArray(d.proposals) && d.proposals.length) patch.proposals = d.proposals;
      if (store.enabled) patch.bookings = Array.isArray(d.bookings) ? d.bookings : [];
      else if (Array.isArray(d.bookings) && d.bookings.length) patch.bookings = d.bookings;
      if (store.enabled) {
        patch.expenses = Array.isArray(d.expenses) ? d.expenses : [];
        patch.kpis = Array.isArray(d.kpis) ? d.kpis : [];
        patch.kpiEntries = d.kpiEntries || {};
      } else {
        if (Array.isArray(d.expenses) && d.expenses.length) patch.expenses = d.expenses;
        if (Array.isArray(d.kpis) && d.kpis.length) patch.kpis = d.kpis;
        if (d.kpiEntries) patch.kpiEntries = d.kpiEntries;
      }
      this.setState(patch);
    } catch (e) { console.error('loadStore failed', e); }
  }
  // Persist the current week's Friday Five + the app-state doc. Debounced so a
  // burst of keystrokes coalesces into one write, then awaited so we can show a
  // real SYNCED/FAILED status instead of firing-and-forgetting.
  saveStore() {
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => this.flushStore(), 300);
  }
  async flushStore() {
    try {
      const wk = this.weekKey();
      const w = this.state.weeks[wk];
      const tasks = [];
      if (w) tasks.push(store.saveWeek(wk, w));
      tasks.push(store.saveApp({ founder: this.state.founder, habits: this.state.habits, goals: this.state.goals, ops: this.state.ops }));
      await Promise.all(tasks);
      if (store.enabled) this.flash('SYNCED ✓');
    } catch (e) {
      console.error('save failed', e);
      if (store.enabled) this.flash('SAVE FAILED — ' + (e.message || e), 7000);
    }
  }

  // --- Pipeline deal CRUD (added for Stage 1: deals are now real & editable) ---
  openDeal(d) {
    this.setState({ dealModal: d
      ? { id: d.id, name: d.name, offer: d.offer, value: d.value, stage: d.stage, date: d.date || '', clientId: d.clientId || '' }
      : { id: null, name: '', offer: 'Authority Diagnostic', value: 750, stage: 'Lead', date: '', clientId: '' } });
  }
  closeDeal() { this.setState({ dealModal: null }); }
  setDealField(k, v) { this.setState(s => ({ dealModal: Object.assign({}, s.dealModal, { [k]: v }) })); }
  async saveDeal() {
    const m = this.state.dealModal; if (!m) return;
    const deal = { id: m.id || undefined, name: (m.name || '').trim() || 'Untitled', offer: m.offer || '', value: +m.value || 0, stage: m.stage || 'Lead', date: m.date || undefined, clientId: m.clientId || null };
    let id;
    try {
      id = await store.upsertDeal(deal);
    } catch (e) {
      console.error('deal save failed', e);
      this.flash('DEAL SAVE FAILED — ' + (e.message || e), 7000);
      return; // keep the modal open; nothing was persisted
    }
    deal.id = id || m.id || ('local-' + Date.now());
    this.setState(s => {
      const deals = s.deals.slice();
      const i = deals.findIndex(x => x.id === deal.id);
      if (i >= 0) deals[i] = deal; else deals.push(deal);
      return { deals, dealModal: null };
    });
    this.flash(m.id ? 'DEAL UPDATED ✓' : 'DEAL ADDED ✓');
  }
  async removeDeal() {
    const m = this.state.dealModal; if (!m) return;
    const persisted = m.id && !String(m.id).startsWith('seed') && !String(m.id).startsWith('local');
    if (persisted) {
      try { await store.deleteDeal(m.id); }
      catch (e) { console.error(e); this.flash('DELETE FAILED — ' + (e.message || e), 7000); return; }
    }
    this.setState(s => ({ deals: s.deals.filter(x => x.id !== m.id), dealModal: null }));
    this.flash('DEAL DELETED');
  }
  async logout() {
    try { await store.signOut(); } catch (e) {}
    window.location.assign('/login');
  }

  // --- Document links (Stage 1 "easy route": each card holds a URL you paste) ---
  openDoc(it, url) { this.setState({ docModal: { name: it.name, fmt: it.fmt, url: url || '' } }); }
  closeDoc() { this.setState({ docModal: null }); }
  setDocUrl(v) { this.setState(s => ({ docModal: Object.assign({}, s.docModal, { url: v }) })); }
  openDocLink() {
    const m = this.state.docModal; if (!m || !m.url) return;
    let u = m.url.trim();
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    window.open(u, '_blank', 'noopener');
  }
  saveDocLink() {
    const m = this.state.docModal; if (!m) return;
    const url = (m.url || '').trim();
    this.setState(s => {
      const ops = Object.assign({}, s.ops);
      const key = 'doclink:' + m.name;
      if (url) ops[key] = url; else delete ops[key];
      return { ops, docModal: null };
    }, () => this.saveStore());
    this.flash(url ? 'LINK SAVED ✓' : 'LINK CLEARED');
  }

  // --- Clients / CRM (Phase 1 of the HoneyBook replacement) ---
  clientStats(id) {
    const ds = this.state.deals.filter(d => d.clientId === id);
    const ltv = ds.filter(d => d.stage === 'Collected').reduce((s, d) => s + (+d.value || 0), 0);
    return { count: ds.length, ltv };
  }
  blankClient() { return { id: null, name: '', contact: '', email: '', phone: '', industry: '', status: 'Lead', source: '', ladder: '', renewal: '', notes: '' }; }
  openClient(c) { this.setState({ clientModal: c ? Object.assign({}, c) : this.blankClient() }); }
  closeClient() { this.setState({ clientModal: null }); }
  setClientField(k, val) { this.setState(s => ({ clientModal: Object.assign({}, s.clientModal, { [k]: val }) })); }
  async saveClient() {
    const m = this.state.clientModal; if (!m) return;
    const c = Object.assign({}, m, { name: (m.name || '').trim() || 'Untitled' });
    let id;
    try { id = await store.upsertClient(c); }
    catch (e) { console.error('client save failed', e); this.flash('CLIENT SAVE FAILED — ' + (e.message || e), 7000); return; }
    c.id = id || m.id || ('local-' + Date.now());
    this.setState(s => {
      const clients = s.clients.slice();
      const i = clients.findIndex(x => x.id === c.id);
      if (i >= 0) clients[i] = c; else clients.push(c);
      return { clients, clientModal: null };
    });
    this.flash(m.id ? 'CLIENT UPDATED ✓' : 'CLIENT ADDED ✓');
  }
  async removeClient() {
    const m = this.state.clientModal; if (!m) return;
    const persisted = m.id && !String(m.id).startsWith('local');
    if (persisted) { try { await store.deleteClient(m.id); } catch (e) { console.error(e); this.flash('DELETE FAILED — ' + (e.message || e), 7000); return; } }
    this.setState(s => ({ clients: s.clients.filter(x => x.id !== m.id), clientModal: null }));
    this.flash('CLIENT DELETED');
  }

  renderClientsTab() {
    const clients = this.state.clients || [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueSoon = (r) => { if (!r) return false; const d = new Date(r + 'T00:00:00'); const diff = (d - today) / 864e5; return diff <= 30; };
    const active = clients.filter(c => c.status === 'Active').length;
    const renewals = clients.filter(c => c.renewal && dueSoon(c.renewal)).length;
    const totalLtv = clients.reduce((s, c) => s + this.clientStats(c.id).ltv, 0);
    const statusColor = { Lead: 'var(--dim)', Active: '#3fb97a', Past: 'var(--red)' };

    const Stat = (label, val, sub, accent) => (
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid " + (accent || "var(--line2)"), padding: "15px 18px" }}>
        <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>{label}</div>
        <div style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "38px", lineHeight: ".9", color: "var(--cream)", marginTop: "6px" }}>{val}</div>
        <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>{sub}</div>
      </div>
    );

    return (
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 03 · THE ROSTER</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>CLIENT <span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>ROSTER</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Every client, where they sit on the ladder, and when they renew. The day-60 / day-75 play lives here — protect the base.</div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexShrink: 0, marginTop: "6px" }}>
            <Hover as="button" onClick={() => { window.location.assign('/api/fb/connect'); }} title={(this.state.ops && this.state.ops.__fb) ? 'Connected: ' + this.state.ops.__fb.page_name + ' — click to reconnect' : 'Login with Facebook, pick your page, approve — leads flow in automatically'}
              baseStyle={{ background: "transparent", border: "1px solid " + ((this.state.ops && this.state.ops.__fb) ? '#2f7d4f' : 'var(--line2)'), color: (this.state.ops && this.state.ops.__fb) ? '#3fb97a' : 'var(--muted)', fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ borderColor: "var(--red)", color: "var(--cream)" }}>
              {(this.state.ops && this.state.ops.__fb) ? 'FB ✓ ' + (this.state.ops.__fb.page_name || 'Connected') : 'Connect Facebook'}
            </Hover>
            <Hover as="button" onClick={() => this.openIntakeSettings()} baseStyle={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ borderColor: "var(--red)", color: "var(--cream)" }}>Intake Form</Hover>
            <Hover as="button" onClick={() => this.openClient(null)} baseStyle={{ background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>+ Add Client</Hover>
          </div>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" }}>
          {Stat('CLIENTS', String(clients.length), 'ON THE ROSTER', 'var(--line2)')}
          {Stat('ACTIVE', String(active), 'PAYING NOW', '#3fb97a')}
          {Stat('RENEWALS DUE', String(renewals), 'WITHIN 30 DAYS', renewals ? 'var(--red)' : 'var(--line2)')}
          {Stat('LIFETIME VALUE', this.fmt(totalLtv), 'COLLECTED, ALL CLIENTS', 'var(--red)')}
        </div>

        {clients.length === 0 ? (
          <div style={{ border: "1px dashed var(--line2)", padding: "44px", textAlign: "center", color: "var(--dim)", fontSize: "13px", lineHeight: 1.7 }}>
            No clients yet.<br />Hit <span style={{ color: "var(--red)" }}>+ ADD CLIENT</span> to start the roster — or they'll land here automatically when a proposal is accepted.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--line)", background: "var(--panel)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr .9fr 1.1fr .7fr .9fr 1fr", gap: "10px", padding: "11px 16px", borderBottom: "1px solid var(--line)", fontSize: "9.5px", letterSpacing: ".14em", color: "var(--dim)", textTransform: "uppercase" }}>
              <div>Client</div><div>Industry</div><div>Status</div><div>Ladder</div><div>Deals</div><div>LTV</div><div>Renewal</div>
            </div>
            {clients.map((c) => {
              const st = this.clientStats(c.id);
              const due = c.renewal && dueSoon(c.renewal);
              return (
                <Hover as="div" key={c.id} onClick={() => this.openClient(c)} baseStyle={{ display: "grid", gridTemplateColumns: "2fr 1.2fr .9fr 1.1fr .7fr .9fr 1fr", gap: "10px", padding: "13px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", alignItems: "center", fontSize: "13px" }} hoverStyle={{ background: "#141418" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--cream)" }}>
                      {c.name}
                      {c.id && !String(c.id).startsWith('local') ? (
                        <a href={'/clients/' + c.id} onClick={(e) => e.stopPropagation()} title="Open client dashboard"
                          style={{ marginLeft: "8px", color: "var(--red)", fontSize: "10px", letterSpacing: ".08em", textDecoration: "none", border: "1px solid var(--line2)", padding: "2px 7px", verticalAlign: "middle" }}>DASH ↗</a>
                      ) : null}
                    </div>
                    {c.contact ? <div style={{ fontSize: "10.5px", color: "var(--muted)", marginTop: "2px" }}>{c.contact}</div> : null}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "11.5px" }}>{c.industry || '—'}</div>
                  <div><span style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: statusColor[c.status] || 'var(--dim)' }}>{c.status}</span></div>
                  <div style={{ color: "var(--muted)", fontSize: "11.5px" }}>{c.ladder || '—'}</div>
                  <div style={{ fontFamily: "var(--cond)", fontWeight: 800, color: "var(--cream)" }}>{st.count}</div>
                  <div style={{ fontFamily: "var(--cond)", fontWeight: 800, color: "var(--red)" }}>{this.fmt(st.ltv)}</div>
                  <div style={{ fontSize: "11.5px", color: due ? 'var(--red)' : 'var(--muted)' }}>{c.renewal || '—'}</div>
                </Hover>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  renderClientModal() {
    const m = this.state.clientModal;
    if (!m) return null;
    const lbl = { fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { width: "100%", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    const Field = (label, key, opts = {}) => (
      <div style={{ marginBottom: "12px", flex: opts.flex || "none", width: opts.full ? "100%" : undefined }}>
        <label style={lbl}>{label}</label>
        {opts.options ? (
          <select style={inp} value={m[key] || ''} onChange={(e) => this.setClientField(key, e.target.value)}>
            {opts.options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
          </select>
        ) : (
          <input style={inp} type={opts.type || 'text'} value={m[key] || ''} placeholder={opts.ph || ''} onChange={(e) => this.setClientField(key, e.target.value)} />
        )}
      </div>
    );
    return (
      <div onClick={() => this.closeClient()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "520px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: "#0e0e11", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "26px", letterSpacing: ".01em" }}>{m.id ? "EDIT CLIENT" : "NEW CLIENT"}</div>
            <button onClick={() => this.closeClient()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>

          {Field('Business name', 'name', { full: true, ph: 'Cornerstone Plumbing' })}
          <div style={{ display: "flex", gap: "12px" }}>{Field('Contact', 'contact', { flex: 1 })}{Field('Phone', 'phone', { flex: 1 })}</div>
          {Field('Email', 'email', { full: true, type: 'email' })}
          <div style={{ display: "flex", gap: "12px" }}>{Field('Industry', 'industry', { flex: 1, ph: 'Roofing' })}{Field('Source', 'source', { flex: 1, options: ['', 'Facebook', 'Referral', 'Cold', 'Diagnostic', 'Other'] })}</div>
          <div style={{ display: "flex", gap: "12px" }}>
            {Field('Status', 'status', { flex: 1, options: ['Lead', 'Active', 'Past'] })}
            {Field('Ladder rung', 'ladder', { flex: 1, options: ['', 'Diagnostic', 'Tournament', 'Tool Sprint', 'Retainer'] })}
            {Field('Renewal date', 'renewal', { flex: 1, type: 'date' })}
          </div>
          <div style={{ marginBottom: "18px" }}>
            <label style={lbl}>Notes</label>
            <textarea style={Object.assign({}, inp, { minHeight: "64px", resize: "vertical" })} value={m.notes || ''} onChange={(e) => this.setClientField('notes', e.target.value)} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              {m.id ? (
                <button onClick={() => this.removeClient()} style={{ background: "transparent", border: "1px solid #5a2230", color: "var(--red)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button>
              ) : null}
              {m.id && m.email ? (
                <button onClick={() => this.openEmailThread({ id: m.id, name: m.name, email: m.email })} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>✉ Email</button>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeClient()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
              <button onClick={() => this.saveClient()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>{m.id ? "Save" : "Add client"}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  pushLog() {
    const a = this.AMB[Math.floor(Math.random() * this.AMB.length)];
    const d = new Date();
    const t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    this.setState(s => ({ log: [...s.log.slice(-8), { t, tag: a.tag, color: a.color, msg: a.msg }] }));
  }

  fmt(n) { return '$' + Math.round(n || 0).toLocaleString(); }
  weekKey(d = new Date()) {
    const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    const w1 = new Date(t.getFullYear(), 0, 4);
    const wn = 1 + Math.round(((t - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
    return t.getFullYear() + '-W' + String(wn).padStart(2, '0');
  }
  daysTo(ds) { const d = new Date(ds + 'T00:00:00'); const n = new Date(); n.setHours(0, 0, 0, 0); return Math.max(0, Math.ceil((d - n) / 864e5)); }
  collected() { return this.state.deals.filter(d => d.stage === 'Collected').reduce((s, d) => s + (+d.value || 0), 0); }
  signed() { return this.state.deals.filter(d => d.stage === 'Signed' || d.stage === 'Collected').reduce((s, d) => s + (+d.value || 0), 0); }
  openDeals() { return this.state.deals.filter(d => !['Collected', 'Lost', 'Signed'].includes(d.stage)); }

  ff() { return this.state.weeks[this.weekKey()] || {}; }
  setFF(key, val) {
    const wk = this.weekKey();
    this.setState(s => {
      const weeks = Object.assign({}, s.weeks);
      weeks[wk] = Object.assign({ manual: {} }, weeks[wk], { [key]: val });
      return { weeks };
    }, () => this.saveStore());
  }
  toggleManual(key) {
    const wk = this.weekKey();
    this.setState(s => {
      const weeks = Object.assign({}, s.weeks);
      const w = Object.assign({ manual: {} }, weeks[wk]);
      w.manual = Object.assign({}, w.manual, { [key]: !(w.manual && w.manual[key]) });
      weeks[wk] = w; return { weeks };
    }, () => this.saveStore());
  }
  newWeek() {
    const wk = this.weekKey();
    this.setState(s => { const weeks = Object.assign({}, s.weeks); weeks[wk] = { manual: {} }; return { weeks }; }, () => this.saveStore());
    this.flash('NEW WEEK ARMED · FRIDAY FIVE RESET');
  }
  flash(m, dur = 2200) { clearTimeout(this.toastT); this.setState({ toast: m }); this.toastT = setTimeout(() => this.setState({ toast: '' }), dur); }

  todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  setF(key, val) { const t = this.todayStr(); this.setState(s => { const f = Object.assign({}, s.founder); f[t] = Object.assign({}, f[t], { [key]: val }); return { founder: f }; }, () => this.saveStore()); }
  toggleHabit(id) { const t = this.todayStr(); this.setState(s => ({ habits: s.habits.map(h => { if (h.id !== id) return h; const days = Object.assign({}, h.days); days[t] = !days[t]; if (!days[t]) delete days[t]; return Object.assign({}, h, { days }); }) }), () => this.saveStore()); }
  habitStreak(h) { let n = 0; const d = new Date(); for (;;) { const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (h.days && h.days[ds]) { n++; d.setDate(d.getDate() - 1); } else break; } return n; }
  toggleGoal(id) { this.setState(s => ({ goals: s.goals.map(g => g.id === id ? Object.assign({}, g, { done: !g.done }) : g) }), () => this.saveStore()); }
  addHabit() { const n = (window.prompt('New non-negotiable habit:') || '').trim(); if (n) this.setState(s => ({ habits: [...s.habits, { id: 'h' + Date.now(), name: n, days: {} }] }), () => this.saveStore()); }
  addGoal() { const n = (window.prompt('New goal — what, by when:') || '').trim(); if (!n) return; const life = /life|health|family|body|sleep|gym|personal|kid|wife|husband/i.test(n); this.setState(s => ({ goals: [...s.goals, { id: 'g' + Date.now(), text: n, type: life ? 'life' : 'business', target: 0, done: false }] }), () => this.saveStore()); }
  goStep(i) { if (i < 0 || i >= this.SCRIPT.length) return; this.setState({ step: i }); }
  toggleObj() { this.setState(s => ({ showObj: !s.showObj })); }
  weighted() { return this.state.deals.filter(d => !['Collected', 'Lost'].includes(d.stage)).reduce((s, d) => s + (+d.value || 0) * (this.STAGEPROB[d.stage] || 0), 0); }
  winRate() { const closed = this.state.deals.filter(d => ['Signed', 'Collected', 'Lost'].includes(d.stage)).length; const won = this.state.deals.filter(d => ['Signed', 'Collected'].includes(d.stage)).length; return closed ? Math.round(won / closed * 100) + '%' : '—'; }
  toggleOp(k) { this.setState(s => ({ ops: Object.assign({}, s.ops, { [k]: !(s.ops && s.ops[k]) }) }), () => this.saveStore()); }

  renderVals() {
    const motionOn = this.props.enableMotion ?? true;
    const an = (s) => motionOn ? s : 'none';
    const collected = this.collected();
    const gap = Math.max(0, this.GOAL - collected);
    const pct = Math.min(100, this.GOAL ? collected / this.GOAL * 100 : 0);
    const open = this.openDeals();
    const openSum = open.reduce((a, d) => a + (+d.value || 0), 0);
    const cover = gap ? (openSum / gap).toFixed(1) + '×' : '∞';
    const ff = this.ff();
    const ffNum = (k) => { const v = ff[k]; return (v === undefined || v === null || v === '') ? '' : v; };

    const ffDefs = [
      { key: 'calls', label: 'Calls held', floor: 'floor 3', min: 3 },
      { key: 'proposals', label: 'Offers out', floor: 'floor 2', min: 2 },
      { key: 'signed', label: '$ signed / wk', floor: '\u00a0', min: null },
      { key: 'collected', label: '$ collected / wk', floor: '\u00a0', min: null },
      { key: 'founderFree', label: 'Founder-free %', floor: 'trend \u2191', min: null }
    ];
    const ff5 = ffDefs.map(f => {
      const v = ffNum(f.key);
      let edge = 'var(--line2)', floorColor = 'var(--dim)';
      if (f.min != null && v !== '') { const hit = (+v >= f.min); edge = hit ? '#2f7d4f' : '#7a2420'; floorColor = hit ? '#3fb97a' : 'var(--red)'; }
      return { label: f.label, floor: f.floor, val: v, edge, floorColor, onChange: (e) => this.setFF(f.key, e.target.value) };
    });

    let warn = '';
    if (gap && openSum / gap < 3) warn = 'Pipeline coverage is under 3\u00d7 the gap to goal. Raise the weekly call quota to 5 and push two more diagnostics to the cold list this week.';

    const callsDone = (+ffNum('calls') || 0) >= 3;
    const propDone = (+ffNum('proposals') || 0) >= 2;
    const man = ff.manual || {};
    const floorDefs = [
      { text: '3 discovery calls held', on: callsDone, manual: null },
      { text: '2 proposals / diagnostic offers sent', on: propDone, manual: null },
      { text: '5 diagnostic units pitched to the list', on: !!man.pitch, manual: 'pitch' },
      { text: '1 proof asset shipped (every 2 wks)', on: !!man.proof, manual: 'proof' }
    ];
    const floor = floorDefs.map(f => ({
      text: f.text,
      check: f.on ? '\u2713' : '',
      check_c: f.on ? '#3fb97a' : 'var(--dim)',
      box: f.on ? '#3fb97a' : 'var(--line2)',
      tc: f.on ? 'var(--muted)' : 'var(--cream)',
      cursor: f.manual ? 'pointer' : 'default',
      onClick: f.manual ? () => this.toggleManual(f.manual) : () => {}
    }));

    const next = open.slice().sort((a, b) => (a.date || '9') < (b.date || '9') ? -1 : 1).slice(0, 5).map(d => ({
      label: d.name, sub: '· ' + d.stage, val: this.fmt(d.value), onClick: () => { this.setState({ view: 'pipeline' }); this.flash('JUMP \u2192 PIPELINE'); }
    }));

    const v = this.state.view;
    const stageC = { 'Lead': 'var(--dim)', 'Diagnostic Sent': 'var(--red)', 'Diagnostic Done': 'var(--red)', 'Proposal': 'var(--cream)', 'Signed': '#3fb97a', 'Collected': '#fff' };
    const pipeCols = this.STAGES.map(st => {
      const ds = this.state.deals.filter(d => d.stage === st);
      return { stage: st, accent: stageC[st] || 'var(--dim)', sum: this.fmt(ds.reduce((a, d) => a + (+d.value || 0), 0)),
        deals: ds.map(d => ({ name: d.name, offer: d.offer, val: this.fmt(d.value), onClick: () => this.openDeal(d) })) };
    });
    const pStats = { weighted: this.fmt(this.weighted()), count: this.openDeals().length, signed: this.fmt(this.signed()), signedN: this.state.deals.filter(d => ['Signed', 'Collected'].includes(d.stage)).length + ' DEALS', win: this.winRate() };
    const opsState = this.state.ops || {};
    const fleet = this.FLEET.map(a => { const ran = !!opsState['agent:' + a.name]; return { init: a.init, name: a.name, role: a.role, cad: a.cad, accent: a.accent, dot: ran ? '#3fb97a' : '#444', status: ran ? 'RAN TODAY' : 'IDLE', btn: ran ? 'RESET' : 'MARK RUN', onToggle: () => this.toggleOp('agent:' + a.name) }; });
    const opsChecklist = this.OPSLIST.map((o, i) => { const on = !!opsState['ops:' + i]; return { text: o, check: on ? '\u2713' : '', box: on ? '#3fb97a' : 'var(--line2)', cc: on ? '#3fb97a' : 'var(--dim)', tc: on ? 'var(--muted)' : 'var(--cream)', onClick: () => this.toggleOp('ops:' + i) }; });
    const loopNodes = this.LOOP.map((n, i) => ({ label: n, arrow: i < this.LOOP.length - 1 ? '\u2192' : '' }));
    const ladder = this.LADDER;
    const sops = this.SOPS.map(s => ({ t: s.t, p: s.p, steps: s.steps, out: s.out, accent: s.danger ? 'var(--red)' : 'var(--cream)' }));
    const stepIdx = this.state.step || 0;
    const scriptSteps = this.SCRIPT.map((s, i) => ({ n: s.n, l: s.l, bg: i === stepIdx ? '#141418' : '#0a0a0c', bd: i === stepIdx ? 'var(--red)' : 'var(--line)', nc: i === stepIdx ? 'var(--red)' : 'var(--dim)', fg: i === stepIdx ? 'var(--cream)' : 'var(--muted)', onClick: () => this.goStep(i) }));
    const cs = this.SCRIPT[stepIdx] || this.SCRIPT[0];
    const curBlocks = (cs.blocks || []).map(b => ({ isSay: b.t === 'say', isAlt: b.t === 'sayalt', isNote: b.t === 'note', isQ: b.t === 'q', text: b.text || '', items: b.items || [] }));
    const curGoal = cs.goal; const curNum = cs.n; const curLabel = cs.l;
    const canBack = stepIdx > 0; const canNext = stepIdx < this.SCRIPT.length - 1;
    const backOpacity = canBack ? '1' : '.28'; const nextOpacity = canNext ? '1' : '.28';
    const today = this.todayStr();
    const fToday = this.state.founder[today] || {};
    const dnames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const energyScale = [1, 2, 3, 4, 5].map(n => { const on = fToday.energy == n; return { n, bg: on ? 'var(--red)' : '#0a0a0c', bd: on ? 'var(--red)' : 'var(--line2)', fg: on ? '#0a0707' : 'var(--muted)', onClick: () => this.setF('energy', n) }; });
    const sleepScale = [5, 6, 7, 8, 9].map(n => { const on = fToday.sleep == n; return { n, bg: on ? 'var(--red)' : '#0a0a0c', bd: on ? 'var(--red)' : 'var(--line2)', fg: on ? '#0a0707' : 'var(--muted)', onClick: () => this.setF('sleep', n) }; });
    const fToggles = [['workout', 'Trained'], ['deep', 'Deep-work block'], ['calls', '3 calls done'], ['ate', 'Ate right']].map(([k, l]) => { const on = !!fToday[k]; return { label: l, bd: on ? '#1d3d2a' : 'var(--line2)', box: on ? '#3fb97a' : 'var(--line2)', boxBg: on ? '#3fb97a' : 'transparent', cc: on ? '#06140d' : 'transparent', check: on ? '\u2713' : '', onClick: () => this.setF(k, !fToday[k]) }; });
    const noteVal = fToday.note || '';
    const onNote = (e) => this.setF('note', e.target.value);
    const weekStrip = [];
    for (let i = 6; i >= 0; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); const ds = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); const e = this.state.founder[ds] || {}; const sc = e.energy || 0; weekStrip.push({ dw: dnames[dt.getDay()], n: sc || '\u00b7', nc: sc >= 4 ? '#3fb97a' : sc >= 2 ? 'var(--red)' : sc ? '#7a2420' : 'var(--dim)', d1: e.workout ? 'var(--red)' : '#2a2a2d', d2: e.calls ? 'var(--cream)' : '#2a2a2d' }); }
    const collectedNow = this.collected();
    const habitsView = this.state.habits.map(h => { const on = !!(h.days && h.days[today]); const sk = this.habitStreak(h); return { name: h.name, box: on ? '#3fb97a' : 'var(--line2)', boxBg: on ? '#3fb97a' : 'transparent', cc: on ? '#06140d' : 'var(--dim)', check: on ? '\u2713' : '', streak: sk, streakL: sk === 1 ? 'DAY' : 'DAYS', onToggle: () => this.toggleHabit(h.id) }; });
    const goalsView = this.state.goals.map(g => { const prog = g.target ? (g.id === 'g1' ? collectedNow : (g.progress || 0)) : 0; const pctG = g.target ? Math.min(100, prog / g.target * 100) : 0; return { text: g.text, check: g.done ? '\u2713' : '', box: g.done ? 'var(--red)' : 'var(--line2)', boxBg: g.done ? 'var(--red)' : 'transparent', cc: g.done ? '#0a0707' : 'var(--dim)', tc: g.done ? 'var(--dim)' : 'var(--cream)', deco: g.done ? 'line-through' : 'none', type: g.type === 'life' ? 'LIFE' : 'BUSINESS', typeC: g.type === 'life' ? 'var(--cream)' : 'var(--red)', hasBar: !!g.target, pct: pctG, progLabel: g.target ? this.fmt(prog) + ' / ' + this.fmt(g.target) : '', onToggle: () => this.toggleGoal(g.id) }; });
    const dd = new Date(); const dayFull = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']; const moAbbr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const todayLabel = dayFull[dd.getDay()] + ' \u00b7 ' + moAbbr[dd.getMonth()] + ' ' + dd.getDate();
    const docsView = this.DOCS.map(g => ({ cat: g.cat, items: g.items.map(it => {
      const url = opsState['doclink:' + it.name] || '';
      return { name: it.name, fmt: it.fmt, meta: url ? 'Linked \u00b7 click to open' : it.meta, tag: url ? 'LINK' : (it.tag || ''), hasTag: !!(url || it.tag), onClick: () => this.openDoc(it, url) };
    }) }));
    const phaseC = { ACTIVE: 'var(--red)', NEXT: 'var(--cream)', QUEUED: 'var(--dim)' };
    const plansPhases = this.PLANS.map(p => ({ n: p.n, t: p.t, when: p.when, d: p.d, state: p.state, c: phaseC[p.state] || 'var(--dim)' }));
    const planMoves = this.PLANMOVES.map((m, i) => { const on = !!opsState['plan:' + i]; return { text: m, check: on ? '\u2713' : '', box: on ? '#3fb97a' : 'var(--line2)', cc: on ? '#3fb97a' : 'var(--dim)', tc: on ? 'var(--muted)' : 'var(--cream)', onClick: () => this.toggleOp('plan:' + i) }; });

    const sections = this.SECTIONS.map(s => {
      const active = s.id === this.state.view;
      return {
        num: s.num, label: s.label,
        bg: active ? '#141418' : 'transparent',
        bar: active ? '2px solid var(--red)' : '2px solid transparent',
        fg: active ? 'var(--cream)' : 'var(--muted)',
        code: active ? 'var(--red)' : 'var(--dim)',
        dot: active ? '\u25b6' : '',
        onSelect: () => this.setState({ view: s.id })
      };
    });

    const d = new Date(this.state.now);
    const pad = (n) => String(n).padStart(2, '0');
    const clock = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const date = pad(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();

    const cur = this.SECTIONS.find(s => s.id === this.state.view) || this.SECTIONS[0];

    return {
      // boot
      booting: this.state.booting,
      bootLines: this.BOOT.slice(0, this.state.bootIdx),
      bootProgress: Math.min(100, Math.round(this.state.bootIdx / this.BOOT.length * 100)),
      bootReady: this.state.bootIdx >= this.BOOT.length,
      dismissBoot: () => this.dismiss(),
      skipBoot: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.dismiss(); },
      // visuals
      scanOn: this.props.showScanlines ?? true,
      animScan: an('scanmove 1.1s steps(2) infinite'),
      animSweep: an('sweepY 7.5s linear infinite'),
      animGlow: an('glowp 3.4s ease-in-out infinite'),
      animPulse: an('pulse 1.8s ease-in-out infinite'),
      animTicker: an('marq 34s linear infinite'),
      animShimmer: an('shimmer 3.2s ease-in-out infinite'),
      animSpin: an('spin 1.4s linear infinite'),
      // nav
      sections,
      isCommand: this.state.view === 'command',
      isPipeline: v === 'pipeline',
      isClients: v === 'clients',
      isDiagnostic: v === 'script',
      isAgents: v === 'agents',
      isPlaybook: v === 'playbook',
      isFounder: v === 'founder',
      isDocs: v === 'docs',
      isStrategy: v === 'strategy',
      isPlans: v === 'plans',
      isStandby: !['command', 'pipeline', 'clients', 'invoices', 'proposals', 'scheduling', 'kpis', 'expenses', 'script', 'agents', 'playbook', 'founder', 'docs', 'strategy', 'plans', 'rookie'].includes(v),
      currentSection: cur.label.toUpperCase(),
      // status
      clock, date,
      // war board
      oneThingTitle: this.ONE_TITLE,
      oneThingBody: this.ONE_BODY,
      collectedFmt: this.fmt(collected),
      pct,
      gapText: collected >= this.GOAL ? 'GOAL CLEARED \u2014 BANK IT.' : this.fmt(gap) + ' TO GO \u00b7 ' + pct.toFixed(0) + '% OF TARGET',
      sellDays: this.daysTo(this.SELLBY),
      deadDays: this.daysTo(this.DEADLINE),
      founderFree: (ff.founderFree != null && ff.founderFree !== '') ? ff.founderFree + '%' : '\u2014',
      // kpis
      kCollected: this.fmt(collected),
      kSigned: this.fmt(this.signed()),
      kOpen: this.fmt(openSum),
      kOpenN: open.length + ' LIVE DEALS',
      kCover: cover,
      // modules
      pipeCols, pStats, fleet, opsChecklist, loopNodes, ladder, sops,
      scriptSteps, curBlocks, curGoal, curNum, curLabel, canBack, canNext, backOpacity, nextOpacity,
      energyScale, sleepScale, fToggles, noteVal, onNote, weekStrip, habitsView, goalsView, todayLabel,
      addHabit: () => this.addHabit(), addGoal: () => this.addGoal(),
      docsView, plansPhases, planMoves,
      stratThesis: this.STRATEGY.thesis, stratPillars: this.STRATEGY.pillars, stratBets: this.STRATEGY.bets, stratAnti: this.STRATEGY.antigoals,
      objections: this.OBJECTIONS, showObj: this.state.showObj, showScript: !this.state.showObj,
      objBtnLabel: this.state.showObj ? '← BACK TO SCRIPT' : 'OBJECTION HANDLING →',
      backStep: () => this.goStep(stepIdx - 1), nextStep: () => this.goStep(stepIdx + 1), toggleObj: () => this.toggleObj(),
      // panels
      ff5, warn, floor, next,
      log: this.state.log.map(l => ({ t: l.t, tag: l.tag, color: l.color, msg: l.msg })),
      newWeek: () => this.newWeek(),
      toast: this.state.toast
    };
  }

  // Logout control (only in real/Supabase mode). Fixed, unobtrusive, on-brand.
  renderChrome() {
    if (!store.enabled) return null;
    return (
      <button
        onClick={() => this.logout()}
        style={{ position: "fixed", bottom: "12px", left: "14px", zIndex: 80, background: "rgba(10,10,12,.85)", border: "1px solid var(--line2)", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".16em", padding: "6px 11px", cursor: "pointer", textTransform: "uppercase" }}
      >
        Log out
      </button>
    );
  }

  // Deal editor (add / edit / delete). Styled in the cockpit idiom; the only
  // net-new UI Stage 1 adds, because the mockup had no way to edit deals.
  renderDealModal() {
    const m = this.state.dealModal;
    if (!m) return null;
    const lbl = { fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { width: "100%", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    return (
      <div onClick={() => this.closeDeal()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "420px", maxWidth: "100%", background: "#0e0e11", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "26px", letterSpacing: ".01em" }}>{m.id ? "EDIT DEAL" : "NEW DEAL"}</div>
            <button onClick={() => this.closeDeal()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ marginBottom: "13px" }}>
            <label style={lbl}>Client / Deal name</label>
            <input style={inp} value={m.name} onChange={(e) => this.setDealField("name", e.target.value)} placeholder="Lumen Studios" />
          </div>
          <div style={{ marginBottom: "13px" }}>
            <label style={lbl}>Offer</label>
            <input style={inp} value={m.offer} onChange={(e) => this.setDealField("offer", e.target.value)} placeholder="Authority Diagnostic" />
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "13px" }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Value ($)</label>
              <input style={inp} type="number" min="0" step="50" value={m.value} onChange={(e) => this.setDealField("value", e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Expected date</label>
              <input style={inp} type="date" value={m.date || ""} onChange={(e) => this.setDealField("date", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Stage</label>
              <select style={inp} value={m.stage} onChange={(e) => this.setDealField("stage", e.target.value)}>
                {this.STAGES.concat(["Lost"]).map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Client</label>
              <select style={inp} value={m.clientId || ''} onChange={(e) => this.setDealField("clientId", e.target.value)}>
                <option value="">— none —</option>
                {(this.state.clients || []).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            {m.id ? (
              <button onClick={() => this.removeDeal()} style={{ background: "transparent", border: "1px solid #5a2230", color: "var(--red)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button>
            ) : <span />}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeDeal()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
              <button onClick={() => this.saveDeal()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>{m.id ? "Save" : "Add deal"}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Invoices (Phase 2: HoneyBook replacement, slice 2) ---
  invTotal(items) { return (items || []).reduce((s, it) => s + (+it.qty || 0) * (+it.unit || 0), 0); }
  // Next number = highest existing + 1 (never reuses a number after a deletion).
  nextDocNumber(list, prefix) {
    const max = (list || []).reduce((m, x) => {
      const n = parseInt(String(x.number || '').replace(/\D/g, ''), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return prefix + String(max + 1).padStart(4, '0');
  }
  nextInvoiceNumber() { return this.nextDocNumber(this.state.invoices, 'INV-'); }
  blankInvoice() {
    return { id: null, clientId: '', number: this.nextInvoiceNumber(), title: '', items: [{ desc: '', qty: 1, unit: 0 }], status: 'draft', due: '', notes: '', token: '' };
  }
  openInvoice(inv) {
    this.setState({ invoiceModal: inv
      ? { id: inv.id, clientId: inv.clientId || '', number: inv.number, title: inv.title, items: (inv.items || []).map(it => ({ desc: it.desc, qty: it.qty, unit: (it.unit_cents != null ? it.unit_cents / 100 : it.unit) || 0 })), status: inv.status, due: inv.due || '', notes: inv.notes || '', token: inv.token || '' }
      : this.blankInvoice() });
  }
  closeInvoice() { this.setState({ invoiceModal: null }); }
  setInvoiceField(k, val) { this.setState(s => ({ invoiceModal: Object.assign({}, s.invoiceModal, { [k]: val }) })); }
  setInvItem(i, k, val) { this.setState(s => { const items = s.invoiceModal.items.slice(); items[i] = Object.assign({}, items[i], { [k]: val }); return { invoiceModal: Object.assign({}, s.invoiceModal, { items }) }; }); }
  addInvItem() { this.setState(s => ({ invoiceModal: Object.assign({}, s.invoiceModal, { items: [...s.invoiceModal.items, { desc: '', qty: 1, unit: 0 }] }) })); }
  removeInvItem(i) { this.setState(s => { const items = s.invoiceModal.items.slice(); items.splice(i, 1); return { invoiceModal: Object.assign({}, s.invoiceModal, { items: items.length ? items : [{ desc: '', qty: 1, unit: 0 }] }) }; }); }
  async saveInvoice(extra) {
    const m = this.state.invoiceModal; if (!m) return null;
    const inv = Object.assign({}, m, extra || {});
    let res;
    try { res = await store.upsertInvoice(inv); }
    catch (e) { console.error('invoice save failed', e); this.flash('INVOICE SAVE FAILED — ' + (e.message || e), 7000); return null; }
    const id = (res && res.id) || res || m.id || ('local-' + Date.now());
    const token = (res && res.token) || m.token || '';
    const saved = { id, clientId: inv.clientId || null, number: inv.number, title: inv.title, items: inv.items.map(it => ({ desc: it.desc, qty: +it.qty || 0, unit: +it.unit || 0 })), amount: this.invTotal(inv.items), status: inv.status, due: inv.due, notes: inv.notes, token };
    this.setState(s => {
      const invoices = s.invoices.slice();
      const i = invoices.findIndex(x => x.id === id);
      if (i >= 0) invoices[i] = saved; else invoices.unshift(saved);
      return { invoices };
    });
    return saved;
  }
  async saveInvoiceClose() { const s = await this.saveInvoice(); if (s) { this.setState({ invoiceModal: null }); this.flash('INVOICE SAVED ✓'); } }
  async removeInvoice() {
    const m = this.state.invoiceModal; if (!m) return;
    const persisted = m.id && !String(m.id).startsWith('local');
    if (persisted) { try { await store.deleteInvoice(m.id); } catch (e) { console.error(e); this.flash('DELETE FAILED — ' + (e.message || e), 7000); return; } }
    this.setState(s => ({ invoices: s.invoices.filter(x => x.id !== m.id), invoiceModal: null }));
    this.flash('INVOICE DELETED');
  }
  payLink(token) { const origin = (typeof window !== 'undefined') ? window.location.origin : ''; return token ? origin + '/pay/' + token : ''; }
  async copyPayLink() {
    // save first (marks 'sent' so the client sees a live invoice), then copy the link
    const saved = await this.saveInvoice({ status: this.state.invoiceModal.status === 'draft' ? 'sent' : this.state.invoiceModal.status });
    if (!saved) return;
    const link = this.payLink(saved.token);
    try { await navigator.clipboard.writeText(link); this.flash('PAY LINK COPIED ✓ · SENT', 4000); }
    catch (e) { window.prompt('Copy this pay link for your client:', link); }
    this.setState(s => ({ invoiceModal: Object.assign({}, s.invoiceModal, { status: saved.status, token: saved.token, id: saved.id }) }));
  }
  async toggleInvoicePaid() {
    const m = this.state.invoiceModal; if (!m) return;
    const status = m.status === 'paid' ? 'sent' : 'paid';
    const saved = await this.saveInvoice({ status });
    if (saved) { this.setState(s => ({ invoiceModal: Object.assign({}, s.invoiceModal, { status, id: saved.id, token: saved.token }) })); this.flash(status === 'paid' ? 'MARKED PAID ✓' : 'MARKED UNPAID'); }
  }

  renderInvoicesTab() {
    const invoices = this.state.invoices || [];
    const clientName = (id) => { const c = (this.state.clients || []).find(x => x.id === id); return c ? c.name : '—'; };
    const outstanding = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + (+i.amount || 0), 0);
    const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (+i.amount || 0), 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const overdue = invoices.filter(i => i.status === 'sent' && i.due && new Date(i.due + 'T00:00:00') < today).length;
    const stC = { draft: 'var(--dim)', sent: 'var(--cream)', paid: '#3fb97a', void: '#7a2420' };

    const Stat = (label, val, sub, accent) => (
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid " + (accent || "var(--line2)"), padding: "15px 18px" }}>
        <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>{label}</div>
        <div style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "38px", lineHeight: ".9", color: "var(--cream)", marginTop: "6px" }}>{val}</div>
        <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>{sub}</div>
      </div>
    );

    return (
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 04 · GET PAID</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>INV<span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>OICES</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Build it, send the link, get paid. PIF or 50% deposit — never discount month one.</div>
          </div>
          <Hover as="button" onClick={() => this.openInvoice(null)} baseStyle={{ flexShrink: 0, marginTop: "6px", background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>+ New Invoice</Hover>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "20px" }}>
          {Stat('OUTSTANDING', this.fmt(outstanding), 'SENT, NOT YET PAID', outstanding ? 'var(--red)' : 'var(--line2)')}
          {Stat('COLLECTED', this.fmt(paid), 'PAID INVOICES', '#3fb97a')}
          {Stat('OVERDUE', String(overdue), 'PAST DUE DATE', overdue ? 'var(--red)' : 'var(--line2)')}
        </div>

        {invoices.length === 0 ? (
          <div style={{ border: "1px dashed var(--line2)", padding: "44px", textAlign: "center", color: "var(--dim)", fontSize: "13px", lineHeight: 1.7 }}>
            No invoices yet.<br />Hit <span style={{ color: "var(--red)" }}>+ NEW INVOICE</span>, add your line items, then copy the pay link to your client.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--line)", background: "var(--panel)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr .9fr 1fr", gap: "10px", padding: "11px 16px", borderBottom: "1px solid var(--line)", fontSize: "9.5px", letterSpacing: ".14em", color: "var(--dim)", textTransform: "uppercase" }}>
              <div>Number</div><div>Client / Title</div><div>Amount</div><div>Status</div><div>Due</div>
            </div>
            {invoices.map((inv) => (
              <Hover as="div" key={inv.id} onClick={() => this.openInvoice(inv)} baseStyle={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr .9fr 1fr", gap: "10px", padding: "13px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", alignItems: "center", fontSize: "13px" }} hoverStyle={{ background: "#141418" }}>
                <div style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: "12px" }}>{inv.number}</div>
                <div><span style={{ color: "var(--cream)", fontWeight: 600 }}>{clientName(inv.clientId)}</span>{inv.title ? <span style={{ color: "var(--dim)" }}> · {inv.title}</span> : null}</div>
                <div style={{ fontFamily: "var(--cond)", fontWeight: 800, color: "var(--red)" }}>{this.fmt(inv.amount)}</div>
                <div><span style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: stC[inv.status] || 'var(--dim)' }}>{inv.status}</span></div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>{inv.due || '—'}</div>
              </Hover>
            ))}
          </div>
        )}
      </div>
    );
  }

  renderInvoiceModal() {
    const m = this.state.invoiceModal;
    if (!m) return null;
    const lbl = { fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { width: "100%", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    const total = this.invTotal(m.items);
    return (
      <div onClick={() => this.closeInvoice()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "640px", maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", background: "#0e0e11", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "26px", letterSpacing: ".01em" }}>{m.id ? "EDIT INVOICE" : "NEW INVOICE"} <span style={{ color: "var(--dim)", fontSize: "15px" }}>{m.number}</span></div>
            <button onClick={() => this.closeInvoice()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "13px" }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Client</label>
              <select style={inp} value={m.clientId || ''} onChange={(e) => this.setInvoiceField('clientId', e.target.value)}>
                <option value="">— none —</option>
                {(this.state.clients || []).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div style={{ flex: 1 }}><label style={lbl}>Title</label><input style={inp} value={m.title} placeholder="Authority Diagnostic" onChange={(e) => this.setInvoiceField('title', e.target.value)} /></div>
            <div style={{ width: "150px" }}><label style={lbl}>Due date</label><input style={inp} type="date" value={m.due || ''} onChange={(e) => this.setInvoiceField('due', e.target.value)} /></div>
          </div>

          <label style={lbl}>Line items</label>
          <div style={{ border: "1px solid var(--line2)", marginBottom: "13px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 110px 110px 32px", gap: "8px", padding: "8px 10px", borderBottom: "1px solid var(--line2)", fontSize: "9px", letterSpacing: ".1em", color: "var(--dim)", textTransform: "uppercase" }}>
              <div>Description</div><div>Qty</div><div>Unit $</div><div>Amount</div><div></div>
            </div>
            {m.items.map((it, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 110px 110px 32px", gap: "8px", padding: "7px 10px", alignItems: "center", borderBottom: "1px solid #1a1a1f" }}>
                <input style={Object.assign({}, inp, { fontSize: "12px", padding: "7px 9px" })} value={it.desc} placeholder="48-hour teardown" onChange={(e) => this.setInvItem(i, 'desc', e.target.value)} />
                <input style={Object.assign({}, inp, { fontSize: "12px", padding: "7px 9px", textAlign: "center" })} type="number" min="0" value={it.qty} onChange={(e) => this.setInvItem(i, 'qty', e.target.value)} />
                <input style={Object.assign({}, inp, { fontSize: "12px", padding: "7px 9px", textAlign: "right" })} type="number" min="0" step="0.01" value={it.unit} onChange={(e) => this.setInvItem(i, 'unit', e.target.value)} />
                <div style={{ fontFamily: "var(--cond)", fontWeight: 700, textAlign: "right", color: "var(--cream)", fontSize: "14px" }}>{this.fmt((+it.qty || 0) * (+it.unit || 0))}</div>
                <button onClick={() => this.removeInvItem(i)} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: "14px" }}>✕</button>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 10px" }}>
              <button onClick={() => this.addInvItem()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: ".1em", padding: "6px 11px", cursor: "pointer", textTransform: "uppercase" }}>+ Line</button>
              <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "22px", color: "var(--cream)" }}>TOTAL&nbsp;&nbsp;<span style={{ color: "var(--red)" }}>{this.fmt(total)}</span></div>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}><label style={lbl}>Notes (shown to client)</label><textarea style={Object.assign({}, inp, { minHeight: "48px", resize: "vertical" })} value={m.notes || ''} placeholder="PIF · thank you" onChange={(e) => this.setInvoiceField('notes', e.target.value)} /></div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {m.id ? (
              <button onClick={() => this.removeInvoice()} style={{ background: "transparent", border: "1px solid #5a2230", color: "var(--red)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button>
            ) : <span />}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {m.id ? <button onClick={() => this.toggleInvoicePaid()} style={{ background: "transparent", border: "1px solid " + (m.status === 'paid' ? '#2f7d4f' : 'var(--line2)'), color: m.status === 'paid' ? '#3fb97a' : 'var(--muted)', fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>{m.status === 'paid' ? '✓ Paid' : 'Mark paid'}</button> : null}
              <button onClick={() => this.copyPayLink()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Copy pay link</button>
              <button onClick={() => this.saveInvoiceClose()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>Save</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Proposals + e-sign (Phase 3: HoneyBook replacement, slice 3) ---
  LADDER_PRESETS = [
    { desc: 'Authority Diagnostic', unit: 750 },
    { desc: 'Ad Creative Tournament', unit: 2500 },
    { desc: '48-Hour Tool Sprint', unit: 5000 },
    { desc: 'Authority Engine (retainer / mo)', unit: 3500 },
  ];
  nextProposalNumber() { return this.nextDocNumber(this.state.proposals, 'PRO-'); }
  DEFAULT_AGREEMENT = `CLIENT SERVICE AGREEMENT

This agreement is made on {{date}} between Churlish Media ("Company") and {{client}} ("Client").

1. SCOPE. The Company will provide the services and deliverables itemized above ({{title}}) for a total of {{total}}.

2. PAYMENT. 50% is due on acceptance of this agreement; the balance is due on delivery. (The Authority Diagnostic is paid in full.) Payments are non-refundable once work has begun.

3. TIMELINE. Work begins on receipt of the first payment and this signed agreement.

4. OWNERSHIP. Approved final deliverables transfer to the Client upon full payment. The Company may display the work in its portfolio.

5. CANCELLATION. Either party may cancel with written notice; fees for work completed to date remain payable.

By signing below, {{client}} agrees to the scope, pricing, and terms above.

Signed: {{signer}}      Date: {{date}}`;
  blankProposal() {
    return { id: null, clientId: '', number: this.nextProposalNumber(), title: '', intro: '', items: [{ desc: 'Authority Diagnostic', qty: 1, unit: 750 }], terms: this.DEFAULT_AGREEMENT, status: 'draft', token: '' };
  }
  openProposal(p) {
    this.setState({ proposalModal: p
      ? { id: p.id, clientId: p.clientId || '', number: p.number, title: p.title, intro: p.intro || '', items: (p.items || []).map(it => ({ desc: it.desc, qty: it.qty, unit: (it.unit_cents != null ? it.unit_cents / 100 : it.unit) || 0 })), terms: p.terms || '', status: p.status, token: p.token || '' }
      : this.blankProposal() });
  }
  closeProposal() { this.setState({ proposalModal: null }); }
  setPropField(k, val) { this.setState(s => ({ proposalModal: Object.assign({}, s.proposalModal, { [k]: val }) })); }
  setPropItem(i, k, val) { this.setState(s => { const items = s.proposalModal.items.slice(); items[i] = Object.assign({}, items[i], { [k]: val }); return { proposalModal: Object.assign({}, s.proposalModal, { items }) }; }); }
  addPropItem(preset) { this.setState(s => ({ proposalModal: Object.assign({}, s.proposalModal, { items: [...s.proposalModal.items, preset ? { desc: preset.desc, qty: 1, unit: preset.unit } : { desc: '', qty: 1, unit: 0 }] }) })); }
  removePropItem(i) { this.setState(s => { const items = s.proposalModal.items.slice(); items.splice(i, 1); return { proposalModal: Object.assign({}, s.proposalModal, { items: items.length ? items : [{ desc: '', qty: 1, unit: 0 }] }) }; }); }
  async saveProposal(extra) {
    const m = this.state.proposalModal; if (!m) return null;
    const p = Object.assign({}, m, extra || {});
    let res;
    try { res = await store.upsertProposal(p); }
    catch (e) { console.error('proposal save failed', e); this.flash('PROPOSAL SAVE FAILED — ' + (e.message || e), 7000); return null; }
    const id = (res && res.id) || res || m.id || ('local-' + Date.now());
    const token = (res && res.token) || m.token || '';
    const saved = { id, clientId: p.clientId || null, number: p.number, title: p.title, intro: p.intro, items: p.items.map(it => ({ desc: it.desc, qty: +it.qty || 0, unit: +it.unit || 0 })), amount: this.invTotal(p.items), terms: p.terms, status: p.status, token };
    this.setState(s => { const proposals = s.proposals.slice(); const i = proposals.findIndex(x => x.id === id); if (i >= 0) proposals[i] = saved; else proposals.unshift(saved); return { proposals }; });
    return saved;
  }
  async saveProposalClose() { const s = await this.saveProposal(); if (s) { this.setState({ proposalModal: null }); this.flash('PROPOSAL SAVED ✓'); } }
  async removeProposal() {
    const m = this.state.proposalModal; if (!m) return;
    const persisted = m.id && !String(m.id).startsWith('local');
    if (persisted) { try { await store.deleteProposal(m.id); } catch (e) { console.error(e); this.flash('DELETE FAILED — ' + (e.message || e), 7000); return; } }
    this.setState(s => ({ proposals: s.proposals.filter(x => x.id !== m.id), proposalModal: null }));
    this.flash('PROPOSAL DELETED');
  }
  proposalLink(token) { const origin = (typeof window !== 'undefined') ? window.location.origin : ''; return token ? origin + '/proposal/' + token : ''; }
  async copyProposalLink() {
    const saved = await this.saveProposal({ status: this.state.proposalModal.status === 'draft' ? 'sent' : this.state.proposalModal.status });
    if (!saved) return;
    const link = this.proposalLink(saved.token);
    try { await navigator.clipboard.writeText(link); this.flash('PROPOSAL LINK COPIED ✓ · SENT', 4000); }
    catch (e) { window.prompt('Copy this proposal link for your client:', link); }
    this.setState(s => ({ proposalModal: Object.assign({}, s.proposalModal, { status: saved.status, token: saved.token, id: saved.id }) }));
  }

  renderProposalsTab() {
    const props = this.state.proposals || [];
    const clientName = (id) => { const c = (this.state.clients || []).find(x => x.id === id); return c ? c.name : '—'; };
    const sent = props.filter(p => p.status === 'sent').length;
    const accepted = props.filter(p => p.status === 'accepted');
    const acceptedVal = accepted.reduce((s, p) => s + (+p.amount || 0), 0);
    const stC = { draft: 'var(--dim)', sent: 'var(--cream)', accepted: '#3fb97a', declined: '#7a2420' };
    const Stat = (label, val, sub, accent) => (
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid " + (accent || "var(--line2)"), padding: "15px 18px" }}>
        <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>{label}</div>
        <div style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "38px", lineHeight: ".9", color: "var(--cream)", marginTop: "6px" }}>{val}</div>
        <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>{sub}</div>
      </div>
    );
    return (
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 05 · CLOSE IT</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>PRO<span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>POSALS</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Send it, they accept &amp; sign, it drops straight into your pipeline as Signed. Build off the ladder — never discount month one.</div>
          </div>
          <Hover as="button" onClick={() => this.openProposal(null)} baseStyle={{ flexShrink: 0, marginTop: "6px", background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>+ New Proposal</Hover>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "20px" }}>
          {Stat('SENT', String(sent), 'AWAITING SIGNATURE', sent ? 'var(--cream)' : 'var(--line2)')}
          {Stat('ACCEPTED', String(accepted.length), 'SIGNED', '#3fb97a')}
          {Stat('ACCEPTED VALUE', this.fmt(acceptedVal), 'SIGNED FROM PROPOSALS', 'var(--red)')}
        </div>

        {props.length === 0 ? (
          <div style={{ border: "1px dashed var(--line2)", padding: "44px", textAlign: "center", color: "var(--dim)", fontSize: "13px", lineHeight: 1.7 }}>
            No proposals yet.<br />Hit <span style={{ color: "var(--red)" }}>+ NEW PROPOSAL</span>, build it off your ladder, then copy the link — your client accepts &amp; signs online.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--line)", background: "var(--panel)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr .9fr 1.1fr", gap: "10px", padding: "11px 16px", borderBottom: "1px solid var(--line)", fontSize: "9.5px", letterSpacing: ".14em", color: "var(--dim)", textTransform: "uppercase" }}>
              <div>Number</div><div>Client / Title</div><div>Value</div><div>Status</div><div>Signed by</div>
            </div>
            {props.map((p) => (
              <Hover as="div" key={p.id} onClick={() => this.openProposal(p)} baseStyle={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr .9fr 1.1fr", gap: "10px", padding: "13px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", alignItems: "center", fontSize: "13px" }} hoverStyle={{ background: "#141418" }}>
                <div style={{ fontFamily: "var(--mono)", color: "var(--muted)", fontSize: "12px" }}>{p.number}</div>
                <div><span style={{ color: "var(--cream)", fontWeight: 600 }}>{clientName(p.clientId)}</span>{p.title ? <span style={{ color: "var(--dim)" }}> · {p.title}</span> : null}</div>
                <div style={{ fontFamily: "var(--cond)", fontWeight: 800, color: "var(--red)" }}>{this.fmt(p.amount)}</div>
                <div><span style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: stC[p.status] || 'var(--dim)' }}>{p.status}</span></div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>{p.signer || '—'}</div>
              </Hover>
            ))}
          </div>
        )}
      </div>
    );
  }

  renderProposalModal() {
    const m = this.state.proposalModal;
    if (!m) return null;
    const lbl = { fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { width: "100%", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    const total = this.invTotal(m.items);
    return (
      <div onClick={() => this.closeProposal()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "660px", maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", background: "#0e0e11", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "26px", letterSpacing: ".01em" }}>{m.id ? "EDIT PROPOSAL" : "NEW PROPOSAL"} <span style={{ color: "var(--dim)", fontSize: "15px" }}>{m.number}</span></div>
            <button onClick={() => this.closeProposal()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "13px" }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Client</label>
              <select style={inp} value={m.clientId || ''} onChange={(e) => this.setPropField('clientId', e.target.value)}>
                <option value="">— none —</option>
                {(this.state.clients || []).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div style={{ flex: 1.4 }}><label style={lbl}>Title</label><input style={inp} value={m.title} placeholder="Authority Engine — Q3" onChange={(e) => this.setPropField('title', e.target.value)} /></div>
          </div>

          <div style={{ marginBottom: "13px" }}><label style={lbl}>Intro (shown to client)</label><textarea style={Object.assign({}, inp, { minHeight: "50px", resize: "vertical" })} value={m.intro || ''} placeholder="Here's the plan to fix the leak we found…" onChange={(e) => this.setPropField('intro', e.target.value)} /></div>

          <label style={lbl}>Scope &amp; pricing</label>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
            {this.LADDER_PRESETS.map((p) => (
              <button key={p.desc} onClick={() => this.addPropItem(p)} style={{ background: "transparent", border: "1px dashed var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".06em", padding: "6px 9px", cursor: "pointer" }}>+ {p.desc} · {this.fmt(p.unit)}</button>
            ))}
          </div>
          <div style={{ border: "1px solid var(--line2)", marginBottom: "13px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 110px 110px 32px", gap: "8px", padding: "8px 10px", borderBottom: "1px solid var(--line2)", fontSize: "9px", letterSpacing: ".1em", color: "var(--dim)", textTransform: "uppercase" }}>
              <div>Item</div><div>Qty</div><div>Price $</div><div>Amount</div><div></div>
            </div>
            {m.items.map((it, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 110px 110px 32px", gap: "8px", padding: "7px 10px", alignItems: "center", borderBottom: "1px solid #1a1a1f" }}>
                <input style={Object.assign({}, inp, { fontSize: "12px", padding: "7px 9px" })} value={it.desc} onChange={(e) => this.setPropItem(i, 'desc', e.target.value)} />
                <input style={Object.assign({}, inp, { fontSize: "12px", padding: "7px 9px", textAlign: "center" })} type="number" min="0" value={it.qty} onChange={(e) => this.setPropItem(i, 'qty', e.target.value)} />
                <input style={Object.assign({}, inp, { fontSize: "12px", padding: "7px 9px", textAlign: "right" })} type="number" min="0" step="0.01" value={it.unit} onChange={(e) => this.setPropItem(i, 'unit', e.target.value)} />
                <div style={{ fontFamily: "var(--cond)", fontWeight: 700, textAlign: "right", color: "var(--cream)", fontSize: "14px" }}>{this.fmt((+it.qty || 0) * (+it.unit || 0))}</div>
                <button onClick={() => this.removePropItem(i)} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: "14px" }}>✕</button>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 10px" }}>
              <button onClick={() => this.addPropItem()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: ".1em", padding: "6px 11px", cursor: "pointer", textTransform: "uppercase" }}>+ Blank line</button>
              <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "22px", color: "var(--cream)" }}>TOTAL&nbsp;&nbsp;<span style={{ color: "var(--red)" }}>{this.fmt(total)}</span></div>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "5px" }}>
              <label style={Object.assign({}, lbl, { marginBottom: 0 })}>Agreement / contract (they sign this)</label>
              <button onClick={() => this.setPropField('terms', this.DEFAULT_AGREEMENT)} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".06em", cursor: "pointer", textTransform: "uppercase" }}>↺ Load template</button>
            </div>
            <textarea style={Object.assign({}, inp, { minHeight: "150px", resize: "vertical", lineHeight: "1.55" })} value={m.terms || ''} onChange={(e) => this.setPropField('terms', e.target.value)} />
            <div style={{ fontSize: "10px", color: "var(--dim)", marginTop: "6px", lineHeight: 1.5 }}>Auto-fills on the client's page: <span style={{ color: "var(--muted)" }}>{'{{client}}'} {'{{title}}'} {'{{total}}'} {'{{date}}'} {'{{signer}}'}</span></div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {m.id ? (
              <button onClick={() => this.removeProposal()} style={{ background: "transparent", border: "1px solid #5a2230", color: "var(--red)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button>
            ) : <span />}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={() => this.copyProposalLink()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Copy sign link</button>
              <button onClick={() => this.saveProposalClose()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>Save</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Scheduling (Phase 4: native booker) ---
  bookingCfg() {
    const d = (this.state.ops && this.state.ops.__booking) || {};
    return Object.assign({ tz: 'America/Chicago', slotMins: 30, horizonDays: 14, leadHours: 12, title: 'Book a call with Churlish', token: '', days: {} }, d);
  }
  setBooking(patchObj) {
    this.setState(s => { const ops = Object.assign({}, s.ops); ops.__booking = Object.assign({}, this.bookingCfg(), patchObj); return { ops }; }, () => this.saveStore());
  }
  setBookingDay(dow, key, val) {
    const cfg = this.bookingCfg(); const days = Object.assign({}, cfg.days);
    days[dow] = Object.assign({ on: false, start: '09:00', end: '17:00' }, days[dow], { [key]: val });
    this.setBooking({ days });
  }
  bookToken() {
    let t = this.bookingCfg().token;
    if (!t) { t = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('bk-' + Date.now() + Math.random().toString(36).slice(2)); this.setBooking({ token: t }); }
    return t;
  }
  async copyBookLink() {
    const t = this.bookToken();
    const link = (typeof window !== 'undefined' ? window.location.origin : '') + '/book/' + t;
    try { await navigator.clipboard.writeText(link); this.flash('BOOKING LINK COPIED ✓', 4000); }
    catch (e) { window.prompt('Your booking link:', link); }
  }
  async cancelBookingRow(id) {
    try { await store.cancelBooking(id); } catch (e) { console.error(e); this.flash('CANCEL FAILED — ' + (e.message || e), 6000); return; }
    this.setState(s => ({ bookings: s.bookings.filter(b => b.id !== id) }));
    this.flash('BOOKING CANCELLED');
  }

  // --- Intake form / questionnaire (customizable public lead-capture) ---
  DEFAULT_INTAKE_FIELDS = [
    { id: 'business', label: 'Business name', type: 'short' },
    { id: 'contact', label: 'Your name', type: 'short' },
    { id: 'email', label: 'Email', type: 'email' },
    { id: 'phone', label: 'Phone', type: 'phone' },
    { id: 'industry', label: 'Industry (roofing, dental, HVAC…)', type: 'short' },
    { id: 'website', label: 'Website / where leads land now', type: 'short' },
    { id: 'spend', label: 'Monthly marketing spend', type: 'choice', options: ['Under $1k', '$1k–$5k', '$5k–$15k', '$15k+'] },
    { id: 'challenge', label: "Biggest thing you'd want fixed", type: 'long' },
    { id: 'timeline', label: 'Timeline to start', type: 'choice', options: ['ASAP', 'Within 30 days', '60–90 days', 'Just exploring'] },
    { id: 'source', label: 'How did you hear about us?', type: 'short' },
  ];
  intakeCfg() {
    const d = (this.state.ops && this.state.ops.__intake) || {};
    return Object.assign({ title: 'Tell us about your business', token: '', fields: this.DEFAULT_INTAKE_FIELDS }, d);
  }
  intakeToken() {
    let t = this.intakeCfg().token;
    if (!t) {
      t = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('in-' + Date.now() + Math.random().toString(36).slice(2));
      this.setState(s => { const ops = Object.assign({}, s.ops); ops.__intake = Object.assign({}, this.intakeCfg(), { token: t }); return { ops }; }, () => this.saveStore());
    }
    return t;
  }
  strategyText() { return (this.state.ops && this.state.ops.__strategy) || ''; }
  setStrategyText(v) { this.setState(s => { const ops = Object.assign({}, s.ops); ops.__strategy = v; return { ops }; }, () => this.saveStore()); }

  openIntakeSettings() {
    const c = this.intakeCfg();
    this.setState({ intakeModal: { title: c.title, token: this.intakeToken(), fields: (c.fields || []).map(f => Object.assign({}, f)) } });
  }
  closeIntakeSettings() { this.setState({ intakeModal: null }); }
  setIntakeTitle(v) { this.setState(s => ({ intakeModal: Object.assign({}, s.intakeModal, { title: v }) })); }
  setIntakeQ(i, key, val) { this.setState(s => { const fields = s.intakeModal.fields.slice(); fields[i] = Object.assign({}, fields[i], { [key]: val }); return { intakeModal: Object.assign({}, s.intakeModal, { fields }) }; }); }
  setIntakeQOptions(i, str) { this.setIntakeQ(i, 'options', str.split(',').map(x => x.trim()).filter(Boolean)); }
  addIntakeQ() { this.setState(s => ({ intakeModal: Object.assign({}, s.intakeModal, { fields: [...s.intakeModal.fields, { id: 'q' + Date.now(), label: '', type: 'short' }] }) })); }
  removeIntakeQ(i) { this.setState(s => { const fields = s.intakeModal.fields.slice(); fields.splice(i, 1); return { intakeModal: Object.assign({}, s.intakeModal, { fields }) }; }); }
  saveIntakeSettings() {
    const m = this.state.intakeModal; if (!m) return;
    const fields = (m.fields || []).filter(f => (f.label || '').trim());
    this.setState(s => { const ops = Object.assign({}, s.ops); ops.__intake = { title: m.title || 'Tell us about your business', token: m.token, fields }; return { ops, intakeModal: null }; }, () => this.saveStore());
    this.flash('INTAKE FORM SAVED ✓');
  }
  async copyIntakeLink() {
    const t = (this.state.intakeModal && this.state.intakeModal.token) || this.intakeToken();
    const link = (typeof window !== 'undefined' ? window.location.origin : '') + '/intake/' + t;
    try { await navigator.clipboard.writeText(link); this.flash('INTAKE LINK COPIED ✓', 4000); }
    catch (e) { window.prompt('Your intake form link:', link); }
  }

  renderIntakeModal() {
    const m = this.state.intakeModal;
    if (!m) return null;
    const lbl = { fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { width: "100%", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    const types = ['short', 'long', 'email', 'phone', 'choice', 'date'];
    return (
      <div onClick={() => this.closeIntakeSettings()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "640px", maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", background: "#0e0e11", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "26px", letterSpacing: ".01em" }}>INTAKE FORM</div>
            <button onClick={() => this.closeIntakeSettings()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ marginBottom: "14px" }}><label style={lbl}>Form title (shown to leads)</label><input style={inp} value={m.title} onChange={(e) => this.setIntakeTitle(e.target.value)} /></div>

          <label style={lbl}>Questions</label>
          <div style={{ border: "1px solid var(--line2)", marginBottom: "12px" }}>
            {m.fields.map((f, i) => (
              <div key={f.id || i} style={{ padding: "9px 10px", borderBottom: i < m.fields.length - 1 ? "1px solid #1a1a1f" : "none" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input style={Object.assign({}, inp, { flex: 1, fontSize: "12px", padding: "7px 9px" })} value={f.label} placeholder="Question label" onChange={(e) => this.setIntakeQ(i, 'label', e.target.value)} />
                  <select style={Object.assign({}, inp, { width: "110px", fontSize: "12px", padding: "7px 9px" })} value={f.type} onChange={(e) => this.setIntakeQ(i, 'type', e.target.value)}>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={() => this.removeIntakeQ(i)} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: "14px" }}>✕</button>
                </div>
                {f.type === 'choice' ? (
                  <input style={Object.assign({}, inp, { fontSize: "11.5px", padding: "6px 9px", marginTop: "6px" })} value={(f.options || []).join(', ')} placeholder="Options, comma-separated" onChange={(e) => this.setIntakeQOptions(i, e.target.value)} />
                ) : null}
              </div>
            ))}
            <div style={{ padding: "9px 10px" }}>
              <button onClick={() => this.addIntakeQ()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: ".1em", padding: "6px 11px", cursor: "pointer", textTransform: "uppercase" }}>+ Question</button>
            </div>
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--dim)", marginBottom: "18px", lineHeight: 1.5 }}>Answers land as a new <b style={{ color: "var(--muted)" }}>Lead</b> in Clients. Keep the ids <b style={{ color: "var(--muted)" }}>business / contact / email / phone / industry</b> to auto-fill those fields on the client record.</div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            <button onClick={() => this.copyIntakeLink()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Copy public link</button>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeIntakeSettings()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
              <button onClick={() => this.saveIntakeSettings()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>Save form</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Expenses (Phase 6a) ---
  EXPENSE_CATS = ['Software', 'Ads', 'Contractors', 'Gear', 'Fees', 'Other'];
  monthKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  blankExpense() { return { id: null, date: new Date().toISOString().slice(0, 10), vendor: '', category: 'Software', amount: 0, recurring: false, notes: '' }; }
  openExpense(x) { this.setState({ expenseModal: x ? Object.assign({}, x) : this.blankExpense() }); }
  closeExpense() { this.setState({ expenseModal: null }); }
  setExpField(k, v) { this.setState(s => ({ expenseModal: Object.assign({}, s.expenseModal, { [k]: v }) })); }
  async saveExpense() {
    const m = this.state.expenseModal; if (!m) return;
    const x = Object.assign({}, m, { vendor: (m.vendor || '').trim() || 'Untitled', amount: +m.amount || 0 });
    let id;
    try { id = await store.upsertExpense(x); }
    catch (e) { console.error(e); this.flash('EXPENSE SAVE FAILED — ' + (e.message || e), 7000); return; }
    x.id = id || m.id || ('local-' + Date.now());
    this.setState(s => { const expenses = s.expenses.slice(); const i = expenses.findIndex(y => y.id === x.id); if (i >= 0) expenses[i] = x; else expenses.unshift(x); return { expenses, expenseModal: null }; });
    this.flash(m.id ? 'EXPENSE UPDATED ✓' : 'EXPENSE ADDED ✓');
  }
  async removeExpense() {
    const m = this.state.expenseModal; if (!m) return;
    if (m.id && !String(m.id).startsWith('local')) { try { await store.deleteExpense(m.id); } catch (e) { console.error(e); this.flash('DELETE FAILED — ' + (e.message || e), 7000); return; } }
    this.setState(s => ({ expenses: s.expenses.filter(x => x.id !== m.id), expenseModal: null }));
    this.flash('EXPENSE DELETED');
  }

  renderExpensesTab() {
    const mk = this.monthKey();
    const monthName = new Date().toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const expenses = this.state.expenses || [];
    const thisMonth = expenses.filter(x => (x.date || '').startsWith(mk));
    const spentMo = thisMonth.reduce((s, x) => s + (+x.amount || 0), 0);
    const burn = expenses.filter(x => x.recurring).reduce((s, x) => s + (+x.amount || 0), 0);
    // Collected this month = PAID INVOICES dated this month (honest denominator).
    const collectedMo = (this.state.invoices || []).filter(i => i.status === 'paid' && (i.paidAt || '').startsWith(mk)).reduce((s, i) => s + (+i.amount || 0), 0);
    const net = collectedMo - spentMo;
    const byCat = {};
    thisMonth.forEach(x => { byCat[x.category] = (byCat[x.category] || 0) + (+x.amount || 0); });

    const Stat = (label, val, sub, accent) => (
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid " + (accent || "var(--line2)"), padding: "15px 18px" }}>
        <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>{label}</div>
        <div style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "38px", lineHeight: ".9", color: "var(--cream)", marginTop: "6px" }}>{val}</div>
        <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>{sub}</div>
      </div>
    );

    return (
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 08 · WHERE IT LEAKS</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>EXP<span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>ENSES</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Every dollar out, next to the dollars in. Recurring is the silent killer — audit the subscriptions monthly.</div>
          </div>
          <Hover as="button" onClick={() => this.openExpense(null)} baseStyle={{ flexShrink: 0, marginTop: "6px", background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>+ Add Expense</Hover>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" }}>
          {Stat('SPENT · ' + monthName, this.fmt(spentMo), 'THIS MONTH', spentMo ? 'var(--red)' : 'var(--line2)')}
          {Stat('RECURRING BURN', this.fmt(burn), 'SUBSCRIPTIONS / MO', burn ? 'var(--red)' : 'var(--line2)')}
          {Stat('COLLECTED · ' + monthName, this.fmt(collectedMo), 'PAID INVOICES', '#3fb97a')}
          {Stat('NET · ' + monthName, this.fmt(net), 'COLLECTED − EXPENSES', net >= 0 ? '#3fb97a' : 'var(--red)')}
        </div>

        {Object.keys(byCat).length ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
            {Object.entries(byCat).map(([c, v]) => (
              <span key={c} style={{ border: "1px solid var(--line2)", padding: "6px 11px", fontSize: "10.5px", letterSpacing: ".08em", color: "var(--muted)" }}>{c.toUpperCase()} <b style={{ color: "var(--cream)" }}>{this.fmt(v)}</b></span>
            ))}
          </div>
        ) : null}

        {expenses.length === 0 ? (
          <div style={{ border: "1px dashed var(--line2)", padding: "44px", textAlign: "center", color: "var(--dim)", fontSize: "13px", lineHeight: 1.7 }}>
            No expenses logged.<br />Start with the subscriptions — that's where the leak usually is.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--line)", background: "var(--panel)" }}>
            <div style={{ display: "grid", gridTemplateColumns: ".9fr 1.6fr 1fr .9fr .8fr", gap: "10px", padding: "11px 16px", borderBottom: "1px solid var(--line)", fontSize: "9.5px", letterSpacing: ".14em", color: "var(--dim)", textTransform: "uppercase" }}>
              <div>Date</div><div>Vendor</div><div>Category</div><div>Amount</div><div>Recurring</div>
            </div>
            {expenses.map((x) => (
              <Hover as="div" key={x.id} onClick={() => this.openExpense(x)} baseStyle={{ display: "grid", gridTemplateColumns: ".9fr 1.6fr 1fr .9fr .8fr", gap: "10px", padding: "12px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", alignItems: "center", fontSize: "13px" }} hoverStyle={{ background: "#141418" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "11.5px", color: "var(--muted)" }}>{x.date}</div>
                <div style={{ color: "var(--cream)", fontWeight: 600 }}>{x.vendor}</div>
                <div style={{ color: "var(--muted)", fontSize: "11.5px" }}>{x.category}</div>
                <div style={{ fontFamily: "var(--cond)", fontWeight: 800, color: "var(--red)" }}>{this.fmt(x.amount)}</div>
                <div style={{ fontSize: "11px", color: x.recurring ? 'var(--red)' : 'var(--dim)' }}>{x.recurring ? '↻ MONTHLY' : '—'}</div>
              </Hover>
            ))}
          </div>
        )}
      </div>
    );
  }

  renderExpenseModal() {
    const m = this.state.expenseModal;
    if (!m) return null;
    const lbl = { fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { width: "100%", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    return (
      <div onClick={() => this.closeExpense()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "440px", maxWidth: "100%", background: "#0e0e11", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "26px" }}>{m.id ? "EDIT EXPENSE" : "NEW EXPENSE"}</div>
            <button onClick={() => this.closeExpense()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <div style={{ flex: 1 }}><label style={lbl}>Vendor</label><input style={inp} value={m.vendor} placeholder="HoneyBook" onChange={(e) => this.setExpField('vendor', e.target.value)} /></div>
            <div style={{ width: "130px" }}><label style={lbl}>Amount ($)</label><input style={inp} type="number" min="0" step="0.01" value={m.amount} onChange={(e) => this.setExpField('amount', e.target.value)} /></div>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <div style={{ flex: 1 }}><label style={lbl}>Category</label>
              <select style={inp} value={m.category} onChange={(e) => this.setExpField('category', e.target.value)}>{this.EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div style={{ width: "150px" }}><label style={lbl}>Date</label><input style={inp} type="date" value={m.date} onChange={(e) => this.setExpField('date', e.target.value)} /></div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "12px", color: "var(--muted)", cursor: "pointer", marginBottom: "14px" }}>
            <input type="checkbox" checked={!!m.recurring} onChange={(e) => this.setExpField('recurring', e.target.checked)} /> Recurring monthly (subscription)
          </label>
          <div style={{ marginBottom: "18px" }}><label style={lbl}>Notes</label><input style={inp} value={m.notes || ''} onChange={(e) => this.setExpField('notes', e.target.value)} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
            {m.id ? <button onClick={() => this.removeExpense()} style={{ background: "transparent", border: "1px solid #5a2230", color: "var(--red)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button> : <span />}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeExpense()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
              <button onClick={() => this.saveExpense()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>{m.id ? "Save" : "Add"}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- KPIs (Phase 6b) ---
  KPI_PRESETS = [
    { name: 'Leads', unit: '#', target: 10, cadence: 'weekly' },
    { name: 'Calls booked', unit: '#', target: 3, cadence: 'weekly' },
    { name: 'Proposals out', unit: '#', target: 2, cadence: 'weekly' },
    { name: 'Close rate', unit: '%', target: 30, cadence: 'monthly' },
    { name: 'Ad spend', unit: '$', target: '', cadence: 'monthly' },
  ];
  kpiPeriodKey(kpi, offset = 0) {
    const d = new Date();
    if (kpi.cadence === 'monthly') { d.setDate(1); d.setMonth(d.getMonth() - offset); return this.monthKey(d); }
    d.setDate(d.getDate() - offset * 7); return this.weekKey(d);
  }
  kpiPeriodLabel(kpi, offset = 0) {
    const d = new Date();
    if (kpi.cadence === 'monthly') { d.setDate(1); d.setMonth(d.getMonth() - offset); return d.toLocaleString('en-US', { month: 'short' }).toUpperCase(); }
    return 'W' + this.kpiPeriodKey(kpi, offset).split('-W')[1];
  }
  kpiVal(kpi, offset = 0) { const v = (this.state.kpiEntries || {})[kpi.id + '|' + this.kpiPeriodKey(kpi, offset)]; return v == null ? '' : v; }
  kpiFmt(kpi, v) { if (v === '' || v == null) return '·'; return kpi.unit === '$' ? this.fmt(v) : kpi.unit === '%' ? v + '%' : String(v); }
  setKpiLocal(kpi, value) {
    const key = kpi.id + '|' + this.kpiPeriodKey(kpi, 0);
    this.setState(s => ({ kpiEntries: Object.assign({}, s.kpiEntries, { [key]: value === '' ? null : +value }) }));
  }
  async persistKpi(kpi) {
    const v = this.kpiVal(kpi, 0);
    if (v === '' || v == null) return;
    try { await store.setKpiEntry(kpi.id, this.kpiPeriodKey(kpi, 0), v); if (store.enabled) this.flash('SYNCED ✓'); }
    catch (e) { console.error(e); this.flash('KPI SAVE FAILED — ' + (e.message || e), 7000); }
  }
  blankKpi() { return { id: null, name: '', unit: '#', target: '', cadence: 'weekly', sort: (this.state.kpis || []).length }; }
  openKpi(k) { this.setState({ kpiModal: k ? Object.assign({}, k) : this.blankKpi() }); }
  closeKpi() { this.setState({ kpiModal: null }); }
  setKpiField(k, v) { this.setState(s => ({ kpiModal: Object.assign({}, s.kpiModal, { [k]: v }) })); }
  async saveKpi(preset) {
    const m = preset || this.state.kpiModal; if (!m) return;
    const k = Object.assign({}, m, { name: (m.name || '').trim() || 'Untitled' });
    let id;
    try { id = await store.upsertKpi(k); }
    catch (e) { console.error(e); this.flash('KPI SAVE FAILED — ' + (e.message || e), 7000); return; }
    k.id = id || m.id || ('local-' + Date.now());
    this.setState(s => { const kpis = s.kpis.slice(); const i = kpis.findIndex(y => y.id === k.id); if (i >= 0) kpis[i] = k; else kpis.push(k); return { kpis, kpiModal: preset ? s.kpiModal : null }; });
    this.flash(m.id ? 'KPI UPDATED ✓' : 'KPI ADDED ✓');
  }
  async removeKpi() {
    const m = this.state.kpiModal; if (!m) return;
    if (m.id && !String(m.id).startsWith('local')) { try { await store.deleteKpi(m.id); } catch (e) { console.error(e); this.flash('DELETE FAILED — ' + (e.message || e), 7000); return; } }
    this.setState(s => ({ kpis: s.kpis.filter(x => x.id !== m.id), kpiModal: null }));
    this.flash('KPI DELETED');
  }

  renderKpisTab() {
    const kpis = this.state.kpis || [];
    return (
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 07 · WHAT GETS MEASURED</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>THE <span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>NUMBERS</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Define the numbers that matter, log them every period, watch the trend. A KPI without a number is an opinion.</div>
          </div>
          <Hover as="button" onClick={() => this.openKpi(null)} baseStyle={{ flexShrink: 0, marginTop: "6px", background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>+ Add KPI</Hover>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        {kpis.length === 0 ? (
          <div style={{ border: "1px dashed var(--line2)", padding: "34px", textAlign: "center", color: "var(--dim)", fontSize: "13px", lineHeight: 1.7 }}>
            No KPIs yet. Start with the Churlish set:
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginTop: "14px" }}>
              {this.KPI_PRESETS.map((p) => (
                <button key={p.name} onClick={() => this.saveKpi(p)} style={{ background: "transparent", border: "1px dashed var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".06em", padding: "8px 12px", cursor: "pointer" }}>+ {p.name} ({p.cadence})</button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: "14px" }}>
            {kpis.map((k) => {
              const cur = this.kpiVal(k, 0);
              const hasTarget = k.target !== '' && k.target != null;
              const hit = hasTarget && cur !== '' && +cur >= +k.target;
              const hist = [5, 4, 3, 2, 1].map(o => ({ label: this.kpiPeriodLabel(k, o), v: this.kpiVal(k, o) }));
              const maxV = Math.max(1, ...hist.map(h => +h.v || 0), +cur || 0, hasTarget ? +k.target : 0);
              return (
                <div key={k.id} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid " + (cur === '' ? 'var(--line2)' : hit ? '#3fb97a' : hasTarget ? 'var(--red)' : 'var(--cream)'), padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                    <button onClick={() => this.openKpi(k)} style={{ background: "none", border: "none", color: "var(--cream)", fontFamily: "var(--cond)", fontWeight: 800, fontSize: "17px", letterSpacing: ".02em", cursor: "pointer", padding: 0, textAlign: "left" }}>{k.name.toUpperCase()} <span style={{ color: "var(--dim)", fontSize: "10px", letterSpacing: ".14em" }}>{k.cadence.toUpperCase()}</span></button>
                    {hasTarget ? <span style={{ fontSize: "10px", letterSpacing: ".1em", color: hit ? '#3fb97a' : 'var(--dim)' }}>TARGET {this.kpiFmt(k, k.target)}</span> : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "14px" }}>
                    <div style={{ flex: "0 0 120px" }}>
                      <div style={{ fontSize: "9px", letterSpacing: ".14em", color: "var(--dim)", marginBottom: "4px" }}>{this.kpiPeriodLabel(k, 0)} · THIS {k.cadence === 'monthly' ? 'MONTH' : 'WEEK'}</div>
                      <input
                        type="number" step="any" value={cur} placeholder="0"
                        onChange={(e) => this.setKpiLocal(k, e.target.value)}
                        onBlur={() => this.persistKpi(k)}
                        style={{ width: "100%", background: "#0a0a0c", border: "1px solid " + (cur === '' ? 'var(--line2)' : hit ? '#2f7d4f' : hasTarget ? '#7a2420' : 'var(--line2)'), color: "var(--cream)", textAlign: "center", fontFamily: "var(--cond)", fontWeight: 800, fontSize: "26px", padding: "6px 4px" }}
                      />
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "6px", height: "62px" }}>
                      {hist.map((h, i) => (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                          <div style={{ fontSize: "8.5px", color: "var(--muted)" }}>{this.kpiFmt(k, h.v)}</div>
                          <div style={{ width: "100%", height: Math.max(3, Math.round(((+h.v || 0) / maxV) * 38)) + "px", background: (+h.v || 0) === 0 ? '#1a1a1f' : (hasTarget && +h.v >= +k.target ? '#2f7d4f' : 'var(--red2)') }}></div>
                          <div style={{ fontSize: "8px", letterSpacing: ".06em", color: "var(--dim)" }}>{h.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  renderKpiModal() {
    const m = this.state.kpiModal;
    if (!m) return null;
    const lbl = { fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { width: "100%", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    return (
      <div onClick={() => this.closeKpi()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "420px", maxWidth: "100%", background: "#0e0e11", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "26px" }}>{m.id ? "EDIT KPI" : "NEW KPI"}</div>
            <button onClick={() => this.closeKpi()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ marginBottom: "12px" }}><label style={lbl}>Name</label><input style={inp} value={m.name} placeholder="Leads" onChange={(e) => this.setKpiField('name', e.target.value)} /></div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "18px" }}>
            <div style={{ flex: 1 }}><label style={lbl}>Unit</label>
              <select style={inp} value={m.unit} onChange={(e) => this.setKpiField('unit', e.target.value)}><option value="#"># count</option><option value="$">$ dollars</option><option value="%">% percent</option></select>
            </div>
            <div style={{ flex: 1 }}><label style={lbl}>Cadence</label>
              <select style={inp} value={m.cadence} onChange={(e) => this.setKpiField('cadence', e.target.value)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
            </div>
            <div style={{ flex: 1 }}><label style={lbl}>Target</label><input style={inp} type="number" step="any" value={m.target} placeholder="—" onChange={(e) => this.setKpiField('target', e.target.value)} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
            {m.id ? <button onClick={() => this.removeKpi()} style={{ background: "transparent", border: "1px solid #5a2230", color: "var(--red)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button> : <span />}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeKpi()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
              <button onClick={() => this.saveKpi()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>{m.id ? "Save" : "Add"}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Client email threads (Phase 6c) ---
  async openEmailThread(client) {
    this.setState({ emailModal: { clientId: client.id, name: client.name, email: client.email, msgs: null, subject: '', body: '', sending: false, notice: '' } });
    try {
      const msgs = await store.getEmails(client.id);
      this.setState(s => s.emailModal && s.emailModal.clientId === client.id ? { emailModal: Object.assign({}, s.emailModal, { msgs }) } : null);
    } catch (e) {
      console.error(e);
      this.setState(s => s.emailModal ? { emailModal: Object.assign({}, s.emailModal, { msgs: [], notice: 'Could not load history — run the 08_growth.sql migration.' }) } : null);
    }
  }
  closeEmailThread() { this.setState({ emailModal: null }); }
  setEmailF(k, v) { this.setState(s => ({ emailModal: Object.assign({}, s.emailModal, { [k]: v }) })); }
  async sendEmailMsg() {
    const m = this.state.emailModal; if (!m || !m.subject.trim() || !m.body.trim() || m.sending) return;
    this.setEmailF('sending', true);
    try {
      const res = await fetch('/api/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: m.clientId, to: m.email, subject: m.subject, body: m.body }) });
      const j = await res.json();
      if (j.ok) {
        const msg = { id: 'tmp-' + Date.now(), dir: 'out', to: m.email, subject: m.subject, body: m.body, at: new Date().toISOString() };
        this.setState(s => ({ emailModal: Object.assign({}, s.emailModal, { msgs: [...(s.emailModal.msgs || []), msg], subject: '', body: '', sending: false, notice: '' }) }));
        this.flash('EMAIL SENT ✓');
      } else {
        this.setState(s => ({ emailModal: Object.assign({}, s.emailModal, { sending: false, notice: j.error === 'email_not_configured' ? 'Email isn’t switched on yet — finish the Resend setup (API key + domain) in Vercel.' : 'Send failed — try again.' }) }));
      }
    } catch (e) {
      this.setState(s => ({ emailModal: Object.assign({}, s.emailModal, { sending: false, notice: 'Send failed — try again.' }) }));
    }
  }

  renderEmailModal() {
    const m = this.state.emailModal;
    if (!m) return null;
    const inp = { width: "100%", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    const fmtAt = (iso) => { try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
    return (
      <div onClick={() => this.closeEmailThread()} style={{ position: "fixed", inset: 0, zIndex: 91, background: "rgba(4,4,5,.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "620px", maxWidth: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "#0e0e11", border: "1px solid var(--line)", borderTop: "3px solid var(--red)" }}>
          <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "24px" }}>✉ {m.name}</div>
              <div style={{ fontSize: "10.5px", color: "var(--dim)", marginTop: "2px" }}>{m.email}</div>
            </div>
            <button onClick={() => this.closeEmailThread()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", minHeight: "160px", maxHeight: "44vh" }}>
            {m.msgs === null ? (
              <div style={{ color: "var(--dim)", fontSize: "12px" }}>Loading thread…</div>
            ) : m.msgs.length === 0 ? (
              <div style={{ color: "var(--dim)", fontSize: "12px", lineHeight: 1.7 }}>No emails yet. Everything you send from here — and every reply they send back — stacks up in this thread.</div>
            ) : m.msgs.map((x) => (
              <div key={x.id} style={{ marginBottom: "14px", borderLeft: "3px solid " + (x.dir === 'in' ? 'var(--red)' : 'var(--line2)'), paddingLeft: "12px" }}>
                <div style={{ fontSize: "9.5px", letterSpacing: ".12em", color: x.dir === 'in' ? 'var(--red)' : 'var(--dim)', textTransform: "uppercase" }}>{x.dir === 'in' ? '← FROM THEM' : '→ SENT'} · {fmtAt(x.at)}</div>
                <div style={{ fontWeight: 600, color: "var(--cream)", fontSize: "13px", margin: "4px 0 3px" }}>{x.subject}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{x.body}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--line)", padding: "14px 22px 18px" }}>
            <input style={Object.assign({}, inp, { marginBottom: "8px" })} value={m.subject} placeholder="Subject" onChange={(e) => this.setEmailF('subject', e.target.value)} />
            <textarea style={Object.assign({}, inp, { minHeight: "84px", resize: "vertical", marginBottom: "10px" })} value={m.body} placeholder="Write it straight. They can smell template." onChange={(e) => this.setEmailF('body', e.target.value)} />
            {m.notice ? <div style={{ color: "var(--red)", fontSize: "11.5px", marginBottom: "10px", lineHeight: 1.5 }}>{m.notice}</div> : null}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => this.sendEmailMsg()} disabled={m.sending} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 20px", cursor: m.sending ? "default" : "pointer", textTransform: "uppercase", opacity: m.sending ? .6 : 1 }}>{m.sending ? 'Sending…' : 'Send →'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Rookie (operator copilot: chat in, real OS writes out) ---
  pickRookieFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 3.5 * 1024 * 1024) { this.flash('FILE TOO LARGE — 3.5MB MAX'); return; }
    const isImage = /^image\//.test(f.type);
    const isPdf = f.type === 'application/pdf';
    const reader = new FileReader();
    reader.onload = () => {
      if (isImage || isPdf) {
        const data = String(reader.result).split(',')[1]; // strip data: prefix
        this.setState({ rookieFile: { name: f.name, kind: isPdf ? 'pdf' : 'image', media_type: f.type, data } });
      } else {
        this.setState({ rookieFile: { name: f.name, kind: 'text', text: String(reader.result) } });
      }
      this.flash('ATTACHED: ' + f.name.toUpperCase());
    };
    if (isImage || isPdf) reader.readAsDataURL(f); else reader.readAsText(f);
  }
  async sendRookie() {
    const text = (this.state.rookieInput || '').trim();
    const file = this.state.rookieFile;
    if ((!text && !file) || this.state.rookieBusy) return;
    const shown = text || 'Process this file.';
    const msgs = [...this.state.rookieMsgs, { role: 'user', content: shown, fileName: file ? file.name : null }];
    this.setState({ rookieMsgs: msgs, rookieInput: '', rookieBusy: true, rookieFile: null });
    try {
      const res = await fetch('/api/rookie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs.map(m => ({ role: m.role, content: m.content })), file: file || undefined }) });
      const j = await res.json();
      if (j.ok) {
        this.setState(s => ({ rookieMsgs: [...s.rookieMsgs, { role: 'assistant', content: j.reply, actions: j.actions || [] }], rookieBusy: false }));
        if (j.actions && j.actions.length) { this.flash('ROOKIE: ' + j.actions.length + ' ACTION' + (j.actions.length > 1 ? 'S' : '') + ' EXECUTED'); this.loadStore(); }
      } else {
        const msg = j.error === 'no_api_key' ? 'ANTHROPIC_API_KEY missing in Vercel — Rookie is offline.' : j.error === 'no_service_role' ? 'SUPABASE_SERVICE_ROLE_KEY missing — Rookie cannot act.' : 'Error: ' + (j.error || 'unknown') + '. Try again.';
        this.setState(s => ({ rookieMsgs: [...s.rookieMsgs, { role: 'assistant', content: msg, actions: [] }], rookieBusy: false }));
      }
    } catch (e) {
      this.setState(s => ({ rookieMsgs: [...s.rookieMsgs, { role: 'assistant', content: 'Connection failed — try again.', actions: [] }], rookieBusy: false }));
    }
  }

  renderRookieTab() {
    const msgs = this.state.rookieMsgs || [];
    const inp = { background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "11px 13px" };
    const chips = ['Log my Friday Five: 3 calls, 2 offers, $1500 signed, $750 collected', 'Add a deal: Acme Roofing, Authority Diagnostic, $750', "What's my coverage?", 'Log expense: Adobe $60/mo recurring', 'Change THE ONE THING to: Close 3 Authority Engines by Aug 31', 'Email Rustic Lumber Store: new leads are on the way to Zach this week'];
    return (
      <div style={{ padding: "24px 26px 60px", maxWidth: "900px" }}>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 16 · THE BATTLESUIT</div>
          <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>ROO<span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>KIE</span></h1>
          <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "620px", lineHeight: "1.6" }}>Give the order; Rookie executes it against the OS — deals, Friday Five, clients, expenses, KPIs — and reports back with the numbers. Every action hits the database and the sys.log.</div>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", height: "56vh" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            {msgs.length === 0 ? (
              <div>
                <div style={{ color: "var(--dim)", fontSize: "12.5px", lineHeight: 1.7, marginBottom: "14px" }}>Rookie online. Standing by for orders. Try:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                  {chips.map((c, i) => (
                    <button key={i} onClick={() => this.setState({ rookieInput: c }, () => this.sendRookie())} style={{ background: "transparent", border: "1px dashed var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "11px", padding: "8px 12px", cursor: "pointer", textAlign: "left" }}>▸ {c}</button>
                  ))}
                </div>
              </div>
            ) : msgs.map((m, i) => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "9px", letterSpacing: ".18em", color: m.role === 'user' ? 'var(--cream)' : 'var(--red)', textTransform: "uppercase", marginBottom: "4px" }}>{m.role === 'user' ? '> YOU' : '◉ ROOKIE'}</div>
                <div style={{ fontSize: "13px", color: m.role === 'user' ? "var(--cream)" : "var(--muted)", lineHeight: 1.65, whiteSpace: "pre-wrap", borderLeft: "2px solid " + (m.role === 'user' ? 'var(--line2)' : 'var(--red)'), paddingLeft: "12px" }}>{m.content}{m.fileName ? <span style={{ display: "inline-block", marginLeft: "8px", border: "1px solid var(--line2)", color: "var(--dim)", fontSize: "9.5px", padding: "2px 7px", letterSpacing: ".06em" }}>📎 {m.fileName}</span> : null}</div>
                {m.actions && m.actions.length ? (
                  <div style={{ marginTop: "6px", paddingLeft: "14px" }}>
                    {m.actions.map((a, k) => (<div key={k} style={{ fontSize: "10.5px", color: "#3fb97a", lineHeight: 1.6 }}>✓ {a}</div>))}
                  </div>
                ) : null}
              </div>
            ))}
            {this.state.rookieBusy ? <div style={{ color: "var(--dim)", fontSize: "11px" }}>◉ executing…</div> : null}
          </div>
          {this.state.rookieFile ? (
            <div style={{ borderTop: "1px solid var(--line)", padding: "8px 14px", display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: "var(--muted)" }}>
              📎 {this.state.rookieFile.name}
              <button onClick={() => this.setState({ rookieFile: null })} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: "12px" }}>✕</button>
              <span style={{ color: "var(--dim)", fontSize: "10px" }}>— tell Rookie what to do with it (e.g. "log these as expenses")</span>
            </div>
          ) : null}
          <div style={{ borderTop: "1px solid var(--line)", padding: "12px 14px", display: "flex", gap: "10px" }}>
            <label title="Attach a receipt, statement, PDF, or CSV (3.5MB max)" style={{ border: "1px solid var(--line2)", color: "var(--muted)", padding: "10px 13px", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>
              📎<input type="file" accept="image/*,application/pdf,.csv,.txt" onChange={(e) => this.pickRookieFile(e)} style={{ display: "none" }} />
            </label>
            <input
              style={Object.assign({}, inp, { flex: 1 })}
              value={this.state.rookieInput}
              placeholder={this.state.rookieFile ? "What should Rookie do with the file?" : "Give an order — Rookie writes it to the OS"}
              onChange={(e) => this.setState({ rookieInput: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') this.sendRookie(); }}
            />
            <button onClick={() => this.sendRookie()} disabled={this.state.rookieBusy} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "11px", letterSpacing: ".12em", padding: "11px 20px", cursor: this.state.rookieBusy ? "default" : "pointer", textTransform: "uppercase", opacity: this.state.rookieBusy ? .5 : 1 }}>Execute →</button>
          </div>
        </div>
        <div style={{ fontSize: "10px", color: "var(--dim)", marginTop: "10px", lineHeight: 1.5 }}>Write-safe: Rookie can add and update — including the sprint target, THE ONE THING, goals, and strategy — but cannot delete anything. 📎 attach a receipt, statement, PDF, or CSV and he'll extract + log the expenses. Conversation resets on refresh (persistence later).</div>
      </div>
    );
  }

  renderSchedulingTab() {
    const cfg = this.bookingCfg();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const lbl = { fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    const fmtWhen = (iso) => { try { return new Date(iso).toLocaleString('en-US', { timeZone: cfg.tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return iso; } };
    const upcoming = (this.state.bookings || []).slice().sort((a, b) => (a.start < b.start ? -1 : 1));

    return (
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 06 · BOOK THE CALLS</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>SCHED<span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>ULING</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Set your hours, share one link, clients book the discovery call themselves. The floor is 3 a week — keep it fed.</div>
          </div>
          <Hover as="button" onClick={() => this.copyBookLink()} baseStyle={{ flexShrink: 0, marginTop: "6px", background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>Copy Booking Link</Hover>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "20px" }}>
          {/* config */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "20px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "18px", marginBottom: "16px" }}>AVAILABILITY</div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
              <div style={{ flex: "2 1 140px" }}><label style={lbl}>Page title</label><input style={Object.assign({}, inp, { width: "100%" })} value={cfg.title} onChange={(e) => this.setBooking({ title: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 120px" }}><label style={lbl}>Timezone (IANA)</label><input style={Object.assign({}, inp, { width: "100%" })} value={cfg.tz} placeholder="America/Chicago" onChange={(e) => this.setBooking({ tz: e.target.value })} /></div>
              <div style={{ flex: "0 1 110px" }}><label style={lbl}>Slot length</label>
                <select style={Object.assign({}, inp, { width: "100%" })} value={cfg.slotMins} onChange={(e) => this.setBooking({ slotMins: +e.target.value })}>
                  {[15, 30, 45, 60].map(n => <option key={n} value={n}>{n} min</option>)}
                </select>
              </div>
              <div style={{ flex: "0 1 90px" }}><label style={lbl}>Days out</label><input style={Object.assign({}, inp, { width: "100%" })} type="number" min="1" max="60" value={cfg.horizonDays} onChange={(e) => this.setBooking({ horizonDays: +e.target.value || 14 })} /></div>
              <div style={{ flex: "0 1 90px" }}><label style={lbl}>Lead hrs</label><input style={Object.assign({}, inp, { width: "100%" })} type="number" min="0" value={cfg.leadHours} onChange={(e) => this.setBooking({ leadHours: +e.target.value || 0 })} /></div>
            </div>

            <label style={lbl}>Weekly hours</label>
            <div style={{ border: "1px solid var(--line2)" }}>
              {dayNames.map((dn, dow) => {
                const day = Object.assign({ on: false, start: '09:00', end: '17:00' }, cfg.days[dow]);
                return (
                  <div key={dow} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderBottom: dow < 6 ? "1px solid #1a1a1f" : "none" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", width: "120px", cursor: "pointer", fontSize: "12px", color: day.on ? "var(--cream)" : "var(--dim)" }}>
                      <input type="checkbox" checked={!!day.on} onChange={(e) => this.setBookingDay(dow, 'on', e.target.checked)} />{dn}
                    </label>
                    {day.on ? (
                      <React.Fragment>
                        <input style={Object.assign({}, inp, { padding: "6px 8px", fontSize: "12px" })} type="time" value={day.start} onChange={(e) => this.setBookingDay(dow, 'start', e.target.value)} />
                        <span style={{ color: "var(--dim)" }}>–</span>
                        <input style={Object.assign({}, inp, { padding: "6px 8px", fontSize: "12px" })} type="time" value={day.end} onChange={(e) => this.setBookingDay(dow, 'end', e.target.value)} />
                      </React.Fragment>
                    ) : <span style={{ color: "var(--dim)", fontSize: "11.5px" }}>Unavailable</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--dim)", marginTop: "10px", lineHeight: 1.5 }}>Times are in your timezone above. Share the booking link — clients pick an open slot and it appears under Upcoming.</div>
          </div>

          {/* upcoming */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "20px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "18px", marginBottom: "16px" }}>UPCOMING <span style={{ color: "var(--dim)", fontSize: "13px" }}>{upcoming.length}</span></div>
            {upcoming.length === 0 ? (
              <div style={{ color: "var(--dim)", fontSize: "12.5px", lineHeight: 1.7 }}>No calls booked yet.<br />Copy your booking link and put it in your outreach + on the site.</div>
            ) : upcoming.map((b) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <div style={{ color: "var(--cream)", fontSize: "13px", fontWeight: 600 }}>{b.name || 'Guest'}</div>
                  <div style={{ color: "var(--muted)", fontSize: "11px", marginTop: "2px" }}>{fmtWhen(b.start)}{b.email ? ' · ' + b.email : ''}</div>
                </div>
                <button onClick={() => this.cancelBookingRow(b.id)} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".1em", padding: "5px 9px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Document link editor — paste a URL, then the card opens it.
  renderDocModal() {
    const m = this.state.docModal;
    if (!m) return null;
    const lbl = { fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { width: "100%", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    return (
      <div onClick={() => this.closeDoc()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "440px", maxWidth: "100%", background: "#0e0e11", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "24px", letterSpacing: ".01em" }}>DOCUMENT LINK</div>
            <button onClick={() => this.closeDoc()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "18px", lineHeight: 1.4 }}>{m.name}</div>

          <label style={lbl}>Link (Google Drive, Dropbox, any URL)</label>
          <input
            style={inp}
            value={m.url}
            autoFocus
            placeholder="https://drive.google.com/…"
            onChange={(e) => this.setDocUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') this.saveDocLink(); }}
          />
          <div style={{ fontSize: "10.5px", color: "var(--dim)", marginTop: "8px", lineHeight: 1.5 }}>
            Tip: in Google Drive / Dropbox use “Share → Copy link”, then paste it here.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "20px" }}>
            {m.url ? (
              <button onClick={() => this.openDocLink()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Open ↗</button>
            ) : <span />}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeDoc()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
              <button onClick={() => this.saveDocLink()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>Save link</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const v = this.renderVals();
    const { addGoal, addHabit, animGlow, animPulse, animScan, animShimmer, animSpin, animSweep, animTicker, backOpacity, backStep, bootLines, bootProgress, bootReady, booting, clock, collectedFmt, curBlocks, curGoal, currentSection, date, deadDays, dismissBoot, docsView, energyScale, fToggles, ff5, fleet, floor, founderFree, gapText, goalsView, habitsView, isAgents, isCommand, isDiagnostic, isDocs, isFounder, isPipeline, isPlans, isPlaybook, isStandby, isStrategy, kCollected, kCover, kOpen, kOpenN, kSigned, ladder, log, loopNodes, newWeek, next, nextOpacity, nextStep, noteVal, objBtnLabel, objections, onNote, oneThingBody, oneThingTitle, opsChecklist, pStats, pct, pipeCols, planMoves, plansPhases, scanOn, scriptSteps, sections, sellDays, showObj, showScript, skipBoot, sleepScale, sops, stratAnti, stratBets, stratPillars, stratThesis, toast, todayLabel, toggleObj, warn, weekStrip } = v;
    return (
      <>

<div style={{ position: "relative", width: "100%", minHeight: "100vh", background: "var(--bg)", color: "var(--cream)", fontFamily: "var(--mono)", overflowX: "hidden", "--bg": "#080809", "--panel": "#0e0e11", "--panel2": "#131317", "--line": "#26262c", "--line2": "#34343c", "--cream": "#ece8e1", "--muted": "#8b867d", "--dim": "#56524b", "--red": "#e6322b", "--red2": "#b81f1a", "--reddim": "#2a1110", "--mono": "'JetBrains Mono',ui-monospace,monospace", "--cond": "'Barlow Condensed','Arial Narrow',sans-serif" }}>
{this.renderDealModal()}
{this.renderDocModal()}
{this.renderClientModal()}
{this.renderInvoiceModal()}
{this.renderProposalModal()}
{this.renderIntakeModal()}
{this.renderExpenseModal()}
{this.renderKpiModal()}
{this.renderEmailModal()}
{this.renderChrome()}

  {(scanOn) ? (<>
    <div style={{ position: "absolute", inset: "0", pointerEvents: "none", zIndex: "62", background: "repeating-linear-gradient(0deg,rgba(0,0,0,.2) 0 1px,transparent 1px 3px)", animation: animScan }}></div>
    <div style={{ position: "absolute", left: "0", right: "0", top: "0", height: "150px", pointerEvents: "none", zIndex: "60", background: "linear-gradient(180deg,transparent,rgba(230,50,43,.06),transparent)", animation: animSweep }}></div>
  </>) : null}

  
  <div style={{ display: "flex", minHeight: "100vh", position: "relative", zIndex: "1" }}>

    
    <aside style={{ width: "264px", flexShrink: "0", background: "linear-gradient(180deg,#0b0b0e,#070708)", borderRight: "1px solid var(--line)", position: "sticky", top: "0", height: "100vh", display: "flex", flexDirection: "column", zIndex: "3" }}>
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: "13px" }}>
        <div style={{ position: "relative", width: "42px", height: "42px", border: "2px solid var(--red)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0", background: "#0a0707", animation: animGlow }}>
          <div style={{ position: "absolute", left: "2px", top: "3px", bottom: "3px", width: "4px", background: "repeating-linear-gradient(180deg,var(--red) 0 3px,transparent 3px 7px)" }}></div>
          <div style={{ position: "absolute", right: "2px", top: "3px", bottom: "3px", width: "4px", background: "repeating-linear-gradient(180deg,var(--red) 0 3px,transparent 3px 7px)" }}></div>
          <div style={{ width: "0", height: "0", borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "13px solid var(--red)", marginLeft: "3px" }}></div>
        </div>
        <div>
          <div style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "23px", lineHeight: ".86", letterSpacing: ".01em" }}>CHURLISH<span style={{ color: "var(--red)" }}>/</span>OS</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "8.5px", letterSpacing: ".32em", color: "var(--dim)", marginTop: "3px" }}>OPERATING SYSTEM</div>
        </div>
      </div>

      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--line)", fontSize: "10px", letterSpacing: ".14em", color: "var(--muted)" }}>
        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3fb97a", boxShadow: "0 0 8px #3fb97a", animation: animPulse }}></span>SYSTEM ONLINE
        <span style={{ marginLeft: "auto", color: "var(--dim)" }}>v1.4.0</span>
      </div>

      <nav style={{ padding: "12px 10px", flex: "1", overflowY: "auto" }}>
        <div style={{ fontSize: "9px", letterSpacing: ".28em", color: "var(--dim)", padding: "4px 8px 8px" }}>// MODULES</div>
        {(sections).map((s, __k0) => (<React.Fragment key={__k0}>
          <Hover as="button" baseStyle={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", textAlign: "left", padding: "10px 12px 10px 14px", marginBottom: "2px", background: s.bg, border: "none", borderLeft: s.bar, color: s.fg, cursor: "pointer", fontFamily: "var(--cond)", fontWeight: "700", fontSize: "16.5px", letterSpacing: ".03em", textTransform: "uppercase", transition: ".14s" }} hoverStyle={{ background: "#141418", color: "var(--cream)" }} onClick={s.onSelect}>
            <span style={{ fontFamily: "var(--mono)", fontWeight: "500", fontSize: "10.5px", letterSpacing: ".04em", color: s.code }}>{s.num}</span>
            <span>{s.label}</span>
            <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--red)" }}>{s.dot}</span>
          </Hover>
        </React.Fragment>))}
      </nav>

      <div style={{ padding: "14px 16px", borderTop: "1px solid var(--line)", fontSize: "10px", letterSpacing: ".08em", lineHeight: "1.9", color: "var(--dim)" }}>
        <div style={{ color: "var(--muted)" }}>ONE-MAN HQ</div>
        <div>SPRINT <span style={{ color: "var(--red)" }}>//</span> $150,000</div>
        <div>SIGN-BY <span style={{ color: "var(--cream)" }}>08.31.26</span></div>
        <div style={{ marginTop: "6px", color: "var(--dim)" }}>402.819.8168</div>
        <div style={{ color: "var(--dim)" }}>CHURLISHMEDIA.COM</div>
      </div>
    </aside>

    
    <main style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", position: "relative" }}>

      
      <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "8px 22px", borderBottom: "1px solid var(--line)", background: "#0a0a0c", fontSize: "11px", letterSpacing: ".1em", color: "var(--muted)", position: "sticky", top: "0", zIndex: "22", whiteSpace: "nowrap" }}>
        <span style={{ color: "var(--red)" }}>●</span>
        <span style={{ color: "var(--cream)" }}>{clock}</span>
        <span style={{ color: "var(--dim)" }}>{date}</span>
        <span style={{ color: "var(--line2)" }}>|</span>
        <span>AGENTS <span style={{ color: "#3fb97a" }}>6/6</span></span>
        <span style={{ color: "var(--line2)" }}>|</span>
        <span>ENC <span style={{ color: "var(--cream)" }}>AES-256</span></span>
        <div style={{ flex: "1", overflow: "hidden", margin: "0 6px" }}>
          <div style={{ display: "inline-flex", whiteSpace: "nowrap", animation: animTicker }}>
            <span style={{ color: "var(--dim)", paddingRight: "48px" }}>SYS.OK ▸ FEED.LIVE ▸ KID FLASH: 142 LEADS SOURCED ▸ BLUE BEETLE: 18 SEQUENCES ACTIVE ▸ RED ROBIN: 31 CLIPS RENDERED ▸ WATCHTOWER: FLEET GREEN ▸ LEDGER SYNCED ▸ UPTIME 99.98% ▸</span>
            <span style={{ color: "var(--dim)", paddingRight: "48px" }}>SYS.OK ▸ FEED.LIVE ▸ KID FLASH: 142 LEADS SOURCED ▸ BLUE BEETLE: 18 SEQUENCES ACTIVE ▸ RED ROBIN: 31 CLIPS RENDERED ▸ WATCHTOWER: FLEET GREEN ▸ LEDGER SYNCED ▸ UPTIME 99.98% ▸</span>
          </div>
        </div>
        <span style={{ color: "#3fb97a" }}>SYS.OK</span>
      </div>

      
      <section style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", background: "linear-gradient(180deg,#0c0c0f,#090909)", display: "flex", gap: "22px", alignItems: "center", flexWrap: "wrap", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "0", left: "0", right: "0", height: "1px", background: "linear-gradient(90deg,var(--red),transparent 40%)" }}></div>
        <div style={{ flex: "1", minWidth: "330px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
            <span style={{ fontSize: "10px", letterSpacing: ".2em", color: "var(--dim)" }}>COLLECTED <span style={{ color: "var(--red)" }}>//</span> TARGET LOCK</span>
            <span style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "17px", letterSpacing: ".02em" }}><span style={{ color: "var(--red)" }}>{collectedFmt}</span> <span style={{ color: "var(--dim)", fontSize: "13px" }}>/ $150,000</span></span>
          </div>
          <div style={{ height: "13px", background: "#161619", border: "1px solid var(--line2)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: `${pct}%`, background: "linear-gradient(90deg,var(--red2),var(--red))", boxShadow: "0 0 16px rgba(230,50,43,.6)" }}>
              <div style={{ position: "absolute", inset: "0", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)", animation: animShimmer }}></div>
            </div>
            <div style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: "100%", background: "repeating-linear-gradient(90deg,transparent 0 33px,rgba(0,0,0,.4) 33px 34px)" }}></div>
          </div>
          <div style={{ fontSize: "10.5px", letterSpacing: ".08em", color: "var(--muted)", marginTop: "7px" }}>{gapText}</div>
        </div>

        <div style={{ position: "relative", minWidth: "138px", background: "#0b0b0e", border: "1px solid var(--line2)", padding: "11px 16px" }}>
          <span style={{ position: "absolute", top: "-1px", left: "-1px", width: "11px", height: "11px", borderTop: "2px solid var(--red)", borderLeft: "2px solid var(--red)" }}></span>
          <span style={{ position: "absolute", bottom: "-1px", right: "-1px", width: "11px", height: "11px", borderBottom: "2px solid var(--red)", borderRight: "2px solid var(--red)" }}></span>
          <div style={{ fontSize: "9.5px", letterSpacing: ".16em", color: "var(--dim)" }}>SELL-BY</div>
          <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "40px", lineHeight: ".92", color: "var(--cream)" }}>{sellDays}</div>
          <div style={{ fontSize: "9px", letterSpacing: ".12em", color: "var(--muted)" }}>DAYS // AUG 31</div>
        </div>
        <div style={{ position: "relative", minWidth: "138px", background: "#0b0b0e", border: "1px solid var(--line2)", padding: "11px 16px" }}>
          <span style={{ position: "absolute", top: "-1px", left: "-1px", width: "11px", height: "11px", borderTop: "2px solid var(--line2)", borderLeft: "2px solid var(--line2)" }}></span>
          <span style={{ position: "absolute", bottom: "-1px", right: "-1px", width: "11px", height: "11px", borderBottom: "2px solid var(--line2)", borderRight: "2px solid var(--line2)" }}></span>
          <div style={{ fontSize: "9.5px", letterSpacing: ".16em", color: "var(--dim)" }}>DEADLINE</div>
          <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "40px", lineHeight: ".92", color: "var(--cream)" }}>{deadDays}</div>
          <div style={{ fontSize: "9px", letterSpacing: ".12em", color: "var(--muted)" }}>DAYS // DEC 31</div>
        </div>
        <div style={{ position: "relative", minWidth: "138px", background: "#0b0b0e", border: "1px solid var(--line2)", padding: "11px 16px" }}>
          <span style={{ position: "absolute", top: "-1px", left: "-1px", width: "11px", height: "11px", borderTop: "2px solid var(--line2)", borderLeft: "2px solid var(--line2)" }}></span>
          <span style={{ position: "absolute", bottom: "-1px", right: "-1px", width: "11px", height: "11px", borderBottom: "2px solid var(--line2)", borderRight: "2px solid var(--line2)" }}></span>
          <div style={{ fontSize: "9.5px", letterSpacing: ".16em", color: "var(--dim)" }}>FOUNDER-FREE</div>
          <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "40px", lineHeight: ".92", color: "var(--cream)" }}>{founderFree}</div>
          <div style={{ fontSize: "9px", letterSpacing: ".12em", color: "var(--muted)" }}>AUTONOMY</div>
        </div>
      </section>

      
      {(isCommand) ? (<>
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "6px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// LAYER_01 · THE SCREEN YOU LIVE IN</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>COMMAND <span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>CENTER</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>The whole sprint on one screen. Sign by August 31, collect by December 31. Everything else is noise.</div>
          </div>
          <Hover as="button" baseStyle={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".12em", padding: "9px 15px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ borderColor: "var(--red)", color: "var(--cream)" }} onClick={newWeek}>↻ NEW WEEK</Hover>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "16px" }}>
          <div style={{ position: "relative", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--red)", padding: "16px 18px 18px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>COLLECTED</div>
            <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "44px", lineHeight: ".9", color: "var(--red)", marginTop: "7px" }}>{kCollected}</div>
            <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>OF $150,000 TARGET</div>
          </div>
          <div style={{ position: "relative", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--line2)", padding: "16px 18px 18px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>SIGNED · IN-YEAR</div>
            <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "44px", lineHeight: ".9", color: "var(--cream)", marginTop: "7px" }}>{kSigned}</div>
            <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>CONTRACTS WON</div>
          </div>
          <div style={{ position: "relative", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--line2)", padding: "16px 18px 18px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>OPEN PIPELINE</div>
            <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "44px", lineHeight: ".9", color: "var(--cream)", marginTop: "7px" }}>{kOpen}</div>
            <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>{kOpenN}</div>
          </div>
          <div style={{ position: "relative", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--red)", padding: "16px 18px 18px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>COVERAGE</div>
            <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "44px", lineHeight: ".9", color: "var(--cream)", marginTop: "7px" }}>{kCover}</div>
            <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>PIPELINE ÷ GAP · NEED ≥3×</div>
          </div>
        </div>

        
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "14px" }}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "18px 20px", position: "relative" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)" }}>THE FRIDAY FIVE <span style={{ color: "var(--dim)" }}>— LOG IT, CLOSE THE LAPTOP</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "9px", marginTop: "14px" }}>
              {(ff5).map((f, __k1) => (<React.Fragment key={__k1}>
                <div style={{ background: "var(--panel2)", border: `1px solid ${f.edge}`, padding: "11px 8px", textAlign: "center" }}>
                  <label style={{ display: "block", fontSize: "8.5px", letterSpacing: ".08em", color: "var(--dim)", textTransform: "uppercase", minHeight: "26px", lineHeight: "1.3" }}>{f.label}</label>
                  <input value={f.val} onChange={f.onChange} placeholder="0" style={{ width: "100%", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", textAlign: "center", fontFamily: "var(--cond)", fontWeight: "800", fontSize: "24px", padding: "5px 2px", marginTop: "6px" }} />
                  <div style={{ fontSize: "8.5px", letterSpacing: ".06em", color: f.floorColor, marginTop: "5px" }}>{f.floor}</div>
                </div>
              </React.Fragment>))}
            </div>
            {(warn) ? (<>
              <div style={{ marginTop: "14px", background: "var(--reddim)", border: "1px solid #5a2230", borderLeft: "3px solid var(--red)", padding: "11px 14px" }}>
                <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)", marginBottom: "4px" }}>⚠ TRIPWIRE</div>
                <div style={{ fontSize: "12px", color: "var(--cream)", lineHeight: "1.5" }}>{warn}</div>
              </div>
            </>) : null}
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "18px 20px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>THIS WEEK'S FLOOR</div>
            <div style={{ marginTop: "10px" }}>
              {(floor).map((g, __k2) => (<React.Fragment key={__k2}>
                <div onClick={g.onClick} style={{ display: "flex", alignItems: "center", gap: "11px", padding: "9px 0", borderBottom: "1px solid #1a1a1d", fontSize: "12.5px", cursor: g.cursor }}>
                  <span style={{ width: "18px", height: "18px", border: `1.5px solid ${g.box}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: g.check_c, flexShrink: "0" }}>{g.check}</span>
                  <span style={{ color: g.tc }}>{g.text}</span>
                </div>
              </React.Fragment>))}
            </div>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)", marginTop: "16px" }}>WHERE THE MONEY IS HIDING</div>
            <div style={{ marginTop: "8px" }}>
              {(next).map((n, __k3) => (<React.Fragment key={__k3}>
                <Hover as="div" baseStyle={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid #1a1a1d", fontSize: "12px", cursor: "pointer" }} hoverStyle={{ color: "var(--cream)" }} onClick={n.onClick}>
                  <span style={{ color: "var(--red)" }}>›</span>
                  <span style={{ color: "var(--cream)", fontWeight: "500" }}>{n.label}</span>
                  <span style={{ color: "var(--dim)" }}>{n.sub}</span>
                  <span style={{ marginLeft: "auto", fontFamily: "var(--cond)", fontWeight: "800", fontSize: "15px", color: "var(--cream)" }}>{n.val}</span>
                </Hover>
              </React.Fragment>))}
            </div>
          </div>
        </div>

        
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "14px", marginTop: "16px" }}>
          <div style={{ position: "relative", background: "var(--reddim)", border: "1px solid #5a2230", borderLeft: "4px solid var(--red)", padding: "20px 22px", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: "-30px", top: "-30px", fontFamily: "var(--cond)", fontWeight: "900", fontSize: "140px", color: "rgba(230,50,43,.07)", lineHeight: "1" }}>01</div>
            <div style={{ fontSize: "10px", letterSpacing: ".2em", color: "var(--red)" }}>THE ONE THING · UNTIL IT'S DONE</div>
            <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "27px", lineHeight: "1.02", marginTop: "10px", maxWidth: "90%", textTransform: "uppercase" }}>{oneThingTitle}</div>
            <div style={{ fontSize: "12.5px", color: "var(--cream)", lineHeight: "1.6", marginTop: "10px", maxWidth: "94%" }}>{oneThingBody}</div>
          </div>
          <div style={{ background: "#0a0a0c", border: "1px solid var(--line)", padding: "14px 16px", fontSize: "11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--dim)", letterSpacing: ".16em", fontSize: "10px", borderBottom: "1px solid var(--line)", paddingBottom: "9px", marginBottom: "8px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3fb97a", animation: animPulse }}></span>SYS.LOG — LIVE FEED
            </div>
            {(log).map((l, __k4) => (<React.Fragment key={__k4}>
              <div style={{ display: "flex", gap: "9px", padding: "3px 0", lineHeight: "1.5" }}>
                <span style={{ color: "var(--dim)", flexShrink: "0" }}>{l.t}</span>
                <span style={{ color: l.color, flexShrink: "0" }}>{l.tag}</span>
                <span style={{ color: "var(--muted)" }}>{l.msg}</span>
              </div>
            </React.Fragment>))}
          </div>
        </div>
      </div>
      </>) : null}

      
      {(isPipeline) ? (<>
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 02 · THE BOARD</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>SALES <span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>PIPELINE</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Every live deal by stage. Signed and Collected feed the war board upstairs. Nothing moves itself — you move it.</div>
          </div>
          <Hover as="button" onClick={() => this.openDeal(null)} baseStyle={{ flexShrink: 0, marginTop: "6px", background: "var(--red)", border: "1px solid var(--red)", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>+ Add Deal</Hover>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" }}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--line2)", padding: "15px 18px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>WEIGHTED PIPELINE</div>
            <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "38px", lineHeight: ".9", color: "var(--cream)", marginTop: "6px" }}>{pStats.weighted}</div>
            <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>STAGE-PROBABILITY ADJUSTED</div>
          </div>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--line2)", padding: "15px 18px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>LIVE DEALS</div>
            <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "38px", lineHeight: ".9", color: "var(--cream)", marginTop: "6px" }}>{pStats.count}</div>
            <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>NOT WON / LOST</div>
          </div>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--red)", padding: "15px 18px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>SIGNED</div>
            <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "38px", lineHeight: ".9", color: "var(--red)", marginTop: "6px" }}>{pStats.signed}</div>
            <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>{pStats.signedN}</div>
          </div>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--line2)", padding: "15px 18px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>WIN RATE</div>
            <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "38px", lineHeight: ".9", color: "var(--cream)", marginTop: "6px" }}>{pStats.win}</div>
            <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>SIGNED ÷ CLOSED</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(178px,1fr))", gap: "12px", overflowX: "auto", paddingBottom: "10px" }}>
          {(pipeCols).map((c, __k5) => (<React.Fragment key={__k5}>
            <div style={{ background: "#0a0a0c", border: "1px solid var(--line)", padding: "11px", minHeight: "150px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "11px", borderBottom: "1px solid var(--line)", paddingBottom: "9px" }}>
                <span style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "12px", letterSpacing: ".05em", textTransform: "uppercase", color: c.accent }}>{c.stage}</span>
                <span style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "13px", color: "var(--dim)" }}>{c.sum}</span>
              </div>
              {(c.deals).map((d, __k6) => (<React.Fragment key={__k6}>
                <Hover as="div" onClick={d.onClick} baseStyle={{ background: "var(--panel)", border: "1px solid var(--line2)", padding: "9px 10px", marginBottom: "8px", cursor: "pointer", transition: ".12s" }} hoverStyle={{ borderColor: "var(--red)" }}>
                  <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--cream)", lineHeight: "1.2" }}>{d.name}</div>
                  <div style={{ fontSize: "10.5px", color: "var(--muted)", marginTop: "3px" }}>{d.offer}</div>
                  <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "15px", color: "var(--red)", marginTop: "5px" }}>{d.val}</div>
                </Hover>
              </React.Fragment>))}
            </div>
          </React.Fragment>))}
        </div>
      </div>
      </>) : null}

      
      {(isAgents) ? (<>
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 05 · THE FOUNDER-FREE ENGINE</div>
          <h1 style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>AGENT <span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>FLEET</span></h1>
          <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "580px", lineHeight: "1.6" }}>Six units run the top of the funnel and the content machine, so your hands stay on sales and the lens. Your only manual jobs: take the calls and approve the proof.</div>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)", marginBottom: "10px" }}>THE DAILY LOOP</div>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap", background: "#0a0a0c", border: "1px solid var(--line)", padding: "15px 18px", marginBottom: "18px" }}>
          {(loopNodes).map((n, __k7) => (<React.Fragment key={__k7}>
            <span style={{ fontFamily: "var(--cond)", fontWeight: "700", fontSize: "12.5px", letterSpacing: ".05em", textTransform: "uppercase", padding: "8px 13px", background: "#141418", border: "1px solid var(--line2)", color: "var(--cream)" }}>{n.label}</span>
            <span style={{ color: "var(--red)", fontWeight: "900", fontSize: "15px" }}>{n.arrow}</span>
          </React.Fragment>))}
        </div>

        <div style={{ marginBottom: "20px" }}>
          {(fleet).map((a, __k8) => (<React.Fragment key={__k8}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", background: "var(--panel)", border: "1px solid var(--line)", borderLeft: `2px solid ${a.accent}`, padding: "13px 16px", marginBottom: "9px" }}>
              <div style={{ width: "44px", height: "44px", background: "#0a0a0c", border: "1px solid var(--line2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--cond)", fontWeight: "900", fontSize: "17px", color: a.accent, flexShrink: "0" }}>{a.init}</div>
              <div style={{ flex: "1", minWidth: "0" }}>
                <div style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "17px", letterSpacing: ".02em", color: "var(--cream)" }}>{a.name}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.45" }}>{a.role}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--dim)", marginTop: "3px" }}>{a.cad}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: "0" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: a.dot }}></span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: ".08em", color: "var(--muted)", minWidth: "62px" }}>{a.status}</span>
                <Hover as="button" baseStyle={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".1em", padding: "7px 11px", cursor: "pointer", transition: ".15s" }} hoverStyle={{ borderColor: "var(--red)", color: "var(--cream)" }} onClick={a.onToggle}>{a.btn}</Hover>
              </div>
            </div>
          </React.Fragment>))}
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "18px 20px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>TODAY'S OPERATING CHECKLIST</div>
          <div style={{ marginTop: "10px" }}>
            {(opsChecklist).map((o, __k9) => (<React.Fragment key={__k9}>
              <div onClick={o.onClick} style={{ display: "flex", alignItems: "center", gap: "11px", padding: "9px 0", borderBottom: "1px solid #1a1a1d", fontSize: "12.5px", cursor: "pointer" }}>
                <span style={{ width: "18px", height: "18px", border: `1.5px solid ${o.box}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: o.cc, flexShrink: "0" }}>{o.check}</span>
                <span style={{ color: o.tc }}>{o.text}</span>
              </div>
            </React.Fragment>))}
          </div>
        </div>
      </div>
      </>) : null}

      
      {(isPlaybook) ? (<>
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 04 · OFFERS &amp; DELIVERY</div>
          <h1 style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>THE <span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>PLAYBOOK</span></h1>
          <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>The offers and how each one gets delivered — the SOPs you and the agents execute. Pricing is fixed. Never discount month one.</div>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)", marginBottom: "11px" }}>THE LADDER · TOP OF MIND</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "24px" }}>
          {(ladder).map((l, __k10) => (<React.Fragment key={__k10}>
            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: `2px solid ${l.accent}`, padding: "16px 18px" }}>
              <div style={{ fontFamily: "var(--cond)", fontWeight: "700", fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", color: l.accent }}>{l.p}</div>
              <div style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "22px", color: "var(--cream)", marginTop: "7px", lineHeight: "1" }}>{l.n}</div>
              <div style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.5", marginTop: "7px" }}>{l.d}</div>
            </div>
          </React.Fragment>))}
        </div>

        <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)", marginBottom: "11px" }}>DELIVERY SOPS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          {(sops).map((s, __k11) => (<React.Fragment key={__k11}>
            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "18px 20px" }}>
              <div style={{ display: "inline-block", fontFamily: "var(--cond)", fontWeight: "900", fontSize: "10px", letterSpacing: ".12em", color: "#0a0707", background: s.accent, padding: "3px 10px" }}>SOP</div>
              <div style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "20px", color: "var(--cream)", marginTop: "11px" }}>{s.t}</div>
              <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "12.5px", letterSpacing: ".04em", color: "var(--red)", marginTop: "4px" }}>{s.p}</div>
              <ol style={{ margin: "11px 0 0 16px", padding: "0", fontSize: "12.5px", color: "var(--cream)", lineHeight: "1.5" }}>
                {(s.steps).map((st, __k12) => (<React.Fragment key={__k12}>
                  <li style={{ padding: "3px 0" }}>{st}</li>
                </React.Fragment>))}
              </ol>
              <div style={{ fontSize: "11.5px", color: "var(--muted)", lineHeight: "1.5", marginTop: "11px", paddingTop: "11px", borderTop: "1px solid var(--line)" }}>{s.out}</div>
            </div>
          </React.Fragment>))}
        </div>

        <div style={{ background: "var(--reddim)", border: "1px solid #5a2230", borderLeft: "3px solid var(--red)", padding: "14px 18px", marginTop: "18px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)", marginBottom: "5px" }}>PRICE INTEGRITY</div>
          <div style={{ fontSize: "12.5px", color: "var(--cream)", lineHeight: "1.6" }}>Ad spend is always separate, $500/mo minimum. The first three tournaments at $1,500 are a case-study exchange with a deliverable attached — say it that way in writing. Never the word "discount."</div>
        </div>
      </div>
      </>) : null}

      {(this.state.view === 'clients') ? this.renderClientsTab() : null}

      {(this.state.view === 'invoices') ? this.renderInvoicesTab() : null}

      {(this.state.view === 'proposals') ? this.renderProposalsTab() : null}

      {(this.state.view === 'scheduling') ? this.renderSchedulingTab() : null}

      {(this.state.view === 'kpis') ? this.renderKpisTab() : null}

      {(this.state.view === 'expenses') ? this.renderExpensesTab() : null}

      {(this.state.view === 'rookie') ? this.renderRookieTab() : null}

      {(isDiagnostic) ? (<>
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "6px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 03 · THE FIRST YES</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>THE DIAGNOSTIC <span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>CALL</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>The $750 first-yes call. NEPQ spine, Voss on the objections, Churlish in the mouth. Run it live — don't wing it.</div>
          </div>
          <Hover as="button" baseStyle={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".12em", padding: "9px 15px", cursor: "pointer", textTransform: "uppercase", transition: ".15s", whiteSpace: "nowrap" }} hoverStyle={{ borderColor: "var(--red)", color: "var(--cream)" }} onClick={toggleObj}>{objBtnLabel}</Hover>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        {(showScript) ? (<>
        <div style={{ display: "grid", gridTemplateColumns: "236px 1fr", gap: "18px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {(scriptSteps).map((s, __k13) => (<React.Fragment key={__k13}>
              <button onClick={s.onClick} style={{ display: "flex", alignItems: "center", gap: "11px", textAlign: "left", padding: "11px 13px", background: s.bg, border: `1px solid ${s.bd}`, color: s.fg, cursor: "pointer", transition: ".14s" }}>
                <span style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "14px", color: s.nc, width: "18px", flexShrink: "0" }}>{s.n}</span>
                <span style={{ fontFamily: "var(--cond)", fontWeight: "700", fontSize: "13.5px", letterSpacing: ".03em", textTransform: "uppercase", lineHeight: "1.05" }}>{s.l}</span>
              </button>
            </React.Fragment>))}
          </div>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "22px 24px", minHeight: "360px" }}>
            <div style={{ fontSize: "12.5px", color: "var(--red)", fontWeight: "500", lineHeight: "1.5", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>▸ {curGoal}</div>
            {(curBlocks).map((b, __k14) => (<React.Fragment key={__k14}>
              {(b.isSay) ? (<>
                <div style={{ background: "#100b0c", borderLeft: "3px solid var(--red)", padding: "13px 16px", margin: "12px 0", fontSize: "14.5px", lineHeight: "1.55", color: "var(--cream)" }}>{b.text}</div>
              </>) : null}
              {(b.isAlt) ? (<>
                <div style={{ background: "#0e0e10", borderLeft: "3px solid var(--line2)", padding: "13px 16px", margin: "12px 0", fontSize: "14.5px", lineHeight: "1.55", color: "var(--muted)" }}>{b.text}</div>
              </>) : null}
              {(b.isNote) ? (<>
                <div style={{ fontSize: "12.5px", color: "var(--muted)", fontStyle: "italic", margin: "10px 0", lineHeight: "1.5" }}>{b.text}</div>
              </>) : null}
              {(b.isQ) ? (<>
                <div style={{ margin: "10px 0 4px" }}>
                  {(b.items).map((q, __k15) => (<React.Fragment key={__k15}>
                    <div style={{ padding: "9px 0 9px 22px", position: "relative", fontSize: "14px", lineHeight: "1.5", borderBottom: "1px solid #1a1a1d", color: "var(--cream)" }}><span style={{ position: "absolute", left: "2px", color: "var(--red)", fontWeight: "900" }}>›</span>{q}</div>
                  </React.Fragment>))}
                </div>
              </>) : null}
            </React.Fragment>))}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "22px" }}>
              <Hover as="button" baseStyle={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".1em", padding: "8px 14px", cursor: "pointer", opacity: backOpacity }} hoverStyle={{ borderColor: "var(--red)", color: "var(--cream)" }} onClick={backStep}>← BACK</Hover>
              <button onClick={nextStep} style={{ background: "var(--red)", border: "none", color: "#0a0707", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".1em", padding: "8px 16px", cursor: "pointer", opacity: nextOpacity }}>NEXT STEP →</button>
            </div>
          </div>
        </div>
        </>) : null}

        {(showObj) ? (<>
        <div>
          <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)", marginBottom: "14px" }}>THE SEVEN YOU'LL ACTUALLY HEAR — AND THE TURN</div>
          {(objections).map((o, __k16) => (<React.Fragment key={__k16}>
            <details style={{ border: "1px solid var(--line)", background: "#0a0a0c", marginBottom: "9px" }}>
              <summary style={{ padding: "14px 16px", cursor: "pointer", fontFamily: "var(--cond)", fontWeight: "700", fontSize: "15.5px", letterSpacing: ".02em", color: "var(--cream)", listStyle: "none" }}>{o.q}</summary>
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ fontFamily: "var(--cond)", fontWeight: "700", fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--dim)", margin: "4px 0 8px" }}>{o.lab}</div>
                <div style={{ background: "#100b0c", borderLeft: "3px solid var(--red)", padding: "13px 16px", fontSize: "14px", lineHeight: "1.55", color: "var(--cream)" }}>{o.a}</div>
              </div>
            </details>
          </React.Fragment>))}
        </div>
        </>) : null}
      </div>
      </>) : null}

      
      {(isFounder) ? (<>
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "6px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 06 · THE SINGLE POINT OF FAILURE</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>FOUNDER <span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>OS</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "580px", lineHeight: "1.6" }}>You are the single point of failure. Energy in, calls out, goals tracked. Burnout in week 5 kills the number — so this layer is non-optional.</div>
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".12em", color: "var(--muted)" }}>{todayLabel}</div>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "18px 20px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)" }}>TODAY'S CHECK-IN</div>
            <div style={{ marginTop: "14px" }}>
              <div style={{ fontSize: "10px", letterSpacing: ".1em", color: "var(--dim)", textTransform: "uppercase" }}>Energy</div>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                {(energyScale).map((e, __k17) => (<React.Fragment key={__k17}>
                  <button onClick={e.onClick} style={{ flex: "1", background: e.bg, border: `1px solid ${e.bd}`, color: e.fg, fontFamily: "var(--cond)", fontWeight: "900", fontSize: "16px", padding: "9px 0", cursor: "pointer", transition: ".12s" }}>{e.n}</button>
                </React.Fragment>))}
              </div>
            </div>
            <div style={{ marginTop: "14px" }}>
              <div style={{ fontSize: "10px", letterSpacing: ".1em", color: "var(--dim)", textTransform: "uppercase" }}>Sleep (hrs)</div>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                {(sleepScale).map((e, __k18) => (<React.Fragment key={__k18}>
                  <button onClick={e.onClick} style={{ flex: "1", background: e.bg, border: `1px solid ${e.bd}`, color: e.fg, fontFamily: "var(--cond)", fontWeight: "900", fontSize: "16px", padding: "9px 0", cursor: "pointer", transition: ".12s" }}>{e.n}</button>
                </React.Fragment>))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px", marginTop: "14px" }}>
              {(fToggles).map((t, __k19) => (<React.Fragment key={__k19}>
                <div onClick={t.onClick} style={{ display: "flex", alignItems: "center", gap: "9px", background: "#0a0a0c", border: `1px solid ${t.bd}`, padding: "11px 12px", cursor: "pointer", transition: ".12s" }}>
                  <span style={{ width: "20px", height: "20px", border: `2px solid ${t.box}`, background: t.boxBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "900", color: t.cc, flexShrink: "0" }}>{t.check}</span>
                  <span style={{ fontSize: "13px", color: "var(--cream)" }}>{t.label}</span>
                </div>
              </React.Fragment>))}
            </div>
            <div style={{ marginTop: "14px" }}>
              <label style={{ display: "block", fontSize: "10px", letterSpacing: ".1em", color: "var(--dim)", textTransform: "uppercase", marginBottom: "6px" }}>One line — how's the head today?</label>
              <textarea value={noteVal} onChange={onNote} placeholder="Honest. Nobody reads this but you." style={{ width: "100%", minHeight: "62px", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: "12px", lineHeight: "1.5", resize: "vertical" }}></textarea>
            </div>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "18px 20px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>LAST 7 DAYS</div>
            <div style={{ display: "flex", gap: "7px", marginTop: "8px" }}>
              {(weekStrip).map((d, __k20) => (<React.Fragment key={__k20}>
                <div style={{ flex: "1", textAlign: "center", background: "#0a0a0c", border: "1px solid var(--line)", padding: "9px 4px" }}>
                  <div style={{ fontFamily: "var(--cond)", fontWeight: "700", fontSize: "10px", color: "var(--dim)" }}>{d.dw}</div>
                  <div style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "18px", margin: "3px 0", color: d.nc }}>{d.n}</div>
                  <div style={{ fontSize: "8px", letterSpacing: "1px" }}><span style={{ color: d.d1 }}>●</span><span style={{ color: d.d2 }}>●</span></div>
                </div>
              </React.Fragment>))}
            </div>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)", marginTop: "20px" }}>NON-NEGOTIABLE HABITS</div>
            <div style={{ marginTop: "8px" }}>
              {(habitsView).map((h, __k21) => (<React.Fragment key={__k21}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #1a1a1d" }}>
                  <span style={{ fontSize: "14px", color: "var(--cream)" }}>{h.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "15px", color: "var(--red)" }}>{h.streak}<span style={{ color: "var(--dim)", fontSize: "9.5px", fontWeight: "700", letterSpacing: ".08em" }}> {h.streakL}</span></span>
                    <div onClick={h.onToggle} style={{ width: "30px", height: "30px", border: `2px solid ${h.box}`, background: h.boxBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "14px", color: h.cc, cursor: "pointer", transition: ".12s" }}>{h.check}</div>
                  </div>
                </div>
              </React.Fragment>))}
            </div>
            <Hover as="button" baseStyle={{ width: "100%", background: "transparent", border: "1px dashed var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".1em", textTransform: "uppercase", padding: "11px", marginTop: "10px", cursor: "pointer", transition: ".15s" }} hoverStyle={{ borderColor: "var(--red)", color: "var(--cream)" }} onClick={addHabit}>+ ADD HABIT</Hover>
          </div>
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "18px 20px", marginTop: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)" }}>GOALS — BUSINESS &amp; THE REST OF YOUR LIFE</div>
            <Hover as="button" baseStyle={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: ".1em", padding: "6px 11px", cursor: "pointer", transition: ".15s" }} hoverStyle={{ borderColor: "var(--red)", color: "var(--cream)" }} onClick={addGoal}>+ ADD GOAL</Hover>
          </div>
          <div style={{ marginTop: "10px" }}>
            {(goalsView).map((g, __k22) => (<React.Fragment key={__k22}>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid #1a1a1d" }}>
                <div onClick={g.onToggle} style={{ marginTop: "1px", width: "22px", height: "22px", border: `2px solid ${g.box}`, background: g.boxBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "12px", color: g.cc, cursor: "pointer", flexShrink: "0", transition: ".12s" }}>{g.check}</div>
                <div style={{ flex: "1", minWidth: "0" }}>
                  <span style={{ fontSize: "14px", color: g.tc, textDecoration: g.deco }}>{g.text}</span>
                  <span style={{ fontFamily: "var(--cond)", fontWeight: "700", fontSize: "9px", letterSpacing: ".1em", padding: "2px 7px", marginLeft: "9px", border: `1px solid ${g.typeC}`, color: g.typeC, whiteSpace: "nowrap" }}>{g.type}</span>
                  {(g.hasBar) ? (<>
                    <div style={{ height: "6px", background: "#1a1a1d", marginTop: "9px", overflow: "hidden" }}><div style={{ height: "100%", width: `${g.pct}%`, background: "var(--red)" }}></div></div>
                    <div style={{ fontSize: "11px", color: "var(--dim)", marginTop: "4px" }}>{g.progLabel}</div>
                  </>) : null}
                </div>
              </div>
            </React.Fragment>))}
          </div>
        </div>
      </div>
      </>) : null}

      
      {(isDocs) ? (<>
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 07 · THE LIBRARY</div>
          <h1 style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>DOCUMENT <span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>VAULT</span></h1>
          <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Every artifact the OS runs on — the spec, the scripts, the brand, the lists. One source of truth, version-locked.</div>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        {(docsView).map((g, __k23) => (<React.Fragment key={__k23}>
          <div style={{ marginBottom: "22px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)", marginBottom: "10px" }}>{g.cat}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {(g.items).map((it, __k24) => (<React.Fragment key={__k24}>
                <Hover as="div" baseStyle={{ display: "flex", alignItems: "center", gap: "13px", background: "var(--panel)", border: "1px solid var(--line)", padding: "12px 14px", cursor: "pointer", transition: ".12s" }} hoverStyle={{ borderColor: "var(--red)" }} onClick={it.onClick}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "9px", fontWeight: "700", letterSpacing: ".04em", color: "var(--red)", border: "1px solid var(--line2)", padding: "5px 0", minWidth: "44px", textAlign: "center", flexShrink: "0" }}>{it.fmt}</div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ fontSize: "13.5px", color: "var(--cream)", fontWeight: "500", lineHeight: "1.2" }}>{it.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{it.meta}</div>
                  </div>
                  {(it.hasTag) ? (<>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "8.5px", letterSpacing: ".1em", color: "#0a0707", background: "var(--red)", padding: "3px 6px", flexShrink: "0" }}>{it.tag}</span>
                  </>) : null}
                </Hover>
              </React.Fragment>))}
            </div>
          </div>
        </React.Fragment>))}
      </div>
      </>) : null}

      
      {(isStrategy) ? (<>
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 08 · THE THESIS</div>
          <h1 style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>THE <span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>STRATEGY</span></h1>
          <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Why the engine is built the way it's built. Read it when a shiny distraction shows up and threatens the one thing.</div>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--red)", padding: "18px 20px", marginBottom: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "17px", letterSpacing: ".02em" }}>MY WORKING STRATEGY</div>
            <div style={{ fontSize: "9.5px", letterSpacing: ".14em", color: "var(--dim)", textTransform: "uppercase" }}>Saves automatically</div>
          </div>
          <textarea value={this.strategyText()} onChange={(e) => this.setStrategyText(e.target.value)} placeholder="Type your current strategy, bets, and what you're deliberately NOT doing this quarter…"
            style={{ width: "100%", minHeight: "120px", background: "#0a0a0c", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", lineHeight: "1.6", padding: "12px 14px", resize: "vertical" }} />
        </div>

        <div style={{ position: "relative", background: "var(--reddim)", border: "1px solid #5a2230", borderLeft: "4px solid var(--red)", padding: "24px 28px", marginBottom: "22px", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: "-10px", top: "-44px", fontFamily: "var(--cond)", fontWeight: "900", fontSize: "150px", color: "rgba(230,50,43,.07)", lineHeight: "1" }}>★</div>
          <div style={{ fontSize: "10px", letterSpacing: ".2em", color: "var(--red)" }}>THE THESIS</div>
          <div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "30px", lineHeight: "1.08", marginTop: "10px", maxWidth: "880px", color: "var(--cream)" }}>{stratThesis}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "22px" }}>
          {(stratPillars).map((p, __k25) => (<React.Fragment key={__k25}>
            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--red)", padding: "18px 20px" }}>
              <div style={{ fontFamily: "var(--cond)", fontWeight: "700", fontSize: "11px", letterSpacing: ".16em", color: "var(--red)" }}>{p.k}</div>
              <div style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "19px", color: "var(--cream)", marginTop: "6px", lineHeight: "1.05" }}>{p.t}</div>
              <div style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.55", marginTop: "8px" }}>{p.d}</div>
            </div>
          </React.Fragment>))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "18px 20px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)" }}>THE THREE BETS</div>
            <div style={{ marginTop: "10px" }}>
              {(stratBets).map((b, __k26) => (<React.Fragment key={__k26}>
                <div style={{ display: "flex", gap: "11px", padding: "10px 0", borderBottom: "1px solid #1a1a1d", fontSize: "13px", lineHeight: "1.5", color: "var(--cream)" }}><span style={{ color: "var(--red)", fontWeight: "900", flexShrink: "0" }}>›</span><span>{b}</span></div>
              </React.Fragment>))}
            </div>
          </div>
          <div style={{ background: "#0a0a0c", border: "1px solid var(--line)", padding: "18px 20px" }}>
            <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>WHAT WE DON'T DO</div>
            <div style={{ marginTop: "10px" }}>
              {(stratAnti).map((a, __k27) => (<React.Fragment key={__k27}>
                <div style={{ display: "flex", gap: "11px", padding: "10px 0", borderBottom: "1px solid #1a1a1d", fontSize: "13px", lineHeight: "1.5", color: "var(--muted)" }}><span style={{ color: "var(--dim)", fontWeight: "900", flexShrink: "0" }}>✕</span><span>{a}</span></div>
              </React.Fragment>))}
            </div>
          </div>
        </div>
      </div>
      </>) : null}

      
      {(isPlans) ? (<>
      <div style={{ padding: "24px 26px 60px", maxWidth: "1240px" }}>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 09 · THE ROADMAP</div>
          <h1 style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>THE <span style={{ display: "inline-block", background: "var(--red)", color: "#0a0707", padding: "0 12px", transform: "skewX(-7deg)" }}>PLAN</span></h1>
          <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Four phases, two deadlines, one number. Sign by August 31, collect by December 31.</div>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "22px" }}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--red)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "18px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "46px", color: "var(--red)", lineHeight: ".86" }}>{sellDays}</div>
            <div><div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>DAYS TO SIGN</div><div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "17px", color: "var(--cream)", marginTop: "3px" }}>$150K CONTRACTED · AUG 31</div></div>
          </div>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid var(--line2)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "18px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "46px", color: "var(--cream)", lineHeight: ".86" }}>{deadDays}</div>
            <div><div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>DAYS TO COLLECT</div><div style={{ fontFamily: "var(--cond)", fontWeight: "800", fontSize: "17px", color: "var(--cream)", marginTop: "3px" }}>$150K BANKED · DEC 31</div></div>
          </div>
        </div>

        <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)", marginBottom: "11px" }}>THE FOUR PHASES</div>
        <div style={{ marginBottom: "22px" }}>
          {(plansPhases).map((p, __k28) => (<React.Fragment key={__k28}>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", background: "var(--panel)", border: "1px solid var(--line)", borderLeft: `3px solid ${p.c}`, padding: "16px 18px", marginBottom: "10px" }}>
              <div style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "26px", color: p.c, flexShrink: "0", width: "40px", lineHeight: "1" }}>{p.n}</div>
              <div style={{ flex: "1", minWidth: "0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "19px", color: "var(--cream)" }}>{p.t}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: ".1em", color: p.c, border: `1px solid ${p.c}`, padding: "2px 7px" }}>{p.when}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: ".12em", color: "var(--dim)", marginLeft: "auto" }}>{p.state}</span>
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.55", marginTop: "6px" }}>{p.d}</div>
              </div>
            </div>
          </React.Fragment>))}
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", padding: "18px 20px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--red)" }}>THIS WEEK'S MOVES · PHASE 1</div>
          <div style={{ marginTop: "10px" }}>
            {(planMoves).map((m, __k29) => (<React.Fragment key={__k29}>
              <div onClick={m.onClick} style={{ display: "flex", alignItems: "center", gap: "11px", padding: "9px 0", borderBottom: "1px solid #1a1a1d", fontSize: "12.5px", cursor: "pointer" }}>
                <span style={{ width: "18px", height: "18px", border: `1.5px solid ${m.box}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: m.cc, flexShrink: "0" }}>{m.check}</span>
                <span style={{ color: m.tc }}>{m.text}</span>
              </div>
            </React.Fragment>))}
          </div>
        </div>
      </div>
      </>) : null}

      
      {(isStandby) ? (<>
      <div style={{ padding: "24px 26px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ position: "relative", background: "var(--panel)", border: "1px solid var(--line)", padding: "46px 54px", textAlign: "center", maxWidth: "560px", overflow: "hidden" }}>
          <span style={{ position: "absolute", top: "-1px", left: "-1px", width: "16px", height: "16px", borderTop: "2px solid var(--red)", borderLeft: "2px solid var(--red)" }}></span>
          <span style={{ position: "absolute", top: "-1px", right: "-1px", width: "16px", height: "16px", borderTop: "2px solid var(--red)", borderRight: "2px solid var(--red)" }}></span>
          <span style={{ position: "absolute", bottom: "-1px", left: "-1px", width: "16px", height: "16px", borderBottom: "2px solid var(--red)", borderLeft: "2px solid var(--red)" }}></span>
          <span style={{ position: "absolute", bottom: "-1px", right: "-1px", width: "16px", height: "16px", borderBottom: "2px solid var(--red)", borderRight: "2px solid var(--red)" }}></span>
          <div style={{ width: "54px", height: "54px", border: "2px solid var(--line2)", borderTopColor: "var(--red)", borderRadius: "50%", margin: "0 auto 22px", animation: animSpin }}></div>
          <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>MODULE // STANDBY</div>
          <div style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "42px", lineHeight: ".92", marginTop: "8px" }}>{currentSection}</div>
          <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.6", marginTop: "12px" }}>This module is wired and ready. The <span style={{ color: "var(--cream)" }}>TERMINAL</span> skin rolls across it next — confirm the look on Command and I'll build it out.</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "var(--dim)", letterSpacing: ".1em", marginTop: "18px" }}>STATUS: QUEUED · LAYER MOUNTED · AWAITING BUILD ORDER</div>
        </div>
      </div>
      </>) : null}

    </main>
  </div>

  
  {(toast) ? (<>
    <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "#0e0e11", border: "1px solid var(--red)", borderLeft: "3px solid var(--red)", color: "var(--cream)", padding: "11px 22px", fontSize: "11px", letterSpacing: ".12em", zIndex: "90", boxShadow: "0 8px 30px rgba(0,0,0,.6)" }}>{toast}</div>
  </>) : null}

  
  {(booting) ? (<>
    <div onClick={dismissBoot} style={{ position: "fixed", inset: "0", zIndex: "120", background: "#060607", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: "var(--mono)", padding: "24px" }}>
      <div style={{ position: "absolute", inset: "0", pointerEvents: "none", background: "repeating-linear-gradient(0deg,rgba(0,0,0,.3) 0 1px,transparent 1px 3px)" }}></div>
      <div onClick={skipBoot} style={{ position: "absolute", top: "18px", right: "22px", fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)", border: "1px solid var(--line)", padding: "6px 12px", cursor: "pointer" }}>[ESC] SKIP →</div>

      <div style={{ position: "relative", width: "104px", height: "104px", border: "3px solid var(--red)", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0707", animation: animGlow, marginBottom: "22px" }}>
        <div style={{ position: "absolute", left: "5px", top: "7px", bottom: "7px", width: "8px", background: "repeating-linear-gradient(180deg,var(--red) 0 6px,transparent 6px 13px)" }}></div>
        <div style={{ position: "absolute", right: "5px", top: "7px", bottom: "7px", width: "8px", background: "repeating-linear-gradient(180deg,var(--red) 0 6px,transparent 6px 13px)" }}></div>
        <div style={{ width: "0", height: "0", borderTop: "20px solid transparent", borderBottom: "20px solid transparent", borderLeft: "32px solid var(--red)", marginLeft: "6px" }}></div>
        <span style={{ position: "absolute", top: "-3px", left: "-3px", width: "18px", height: "18px", borderTop: "2px solid var(--cream)", borderLeft: "2px solid var(--cream)" }}></span>
        <span style={{ position: "absolute", bottom: "-3px", right: "-3px", width: "18px", height: "18px", borderBottom: "2px solid var(--cream)", borderRight: "2px solid var(--cream)" }}></span>
      </div>
      <div style={{ fontFamily: "var(--cond)", fontWeight: "900", fontSize: "34px", letterSpacing: ".04em", lineHeight: ".9" }}>CHURLISH<span style={{ color: "var(--red)" }}>/</span>OS</div>
      <div style={{ fontSize: "9px", letterSpacing: ".4em", color: "var(--dim)", marginTop: "6px", marginBottom: "24px" }}>OPERATING SYSTEM · v1.4.0</div>

      <div style={{ width: "100%", maxWidth: "520px", background: "#0a0a0c", border: "1px solid var(--line)", padding: "16px 18px", minHeight: "212px" }}>
        {(bootLines).map((b, __k30) => (<React.Fragment key={__k30}>
          <div style={{ fontSize: "12px", lineHeight: "1.65", color: b.color, animation: "bootin .18s ease" }}>{b.text}</div>
        </React.Fragment>))}
        {(bootReady) ? (<>
          <div style={{ fontSize: "13px", letterSpacing: ".14em", color: "var(--red)", marginTop: "12px" }}>▸ PRESS ENTER TO AUTHENTICATE<span style={{ animation: "blink 1s steps(1) infinite" }}>_</span></div>
        </>) : null}
      </div>
      <div style={{ width: "100%", maxWidth: "520px", height: "6px", background: "#161619", border: "1px solid var(--line2)", marginTop: "14px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: `${bootProgress}%`, background: "linear-gradient(90deg,var(--red2),var(--red))", transition: "width .2s" }}></div>
      </div>
      <div style={{ width: "100%", maxWidth: "520px", display: "flex", justifyContent: "space-between", fontSize: "9.5px", letterSpacing: ".14em", color: "var(--dim)", marginTop: "7px" }}>
        <span>INITIALIZING SYSTEM</span><span>{bootProgress}%</span>
      </div>
    </div>
  </>) : null}

</div>




</>
    );
  }
}

export default Cockpit;
