'use client';
/* ============================================================================
 * Creative Impact OS — Broadcast cockpit.
 * Skin ported from the design handoff prototype (design/Creative Impact OS -
 * Broadcast.dc.html): scorebug header, channel tabs, drive meter, bottomline
 * ticker, GOING LIVE boot. The engine underneath (lib/store.js, API routes)
 * is the proven Churlish OS engine — do not rewrite it. Sections 01-09 are the
 * broadcast screens; 10-16 are the engine screens re-toned to the same tokens.
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
  GOAL = 100000;
  SELLBY = '2026-10-31';
  DEADLINE = '2026-12-31';
  ONE_TITLE = "Sell out August's four capture days";
  ONE_BODY = "Free 30-minute Authority Audit as the door-opener, booked from the Charlotte cold list. Until all four slots are sold, nothing else on this board matters.";
  KEY = 'ci.os.broadcast.v1';
  COUNT = ['3', '2', '1'];

  SECTIONS = [
    { num: '01', label: 'Command', id: 'command' },
    { num: '02', label: 'Pipeline', id: 'pipeline' },
    { num: '03', label: 'Audits', id: 'audits' },
    { num: '04', label: 'Shoots', id: 'shoots' },
    { num: '05', label: 'Agent Fleet', id: 'agents' },
    { num: '06', label: 'Partners', id: 'partners' },
    { num: '07', label: 'Documents', id: 'docs' },
    { num: '08', label: 'Strategy', id: 'strategy' },
    { num: '09', label: 'Plans', id: 'plans' },
    { num: '10', label: 'Clients', id: 'clients' },
    { num: '11', label: 'Invoices', id: 'invoices' },
    { num: '12', label: 'Proposals', id: 'proposals' },
    { num: '13', label: 'Scheduling', id: 'scheduling' },
    { num: '14', label: 'KPIs', id: 'kpis' },
    { num: '15', label: 'Expenses', id: 'expenses' },
    { num: '16', label: 'Console', id: 'rookie' }
  ];

  // Local-dev demo data only. Real (Supabase) mode starts EMPTY — the DB is the
  // single source of truth and there is NO auto-seeding in app code.
  SEED = [
    { name: 'Elite Sales Training', offer: 'Authority Engine · MO 05', value: 7000, stage: 'Collected' },
    { name: 'Myers Park Ortho', offer: 'Authority Engine · MO 03', value: 4500, stage: 'Collected' },
    { name: 'NoDa Med Spa', offer: 'Story Capture Pilot', value: 2400, stage: 'Collected' },
    { name: 'Uptown Realty Group', offer: 'Authority Engine · MO 02', value: 4500, stage: 'Collected' },
    { name: 'South End Dental', offer: 'Authority Engine · 3-mo term', value: 4500, stage: 'Signed' },
    { name: 'Steele Creek Roofing', offer: 'Authority Engine · 3-mo term', value: 4000, stage: 'Signed' },
    { name: 'Queen City HVAC', offer: 'Authority Engine · 3-mo term', value: 10500, stage: 'Audit Booked', date: '2026-07-01' },
    { name: 'SouthPark Aesthetics', offer: 'Story Capture Pilot', value: 2400, stage: 'Audit Booked', date: '2026-07-02' },
    { name: 'Dilworth Family Dental', offer: 'Authority Engine · 3-mo term', value: 10500, stage: 'Audit Done', date: '2026-07-03' },
    { name: 'University City Injury Law', offer: 'Authority Engine · 3-mo term', value: 12000, stage: 'Audit Done', date: '2026-07-05' },
    { name: 'Ballantyne Law', offer: 'Authority Engine · 3-mo term', value: 12000, stage: 'Proposal', date: '2026-07-06' },
    { name: 'Cotswold Med Spa', offer: 'Authority Engine · 3-mo term', value: 7500, stage: 'Proposal', date: '2026-07-08' },
    { name: 'Plaza Midwood Realty', offer: 'Story Capture Pilot', value: 2400, stage: 'Lead', date: '2026-07-09' },
    { name: 'Belmont Custom Homes', offer: 'Authority Engine · 3-mo term', value: 7500, stage: 'Lead', date: '2026-07-10' },
    { name: 'Matthews Financial Group', offer: 'Story Capture Pilot', value: 2400, stage: 'Lead', date: '2026-07-11' },
    { name: 'Providence Wealth', offer: 'Authority Engine · 3-mo term', value: 10500, stage: 'Lead', date: '2026-07-12' },
    { name: 'Pineville Plumbing', offer: 'Story Capture Pilot', value: 2400, stage: 'Lead', date: '2026-07-13' }
  ];
  STAGES = ['Lead', 'Audit Booked', 'Audit Done', 'Proposal', 'Signed', 'Collected'];
  STAGEPROB = { 'Lead': .1, 'Audit Booked': .3, 'Audit Done': .5, 'Proposal': .7, 'Signed': .95, 'Collected': 1 };

  // Local-dev demo shoots/deliverables (real mode loads from the DB).
  SHOOTSEED = [
    { id: 'sh1', date: '2026-07-09', client: 'South End Dental', kind: 'STORY CAPTURE · HALF-DAY', status: 'BOOKED' },
    { id: 'sh2', date: '2026-07-14', client: 'Steele Creek Roofing', kind: 'STORY CAPTURE · HALF-DAY', status: 'BOOKED' },
    { id: 'sh3', date: '2026-07-18', client: 'Elite Sales Training', kind: 'MONTHLY CAPTURE', status: 'CONFIRMED' },
    { id: 'sh4', date: '2026-07-25', client: '', kind: 'SELL THIS DAY', status: 'OPEN' },
    { id: 'sh5', date: '2026-08-06', client: '', kind: 'SELL THIS DAY', status: 'OPEN' },
    { id: 'sh6', date: '2026-08-12', client: '', kind: 'SELL THIS DAY', status: 'OPEN' },
    { id: 'sh7', date: '2026-08-20', client: '', kind: 'SELL THIS DAY', status: 'OPEN' },
    { id: 'sh8', date: '2026-08-27', client: '', kind: 'SELL THIS DAY', status: 'OPEN' }
  ];
  DELIVSEED = [
    { id: 'dl1', name: 'NoDa Med Spa', done: 12, meta: '34 PHOTOS · 6 ADS LIVE · REVIEW CALL JUL 29' },
    { id: 'dl2', name: 'Uptown Realty Group', done: 8, meta: '28 PHOTOS · 4 ADS LIVE · SHOOT SHOT JUL 02' },
    { id: 'dl3', name: 'Elite Sales Training', done: 9, meta: '22 PHOTOS · 5 ADS LIVE · CAPTURE JUL 18' },
    { id: 'dl4', name: 'Myers Park Ortho', done: 6, meta: '18 PHOTOS · 3 ADS LIVE · EDIT IN PROGRESS' }
  ];
  RUNSHEET = [
    'T-3 days — pre-pro call: story angle, locations, shot list locked.',
    'AM — Authority Video interview: the long-form centerpiece (60–90 min).',
    'Midday — b-roll: the work, the team, the space, the details.',
    'PM — brand photography session: portraits, lifestyle, product (Emmanuel).',
    'Same week — selects + edit brief to Splice; 8–12 cuts queued; Gaffer picks ad frames.'
  ];

  FLEET = [
    { init: 'SC', ch: '1', name: 'Scout', role: 'Lead research — sources, qualifies and tiers the Charlotte prospect list.', cad: 'Every morning', accent: 'var(--gold)' },
    { init: 'AN', ch: '2', name: 'Anchor', role: 'Outreach & booking — works the sequences, books the 30-minute audits.', cad: 'Daily', accent: 'var(--good)' },
    { init: 'SP', ch: '3', name: 'Splice', role: 'Short-form edit — cuts every capture day into 8–12 clips per client.', cad: 'Daily', accent: 'var(--white)' },
    { init: 'DR', ch: '4', name: 'Darkroom', role: 'Photo pipeline — culls, grades and delivers the photography sets.', cad: 'Per shoot', accent: 'var(--white)' },
    { init: 'GF', ch: '5', name: 'Gaffer', role: 'Ads — builds and launches Meta + Google variants from winning cuts.', cad: 'Weekly', accent: 'var(--gold)' },
    { init: 'SR', ch: '6', name: 'Showrunner', role: 'Supervisor — verifies every source ran clean and on-brand; routes work.', cad: 'Midday', accent: 'var(--muted)' }
  ];
  LOOP = ['Scout', 'Anchor', 'Booked audit', 'Pipeline', 'Splice + Gaffer', 'Showrunner'];
  OPSLIST = [
    'Showrunner report reviewed — fleet green',
    'Scout list approved → handed to Anchor',
    '3 discovery calls held (the floor)',
    'New deals + stage moves logged in Pipeline',
    'Splice clip batch reviewed / scheduled',
    'Partner desk check-in done — both of you'
  ];
  LOGSEED = [
    { t: '07:42', tag: 'SC', color: 'var(--gold)', msg: 'sourced 14 prospects · HVAC / south CLT' },
    { t: '08:05', tag: 'AN', color: 'var(--good)', msg: 'sequence dispatched · 16 sends, 0 bounces' },
    { t: '09:18', tag: 'AN', color: 'var(--good)', msg: 'audit booked · SouthPark Aesthetics · THU 14:00' },
    { t: '10:30', tag: 'SP', color: 'var(--white)', msg: 'cut 4 clips · Elite Sales Training batch' },
    { t: '11:02', tag: 'SR', color: 'var(--muted)', msg: 'fleet audit · all sources on-brand · green' },
    { t: '12:15', tag: 'DR', color: 'var(--white)', msg: 'graded 48 frames · Uptown Realty set' },
    { t: '13:40', tag: 'GF', color: 'var(--gold)', msg: '2 ad variants live · NoDa Med Spa · Meta' }
  ];
  AMB = [
    { tag: 'AN', color: 'var(--good)', msg: 'reply received · Ballantyne Law · positive' },
    { tag: 'SP', color: 'var(--white)', msg: 'clip batch queued · short-form #27' },
    { tag: 'SR', color: 'var(--muted)', msg: 'heartbeat · 6/6 sources responding' },
    { tag: 'SC', color: 'var(--gold)', msg: 'new tier-1 prospect · dental · scored 0.92' },
    { tag: 'GF', color: 'var(--gold)', msg: 'ad set optimized · CPL down 12%' },
    { tag: 'AN', color: 'var(--good)', msg: 'follow-up scheduled · Providence Wealth · +2d' }
  ];

  LADDER = [
    { o: '01', n: 'Authority Audit', p: 'FREE · 30 MIN', d: 'The door-opener. No pitch slap — they walk away with a written plan either way. It pre-qualifies and starts the relationship on proof.', w: 'Every relationship starts here. The plan sells the next rung so you don’t have to.', accent: 'var(--gold)' },
    { o: '02', n: 'Authority Diagnostic', p: '$750 PIF · 5 DAYS', d: 'The written teardown of their ad account — scored, benchmarked, a dollar on every fix. Report in hand within 5 business days.', w: 'When they want the deep read before committing monthly. The $750 credits into Engine month one.', accent: 'var(--white)' },
    { o: '03', n: 'Story Capture Pilot', p: '$2,400 ONE-TIME', d: 'One half-day capture: an Authority Video, a photo set, 8–12 clips. The taste of the Engine, delivered in a week.', w: 'When they need proof of the machine before a retainer.', accent: 'var(--gold)' },
    { o: '04', n: 'Authority Engine', p: '$3,500/MO · 3-MO MIN', d: 'The core. One capture day, 8–12 clips, ads, funnel, follow-up, monthly review. Priced fixed — never discount month one.', w: 'The default retainer pitch — the Diagnostic credit lands here.', accent: 'var(--white)' },
    { o: '05', n: 'Market Domination', p: '$6,000/MO · EXPANSION', d: 'Two capture days, multi-platform, full reporting. The day-60 expansion conversation for clients the Engine is already winning for.', w: 'When results earn the expansion conversation. Never pitched cold.', accent: 'var(--gold)' }
  ];

  SCRIPT = [
    { n: '01', l: 'Open / Disarm', goal: 'Lower the guard. This is a working session, not a sales call — say so and mean it.', blocks: [
      { t: 'say', text: '“Hey [Name] — appreciate you grabbing 30 minutes. Straight up: this isn’t a pitch. We do a working audit of where a service business is leaking attention and leads in Charlotte — and you’ll walk out of this call with a plan whether or not we ever talk again. Fair?”' },
      { t: 'note', text: 'Calm, low, no upward inflection. You’re the person who already knows what’s wrong — not the one who needs the deal.' },
      { t: 'q', items: ['“Before I dig in — what made you take the call?” (let the real reason surface)', 'Mirror the last three words of whatever they say. Then stay quiet.'] }
    ] },
    { n: '02', l: 'Situation', goal: 'Get the lay of the land. Facts first — build the map you’ll audit against.', blocks: [
      { t: 'q', items: ['“Walk me through how someone finds you today — start to booked job.”', '“Roughly how many new leads a month, and where do most come from?”', '“What are you spending on marketing right now — ads, content, an agency, lead services, all of it?”', '“When someone reaches out but doesn’t buy — what happens to them?”'] },
      { t: 'note', text: 'That last one is the trap door. Most Charlotte operators have no answer. Don’t react — write it down and nod.' }
    ] },
    { n: '03', l: 'Problem Awareness', goal: 'Make them say it out loud: great reviews, invisible brand. Your job is questions; their job is realizing.', blocks: [
      { t: 'q', items: ['“Pull up your website and your top competitor’s — honestly, could a stranger tell them apart?”', '“How long has it been running like that?”', '“What have you already tried? And how’d that go?”'] },
      { t: 'sayalt', text: '“So if I’m hearing you right — the work is five stars, the reviews prove it, but between ‘they hear about you’ and ‘they hire you’ it’s basically held together with referrals and hope. Is that fair, or am I overstating it?”' },
      { t: 'note', text: 'Label it: “It sounds like…” / “It seems like…”. Let them correct you — correction is engagement.' }
    ] },
    { n: '04', l: 'Consequence', goal: 'Let the gap breathe. What staying invisible costs — in dollars and in market position.', blocks: [
      { t: 'q', items: ['“If nothing changes in the next 6–12 months, where does that leave you?”', '“What’s a single closed job worth to you, on average?”', '“So if the guy with half your skill keeps out-posting you — you’ve got a rough number for what that’s already costing, right?”'] },
      { t: 'note', text: 'Silence after the cost question. The number landing in their own head does more than any deck could.' }
    ] },
    { n: '05', l: 'The Plan', goal: 'Deliver the audit — live. Three cracks, ranked, each with a dollar next to it. This is the deliverable.', blocks: [
      { t: 'say', text: '“Here’s what I’m seeing — three things, in order. [Name them: positioning, content, follow-up — whatever the call surfaced.] If you fix nothing else, fix the first one. I’ll send this as a one-page plan after the call. It’s yours either way — run it yourself or hire anyone you want to run it.”' },
      { t: 'sayalt', text: '“The way we’d run it: once a month, Emmanuel and the team come to you for a half-day shoot. One Authority Video, a full photo set, 8–12 cuts, the ads, the landing pages, the follow-up. Your job is to answer the phone. Ours is to make it ring.”' },
      { t: 'q', items: ['“Want me to walk you through what a month actually looks like?”', '“Anything you’d want us to point the first shoot at?”'] }
    ] },
    { n: '06', l: 'Commit', goal: 'Ask for the small yes. Calendar, not contract — the capture day is the close.', blocks: [
      { t: 'say', text: '“So there are two ways this goes. You take the plan and run it — genuinely fine. Or we run it for you, and the first move is getting you on the capture calendar. August has one day left — do you want it?”' },
      { t: 'q', items: ['“Who else needs to see the plan before you’d green-light a first month?”', '“What’s the best email for the plan and the calendar hold?”'] },
      { t: 'note', text: 'The second they say yes: Pipeline → move the deal to Proposal, hold the shoot date. Don’t trust memory after the call.' }
    ] }
  ];
  OBJECTIONS = [
    { q: '“We tried an agency before and it didn’t work.”', lab: 'Agree, then separate — the out-of-state trap', a: '“Good — then you already know what bad looks like. You paid someone in Austin or Denver who couldn’t tell South End from South Charlotte, got generic ads, and three months of excuses. We’re the opposite bet: Charlotte-based, on-site every month, and you’ll see every number — cost per lead, cost per booked job. The plan I just gave you is proof of how we think. That part was free.”' },
    { q: '“I get all my business from referrals.”', lab: 'Referrals are the ceiling, not the floor', a: '“And that’s exactly why you’re a good fit — referrals mean the work is real. But referrals got you to this revenue and they’re what’s keeping you at it. You can’t scale granny’s church friend. The Engine doesn’t replace referrals — it makes every referral check you out and find a brand instead of a business card.”' },
    { q: '“I don’t have time for this.”', lab: 'The system is built for operators, not influencers', a: '“That’s the design constraint we built around. Your total time cost is a half-day once a month plus answering your phone. We handle pre-pro, shooting, editing, posting, ads, landing pages, follow-up. If you’ve got four hours a month, you’ve got the whole system.”' },
    { q: '“I’m already paying Thumbtack / Angi for leads.”', lab: 'Renting vs. owning', a: '“And every month they sell that same lead to four other guys on your block, and you race to the bottom on price. That’s renting. We build the thing you own — your face, your story, your pipeline. A year from now the ad account, the content library, and the audience are yours. Thumbtack keeps theirs.”' },
    { q: '“What does it cost?”', lab: 'Anchor to the plan, not a menu', a: '“Depends what the plan says needs fixing — that’s why we did this call first instead of sending a price list. Core engagement runs $3,500 a month with a three-month minimum, ad spend separate. If the first crack is smaller than that, I’ll tell you — a pilot shoot is a fraction of it. You’ll have exact numbers on the plan I send today.”' },
    { q: '“I need to think about it.”', lab: 'Label it, find the real lock', a: '“Totally fair — sounds like something specific is giving you pause. Usually it’s one of three things: the money, the timing, or whether this will actually be different. Which one’s closest?” Then handle the real one. Don’t argue the stall — find the lock.' },
    { q: '“I’m not good on camera.”', lab: 'Reframe — that’s the product, not the problem', a: '“Nobody is in minute one — that’s literally what the first half-day is for. Emmanuel has spent ten years making Charlotte business owners look like themselves, not like actors. You talk about your work the way you would to a customer; we do the rest. The awkward guy who shows up anyway beats the polished guy who doesn’t exist online — every time.”' }
  ];

  DOCS = [
    { cat: 'STRATEGY', items: [
      { name: 'Creative Impact OS Blueprint', fmt: 'PDF', meta: 'Master spec · the whole operating system', tag: 'CORE' },
      { name: '100K Sprint Plan', fmt: 'DOC', meta: 'Signed by Oct 31, collected by Dec 31' },
      { name: 'Positioning: The Obvious Choice', fmt: 'DOC', meta: 'Local beats loud · the moat memo' }
    ] },
    { cat: 'SALES', items: [
      { name: 'Authority Audit Call Script', fmt: 'DOC', meta: '6 segments · no pitch slap', tag: 'LIVE' },
      { name: 'Audit Plan Template — Leave-Behind', fmt: 'PDF', meta: 'The one-pager every audit ends with', tag: 'HOT' },
      { name: 'Objection Handling — The Seven', fmt: 'DOC', meta: 'Agency trap · referrals · camera-shy' },
      { name: 'Offer Ladder & Pricing', fmt: 'SHEET', meta: 'Fixed · never discount month one' }
    ] },
    { cat: 'BRAND', items: [
      { name: 'Shutter Mark & Logo Kit', fmt: 'PNG', meta: 'Hex shutter + play · dark variants' },
      { name: 'Color & Type System', fmt: 'DOC', meta: 'Navy / gold broadcast package · Oswald + Archivo' },
      { name: 'Broadcast Graphics Package', fmt: 'FIG', meta: 'Scorebug · lower thirds · ticker' }
    ] },
    { cat: 'PRODUCTION', items: [
      { name: 'Shoot-Day Run Sheet', fmt: 'DOC', meta: 'Half-day capture · step by step', tag: 'LIVE' },
      { name: 'Charlotte Cold List', fmt: 'CSV', meta: 'Tiered by Scout', tag: 'LIVE' },
      { name: 'Agent Fleet SOPs', fmt: 'DOC', meta: '6 sources · run order + handoffs' },
      { name: 'Contract + Invoice Templates', fmt: 'DOC', meta: '3-mo minimum · ad spend separate' }
    ] }
  ];

  STRATEGY = {
    thesis: 'Local beats loud. A Charlotte-native partner with studio output — story-driven video plus a decade of ground truth — makes good operators the obvious choice before the phone ever rings.',
    pillars: [
      { k: 'THE WEDGE', t: 'A free audit that’s actually a plan', d: 'Thirty minutes, no pitch slap, and they leave with a written plan either way. It pre-qualifies buyers, builds trust on proof, and books the capture calendar — the plan sells the Engine so you don’t have to.' },
      { k: 'THE MOAT', t: 'Charlotte-native, two operators, one system', d: 'Emmanuel’s ten years shooting this city plus Brandon’s Authority Engine. Out-of-state agencies can’t fake knowing South End from South Charlotte — and a two-operator shop can’t be commoditized like a content mill.' },
      { k: 'THE TARGET', t: 'Service businesses that already work', d: 'Five-star reviews, broken visibility. $500K–$5M home services, dental, law, realty, financial, med spa — operators tired of renting leads from middlemen. We sell the fix with a number on it.' }
    ],
    bets: [
      'Sell out every monthly capture day — four half-days is the whole production line.',
      'Climb the ladder: free Audit → Authority Engine → day-60 expansion. Never discount month one.',
      'Run the fleet so the funnel is founder-free — four hands stay on sales and the lens.'
    ],
    antigoals: [
      'No pitch-slap calls — the audit ends with a plan, not a proposal ambush.',
      'No out-of-market clients until Charlotte is won.',
      'No renting leads — we build pipelines clients own, we don’t resell middleman lists.',
      'No week-5 burnout — the Partner Desk is load-bearing.'
    ]
  };

  PLANS = [
    { n: 'Q1', t: 'Sell Out August', when: 'THIS WEEK', d: 'Four capture days on the calendar, free Authority Audit as the door-opener, Scout’s Charlotte cold list as the fuel. Until all four are sold, nothing else counts.', state: 'ACTIVE' },
    { n: 'Q2', t: 'Fill the Funnel', when: 'WEEKS 1–4', d: 'Scout + Anchor run the cold list daily. Hold the floor: 3 discovery calls and 2 audits delivered every week, 8 clips shipped.', state: 'NEXT' },
    { n: 'Q3', t: 'Sign $100K', when: 'BY OCT 31', d: 'Audits convert to plans convert to contracts. Keep pipeline coverage ≥3× the gap, always. Every signed client goes straight onto the capture calendar.', state: 'QUEUED' },
    { n: 'Q4', t: 'Collect & Renew', when: 'BY DEC 31', d: 'Deliver, collect, and run the expansion play at day 60 / renewal at day 75. Protect the base — one saved account is a month of audits.', state: 'QUEUED' }
  ];
  PLANMOVES = [
    'August capture calendar published',
    'Audit booking page live',
    'Cold list segmented — top 50 Charlotte',
    'Anchor sequence pointed at the booking page',
    'First 5 audit invites sent'
  ];

  PARTNERS = [
    { init: 'EB', name: 'Emmanuel Bibbs', role: 'VISUAL DIRECTOR · CLT' },
    { init: 'BK', name: 'Brandon King', role: 'CREATIVE DIRECTOR · ENGINE' }
  ];

  constructor(props) {
    super(props);
    const booted = (() => { try { return sessionStorage.getItem('ci_booted_broadcast') === '1'; } catch (e) { return false; } })();
    const bootOn = (props.bootSequence ?? true) && !booted;
    const wk = this.weekKey();
    this.state = {
      booting: bootOn,
      bootIdx: 0,
      view: 'command',
      now: Date.now(),
      // Real (Supabase) mode starts EMPTY and loads from the DB — no phantom
      // seed deals or box-score numbers. The seeds are local-dev demo only.
      deals: store.enabled ? [] : this.SEED.map((d, i) => Object.assign({ id: 'seed' + i }, d)),
      shoots: store.enabled ? [] : this.SHOOTSEED.slice(),
      delivs: store.enabled ? [] : this.DELIVSEED.slice(),
      clients: [],
      invoices: [],
      proposals: [],
      bookings: [],
      expenses: [],
      kpis: [],
      kpiEntries: {},
      weeks: store.enabled ? {} : { [wk]: { calls: 4, proposals: 2, signed: 4000, collected: 2400, manual: { invites: true, clips: 9 } } },
      ops: {},
      step: 0,
      showObj: false,
      partner: 'EB',
      dealModal: null,
      docModal: null,
      clientModal: null,
      invoiceModal: null,
      proposalModal: null,
      intakeModal: null,
      expenseModal: null,
      kpiModal: null,
      emailModal: null,
      shootModal: null,
      delivModal: null,
      rookieMsgs: [],
      rookieInput: '',
      rookieBusy: false,
      rookieFile: null,
      founder: {},
      habits: [
        { id: 'h1', name: '3 sales conversations', owner: 'BK', days: {} },
        { id: 'h2', name: 'Camera on something', owner: 'EB', days: {} },
        { id: 'h3', name: 'Move my body', owner: 'BOTH', days: {} }
      ],
      goals: [
        { id: 'g1', text: '$100K collected by Dec 31', type: 'business', owner: 'BOTH', target: 100000, done: false },
        { id: 'g2', text: 'Sell out August’s four capture days', type: 'business', owner: 'BK', target: 0, done: false },
        { id: 'g3', text: 'Ship the 500-brands Charlotte archive reel', type: 'business', owner: 'EB', target: 0, done: false },
        { id: 'g4', text: 'Protect health through the sprint — no week-5 wall', type: 'life', owner: 'BOTH', target: 0, done: false }
      ],
      // Real mode: The Wire shows only real log_entries from the DB — no demo
      // feed, no fabricated agent activity. Demo wire lines are local-dev only.
      log: store.enabled ? [] : this.LOGSEED.slice(),
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
    this.logTimer = setInterval(() => this.pushLog(), 4600);
    window.addEventListener('keydown', this.onKey);
    if (this.state.booting) {
      this.bootTimer = setInterval(() => {
        this.setState(s => {
          const idx = s.bootIdx + 1;
          if (idx > this.COUNT.length) { clearInterval(this.bootTimer); this.autoDismiss = setTimeout(() => this.dismiss(), 3600); return { bootIdx: this.COUNT.length }; }
          return { bootIdx: idx };
        });
      }, 950);
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
    try { sessionStorage.setItem('ci_booted_broadcast', '1'); } catch (e) {}
    this.setState({ booting: false, bootIdx: this.COUNT.length });
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
      // Capture days + deliverables (broadcast additions; DB is source of truth).
      if (store.enabled) {
        patch.shoots = Array.isArray(d.shoots) ? d.shoots : [];
        patch.delivs = Array.isArray(d.delivs) ? d.delivs : [];
      } else {
        if (Array.isArray(d.shoots) && d.shoots.length) patch.shoots = d.shoots;
        if (Array.isArray(d.delivs) && d.delivs.length) patch.delivs = d.delivs;
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
      : { id: null, name: '', offer: 'Authority Engine · 3-mo term', value: 10500, stage: 'Lead', date: '', clientId: '' } });
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
    const statusColor = { Lead: 'var(--dim)', Active: 'var(--good)', Past: 'var(--red)' };

    const Stat = (label, val, sub, accent) => (
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid " + (accent || "var(--line2)"), padding: "15px 18px" }}>
        <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>{label}</div>
        <div style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "38px", lineHeight: ".9", color: "var(--cream)", marginTop: "6px" }}>{val}</div>
        <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>{sub}</div>
      </div>
    );

    return (
      <div style={{ padding: "28px 26px 96px", maxWidth: "1240px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 10 · THE ROSTER</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>CLIENT <span style={{ display: "inline-block", background: "var(--red)", color: "var(--golddark)", padding: "0 12px", transform: "skewX(0deg)" }}>ROSTER</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Every client, where they sit on the ladder, and when they renew. The day-60 / day-75 play lives here — protect the base.</div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexShrink: 0, marginTop: "6px" }}>
            <Hover as="button" onClick={() => { window.location.assign('/api/fb/connect'); }} title={(this.state.ops && this.state.ops.__fb) ? 'Connected: ' + this.state.ops.__fb.page_name + ' — click to reconnect' : 'Login with Facebook, pick your page, approve — leads flow in automatically'}
              baseStyle={{ background: "transparent", border: "1px solid " + ((this.state.ops && this.state.ops.__fb) ? 'rgba(46,224,111,.5)' : 'var(--line2)'), color: (this.state.ops && this.state.ops.__fb) ? 'var(--good)' : 'var(--muted)', fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ borderColor: "var(--red)", color: "var(--cream)" }}>
              {(this.state.ops && this.state.ops.__fb) ? 'FB ✓ ' + (this.state.ops.__fb.page_name || 'Connected') : 'Connect Facebook'}
            </Hover>
            <Hover as="button" onClick={() => this.openIntakeSettings()} baseStyle={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ borderColor: "var(--red)", color: "var(--cream)" }}>Intake Form</Hover>
            <Hover as="button" onClick={() => { window.location.assign('/diagnostics'); }} title="The $750 Authority Diagnostic pipeline — checkout, intakes, drafts awaiting your approval"
              baseStyle={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ borderColor: "var(--gold)", color: "var(--white)" }}>⚡ Diagnostics</Hover>
            <Hover as="button" onClick={() => this.openClient(null)} baseStyle={{ background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>+ Add Client</Hover>
          </div>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" }}>
          {Stat('CLIENTS', String(clients.length), 'ON THE ROSTER', 'var(--line2)')}
          {Stat('ACTIVE', String(active), 'PAYING NOW', 'var(--good)')}
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
                <Hover as="div" key={c.id} onClick={() => this.openClient(c)} baseStyle={{ display: "grid", gridTemplateColumns: "2fr 1.2fr .9fr 1.1fr .7fr .9fr 1fr", gap: "10px", padding: "13px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", alignItems: "center", fontSize: "13px" }} hoverStyle={{ background: "var(--panel2)" }}>
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
    const inp = { width: "100%", background: "var(--deep)", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
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
        <div onClick={(e) => e.stopPropagation()} style={{ width: "520px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "26px", letterSpacing: ".01em" }}>{m.id ? "EDIT CLIENT" : "NEW CLIENT"}</div>
            <button onClick={() => this.closeClient()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>

          {Field('Business name', 'name', { full: true, ph: 'NoDa Med Spa' })}
          <div style={{ display: "flex", gap: "12px" }}>{Field('Contact', 'contact', { flex: 1 })}{Field('Phone', 'phone', { flex: 1 })}</div>
          {Field('Email', 'email', { full: true, type: 'email' })}
          <div style={{ display: "flex", gap: "12px" }}>{Field('Industry', 'industry', { flex: 1, ph: 'Med spa' })}{Field('Source', 'source', { flex: 1, options: ['', 'Facebook', 'Referral', 'Cold', 'Diagnostic', 'Other'] })}</div>
          <div style={{ display: "flex", gap: "12px" }}>
            {Field('Status', 'status', { flex: 1, options: ['Lead', 'Active', 'Past'] })}
            {Field('Ladder rung', 'ladder', { flex: 1, options: ['', 'Audit', 'Pilot', 'Engine', 'Domination'] })}
            {Field('Renewal date', 'renewal', { flex: 1, type: 'date' })}
          </div>
          <div style={{ marginBottom: "18px" }}>
            <label style={lbl}>Notes</label>
            <textarea style={Object.assign({}, inp, { minHeight: "64px", resize: "vertical" })} value={m.notes || ''} onChange={(e) => this.setClientField('notes', e.target.value)} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              {m.id ? (
                <button onClick={() => this.removeClient()} style={{ background: "transparent", border: "1px solid rgba(255,48,64,.4)", color: "var(--live)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button>
              ) : null}
              {m.id && m.email ? (
                <button onClick={() => this.openEmailThread({ id: m.id, name: m.name, email: m.email })} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>✉ Email</button>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeClient()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
              <button onClick={() => this.saveClient()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>{m.id ? "Save" : "Add client"}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  pushLog() {
    // Real mode: never invent wire lines — the feed is real log_entries only.
    if (store.enabled) return;
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
    this.flash('NEW WEEK — FRESH TAPE, BOX SCORE RESET');
  }
  flash(m, dur = 2200) { clearTimeout(this.toastT); this.setState({ toast: m }); this.toastT = setTimeout(() => this.setState({ toast: '' }), dur); }

  todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  setF(key, val) { const k = this.fKey(); this.setState(s => { const f = Object.assign({}, s.founder); f[k] = Object.assign({}, f[k], { [key]: val }); return { founder: f }; }, () => this.saveStore()); }
  toggleHabit(id) { const t = this.todayStr(); this.setState(s => ({ habits: s.habits.map(h => { if (h.id !== id) return h; const days = Object.assign({}, h.days); days[t] = !days[t]; if (!days[t]) delete days[t]; return Object.assign({}, h, { days }); }) }), () => this.saveStore()); }
  habitStreak(h) { let n = 0; const d = new Date(); for (;;) { const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (h.days && h.days[ds]) { n++; d.setDate(d.getDate() - 1); } else break; } return n; }
  toggleGoal(id) { this.setState(s => ({ goals: s.goals.map(g => g.id === id ? Object.assign({}, g, { done: !g.done }) : g) }), () => this.saveStore()); }
  addHabit() { const n = (window.prompt('New non-negotiable habit:') || '').trim(); if (n) this.setState(s => ({ habits: [...s.habits, { id: 'h' + Date.now(), name: n, owner: this.state.partner, days: {} }] }), () => this.saveStore()); }
  addGoal() { const n = (window.prompt('New goal — what, by when:') || '').trim(); if (!n) return; const life = /life|health|family|body|sleep|gym|personal|kid|wife|husband/i.test(n); this.setState(s => ({ goals: [...s.goals, { id: 'g' + Date.now(), text: n, type: life ? 'life' : 'business', owner: this.state.partner, target: 0, done: false }] }), () => this.saveStore()); }
  goStep(i) { if (i < 0 || i >= this.SCRIPT.length) return; this.setState({ step: i }); }
  toggleObj() { this.setState(s => ({ showObj: !s.showObj })); }
  weighted() { return this.state.deals.filter(d => !['Collected', 'Lost'].includes(d.stage)).reduce((s, d) => s + (+d.value || 0) * (this.STAGEPROB[d.stage] || 0), 0); }
  winRate() { const closed = this.state.deals.filter(d => ['Signed', 'Collected', 'Lost'].includes(d.stage)).length; const won = this.state.deals.filter(d => ['Signed', 'Collected'].includes(d.stage)).length; return closed ? Math.round(won / closed * 100) + '%' : '—'; }
  toggleOp(k) { this.setState(s => ({ ops: Object.assign({}, s.ops, { [k]: !(s.ops && s.ops[k]) }) }), () => this.saveStore()); }


  // --- Partner desk key: check-ins are stored per partner, per day ('EB|2026-07-07').
  fKey() { return this.state.partner + '|' + this.todayStr(); }

  // Set a numeric value inside the current week's manual{} blob (e.g. clips) —
  // rides the weeks.manual jsonb column so the engine schema stays untouched.
  setManualVal(key, val) {
    const wk = this.weekKey();
    this.setState(s => {
      const weeks = Object.assign({}, s.weeks);
      const w = Object.assign({ manual: {} }, weeks[wk]);
      w.manual = Object.assign({}, w.manual, { [key]: val });
      weeks[wk] = w; return { weeks };
    }, () => this.saveStore());
  }

  // --- Shoots (capture days) CRUD ---
  blankShoot() { return { id: null, date: this.todayStr(), client: '', kind: 'STORY CAPTURE · HALF-DAY', status: 'OPEN' }; }
  openShoot(sh) { this.setState({ shootModal: sh ? Object.assign({}, sh) : this.blankShoot() }); }
  closeShoot() { this.setState({ shootModal: null }); }
  setShootField(k, val) { this.setState(s => ({ shootModal: Object.assign({}, s.shootModal, { [k]: val }) })); }
  async saveShoot() {
    const m = this.state.shootModal; if (!m) return;
    const sh = { id: m.id || undefined, date: m.date || this.todayStr(), client: (m.client || '').trim(), kind: (m.kind || '').trim() || (m.status === 'OPEN' ? 'SELL THIS DAY' : 'STORY CAPTURE · HALF-DAY'), status: m.status || 'OPEN' };
    let id = m.id;
    try { if (store.upsertShoot) id = await store.upsertShoot(sh); }
    catch (e) { console.error('shoot save failed', e); this.flash('SHOOT SAVE FAILED — ' + (e.message || e), 7000); return; }
    sh.id = id || m.id || ('local-' + Date.now());
    this.setState(s => {
      const shoots = s.shoots.slice();
      const i = shoots.findIndex(x => x.id === sh.id);
      if (i >= 0) shoots[i] = sh; else shoots.push(sh);
      shoots.sort((a, b) => ((a.date || '') < (b.date || '') ? -1 : 1));
      return { shoots, shootModal: null };
    });
    this.flash(m.id ? 'SHOOT UPDATED ✓' : 'SHOOT ADDED ✓');
  }
  async removeShoot() {
    const m = this.state.shootModal; if (!m) return;
    const persisted = m.id && !String(m.id).startsWith('local') && !String(m.id).startsWith('sh');
    if (persisted && store.deleteShoot) {
      try { await store.deleteShoot(m.id); }
      catch (e) { console.error(e); this.flash('DELETE FAILED — ' + (e.message || e), 7000); return; }
    }
    this.setState(s => ({ shoots: s.shoots.filter(x => x.id !== m.id), shootModal: null }));
    this.flash('SHOOT DELETED');
  }

  // --- Deliverables tracker CRUD ---
  blankDeliv() { return { id: null, name: '', done: 0, meta: '' }; }
  openDeliv(d) { this.setState({ delivModal: d ? Object.assign({}, d) : this.blankDeliv() }); }
  closeDeliv() { this.setState({ delivModal: null }); }
  setDelivField(k, val) { this.setState(s => ({ delivModal: Object.assign({}, s.delivModal, { [k]: val }) })); }
  async saveDeliv() {
    const m = this.state.delivModal; if (!m) return;
    const dl = { id: m.id || undefined, name: (m.name || '').trim() || 'Untitled', done: Math.max(0, +m.done || 0), meta: (m.meta || '').trim() };
    let id = m.id;
    try { if (store.upsertDeliv) id = await store.upsertDeliv(dl); }
    catch (e) { console.error('deliverable save failed', e); this.flash('SAVE FAILED — ' + (e.message || e), 7000); return; }
    dl.id = id || m.id || ('local-' + Date.now());
    this.setState(s => {
      const delivs = s.delivs.slice();
      const i = delivs.findIndex(x => x.id === dl.id);
      if (i >= 0) delivs[i] = dl; else delivs.push(dl);
      return { delivs, delivModal: null };
    });
    this.flash(m.id ? 'TRACKER UPDATED ✓' : 'CLIENT TRACKED ✓');
  }
  async removeDeliv() {
    const m = this.state.delivModal; if (!m) return;
    const persisted = m.id && !String(m.id).startsWith('local') && !String(m.id).startsWith('dl');
    if (persisted && store.deleteDeliv) {
      try { await store.deleteDeliv(m.id); }
      catch (e) { console.error(e); this.flash('DELETE FAILED — ' + (e.message || e), 7000); return; }
    }
    this.setState(s => ({ delivs: s.delivs.filter(x => x.id !== m.id), delivModal: null }));
    this.flash('REMOVED');
  }

  renderShootModal() {
    const m = this.state.shootModal;
    if (!m) return null;
    const lbl = { fontSize: "9.5px", fontWeight: 800, letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { width: "100%", background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "3px", color: "var(--white)", fontFamily: "var(--sans)", fontSize: "13px", padding: "9px 11px" };
    return (
      <div onClick={() => this.closeShoot()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,8,16,.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "420px", maxWidth: "100%", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "3px solid var(--gold)", borderRadius: "4px", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
            <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "26px", letterSpacing: ".02em", textTransform: "uppercase" }}>{m.id ? "Edit Capture Day" : "New Capture Day"}</div>
            <button onClick={() => this.closeShoot()} style={{ background: "none", border: "none", color: "var(--dim)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "13px" }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Date</label>
              <input style={inp} type="date" value={m.date || ''} onChange={(e) => this.setShootField('date', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Status</label>
              <select style={inp} value={m.status || 'OPEN'} onChange={(e) => this.setShootField('status', e.target.value)}>
                {['OPEN', 'BOOKED', 'CONFIRMED', 'SHOT'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: "13px" }}>
            <label style={lbl}>Client</label>
            <input style={inp} value={m.client || ''} placeholder="Empty = open slot, tickets available" onChange={(e) => this.setShootField('client', e.target.value)} />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={lbl}>Kind</label>
            <input style={inp} value={m.kind || ''} placeholder="STORY CAPTURE · HALF-DAY" onChange={(e) => this.setShootField('kind', e.target.value)} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            {m.id ? (
              <button onClick={() => this.removeShoot()} style={{ background: "transparent", border: "1px solid rgba(255,48,64,.4)", color: "var(--live)", fontWeight: 800, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase", borderRadius: "3px" }}>Delete</button>
            ) : <span />}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeShoot()} style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", fontWeight: 800, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase", borderRadius: "3px" }}>Cancel</button>
              <button onClick={() => this.saveShoot()} style={{ background: "var(--gold)", border: "none", color: "var(--golddark)", fontWeight: 900, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase", borderRadius: "3px" }}>{m.id ? "Save" : "Add day"}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderDelivModal() {
    const m = this.state.delivModal;
    if (!m) return null;
    const lbl = { fontSize: "9.5px", fontWeight: 800, letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { width: "100%", background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "3px", color: "var(--white)", fontFamily: "var(--sans)", fontSize: "13px", padding: "9px 11px" };
    return (
      <div onClick={() => this.closeDeliv()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,8,16,.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "420px", maxWidth: "100%", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "3px solid var(--gold)", borderRadius: "4px", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
            <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "26px", letterSpacing: ".02em", textTransform: "uppercase" }}>{m.id ? "Edit Tracker" : "Track Client"}</div>
            <button onClick={() => this.closeDeliv()} style={{ background: "none", border: "none", color: "var(--dim)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ marginBottom: "13px" }}>
            <label style={lbl}>Client</label>
            <input style={inp} value={m.name || ''} placeholder="NoDa Med Spa" onChange={(e) => this.setDelivField('name', e.target.value)} />
          </div>
          <div style={{ marginBottom: "13px" }}>
            <label style={lbl}>Clips shipped this month (target 8–12)</label>
            <input style={inp} type="number" min="0" max="30" value={m.done} onChange={(e) => this.setDelivField('done', e.target.value)} />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={lbl}>Meta line</label>
            <input style={inp} value={m.meta || ''} placeholder="34 PHOTOS · 6 ADS LIVE · REVIEW CALL JUL 29" onChange={(e) => this.setDelivField('meta', e.target.value)} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
            {m.id ? (
              <button onClick={() => this.removeDeliv()} style={{ background: "transparent", border: "1px solid rgba(255,48,64,.4)", color: "var(--live)", fontWeight: 800, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase", borderRadius: "3px" }}>Delete</button>
            ) : <span />}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeDeliv()} style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", fontWeight: 800, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase", borderRadius: "3px" }}>Cancel</button>
              <button onClick={() => this.saveDeliv()} style={{ background: "var(--gold)", border: "none", color: "var(--golddark)", fontWeight: 900, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase", borderRadius: "3px" }}>{m.id ? "Save" : "Track"}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderVals() {
    const motionOn = this.props.enableMotion ?? true;
    const an = (s) => motionOn ? s : 'none';
    const collected = this.collected();
    const gap = Math.max(0, this.GOAL - collected);
    const pct = Math.min(100, this.GOAL ? collected / this.GOAL * 100 : 0);
    const open = this.openDeals();
    const openSum = open.reduce((a, d) => a + (+d.value || 0), 0);
    const cover = gap ? (openSum / gap).toFixed(1) + '×' : '∞';
    const coverBad = gap ? openSum / gap < 3 : false;
    const ff = this.ff();
    const ffNum = (k) => { const v = ff[k]; return (v === undefined || v === null || v === '') ? '' : v; };
    const manualClips = (ff.manual && ff.manual.clips != null && ff.manual.clips !== '') ? ff.manual.clips : '';
    const fmtK = (n) => { n = +n || 0; return n >= 1000 ? '$' + (Math.round(n / 100) / 10) + 'K' : '$' + n; };

    const tiles = [
      { label: 'COLLECTED', val: this.fmt(collected), sub: 'OF ' + this.fmt(this.GOAL) + ' TARGET', edge: 'var(--line)', top: 'var(--gold)', labelColor: 'var(--gold)', valColor: 'var(--gold)', subColor: 'var(--dim)' },
      { label: 'SIGNED · IN-YEAR', val: this.fmt(this.signed()), sub: 'CONTRACTS WON', edge: 'var(--line)', top: 'var(--white)', labelColor: 'var(--muted)', valColor: 'var(--white)', subColor: 'var(--dim)' },
      { label: 'OPEN PIPELINE', val: this.fmt(openSum), sub: open.length + ' LIVE DEALS', edge: 'var(--line)', top: 'var(--white)', labelColor: 'var(--muted)', valColor: 'var(--white)', subColor: 'var(--dim)' },
      coverBad
        ? { label: 'COVERAGE', val: cover, sub: 'NEED ≥3× · UNDER PRESSURE', edge: 'rgba(255,48,64,.45)', top: 'var(--live)', labelColor: '#ff8a94', valColor: '#ff8a94', subColor: '#b0596a' }
        : { label: 'COVERAGE', val: cover, sub: 'NEED ≥3× · HEALTHY', edge: 'var(--line)', top: 'var(--good)', labelColor: 'var(--good)', valColor: 'var(--good)', subColor: 'var(--dim)' }
    ];

    const ffDefs = [
      { key: 'calls', label: 'Calls held', floor: 'floor 3', min: 3 },
      { key: 'proposals', label: 'Audits delivered', floor: 'floor 2', min: 2 },
      { key: 'signed', label: '$ signed / wk', floor: ' ', min: null },
      { key: 'collected', label: '$ collected / wk', floor: ' ', min: null },
      { key: 'clips', label: 'Clips shipped', floor: 'floor 8', min: 8, manual: true }
    ];
    const ff5 = ffDefs.map(f => {
      const v = f.manual ? manualClips : ffNum(f.key);
      let edge = 'var(--line)', floorColor = 'var(--dim)';
      if (f.min != null && v !== '') { const hit = (+v >= f.min); edge = hit ? 'rgba(46,224,111,.5)' : 'rgba(255,48,64,.55)'; floorColor = hit ? 'var(--good)' : 'var(--live)'; }
      return { label: f.label, floor: f.floor, val: v, edge, floorColor, onChange: (e) => f.manual ? this.setManualVal('clips', e.target.value) : this.setFF(f.key, e.target.value) };
    });

    let warn = '';
    if (coverBad) warn = 'Pipeline coverage is under 3× the gap. Book two more Authority Audits this week and sell the next open capture day.';

    const callsDone = (+ffNum('calls') || 0) >= 3;
    const auditsDone = (+ffNum('proposals') || 0) >= 2;
    const clipsDone = (+manualClips || 0) >= 8;
    const man = ff.manual || {};
    const floorDefs = [
      { text: '3 discovery calls held', on: callsDone, manual: null },
      { text: '2 Authority Audits delivered', on: auditsDone, manual: null },
      { text: '8 short-form clips shipped', on: clipsDone, manual: null },
      { text: '5 audit invites to the cold list', on: !!man.invites, manual: 'invites' },
      { text: '1 proof asset posted (every 2 wks)', on: !!man.proof, manual: 'proof' }
    ];
    const floor = floorDefs.map(f => ({
      text: f.text, check: f.on ? '✓' : '',
      box: f.on ? 'var(--gold)' : 'transparent',
      boxEdge: f.on ? 'var(--gold)' : 'var(--line)',
      tc: f.on ? 'var(--dim)' : 'var(--white)',
      cursor: f.manual ? 'pointer' : 'default',
      onClick: f.manual ? () => this.toggleManual(f.manual) : () => {}
    }));

    const next = open.slice().sort((a, b) => (a.date || '9') < (b.date || '9') ? -1 : 1).slice(0, 5).map(d => ({
      label: d.name, sub: '· ' + d.stage, val: this.fmt(d.value),
      onClick: () => { this.setState({ view: 'pipeline' }); this.flash('JUMP → THE STANDINGS'); }
    }));

    // --- Shoots: group capture days by month (current + next), derived live ---
    const moAbbr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const moFull = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const dnames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const nowD = new Date(this.state.now);
    const monthKey = (y, m) => y + '-' + String(m + 1).padStart(2, '0');
    const curKey = monthKey(nowD.getFullYear(), nowD.getMonth());
    const nextD = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 1);
    const nextKey = monthKey(nextD.getFullYear(), nextD.getMonth());
    const allShoots = (this.state.shoots || []).slice().sort((a, b) => ((a.date || '') < (b.date || '') ? -1 : 1));
    const inMonth = (sh, key) => (sh.date || '').slice(0, 7) === key;
    const curShoots = allShoots.filter(sh => inMonth(sh, curKey));
    const nextShoots = allShoots.filter(sh => inMonth(sh, nextKey));
    const shootView = (sh) => {
      const isOpen = sh.status === 'OPEN';
      const d2 = sh.date ? new Date(sh.date + 'T00:00:00') : nowD;
      return {
        day: (sh.date || '').slice(8, 10), mon: moAbbr[d2.getMonth()], dow: dnames[d2.getDay()],
        client: sh.client || 'OPEN SLOT — TICKETS AVAILABLE', kind: sh.kind || (isOpen ? 'SELL THIS DAY' : ''), status: sh.status,
        bg: isOpen ? 'rgba(255,184,28,.07)' : 'var(--deep)',
        edge: isOpen ? 'rgba(255,184,28,.5)' : 'var(--line)',
        headBg: isOpen ? 'var(--gold)' : 'var(--panel2)',
        headFg: isOpen ? 'var(--golddark)' : 'var(--muted)',
        statusColor: isOpen ? 'var(--golddark)' : 'var(--good)',
        dayColor: isOpen ? 'var(--gold)' : 'var(--white)',
        clientColor: isOpen ? 'var(--gold2)' : 'var(--white)',
        onClick: () => this.openShoot(sh)
      };
    };
    const shoots = curShoots.slice(0, 4).map(shootView);
    const shootsAll = curShoots.map(shootView);
    const nextShootsView = nextShoots.map(shootView);
    const curMonthName = moFull[nowD.getMonth()];
    const nextMonthName = moFull[nextD.getMonth()];
    const curBooked = curShoots.filter(sh => sh.status !== 'OPEN').length;
    const nextSold = nextShoots.filter(sh => sh.status !== 'OPEN').length;
    const curMonthLabel = curShoots.length ? ('· ' + curBooked + ' OF ' + curShoots.length + ' BOOKED') : '· NO CAPTURE DAYS YET';
    const nextMonthLabel = nextShoots.length ? ('· ' + nextSold + ' OF ' + nextShoots.length + ' SOLD — THE ONE THING') : '· PUBLISH THE CALENDAR';

    const delivs = (this.state.delivs || []).map(d => {
      const done = +d.done || 0;
      const p = Math.min(100, done / 12 * 100);
      const hit = done >= 8;
      return { name: d.name, clips: done + '/12', meta: d.meta || '—', pct: p, clipColor: hit ? 'var(--good)' : 'var(--gold)', barColor: hit ? 'var(--good)' : 'var(--gold)', onClick: () => this.openDeliv(d) };
    });

    // --- Drive chart: every client advances four downs (derived, capped at 4 chips) ---
    const engineDefs = [
      { down: '1ST', name: 'AUDIT', tag: 'expose the cracks', head: 'white', clients: this.state.deals.filter(d => ['Audit Booked', 'Audit Done'].includes(d.stage)).slice(0, 4).map(d => ({ n: d.name, v: fmtK(d.value) })) },
      { down: '2ND', name: 'CAPTURE', tag: 'half-day story shoot', head: 'gold', clients: allShoots.filter(sh => sh.status !== 'OPEN' && sh.client).slice(0, 4).map(sh => ({ n: sh.client, v: moAbbr[new Date((sh.date || '') + 'T00:00:00').getMonth()] + ' ' + (sh.date || '').slice(8, 10) })) },
      { down: '3RD', name: 'DEPLOY', tag: 'ads · funnels · follow-up', head: 'gold', clients: (this.state.delivs || []).slice(0, 4).map(x => ({ n: x.name, v: (+x.done || 0) + ' clips' })) },
      { down: '4TH', name: 'LOOP', tag: 'review · retest · renew', head: 'white', clients: this.state.deals.filter(d => d.stage === 'Collected').slice(0, 4).map(d => ({ n: d.name, v: fmtK(d.value) })) }
    ];
    const engine = engineDefs.map(st => ({
      down: st.down, name: st.name, tag: st.tag,
      headBg: st.head === 'gold' ? 'var(--gold)' : 'var(--panel2)',
      headFg: st.head === 'gold' ? 'var(--golddark)' : 'var(--white)',
      headSub: st.head === 'gold' ? 'rgba(26,22,8,.65)' : 'var(--dim)',
      count: st.clients.length + ' LIVE',
      clients: st.clients
    }));

    const v = this.state.view;
    const stageC = { 'Lead': 'var(--dim)', 'Audit Booked': 'var(--gold)', 'Audit Done': 'var(--gold2)', 'Proposal': 'var(--white)', 'Signed': 'var(--good)', 'Collected': 'var(--good)' };
    const pipeCols = this.STAGES.map(st => {
      const ds = this.state.deals.filter(d => d.stage === st);
      return { stage: st, accent: stageC[st] || 'var(--dim)', sum: this.fmt(ds.reduce((a, d) => a + (+d.value || 0), 0)),
        deals: ds.map(d => ({ name: d.name, offer: d.offer, val: this.fmt(d.value), onClick: () => this.openDeal(d) })) };
    });
    const pStats = { weighted: this.fmt(this.weighted()), count: open.length, signed: this.fmt(this.signed()), signedN: this.state.deals.filter(d => ['Signed', 'Collected'].includes(d.stage)).length + ' DEALS', win: this.winRate() };

    const opsState = this.state.ops || {};
    const fleet = this.FLEET.map(a => {
      const ran = !!opsState['agent:' + a.name];
      return { init: a.init, ch: a.ch, name: a.name, role: a.role, cad: a.cad, accent: a.accent, dot: ran ? 'var(--good)' : '#33455f', status: ran ? 'ON AIR TODAY' : 'IDLE', btn: ran ? 'RESET' : 'MARK RUN', onToggle: () => this.toggleOp('agent:' + a.name) };
    });
    const opsChecklist = this.OPSLIST.map((o, i) => {
      const on = !!opsState['ops:' + i];
      return { text: o, check: on ? '✓' : '', box: on ? 'var(--gold)' : 'var(--line)', boxBg: on ? 'var(--gold)' : 'transparent', tc: on ? 'var(--dim)' : 'var(--white)', onClick: () => this.toggleOp('ops:' + i) };
    });
    const loopNodes = this.LOOP.map((n, i) => ({ label: n, arrow: i < this.LOOP.length - 1 ? '→' : '' }));

    const ladder = this.LADDER;
    const stepIdx = this.state.step || 0;
    const scriptSteps = this.SCRIPT.map((s, i) => ({
      n: s.n, l: s.l,
      bg: i === stepIdx ? 'var(--panel2)' : 'var(--deep)',
      bd: 'var(--line)',
      blk: i === stepIdx ? 'var(--gold)' : 'transparent',
      nc: i === stepIdx ? 'var(--gold)' : 'var(--dim)',
      fg: i === stepIdx ? 'var(--white)' : 'var(--muted)',
      onClick: () => this.goStep(i)
    }));
    const cs = this.SCRIPT[stepIdx] || this.SCRIPT[0];
    const curBlocks = (cs.blocks || []).map(b => ({ isSay: b.t === 'say', isAlt: b.t === 'sayalt', isNote: b.t === 'note', isQ: b.t === 'q', text: b.text || '', items: b.items || [] }));
    const canBack = stepIdx > 0; const canNext = stepIdx < this.SCRIPT.length - 1;

    const today = this.todayStr();
    const fToday = this.state.founder[this.fKey()] || {};
    const energyScale = [1, 2, 3, 4, 5].map(n => { const on = fToday.energy == n; return { n, bg: on ? 'var(--gold)' : 'var(--deep)', bd: on ? 'var(--gold)' : 'var(--line)', fg: on ? 'var(--golddark)' : 'var(--muted)', onClick: () => this.setF('energy', n) }; });
    const sleepScale = [5, 6, 7, 8, 9].map(n => { const on = fToday.sleep == n; return { n, bg: on ? 'var(--gold)' : 'var(--deep)', bd: on ? 'var(--gold)' : 'var(--line)', fg: on ? 'var(--golddark)' : 'var(--muted)', onClick: () => this.setF('sleep', n) }; });
    const togDefs = this.state.partner === 'EB'
      ? [['workout', 'Trained'], ['deep', 'Deep-work block'], ['camera', 'Shot something'], ['ate', 'Ate right']]
      : [['workout', 'Trained'], ['deep', 'Deep-work block'], ['calls', '3 conversations'], ['ate', 'Ate right']];
    const fToggles = togDefs.map(([k, l]) => { const on = !!fToday[k]; return { label: l, bd: on ? 'rgba(46,224,111,.4)' : 'var(--line)', box: on ? 'var(--good)' : 'var(--line)', boxBg: on ? 'var(--good)' : 'transparent', cc: on ? '#06140d' : 'transparent', check: on ? '✓' : '', onClick: () => this.setF(k, !fToday[k]) }; });
    const noteVal = fToday.note || '';
    const onNote = (e) => this.setF('note', e.target.value);
    const weekStrip = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const ds = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      const e = this.state.founder[this.state.partner + '|' + ds] || {};
      const sc = e.energy || 0;
      weekStrip.push({ dw: dnames[dt.getDay()], n: sc || '·', nc: sc >= 4 ? 'var(--good)' : sc >= 2 ? 'var(--gold)' : sc ? 'var(--live)' : 'var(--dim)', d1: e.workout ? 'var(--gold)' : '#22344f', d2: (e.calls || e.camera) ? 'var(--white)' : '#22344f' });
    }
    const partnerTabs = this.PARTNERS.map(p => {
      const on = p.init === this.state.partner;
      return { init: p.init, name: p.name, role: p.role, bg: on ? 'var(--panel2)' : 'var(--deep)', bd: on ? 'var(--gold)' : 'var(--line)', initC: on ? 'var(--gold)' : 'var(--dim)', nameC: on ? 'var(--white)' : 'var(--muted)', onClick: () => this.setState({ partner: p.init }) };
    });
    const curP = this.PARTNERS.find(p => p.init === this.state.partner) || this.PARTNERS[0];

    const habitsView = this.state.habits.map(h => {
      const on = !!(h.days && h.days[today]); const sk = this.habitStreak(h);
      return { name: h.name, owner: h.owner || 'BOTH', box: on ? 'var(--good)' : 'var(--line)', boxBg: on ? 'var(--good)' : 'transparent', cc: on ? '#06140d' : 'var(--dim)', check: on ? '✓' : '', streak: sk, streakL: sk === 1 ? 'DAY' : 'DAYS', onToggle: () => this.toggleHabit(h.id) };
    });
    const goalsView = this.state.goals.map(g => {
      const prog = g.target ? (g.id === 'g1' ? collected : (g.progress || 0)) : 0;
      const pctG = g.target ? Math.min(100, prog / g.target * 100) : 0;
      return { text: g.text, owner: g.owner || 'BOTH', check: g.done ? '✓' : '', box: g.done ? 'var(--gold)' : 'var(--line)', boxBg: g.done ? 'var(--gold)' : 'transparent', cc: g.done ? 'var(--golddark)' : 'var(--dim)', tc: g.done ? 'var(--dim)' : 'var(--white)', deco: g.done ? 'line-through' : 'none', type: g.type === 'life' ? 'LIFE' : 'BUSINESS', typeC: g.type === 'life' ? 'var(--white)' : 'var(--gold)', hasBar: !!g.target, pct: pctG, progLabel: g.target ? this.fmt(prog) + ' / ' + this.fmt(g.target) : '', onToggle: () => this.toggleGoal(g.id) };
    });
    const dd = new Date(); const dayFull = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayLabel = dayFull[dd.getDay()] + ' · ' + moAbbr[dd.getMonth()] + ' ' + dd.getDate();

    // Documents keep the engine's paste-a-link behavior (ops['doclink:<name>']).
    const docsView = this.DOCS.map(g => ({ cat: g.cat, items: g.items.map(it => {
      const url = opsState['doclink:' + it.name] || '';
      return { name: it.name, fmt: it.fmt, meta: url ? 'Linked · click to open' : it.meta, tag: url ? 'LINK' : (it.tag || ''), hasTag: !!(url || it.tag), onClick: () => this.openDoc(it, url) };
    }) }));
    const phaseC = { ACTIVE: 'var(--gold)', NEXT: 'var(--white)', QUEUED: 'var(--dim)' };
    const plansPhases = this.PLANS.map(p => ({ n: p.n, t: p.t, when: p.when, d: p.d, state: p.state, c: phaseC[p.state] || 'var(--dim)' }));
    const planMoves = this.PLANMOVES.map((m, i) => { const on = !!opsState['plan:' + i]; return { text: m, check: on ? '✓' : '', box: on ? 'var(--gold)' : 'var(--line)', boxBg: on ? 'var(--gold)' : 'transparent', tc: on ? 'var(--dim)' : 'var(--white)', onClick: () => this.toggleOp('plan:' + i) }; });

    const sections = this.SECTIONS.map(s => {
      const active = s.id === v;
      return { num: s.num, label: s.label, bar: active ? 'var(--gold)' : 'transparent', fg: active ? 'var(--white)' : 'var(--dim)', code: active ? 'var(--gold)' : 'var(--dim)', onSelect: () => this.setState({ view: s.id }) };
    });

    const d = new Date(this.state.now);
    const pad = (n) => String(n).padStart(2, '0');
    const clock = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    const date = pad(d.getDate()) + ' ' + moAbbr[d.getMonth()] + ' ' + d.getFullYear();
    const q = Math.floor(d.getMonth() / 3) + 1;
    const scoreUs = collected >= 1000 ? (collected / 1000).toFixed(1) + 'K' : String(collected);
    const goalShort = this.GOAL >= 1000 ? Math.round(this.GOAL / 1000) + 'K' : String(this.GOAL);
    const counting = this.state.booting && this.state.bootIdx < this.COUNT.length;

    // Bottomline ticker: live agent wire, newest last (falls back to the static line).
    const tickerItems = (this.state.log || []).slice(-6).map(l => (l.tag + ': ' + l.msg).toUpperCase());
    if (!tickerItems.length) tickerItems.push('CREATIVE IMPACT OS — LIVE', 'THE DRIVE TO ' + goalShort + ' IS ON', 'AGENT RUNS APPEAR HERE AS THEY HAPPEN');
    tickerItems.push('TARGET: CHARLOTTE AUTHORITY');

    return {
      booting: this.state.booting,
      countShow: counting,
      countNum: this.COUNT[Math.min(this.state.bootIdx, this.COUNT.length - 1)],
      bootReady: this.state.booting && !counting,
      animCount: an('popcount .95s ease both'),
      dismissBoot: () => this.dismiss(),
      skipBoot: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.dismiss(); },
      tickerOn: this.props.showTicker ?? true,
      tickerItems,
      animPulse: an('pulse 1.4s ease-in-out infinite'),
      animTicker: an('marq 32s linear infinite'),
      sections,
      isCommand: v === 'command',
      isPipeline: v === 'pipeline',
      isAudits: v === 'audits',
      isShoots: v === 'shoots',
      isAgents: v === 'agents',
      isPartners: v === 'partners',
      isDocs: v === 'docs',
      isStrategy: v === 'strategy',
      isPlans: v === 'plans',
      clock, date,
      quarter: 'Q' + q,
      scoreUs, goalShort,
      goalFmt: this.fmt(this.GOAL),
      collectedFmt: this.fmt(collected),
      pct,
      pctLabel: pct.toFixed(0) + '%',
      yardLine: Math.round(pct),
      gapText: collected >= this.GOAL ? 'GOAL CLEARED — BANK IT' : this.fmt(gap) + ' TO GO',
      sellDays: this.daysTo(this.SELLBY),
      deadDays: this.daysTo(this.DEADLINE),
      sellByLabel: (this.SELLBY || '').slice(5, 7) && moAbbr[+(this.SELLBY || '').slice(5, 7) - 1] + ' ' + +(this.SELLBY || '').slice(8, 10),
      deadlineLabel: (this.DEADLINE || '').slice(5, 7) && moAbbr[+(this.DEADLINE || '').slice(5, 7) - 1] + ' ' + +(this.DEADLINE || '').slice(8, 10),
      oneThingTitle: this.ONE_TITLE,
      oneThingBody: this.ONE_BODY,
      clipsFmt: (manualClips === '' ? 0 : manualClips) + '/12',
      tiles, ff5, warn, floor, next, engine,
      shoots, shootsAll, nextShootsView, curMonthName, nextMonthName, curMonthLabel, nextMonthLabel,
      runsheet: this.RUNSHEET, delivs,
      addShoot: () => this.openShoot(null),
      addDeliv: () => this.openDeliv(null),
      addDeal: () => this.openDeal(null),
      pipeCols, pStats,
      fleet, opsChecklist, loopNodes, log: this.state.log.map(l => ({ t: l.t, tag: l.tag, color: l.color, msg: l.msg })),
      ladder, scriptSteps, curBlocks, curGoal: cs.goal,
      backOpacity: canBack ? '1' : '.28', nextOpacity: canNext ? '1' : '.28',
      backStep: () => this.goStep(stepIdx - 1), nextStep: () => this.goStep(stepIdx + 1),
      objections: this.OBJECTIONS, showObj: this.state.showObj, showScript: !this.state.showObj,
      objBtnLabel: this.state.showObj ? '← BACK TO RUNDOWN' : 'OBJECTION HANDLING →',
      toggleObj: () => this.toggleObj(),
      partnerTabs, curPartnerName: curP.name.toUpperCase(),
      energyScale, sleepScale, fToggles, noteVal, onNote, weekStrip, habitsView, goalsView, todayLabel,
      addHabit: () => this.addHabit(), addGoal: () => this.addGoal(),
      docsView,
      stratThesis: this.STRATEGY.thesis, stratPillars: this.STRATEGY.pillars, stratBets: this.STRATEGY.bets, stratAnti: this.STRATEGY.antigoals,
      plansPhases, planMoves,
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
        style={{ position: "fixed", bottom: "48px", left: "14px", zIndex: 80, background: "rgba(10,10,12,.85)", border: "1px solid var(--line2)", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".16em", padding: "6px 11px", cursor: "pointer", textTransform: "uppercase" }}
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
    const inp = { width: "100%", background: "var(--deep)", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    return (
      <div onClick={() => this.closeDeal()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "420px", maxWidth: "100%", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "26px", letterSpacing: ".01em" }}>{m.id ? "EDIT DEAL" : "NEW DEAL"}</div>
            <button onClick={() => this.closeDeal()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ marginBottom: "13px" }}>
            <label style={lbl}>Client / Deal name</label>
            <input style={inp} value={m.name} onChange={(e) => this.setDealField("name", e.target.value)} placeholder="Queen City HVAC" />
          </div>
          <div style={{ marginBottom: "13px" }}>
            <label style={lbl}>Offer</label>
            <input style={inp} value={m.offer} onChange={(e) => this.setDealField("offer", e.target.value)} placeholder="Authority Engine · 3-mo term" />
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
              <button onClick={() => this.removeDeal()} style={{ background: "transparent", border: "1px solid rgba(255,48,64,.4)", color: "var(--live)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button>
            ) : <span />}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeDeal()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
              <button onClick={() => this.saveDeal()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>{m.id ? "Save" : "Add deal"}</button>
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
    const stC = { draft: 'var(--dim)', sent: 'var(--cream)', paid: 'var(--good)', void: 'rgba(255,48,64,.55)' };

    const Stat = (label, val, sub, accent) => (
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid " + (accent || "var(--line2)"), padding: "15px 18px" }}>
        <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>{label}</div>
        <div style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "38px", lineHeight: ".9", color: "var(--cream)", marginTop: "6px" }}>{val}</div>
        <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>{sub}</div>
      </div>
    );

    return (
      <div style={{ padding: "28px 26px 96px", maxWidth: "1240px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 11 · GET PAID</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>INV<span style={{ display: "inline-block", background: "var(--red)", color: "var(--golddark)", padding: "0 12px", transform: "skewX(0deg)" }}>OICES</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Build it, send the link, get paid. PIF or 50% deposit — never discount month one.</div>
          </div>
          <Hover as="button" onClick={() => this.openInvoice(null)} baseStyle={{ flexShrink: 0, marginTop: "6px", background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>+ New Invoice</Hover>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "20px" }}>
          {Stat('OUTSTANDING', this.fmt(outstanding), 'SENT, NOT YET PAID', outstanding ? 'var(--red)' : 'var(--line2)')}
          {Stat('COLLECTED', this.fmt(paid), 'PAID INVOICES', 'var(--good)')}
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
              <Hover as="div" key={inv.id} onClick={() => this.openInvoice(inv)} baseStyle={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr .9fr 1fr", gap: "10px", padding: "13px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", alignItems: "center", fontSize: "13px" }} hoverStyle={{ background: "var(--panel2)" }}>
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
    const inp = { width: "100%", background: "var(--deep)", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    const total = this.invTotal(m.items);
    return (
      <div onClick={() => this.closeInvoice()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "640px", maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
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
            <div style={{ flex: 1 }}><label style={lbl}>Title</label><input style={inp} value={m.title} placeholder="Authority Engine · 3-mo term" onChange={(e) => this.setInvoiceField('title', e.target.value)} /></div>
            <div style={{ width: "150px" }}><label style={lbl}>Due date</label><input style={inp} type="date" value={m.due || ''} onChange={(e) => this.setInvoiceField('due', e.target.value)} /></div>
          </div>

          <label style={lbl}>Line items</label>
          <div style={{ border: "1px solid var(--line2)", marginBottom: "13px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 110px 110px 32px", gap: "8px", padding: "8px 10px", borderBottom: "1px solid var(--line2)", fontSize: "9px", letterSpacing: ".1em", color: "var(--dim)", textTransform: "uppercase" }}>
              <div>Description</div><div>Qty</div><div>Unit $</div><div>Amount</div><div></div>
            </div>
            {m.items.map((it, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 110px 110px 32px", gap: "8px", padding: "7px 10px", alignItems: "center", borderBottom: "1px solid var(--panel2)" }}>
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
              <button onClick={() => this.removeInvoice()} style={{ background: "transparent", border: "1px solid rgba(255,48,64,.4)", color: "var(--live)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button>
            ) : <span />}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {m.id ? <button onClick={() => this.toggleInvoicePaid()} style={{ background: "transparent", border: "1px solid " + (m.status === 'paid' ? 'rgba(46,224,111,.5)' : 'var(--line2)'), color: m.status === 'paid' ? 'var(--good)' : 'var(--muted)', fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>{m.status === 'paid' ? '✓ Paid' : 'Mark paid'}</button> : null}
              <button onClick={() => this.copyPayLink()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Copy pay link</button>
              <button onClick={() => this.saveInvoiceClose()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>Save</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Proposals + e-sign (Phase 3: HoneyBook replacement, slice 3) ---
  LADDER_PRESETS = [
    { desc: 'Authority Diagnostic', unit: 750 },
    { desc: 'Story Capture Pilot', unit: 2400 },
    { desc: 'Authority Engine (per month)', unit: 3500 },
    { desc: 'Authority Engine · 3-mo term', unit: 10500 },
    { desc: 'Market Domination (per month)', unit: 6000 },
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
    const stC = { draft: 'var(--dim)', sent: 'var(--cream)', accepted: 'var(--good)', declined: 'rgba(255,48,64,.55)' };
    const Stat = (label, val, sub, accent) => (
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid " + (accent || "var(--line2)"), padding: "15px 18px" }}>
        <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "var(--dim)" }}>{label}</div>
        <div style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "38px", lineHeight: ".9", color: "var(--cream)", marginTop: "6px" }}>{val}</div>
        <div style={{ fontSize: "9.5px", letterSpacing: ".1em", color: "var(--muted)", marginTop: "4px" }}>{sub}</div>
      </div>
    );
    return (
      <div style={{ padding: "28px 26px 96px", maxWidth: "1240px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 12 · CLOSE IT</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>PRO<span style={{ display: "inline-block", background: "var(--red)", color: "var(--golddark)", padding: "0 12px", transform: "skewX(0deg)" }}>POSALS</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Send it, they accept &amp; sign, it drops straight into your pipeline as Signed. Build off the ladder — never discount month one.</div>
          </div>
          <Hover as="button" onClick={() => this.openProposal(null)} baseStyle={{ flexShrink: 0, marginTop: "6px", background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>+ New Proposal</Hover>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "20px" }}>
          {Stat('SENT', String(sent), 'AWAITING SIGNATURE', sent ? 'var(--cream)' : 'var(--line2)')}
          {Stat('ACCEPTED', String(accepted.length), 'SIGNED', 'var(--good)')}
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
              <Hover as="div" key={p.id} onClick={() => this.openProposal(p)} baseStyle={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr .9fr 1.1fr", gap: "10px", padding: "13px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", alignItems: "center", fontSize: "13px" }} hoverStyle={{ background: "var(--panel2)" }}>
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
    const inp = { width: "100%", background: "var(--deep)", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    const total = this.invTotal(m.items);
    return (
      <div onClick={() => this.closeProposal()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "660px", maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
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
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 110px 110px 32px", gap: "8px", padding: "7px 10px", alignItems: "center", borderBottom: "1px solid var(--panel2)" }}>
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
              <button onClick={() => this.removeProposal()} style={{ background: "transparent", border: "1px solid rgba(255,48,64,.4)", color: "var(--live)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button>
            ) : <span />}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={() => this.copyProposalLink()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Copy sign link</button>
              <button onClick={() => this.saveProposalClose()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>Save</button>
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
    const inp = { width: "100%", background: "var(--deep)", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    const types = ['short', 'long', 'email', 'phone', 'choice', 'date'];
    return (
      <div onClick={() => this.closeIntakeSettings()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "640px", maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "26px", letterSpacing: ".01em" }}>INTAKE FORM</div>
            <button onClick={() => this.closeIntakeSettings()} style={{ background: "none", border: "none", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ marginBottom: "14px" }}><label style={lbl}>Form title (shown to leads)</label><input style={inp} value={m.title} onChange={(e) => this.setIntakeTitle(e.target.value)} /></div>

          <label style={lbl}>Questions</label>
          <div style={{ border: "1px solid var(--line2)", marginBottom: "12px" }}>
            {m.fields.map((f, i) => (
              <div key={f.id || i} style={{ padding: "9px 10px", borderBottom: i < m.fields.length - 1 ? "1px solid var(--panel2)" : "none" }}>
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
              <button onClick={() => this.saveIntakeSettings()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>Save form</button>
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
      <div style={{ padding: "28px 26px 96px", maxWidth: "1240px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 15 · WHERE IT LEAKS</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>EXP<span style={{ display: "inline-block", background: "var(--red)", color: "var(--golddark)", padding: "0 12px", transform: "skewX(0deg)" }}>ENSES</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Every dollar out, next to the dollars in. Recurring is the silent killer — audit the subscriptions monthly.</div>
          </div>
          <Hover as="button" onClick={() => this.openExpense(null)} baseStyle={{ flexShrink: 0, marginTop: "6px", background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>+ Add Expense</Hover>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" }}>
          {Stat('SPENT · ' + monthName, this.fmt(spentMo), 'THIS MONTH', spentMo ? 'var(--red)' : 'var(--line2)')}
          {Stat('RECURRING BURN', this.fmt(burn), 'SUBSCRIPTIONS / MO', burn ? 'var(--red)' : 'var(--line2)')}
          {Stat('COLLECTED · ' + monthName, this.fmt(collectedMo), 'PAID INVOICES', 'var(--good)')}
          {Stat('NET · ' + monthName, this.fmt(net), 'COLLECTED − EXPENSES', net >= 0 ? 'var(--good)' : 'var(--red)')}
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
              <Hover as="div" key={x.id} onClick={() => this.openExpense(x)} baseStyle={{ display: "grid", gridTemplateColumns: ".9fr 1.6fr 1fr .9fr .8fr", gap: "10px", padding: "12px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer", alignItems: "center", fontSize: "13px" }} hoverStyle={{ background: "var(--panel2)" }}>
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
    const inp = { width: "100%", background: "var(--deep)", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    return (
      <div onClick={() => this.closeExpense()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "440px", maxWidth: "100%", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
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
            {m.id ? <button onClick={() => this.removeExpense()} style={{ background: "transparent", border: "1px solid rgba(255,48,64,.4)", color: "var(--live)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button> : <span />}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeExpense()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
              <button onClick={() => this.saveExpense()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>{m.id ? "Save" : "Add"}</button>
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
    { name: 'Audits delivered', unit: '#', target: 2, cadence: 'weekly' },
    { name: 'Clips shipped', unit: '#', target: 8, cadence: 'weekly' },
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
      <div style={{ padding: "28px 26px 96px", maxWidth: "1240px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 14 · WHAT GETS MEASURED</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>THE <span style={{ display: "inline-block", background: "var(--red)", color: "var(--golddark)", padding: "0 12px", transform: "skewX(0deg)" }}>NUMBERS</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Define the numbers that matter, log them every period, watch the trend. A KPI without a number is an opinion.</div>
          </div>
          <Hover as="button" onClick={() => this.openKpi(null)} baseStyle={{ flexShrink: 0, marginTop: "6px", background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>+ Add KPI</Hover>
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
                <div key={k.id} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "2px solid " + (cur === '' ? 'var(--line2)' : hit ? 'var(--good)' : hasTarget ? 'var(--red)' : 'var(--cream)'), padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                    <button onClick={() => this.openKpi(k)} style={{ background: "none", border: "none", color: "var(--cream)", fontFamily: "var(--cond)", fontWeight: 800, fontSize: "17px", letterSpacing: ".02em", cursor: "pointer", padding: 0, textAlign: "left" }}>{k.name.toUpperCase()} <span style={{ color: "var(--dim)", fontSize: "10px", letterSpacing: ".14em" }}>{k.cadence.toUpperCase()}</span></button>
                    {hasTarget ? <span style={{ fontSize: "10px", letterSpacing: ".1em", color: hit ? 'var(--good)' : 'var(--dim)' }}>TARGET {this.kpiFmt(k, k.target)}</span> : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "14px" }}>
                    <div style={{ flex: "0 0 120px" }}>
                      <div style={{ fontSize: "9px", letterSpacing: ".14em", color: "var(--dim)", marginBottom: "4px" }}>{this.kpiPeriodLabel(k, 0)} · THIS {k.cadence === 'monthly' ? 'MONTH' : 'WEEK'}</div>
                      <input
                        type="number" step="any" value={cur} placeholder="0"
                        onChange={(e) => this.setKpiLocal(k, e.target.value)}
                        onBlur={() => this.persistKpi(k)}
                        style={{ width: "100%", background: "var(--deep)", border: "1px solid " + (cur === '' ? 'var(--line2)' : hit ? 'rgba(46,224,111,.5)' : hasTarget ? 'rgba(255,48,64,.55)' : 'var(--line2)'), color: "var(--cream)", textAlign: "center", fontFamily: "var(--cond)", fontWeight: 800, fontSize: "26px", padding: "6px 4px" }}
                      />
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "6px", height: "62px" }}>
                      {hist.map((h, i) => (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                          <div style={{ fontSize: "8.5px", color: "var(--muted)" }}>{this.kpiFmt(k, h.v)}</div>
                          <div style={{ width: "100%", height: Math.max(3, Math.round(((+h.v || 0) / maxV) * 38)) + "px", background: (+h.v || 0) === 0 ? 'var(--panel2)' : (hasTarget && +h.v >= +k.target ? 'rgba(46,224,111,.5)' : 'var(--red2)') }}></div>
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
    const inp = { width: "100%", background: "var(--deep)", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    return (
      <div onClick={() => this.closeKpi()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "420px", maxWidth: "100%", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
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
            {m.id ? <button onClick={() => this.removeKpi()} style={{ background: "transparent", border: "1px solid rgba(255,48,64,.4)", color: "var(--live)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button> : <span />}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => this.closeKpi()} style={{ background: "transparent", border: "1px solid var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 14px", cursor: "pointer", textTransform: "uppercase" }}>Cancel</button>
              <button onClick={() => this.saveKpi()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>{m.id ? "Save" : "Add"}</button>
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
    const inp = { width: "100%", background: "var(--deep)", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    const fmtAt = (iso) => { try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
    return (
      <div onClick={() => this.closeEmailThread()} style={{ position: "fixed", inset: 0, zIndex: 91, background: "rgba(4,4,5,.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "620px", maxWidth: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "3px solid var(--red)" }}>
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
              <button onClick={() => this.sendEmailMsg()} disabled={m.sending} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 20px", cursor: m.sending ? "default" : "pointer", textTransform: "uppercase", opacity: m.sending ? .6 : 1 }}>{m.sending ? 'Sending…' : 'Send →'}</button>
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
        if (j.actions && j.actions.length) { this.flash('SHOWRUNNER: ' + j.actions.length + ' ACTION' + (j.actions.length > 1 ? 'S' : '') + ' EXECUTED'); this.loadStore(); }
      } else {
        const msg = j.error === 'no_api_key' ? 'ANTHROPIC_API_KEY missing in Vercel — Showrunner is offline.' : j.error === 'no_service_role' ? 'SUPABASE_SERVICE_ROLE_KEY missing — Showrunner cannot act.' : 'Error: ' + (j.error || 'unknown') + '. Try again.';
        this.setState(s => ({ rookieMsgs: [...s.rookieMsgs, { role: 'assistant', content: msg, actions: [] }], rookieBusy: false }));
      }
    } catch (e) {
      this.setState(s => ({ rookieMsgs: [...s.rookieMsgs, { role: 'assistant', content: 'Connection failed — try again.', actions: [] }], rookieBusy: false }));
    }
  }

  renderRookieTab() {
    const msgs = this.state.rookieMsgs || [];
    const inp = { background: "var(--deep)", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "11px 13px" };
    const chips = ['Log my box score: 3 calls, 2 audits, $3500 signed, $2400 collected', 'Add a deal: Queen City HVAC, Authority Engine · 3-mo term, $10500', "What's my coverage?", 'Log expense: Adobe $60/mo recurring', "Change THE ONE THING to: Sell out August's four capture days", "Draft an email to NoDa Med Spa: this month's clips are live"];
    return (
      <div style={{ padding: "28px 26px 96px", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 16 · THE SHOWRUNNER DESK</div>
          <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>SHOW<span style={{ display: "inline-block", background: "var(--red)", color: "var(--golddark)", padding: "0 12px", transform: "skewX(0deg)" }}>RUNNER</span></h1>
          <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "620px", lineHeight: "1.6" }}>Give the order; Showrunner executes it against the OS — deals, the box score, clients, expenses, KPIs — and reports back with the numbers. Every action hits the database and the sys.log.</div>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(90deg,var(--red),transparent 55%)", margin: "16px 0 22px" }}></div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", height: "56vh" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            {msgs.length === 0 ? (
              <div>
                <div style={{ color: "var(--dim)", fontSize: "12.5px", lineHeight: 1.7, marginBottom: "14px" }}>Showrunner online. Standing by for orders. Try:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                  {chips.map((c, i) => (
                    <button key={i} onClick={() => this.setState({ rookieInput: c }, () => this.sendRookie())} style={{ background: "transparent", border: "1px dashed var(--line2)", color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "11px", padding: "8px 12px", cursor: "pointer", textAlign: "left" }}>▸ {c}</button>
                  ))}
                </div>
              </div>
            ) : msgs.map((m, i) => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "9px", letterSpacing: ".18em", color: m.role === 'user' ? 'var(--cream)' : 'var(--red)', textTransform: "uppercase", marginBottom: "4px" }}>{m.role === 'user' ? '> YOU' : '◉ SHOWRUNNER'}</div>
                <div style={{ fontSize: "13px", color: m.role === 'user' ? "var(--cream)" : "var(--muted)", lineHeight: 1.65, whiteSpace: "pre-wrap", borderLeft: "2px solid " + (m.role === 'user' ? 'var(--line2)' : 'var(--red)'), paddingLeft: "12px" }}>{m.content}{m.fileName ? <span style={{ display: "inline-block", marginLeft: "8px", border: "1px solid var(--line2)", color: "var(--dim)", fontSize: "9.5px", padding: "2px 7px", letterSpacing: ".06em" }}>📎 {m.fileName}</span> : null}</div>
                {m.actions && m.actions.length ? (
                  <div style={{ marginTop: "6px", paddingLeft: "14px" }}>
                    {m.actions.map((a, k) => (<div key={k} style={{ fontSize: "10.5px", color: "var(--good)", lineHeight: 1.6 }}>✓ {a}</div>))}
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
              <span style={{ color: "var(--dim)", fontSize: "10px" }}>— tell Showrunner what to do with it (e.g. "log these as expenses")</span>
            </div>
          ) : null}
          <div style={{ borderTop: "1px solid var(--line)", padding: "12px 14px", display: "flex", gap: "10px" }}>
            <label title="Attach a receipt, statement, PDF, or CSV (3.5MB max)" style={{ border: "1px solid var(--line2)", color: "var(--muted)", padding: "10px 13px", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>
              📎<input type="file" accept="image/*,application/pdf,.csv,.txt" onChange={(e) => this.pickRookieFile(e)} style={{ display: "none" }} />
            </label>
            <input
              style={Object.assign({}, inp, { flex: 1 })}
              value={this.state.rookieInput}
              placeholder={this.state.rookieFile ? "What should Showrunner do with the file?" : "Give an order — Showrunner writes it to the OS"}
              onChange={(e) => this.setState({ rookieInput: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') this.sendRookie(); }}
            />
            <button onClick={() => this.sendRookie()} disabled={this.state.rookieBusy} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "11px", letterSpacing: ".12em", padding: "11px 20px", cursor: this.state.rookieBusy ? "default" : "pointer", textTransform: "uppercase", opacity: this.state.rookieBusy ? .5 : 1 }}>Execute →</button>
          </div>
        </div>
        <div style={{ fontSize: "10px", color: "var(--dim)", marginTop: "10px", lineHeight: 1.5 }}>Write-safe: Showrunner can add and update — including the sprint target, THE ONE THING, goals, and strategy — but cannot delete anything. 📎 attach a receipt, statement, PDF, or CSV and he'll extract + log the expenses. Conversation resets on refresh (persistence later).</div>
      </div>
    );
  }

  renderSchedulingTab() {
    const cfg = this.bookingCfg();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const lbl = { fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: ".2em", color: "var(--dim)", textTransform: "uppercase", display: "block", marginBottom: "5px" };
    const inp = { background: "var(--deep)", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    const fmtWhen = (iso) => { try { return new Date(iso).toLocaleString('en-US', { timeZone: cfg.tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return iso; } };
    const upcoming = (this.state.bookings || []).slice().sort((a, b) => (a.start < b.start ? -1 : 1));

    return (
      <div style={{ padding: "28px 26px 96px", maxWidth: "1240px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: ".26em", color: "var(--red)" }}>// 13 · BOOK THE AUDITS</div>
            <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "48px", lineHeight: ".92", margin: "6px 0 0", letterSpacing: ".005em" }}>SCHED<span style={{ display: "inline-block", background: "var(--red)", color: "var(--golddark)", padding: "0 12px", transform: "skewX(0deg)" }}>ULING</span></h1>
            <div style={{ fontSize: "12px", letterSpacing: ".04em", color: "var(--muted)", marginTop: "9px", maxWidth: "560px", lineHeight: "1.6" }}>Set your hours, share one link, clients book the discovery call themselves. The floor is 3 a week — keep it fed.</div>
          </div>
          <Hover as="button" onClick={() => this.copyBookLink()} baseStyle={{ flexShrink: 0, marginTop: "6px", background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: "700", fontSize: "11px", letterSpacing: ".12em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", transition: ".15s" }} hoverStyle={{ background: "var(--red2)" }}>Copy Booking Link</Hover>
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
                  <div key={dow} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderBottom: dow < 6 ? "1px solid var(--panel2)" : "none" }}>
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
    const inp = { width: "100%", background: "var(--deep)", border: "1px solid var(--line2)", color: "var(--cream)", fontFamily: "var(--mono)", fontSize: "13px", padding: "9px 11px" };
    return (
      <div onClick={() => this.closeDoc()} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(4,4,5,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "440px", maxWidth: "100%", background: "var(--panel)", border: "1px solid var(--line)", borderTop: "3px solid var(--red)", padding: "24px 24px 20px" }}>
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
              <button onClick={() => this.saveDocLink()} style={{ background: "var(--red)", border: "1px solid var(--red)", color: "var(--golddark)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: "10.5px", letterSpacing: ".12em", padding: "10px 18px", cursor: "pointer", textTransform: "uppercase" }}>Save link</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const v = this.renderVals();
    const {
      addDeal, addDeliv, addGoal, addHabit, addShoot, animCount, animPulse, animTicker,
      backOpacity, backStep, bootReady, booting, clipsFmt, clock, collectedFmt, countNum, countShow,
      curBlocks, curGoal, curMonthLabel, curMonthName, date, deadDays, deadlineLabel, delivs, dismissBoot,
      docsView, energyScale, engine, fToggles, ff5, fleet, floor, gapText, goalFmt, goalShort, goalsView,
      habitsView, isAgents, isAudits, isCommand, isDocs, isPartners, isPipeline, isPlans, isShoots,
      isStrategy, ladder, log, loopNodes, newWeek, next, nextMonthLabel, nextMonthName, nextOpacity,
      nextShootsView, nextStep, noteVal, objBtnLabel, objections, onNote, oneThingBody, oneThingTitle,
      opsChecklist, pStats, partnerTabs, pct, pctLabel, pipeCols, planMoves, plansPhases, quarter,
      runsheet, scoreUs, scriptSteps, sections, sellByLabel, sellDays, shoots, shootsAll, showObj,
      showScript, skipBoot, sleepScale, stratAnti, stratBets, stratPillars, stratThesis, tickerItems,
      tickerOn, toast, todayLabel, toggleObj, warn, weekStrip, curPartnerName, yardLine
    } = v;

    const tickerSpan = (k) => (
      <span key={k} style={{ paddingRight: "70px" }}>
        {tickerItems.map((t, i) => (<React.Fragment key={i}>{t} <span style={{ color: "var(--gold)" }}>▸</span>{' '}</React.Fragment>))}
      </span>
    );

    const shootCard = (sh, i) => (
      <Hover as="div" key={i} onClick={sh.onClick} baseStyle={{ background: sh.bg, border: "1px solid " + sh.edge, borderRadius: "4px", overflow: "hidden", cursor: "pointer", transition: ".12s" }} hoverStyle={{ borderColor: "var(--gold)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: sh.headBg, padding: "6px 12px" }}>
          <span style={{ fontSize: "8.5px", fontWeight: 800, letterSpacing: ".18em", color: sh.headFg }}>{sh.mon} {sh.day} · {sh.dow} 10:00</span>
          <span style={{ fontSize: "8.5px", fontWeight: 800, letterSpacing: ".12em", color: sh.statusColor }}>● {sh.status}</span>
        </div>
        <div style={{ padding: "12px 14px", display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "33px", lineHeight: ".9", color: sh.dayColor, flexShrink: 0 }}>{sh.day}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "13px", lineHeight: "1.15", color: sh.clientColor }}>{sh.client}</div>
            <div style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: ".1em", color: "var(--dim)", marginTop: "4px" }}>{sh.kind}</div>
          </div>
        </div>
      </Hover>
    );

    const kicker = (text) => (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: "3px", padding: "5px 11px" }}>
        <span style={{ width: "7px", height: "7px", background: "var(--gold)" }}></span>
        <span style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".24em", color: "var(--muted)" }}>{text}</span>
      </div>
    );
    const h1s = { fontFamily: "var(--num)", fontWeight: 700, fontSize: "52px", lineHeight: ".98", margin: "12px 0 0", letterSpacing: ".02em", textTransform: "uppercase" };
    const subs = { fontSize: "12.5px", color: "var(--muted)", marginTop: "10px", maxWidth: "620px", lineHeight: "1.65" };
    const screenPad = { padding: "28px 26px 96px", maxWidth: "1240px", margin: "0 auto", width: "100%" };
    const goldBtn = { background: "var(--gold)", border: "none", color: "var(--golddark)", fontWeight: 900, fontSize: "11.5px", letterSpacing: ".16em", padding: "13px 20px", cursor: "pointer", borderRadius: "3px", textTransform: "uppercase" };
    const ghostBtn = { background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", fontWeight: 800, fontSize: "10.5px", letterSpacing: ".14em", padding: "11px 16px", cursor: "pointer", borderRadius: "3px", textTransform: "uppercase", whiteSpace: "nowrap", transition: ".15s" }

    return (
      <>

<div style={{ position: "relative", width: "100%", minHeight: "100vh", background: "var(--navy)", color: "var(--white)", fontFamily: "var(--sans)", overflowX: "hidden",
  "--navy": "#0a1322", "--deep": "#060c17", "--panel": "#101d33", "--panel2": "#16263f", "--line": "#24385c", "--gold": "#ffb81c", "--gold2": "#ffd06a", "--golddark": "#1a1608", "--white": "#f4f7fc", "--muted": "#8ea3c4", "--dim": "#5c7096", "--live": "#ff3040", "--good": "#2ee06f",
  "--sans": "'Archivo',sans-serif", "--num": "'Oswald',sans-serif",
  "--bg": "#0a1322", "--line2": "#33455f", "--cream": "#f4f7fc", "--red": "#ffb81c", "--red2": "#ffd06a", "--reddim": "rgba(255,184,28,.07)", "--mono": "'Archivo',sans-serif", "--cond": "'Oswald',sans-serif" }}>
{this.renderDealModal()}
{this.renderDocModal()}
{this.renderClientModal()}
{this.renderInvoiceModal()}
{this.renderProposalModal()}
{this.renderIntakeModal()}
{this.renderExpenseModal()}
{this.renderKpiModal()}
{this.renderEmailModal()}
{this.renderShootModal()}
{this.renderDelivModal()}
{this.renderChrome()}

  {/* ===================== SCOREBUG ===================== */}
  <header style={{ position: "sticky", top: 0, zIndex: 30, background: "var(--deep)", borderBottom: "3px solid var(--gold)" }}>
    <div style={{ display: "flex", alignItems: "stretch", gap: 0, padding: "0 22px", height: "62px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingRight: "18px", borderRight: "1px solid var(--line)" }}>
        <div style={{ width: "38px", height: "38px", borderRadius: "6px", overflow: "hidden", flexShrink: 0, border: "1px solid var(--line)" }}>
          <img src="/brand/ci-mark.png" alt="Creative Impact" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: "14px", letterSpacing: ".08em", lineHeight: 1 }}>CREATIVE IMPACT</div>
          <div style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: ".3em", color: "var(--dim)", marginTop: "3px" }}>IMPACT SPORTS NET · CLT</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 18px", borderRight: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontWeight: 800, fontSize: "12px", letterSpacing: ".1em", color: "var(--muted)" }}>CI</span>
          <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "27px", color: "var(--gold)", lineHeight: 1 }}>{scoreUs}</span>
        </div>
        <span style={{ margin: "0 14px", fontFamily: "var(--num)", fontWeight: 500, fontSize: "13px", color: "var(--dim)" }}>VS</span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontWeight: 800, fontSize: "12px", letterSpacing: ".1em", color: "var(--muted)" }}>GOAL</span>
          <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "27px", color: "var(--white)", lineHeight: 1 }}>{goalShort}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "0 18px", borderRight: "1px solid var(--line)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--num)", fontWeight: 600, fontSize: "19px", lineHeight: 1, color: "var(--white)" }}>{quarter}</div>
          <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: ".22em", color: "var(--dim)", marginTop: "2px" }}>PERIOD</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--num)", fontWeight: 600, fontSize: "19px", lineHeight: 1, color: "var(--gold)" }}>{sellDays}</div>
          <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: ".22em", color: "var(--dim)", marginTop: "2px" }}>TO SIGN-BY</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--num)", fontWeight: 600, fontSize: "19px", lineHeight: 1, color: "var(--white)" }}>{deadDays}</div>
          <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: ".22em", color: "var(--dim)", marginTop: "2px" }}>TO FINAL</div>
        </div>
      </div>

      <div style={{ flex: 1 }}></div>

      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--num)", fontWeight: 600, fontSize: "19px", letterSpacing: ".06em", lineHeight: 1 }}>{clock}</div>
          <div style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: ".2em", color: "var(--dim)", marginTop: "2px" }}>{date}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--live)", padding: "7px 13px", borderRadius: "3px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#fff", animation: animPulse }}></span>
          <span style={{ fontWeight: 900, fontSize: "11px", letterSpacing: ".18em" }}>LIVE · CLT</span>
        </div>
      </div>
    </div>

    <nav style={{ display: "flex", gap: "2px", padding: "0 22px", background: "var(--deep)", overflowX: "auto" }}>
      {sections.map((s, i) => (
        <Hover as="button" key={i} onClick={s.onSelect}
          baseStyle={{ flexShrink: 0, background: "transparent", border: "none", borderBottom: "3px solid " + s.bar, color: s.fg, cursor: "pointer", padding: "10px 12px 9px", fontFamily: "var(--sans)", fontWeight: 800, fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase", transition: ".12s" }}
          hoverStyle={{ color: "var(--white)" }}>
          <span style={{ color: s.code, marginRight: "7px", fontWeight: 700 }}>{s.num}</span>{s.label}
        </Hover>
      ))}
    </nav>
  </header>

  {/* ===================== DRIVE METER ===================== */}
  <section style={{ padding: "20px 26px", background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
      <span style={{ fontWeight: 900, fontSize: "13px", letterSpacing: ".14em" }}>THE DRIVE TO {goalShort} <span style={{ color: "var(--gold)" }}>· COLLECTED CASH = FIELD POSITION</span></span>
      <span style={{ fontFamily: "var(--num)", fontWeight: 600, fontSize: "15px" }}><span style={{ color: "var(--gold)" }}>{collectedFmt}</span> <span style={{ color: "var(--dim)", fontSize: "12px" }}>/ {goalFmt} · {gapText}</span></span>
    </div>
    <div style={{ position: "relative", height: "34px", background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "3px", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),rgba(142,163,196,.25) calc(10% - 1px) 10%)" }}></div>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "9%", background: "rgba(255,184,28,.16)", borderLeft: "2px solid var(--gold)" }}></div>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "linear-gradient(90deg,rgba(255,184,28,.12),rgba(255,184,28,.4))" }}></div>
      <div style={{ position: "absolute", left: `${pct}%`, top: "50%", width: "16px", height: "16px", margin: "-8px 0 0 -8px", background: "var(--gold)", borderRadius: "50% / 42%", boxShadow: "0 0 12px rgba(255,184,28,.8)" }}></div>
      <div style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", fontFamily: "var(--num)", fontWeight: 700, fontSize: "12px", letterSpacing: ".14em", color: "var(--gold)" }}>END ZONE</div>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "7px", fontSize: "9px", fontWeight: 700, letterSpacing: ".14em", color: "var(--dim)" }}>
      <span>OWN {yardLine} YARD LINE</span><span>{pctLabel} OF THE FIELD COVERED</span>
    </div>
  </section>

  {/* ============ 01 COMMAND: THE BIG BOARD ============ */}
  {(isCommand) ? (
  <div style={screenPad}>

    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "22px" }}>
      <div>
        {kicker('SEGMENT 01 — THE SCREEN YOU LIVE IN')}
        <h1 style={h1s}>The Big Board</h1>
        <div style={{ ...subs, maxWidth: "600px" }}>Sign by <span style={{ color: "var(--white)", fontWeight: 700 }}>{sellByLabel}</span>, collect by <span style={{ color: "var(--white)", fontWeight: 700 }}>{deadlineLabel}</span>. Charlotte is watching the other guy's highlight reel — take the broadcast back.</div>
      </div>
      <Hover as="button" onClick={newWeek} baseStyle={goldBtn} hoverStyle={{ background: "var(--gold2)" }}>↻ NEW WEEK</Hover>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "22px" }}>
      {v.tiles.map((t, i) => (
        <div key={i} style={{ background: "var(--panel2)", border: "1px solid " + t.edge, borderTop: "4px solid " + t.top, borderRadius: "4px", padding: "16px 18px" }}>
          <div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".2em", color: t.labelColor }}>{t.label}</div>
          <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "41px", lineHeight: 1, color: t.valColor, marginTop: "9px" }}>{t.val}</div>
          <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: ".12em", color: t.subColor, marginTop: "7px" }}>{t.sub}</div>
        </div>
      ))}
    </div>

    <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "20px 22px", marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ fontWeight: 900, fontSize: "15px", letterSpacing: ".1em" }}>DRIVE CHART <span style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 700, letterSpacing: ".06em" }}>— EVERY CLIENT ADVANCES FOUR DOWNS</span></div>
        <div style={{ fontSize: "9px", letterSpacing: ".22em", color: "var(--gold)", fontWeight: 800 }}>AUDIT ▸ CAPTURE ▸ DEPLOY ▸ LOOP</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginTop: "16px" }}>
        {engine.map((st, i) => (
          <div key={i} style={{ background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: st.headBg, padding: "8px 12px" }}>
              <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "13.5px", letterSpacing: ".1em", color: st.headFg }}>{st.down} · {st.name}</span>
              <span style={{ fontSize: "8.5px", fontWeight: 800, letterSpacing: ".1em", color: st.headSub }}>{st.count}</span>
            </div>
            <div style={{ padding: "10px 10px 4px" }}>
              <div style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: ".14em", color: "var(--dim)", textTransform: "uppercase", marginBottom: "8px" }}>{st.tag}</div>
              {st.clients.map((c, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", background: "var(--panel2)", borderLeft: "3px solid var(--gold)", padding: "6px 9px", marginBottom: "6px", borderRadius: "2px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.n}</span>
                  <span style={{ fontFamily: "var(--num)", fontWeight: 600, fontSize: "11.5px", color: "var(--gold)", flexShrink: 0 }}>{c.v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "20px" }}>
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "20px 22px" }}>
        <div style={{ fontWeight: 900, fontSize: "15px", letterSpacing: ".1em" }}>BOX SCORE <span style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 700, letterSpacing: ".06em" }}>— LOG IT FRIDAY, CUT TO COMMERCIAL</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "10px", marginTop: "16px" }}>
          {ff5.map((f, i) => (
            <div key={i} style={{ background: "var(--deep)", border: "1px solid " + f.edge, borderRadius: "4px", padding: "11px 7px", textAlign: "center" }}>
              <label style={{ display: "block", fontSize: "8px", fontWeight: 800, letterSpacing: ".1em", color: "var(--dim)", textTransform: "uppercase", minHeight: "24px", lineHeight: "1.4" }}>{f.label}</label>
              <input value={f.val} onChange={f.onChange} placeholder="0" style={{ width: "100%", background: "transparent", border: "none", borderBottom: "2px solid var(--line)", color: "var(--gold)", textAlign: "center", fontFamily: "var(--num)", fontWeight: 700, fontSize: "23px", padding: "3px 2px", marginTop: "4px" }} />
              <div style={{ fontSize: "8px", fontWeight: 800, letterSpacing: ".1em", color: f.floorColor, marginTop: "6px" }}>{f.floor}</div>
            </div>
          ))}
        </div>
        {(warn) ? (
          <div style={{ marginTop: "16px", display: "flex", gap: 0, borderRadius: "3px", overflow: "hidden", border: "1px solid rgba(255,48,64,.5)" }}>
            <div style={{ background: "var(--live)", padding: "12px 14px", display: "flex", alignItems: "center" }}><span style={{ fontWeight: 900, fontSize: "10px", letterSpacing: ".18em", whiteSpace: "nowrap" }}>⚑ FLAG</span></div>
            <div style={{ background: "rgba(255,48,64,.1)", padding: "10px 16px", fontSize: "12px", lineHeight: "1.55", color: "var(--white)" }}>{warn}</div>
          </div>
        ) : null}
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "20px 22px" }}>
        <div style={{ fontWeight: 900, fontSize: "15px", letterSpacing: ".1em" }}>KEYS TO THE GAME</div>
        <div style={{ marginTop: "10px" }}>
          {floor.map((g, i) => (
            <div key={i} onClick={g.onClick} style={{ display: "flex", alignItems: "center", gap: "11px", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: "12px", cursor: g.cursor, fontWeight: 500 }}>
              <span style={{ width: "18px", height: "18px", borderRadius: "2px", background: g.box, border: "1px solid " + g.boxEdge, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "var(--golddark)", flexShrink: 0, fontWeight: 900 }}>{g.check}</span>
              <span style={{ color: g.tc }}>{g.text}</span>
            </div>
          ))}
        </div>
        <div style={{ fontWeight: 900, fontSize: "12.5px", letterSpacing: ".14em", color: "var(--gold)", marginTop: "18px" }}>SCORING CHANCES · RED ZONE</div>
        <div style={{ marginTop: "6px" }}>
          {next.map((n, i) => (
            <Hover as="div" key={i} onClick={n.onClick} baseStyle={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: "11.5px", cursor: "pointer", fontWeight: 500 }} hoverStyle={{ color: "var(--white)" }}>
              <span style={{ color: "var(--gold)", fontWeight: 900 }}>▸</span>
              <span style={{ color: "var(--white)", fontWeight: 700 }}>{n.label}</span>
              <span style={{ color: "var(--dim)" }}>{n.sub}</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--num)", fontWeight: 600, fontSize: "13px", color: "var(--gold)" }}>{n.val}</span>
            </Hover>
          ))}
          {!next.length ? <div style={{ padding: "10px 0", fontSize: "11.5px", color: "var(--dim)" }}>No open deals yet — hit 02 PIPELINE and add the first one.</div> : null}
        </div>
      </div>
    </div>

    <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "20px 22px", marginTop: "20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ fontWeight: 900, fontSize: "15px", letterSpacing: ".1em" }}>BROADCAST SCHEDULE — {curMonthName} <span style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 700, letterSpacing: ".06em" }}>— ONE HALF-DAY SHOOT PER CLIENT, PER MONTH</span></div>
        <div style={{ fontSize: "9.5px", letterSpacing: ".14em", fontWeight: 800, color: "var(--muted)" }}>SPLICE: <span style={{ color: "var(--gold)" }}>{clipsFmt}</span> CLIPS SHIPPED</div>
      </div>
      {shoots.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginTop: "16px" }}>
          {shoots.map(shootCard)}
        </div>
      ) : (
        <div style={{ border: "1px dashed var(--line)", borderRadius: "4px", padding: "26px", textAlign: "center", color: "var(--dim)", fontSize: "12px", marginTop: "16px" }}>
          No capture days on the calendar. <button onClick={addShoot} style={{ background: "none", border: "none", color: "var(--gold)", fontWeight: 800, cursor: "pointer", fontSize: "12px", letterSpacing: ".08em" }}>+ ADD THE FIRST ONE</button>
        </div>
      )}
    </div>

    <div style={{ marginTop: "26px", borderRadius: "4px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,.45)" }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ background: "var(--live)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 18px" }}>
          <div style={{ fontWeight: 900, fontSize: "10px", letterSpacing: ".2em", whiteSpace: "nowrap" }}>THE ONE</div>
          <div style={{ fontWeight: 900, fontSize: "10px", letterSpacing: ".2em", whiteSpace: "nowrap" }}>THING</div>
        </div>
        <div style={{ flex: 1, background: "var(--gold)", color: "var(--golddark)", padding: "16px 22px" }}>
          <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "27px", lineHeight: 1, textTransform: "uppercase", letterSpacing: ".01em" }}>{oneThingTitle}</div>
          <div style={{ fontSize: "12px", fontWeight: 600, lineHeight: "1.5", marginTop: "6px", maxWidth: "760px" }}>{oneThingBody}</div>
        </div>
        <div style={{ background: "var(--golddark)", color: "var(--gold)", display: "flex", alignItems: "center", padding: "0 20px", fontFamily: "var(--num)", fontWeight: 700, fontSize: "29px" }}>01</div>
      </div>
    </div>
  </div>
  ) : null}

  {/* ============ 02 PIPELINE: THE STANDINGS ============ */}
  {(isPipeline) ? (
  <div style={screenPad}>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "22px" }}>
      <div>
        {kicker('SEGMENT 02 — EVERY LIVE DEAL, BY STAGE')}
        <h1 style={h1s}>The Standings</h1>
        <div style={{ ...subs, maxWidth: "600px" }}>Signed and Collected feed the scorebug upstairs. Nothing moves itself — you move it.</div>
      </div>
      <Hover as="button" onClick={addDeal} baseStyle={goldBtn} hoverStyle={{ background: "var(--gold2)" }}>+ New Deal</Hover>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "20px" }}>
      <div style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderTop: "4px solid var(--line)", borderRadius: "4px", padding: "15px 18px" }}>
        <div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".2em", color: "var(--muted)" }}>WEIGHTED PIPELINE</div>
        <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "36px", lineHeight: 1, color: "var(--white)", marginTop: "8px" }}>{pStats.weighted}</div>
        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: ".12em", color: "var(--dim)", marginTop: "6px" }}>STAGE-PROBABILITY ADJUSTED</div>
      </div>
      <div style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderTop: "4px solid var(--line)", borderRadius: "4px", padding: "15px 18px" }}>
        <div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".2em", color: "var(--muted)" }}>LIVE DEALS</div>
        <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "36px", lineHeight: 1, color: "var(--white)", marginTop: "8px" }}>{pStats.count}</div>
        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: ".12em", color: "var(--dim)", marginTop: "6px" }}>NOT WON / LOST</div>
      </div>
      <div style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderTop: "4px solid var(--gold)", borderRadius: "4px", padding: "15px 18px" }}>
        <div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)" }}>SIGNED</div>
        <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "36px", lineHeight: 1, color: "var(--gold)", marginTop: "8px" }}>{pStats.signed}</div>
        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: ".12em", color: "var(--dim)", marginTop: "6px" }}>{pStats.signedN}</div>
      </div>
      <div style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderTop: "4px solid var(--line)", borderRadius: "4px", padding: "15px 18px" }}>
        <div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".2em", color: "var(--muted)" }}>WIN RATE</div>
        <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "36px", lineHeight: 1, color: "var(--white)", marginTop: "8px" }}>{pStats.win}</div>
        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: ".12em", color: "var(--dim)", marginTop: "6px" }}>SIGNED ÷ CLOSED</div>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(178px,1fr))", gap: "12px", overflowX: "auto", paddingBottom: "10px" }}>
      {pipeCols.map((c, i) => (
        <div key={i} style={{ background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "4px", padding: "11px", minHeight: "150px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "11px", borderBottom: "1px solid var(--line)", paddingBottom: "9px" }}>
            <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "12px", letterSpacing: ".08em", textTransform: "uppercase", color: c.accent }}>{c.stage}</span>
            <span style={{ fontFamily: "var(--num)", fontWeight: 600, fontSize: "12px", color: "var(--dim)" }}>{c.sum}</span>
          </div>
          {c.deals.map((dd, j) => (
            <Hover as="div" key={j} onClick={dd.onClick} baseStyle={{ background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: "3px", padding: "9px 10px", marginBottom: "8px", cursor: "pointer", transition: ".12s" }} hoverStyle={{ borderColor: "var(--gold)" }}>
              <div style={{ fontWeight: 700, fontSize: "12.5px", color: "var(--white)", lineHeight: "1.2" }}>{dd.name}</div>
              <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "3px" }}>{dd.offer}</div>
              <div style={{ fontFamily: "var(--num)", fontWeight: 600, fontSize: "14px", color: "var(--gold)", marginTop: "5px" }}>{dd.val}</div>
            </Hover>
          ))}
        </div>
      ))}
    </div>
  </div>
  ) : null}

  {/* ============ 03 AUDITS: THE BOOTH ============ */}
  {(isAudits) ? (
  <div style={screenPad}>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "22px" }}>
      <div>
        {kicker('SEGMENT 03 — THE FIRST YES')}
        <h1 style={h1s}>The Audit Booth</h1>
        <div style={subs}>The free 30-minute Authority Audit. No pitch slap — they walk away with a plan either way. Read it off the prompter; don't wing it.</div>
      </div>
      <Hover as="button" onClick={toggleObj} baseStyle={ghostBtn} hoverStyle={{ borderColor: "var(--gold)", color: "var(--white)" }}>{objBtnLabel}</Hover>
    </div>

    {(showScript) ? (
    <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ fontSize: "9px", fontWeight: 800, letterSpacing: ".22em", color: "var(--dim)", padding: "2px 2px 6px" }}>RUNDOWN</div>
        {scriptSteps.map((s, i) => (
          <button key={i} onClick={s.onClick} style={{ display: "flex", alignItems: "center", gap: "11px", textAlign: "left", padding: "11px 13px", background: s.bg, border: "1px solid " + s.bd, borderLeft: "4px solid " + s.blk, color: s.fg, cursor: "pointer", borderRadius: "3px", transition: ".14s", fontFamily: "var(--sans)" }}>
            <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "14px", color: s.nc, width: "20px", flexShrink: 0 }}>{s.n}</span>
            <span style={{ fontWeight: 800, fontSize: "12px", letterSpacing: ".06em", textTransform: "uppercase", lineHeight: "1.15" }}>{s.l}</span>
          </button>
        ))}
      </div>
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "22px 24px", minHeight: "380px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
          <span style={{ background: "var(--live)", fontWeight: 900, fontSize: "9px", letterSpacing: ".16em", padding: "4px 8px", borderRadius: "2px" }}>PROMPTER</span>
          <span style={{ fontSize: "12.5px", color: "var(--gold)", fontWeight: 600, lineHeight: "1.5" }}>{curGoal}</span>
        </div>
        {curBlocks.map((b, i) => (
          <React.Fragment key={i}>
            {b.isSay ? <div style={{ background: "var(--deep)", borderLeft: "4px solid var(--gold)", borderRadius: "0 3px 3px 0", padding: "14px 17px", margin: "12px 0", fontSize: "14.5px", lineHeight: "1.6", color: "var(--white)" }}>{b.text}</div> : null}
            {b.isAlt ? <div style={{ background: "var(--deep)", borderLeft: "4px solid var(--line)", borderRadius: "0 3px 3px 0", padding: "14px 17px", margin: "12px 0", fontSize: "14px", lineHeight: "1.6", color: "var(--muted)" }}>ALTERNATE READ — {b.text}</div> : null}
            {b.isNote ? <div style={{ fontSize: "12px", color: "var(--dim)", margin: "10px 0", lineHeight: "1.55" }}><span style={{ color: "var(--gold)", fontWeight: 800, letterSpacing: ".1em", fontSize: "9.5px" }}>PRODUCER NOTE · </span>{b.text}</div> : null}
            {b.isQ ? (
              <div style={{ margin: "10px 0 4px" }}>
                {b.items.map((q, j) => (
                  <div key={j} style={{ padding: "9px 0 9px 22px", position: "relative", fontSize: "13.5px", lineHeight: "1.55", borderBottom: "1px solid var(--line)", color: "var(--white)" }}><span style={{ position: "absolute", left: "2px", color: "var(--gold)", fontWeight: 900 }}>›</span>{q}</div>
                ))}
              </div>
            ) : null}
          </React.Fragment>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "22px" }}>
          <Hover as="button" onClick={backStep} baseStyle={{ background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", fontWeight: 800, fontSize: "10.5px", letterSpacing: ".12em", padding: "9px 15px", cursor: "pointer", borderRadius: "3px", opacity: backOpacity }} hoverStyle={{ borderColor: "var(--gold)", color: "var(--white)" }}>← BACK</Hover>
          <button onClick={nextStep} style={{ background: "var(--gold)", border: "none", color: "var(--golddark)", fontWeight: 900, fontSize: "10.5px", letterSpacing: ".12em", padding: "9px 17px", cursor: "pointer", borderRadius: "3px", opacity: nextOpacity }}>NEXT SEGMENT →</button>
        </div>
      </div>
    </div>
    ) : null}

    {(showObj) ? (
    <div>
      <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)", marginBottom: "14px" }}>THE SEVEN YOU'LL ACTUALLY HEAR — AND THE TURN</div>
      {objections.map((o, i) => (
        <details key={i} style={{ border: "1px solid var(--line)", background: "var(--deep)", borderRadius: "4px", marginBottom: "9px" }}>
          <summary style={{ padding: "14px 16px", cursor: "pointer", fontWeight: 800, fontSize: "14px", letterSpacing: ".02em", color: "var(--white)", listStyle: "none" }}>{o.q}</summary>
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--dim)", margin: "4px 0 8px" }}>{o.lab}</div>
            <div style={{ background: "var(--panel)", borderLeft: "4px solid var(--gold)", borderRadius: "0 3px 3px 0", padding: "13px 16px", fontSize: "13.5px", lineHeight: "1.6", color: "var(--white)" }}>{o.a}</div>
          </div>
        </details>
      ))}
    </div>
    ) : null}

    <div style={{ marginTop: "26px" }}>
      <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)", marginBottom: "11px" }}>WHAT THIS CALL SELLS — THE LADDER · SELL IN THIS ORDER</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
        {ladder.map((l, i) => (
          <div key={i} style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderTop: "4px solid " + l.accent, borderRadius: "4px", padding: "16px 18px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px" }}>
              <div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: l.accent }}>{l.p}</div>
              <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "19px", color: "var(--dim)", lineHeight: 1, flexShrink: 0 }}>{l.o}</div>
            </div>
            <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "21px", color: "var(--white)", marginTop: "7px", lineHeight: 1, textTransform: "uppercase" }}>{l.n}</div>
            <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.55", marginTop: "8px" }}>{l.d}</div>
            <div style={{ fontSize: "11px", color: "var(--dim)", lineHeight: "1.5", marginTop: "auto", paddingTop: "10px" }}><span style={{ color: l.accent, fontWeight: 800, letterSpacing: ".1em", fontSize: "9px" }}>WHEN · </span>{l.w}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 0, borderRadius: "3px", overflow: "hidden", border: "1px solid rgba(255,184,28,.4)", marginTop: "14px" }}>
        <div style={{ background: "var(--gold)", color: "var(--golddark)", padding: "12px 14px", display: "flex", alignItems: "center" }}><span style={{ fontWeight: 900, fontSize: "10px", letterSpacing: ".16em", whiteSpace: "nowrap" }}>PRICE INTEGRITY</span></div>
        <div style={{ background: "rgba(255,184,28,.07)", padding: "10px 16px", fontSize: "12px", lineHeight: "1.55", color: "var(--white)" }}>The audit is free but never cheap — it ends with a plan, not a pitch. Retainer pricing is fixed; never discount month one. Ad spend is always separate, $500/mo minimum.</div>
      </div>
    </div>
  </div>
  ) : null}

  {/* ============ 04 SHOOTS: THE PRODUCTION LINE ============ */}
  {(isShoots) ? (
  <div style={screenPad}>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "22px" }}>
      <div>
        {kicker('SEGMENT 04 — ONE HALF-DAY PER CLIENT, PER MONTH')}
        <h1 style={h1s}>The Production Line</h1>
        <div style={subs}>Four capture days a month is the whole factory. Each one feeds an Authority Video, a photo set, and 8–12 clips into Deploy.</div>
      </div>
      <Hover as="button" onClick={addShoot} baseStyle={goldBtn} hoverStyle={{ background: "var(--gold2)" }}>+ Capture Day</Hover>
    </div>

    <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "20px 22px", marginBottom: "16px" }}>
      <div style={{ fontWeight: 900, fontSize: "15px", letterSpacing: ".1em", marginBottom: "14px" }}>{curMonthName} <span style={{ color: "var(--good)", fontSize: "11px", fontWeight: 800, letterSpacing: ".1em" }}>{curMonthLabel}</span></div>
      {shootsAll.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
          {shootsAll.map(shootCard)}
        </div>
      ) : (
        <div style={{ border: "1px dashed var(--line)", borderRadius: "4px", padding: "26px", textAlign: "center", color: "var(--dim)", fontSize: "12px" }}>
          Nothing scheduled this month. <button onClick={addShoot} style={{ background: "none", border: "none", color: "var(--gold)", fontWeight: 800, cursor: "pointer", fontSize: "12px", letterSpacing: ".08em" }}>+ ADD A CAPTURE DAY</button>
        </div>
      )}
    </div>

    <div style={{ background: "var(--panel)", border: "1px solid rgba(255,184,28,.35)", borderRadius: "4px", padding: "20px 22px", marginBottom: "20px" }}>
      <div style={{ fontWeight: 900, fontSize: "15px", letterSpacing: ".1em", marginBottom: "14px" }}>{nextMonthName} <span style={{ color: "var(--gold)", fontSize: "11px", fontWeight: 800, letterSpacing: ".1em" }}>{nextMonthLabel}</span></div>
      {nextShootsView.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
          {nextShootsView.map((sh, i) => sh.status === 'OPEN' ? (
            <Hover as="div" key={i} onClick={sh.onClick} baseStyle={{ background: "rgba(255,184,28,.06)", border: "1px dashed rgba(255,184,28,.45)", borderRadius: "4px", padding: "14px", textAlign: "center", cursor: "pointer", transition: ".12s" }} hoverStyle={{ borderColor: "var(--gold)" }}>
              <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "31px", lineHeight: ".9", color: "var(--gold)" }}>{sh.day}</div>
              <div style={{ fontSize: "8px", fontWeight: 800, letterSpacing: ".24em", color: "var(--dim)", marginTop: "3px" }}>{sh.mon} · {sh.dow} 10:00</div>
              <div style={{ fontWeight: 800, fontSize: "11.5px", color: "var(--gold2)", marginTop: "9px", letterSpacing: ".08em" }}>TICKETS AVAILABLE</div>
              <div style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: ".1em", color: "var(--dim)", marginTop: "4px" }}>SELL THIS DAY</div>
            </Hover>
          ) : shootCard(sh, i))}
        </div>
      ) : (
        <div style={{ border: "1px dashed rgba(255,184,28,.45)", borderRadius: "4px", padding: "26px", textAlign: "center", color: "var(--dim)", fontSize: "12px" }}>
          The calendar for {nextMonthName.toLowerCase()} isn't published. <button onClick={addShoot} style={{ background: "none", border: "none", color: "var(--gold)", fontWeight: 800, cursor: "pointer", fontSize: "12px", letterSpacing: ".08em" }}>+ PUBLISH THE FIRST SLOT</button>
        </div>
      )}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: "20px" }}>
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ background: "var(--gold)", color: "var(--golddark)", fontWeight: 900, fontSize: "9px", letterSpacing: ".14em", padding: "4px 8px", borderRadius: "2px" }}>RUN SHEET</span>
          <span style={{ fontWeight: 900, fontSize: "15px", letterSpacing: ".1em" }}>CAPTURE DAY · HALF-DAY</span>
        </div>
        <ol style={{ margin: "14px 0 0 18px", padding: 0, fontSize: "13px", color: "var(--white)", lineHeight: "1.55" }}>
          {runsheet.map((r, i) => (<li key={i} style={{ padding: "5px 0" }}>{r}</li>))}
        </ol>
        <div style={{ fontSize: "11.5px", color: "var(--muted)", lineHeight: "1.55", marginTop: "13px", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>Output: one Authority Video, one photo set, 8–12 short cuts queued for Splice — per client, per month.</div>
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <div style={{ fontWeight: 900, fontSize: "15px", letterSpacing: ".1em" }}>DELIVERABLES TRACKER <span style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 700, letterSpacing: ".06em" }}>— LIVE CLIENTS · {curMonthName}</span></div>
          <Hover as="button" onClick={addDeliv} baseStyle={{ ...ghostBtn, padding: "7px 12px", fontSize: "9.5px" }} hoverStyle={{ borderColor: "var(--gold)", color: "var(--white)" }}>+ Track</Hover>
        </div>
        <div style={{ marginTop: "12px" }}>
          {delivs.map((d, i) => (
            <Hover as="div" key={i} onClick={d.onClick} baseStyle={{ padding: "11px 0", borderBottom: "1px solid var(--line)", cursor: "pointer" }} hoverStyle={{ background: "rgba(255,184,28,.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontWeight: 800, fontSize: "13px", color: "var(--white)" }}>{d.name}</span>
                <span style={{ fontFamily: "var(--num)", fontWeight: 600, fontSize: "13px", color: d.clipColor }}>{d.clips} CLIPS</span>
              </div>
              <div style={{ height: "7px", background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "3px", overflow: "hidden", marginTop: "7px" }}>
                <div style={{ height: "100%", width: `${d.pct}%`, background: d.barColor }}></div>
              </div>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: ".12em", color: "var(--dim)", marginTop: "6px" }}>{d.meta}</div>
            </Hover>
          ))}
          {!delivs.length ? <div style={{ padding: "14px 0", fontSize: "12px", color: "var(--dim)" }}>No live clients tracked yet — hit + TRACK when the first Engine client signs.</div> : null}
        </div>
      </div>
    </div>
  </div>
  ) : null}

  {/* ============ 05 AGENT FLEET: THE CONTROL ROOM ============ */}
  {(isAgents) ? (
  <div style={screenPad}>
    <div style={{ marginBottom: "22px" }}>
      {kicker('SEGMENT 05 — THE FOUNDER-FREE ENGINE')}
      <h1 style={h1s}>The Control Room</h1>
      <div style={subs}>Six sources run the top of the funnel and the content machine, so four hands stay on sales and the lens. Your only manual jobs: take the calls, run the shoots, approve the proof.</div>
    </div>

    <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)", marginBottom: "10px" }}>THE DAILY LOOP</div>
    <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap", background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "4px", padding: "15px 18px", marginBottom: "18px" }}>
      {loopNodes.map((n, i) => (
        <React.Fragment key={i}>
          <span style={{ fontWeight: 800, fontSize: "11.5px", letterSpacing: ".08em", textTransform: "uppercase", padding: "8px 13px", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: "3px", color: "var(--white)" }}>{n.label}</span>
          <span style={{ color: "var(--gold)", fontWeight: 900, fontSize: "15px" }}>{n.arrow}</span>
        </React.Fragment>
      ))}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "20px" }}>
      <div>
        {fleet.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", background: "var(--panel)", border: "1px solid var(--line)", borderLeft: "4px solid " + a.accent, borderRadius: "4px", padding: "13px 16px", marginBottom: "9px" }}>
            <div style={{ width: "46px", height: "46px", background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "4px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "14px", color: a.accent, lineHeight: 1 }}>{a.init}</span>
              <span style={{ fontSize: "6.5px", fontWeight: 800, letterSpacing: ".14em", color: "var(--dim)", marginTop: "2px" }}>SRC {a.ch}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "16px", letterSpacing: ".06em", color: "var(--white)", textTransform: "uppercase" }}>{a.name}</div>
              <div style={{ fontSize: "11.5px", color: "var(--muted)", lineHeight: "1.45" }}>{a.role}</div>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--dim)", marginTop: "3px" }}>{a.cad}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: a.dot }}></span>
              <span style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".1em", color: "var(--muted)", minWidth: "64px" }}>{a.status}</span>
              <Hover as="button" onClick={a.onToggle} baseStyle={{ background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", fontWeight: 800, fontSize: "9px", letterSpacing: ".12em", padding: "7px 11px", cursor: "pointer", borderRadius: "3px", transition: ".15s" }} hoverStyle={{ borderColor: "var(--gold)", color: "var(--white)" }}>{a.btn}</Hover>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "4px", padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--live)", animation: animPulse }}></span>
            <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--muted)" }}>THE WIRE — LIVE FEED</span>
          </div>
          {log.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", padding: "5px 0", fontSize: "11px", lineHeight: "1.5", borderBottom: "1px solid rgba(36,56,92,.5)" }}>
              <span style={{ color: "var(--dim)", fontFamily: "var(--num)", fontWeight: 500, flexShrink: 0 }}>{l.t}</span>
              <span style={{ color: l.color, fontWeight: 800, flexShrink: 0, minWidth: "26px" }}>{l.tag}</span>
              <span style={{ color: "var(--muted)" }}>{l.msg}</span>
            </div>
          ))}
          {!log.length ? <div style={{ padding: "8px 0", fontSize: "11px", color: "var(--dim)" }}>Quiet wire. Agent runs land here as they happen — nothing is simulated.</div> : null}
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "16px 18px" }}>
          <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--muted)" }}>TODAY'S OPERATING CHECKLIST</div>
          <div style={{ marginTop: "8px" }}>
            {opsChecklist.map((o, i) => (
              <div key={i} onClick={o.onClick} style={{ display: "flex", alignItems: "center", gap: "11px", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: "11.5px", cursor: "pointer" }}>
                <span style={{ width: "17px", height: "17px", borderRadius: "2px", border: "1.5px solid " + o.box, background: o.boxBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--golddark)", flexShrink: 0, fontWeight: 900 }}>{o.check}</span>
                <span style={{ color: o.tc }}>{o.text}</span>
              </div>
            ))}
          </div>
          <Hover as="button" onClick={() => { window.location.assign('/fleet'); }} title="Live run reports from the fleet — what each agent actually did, and when"
            baseStyle={{ marginTop: "14px", background: "var(--gold)", border: "none", color: "var(--golddark)", fontWeight: 900, fontSize: "10.5px", letterSpacing: ".14em", padding: "10px 16px", cursor: "pointer", textTransform: "uppercase", borderRadius: "3px" }} hoverStyle={{ background: "var(--gold2)" }}>⚡ Live Run Reports</Hover>
        </div>
      </div>
    </div>
  </div>
  ) : null}

  {/* ============ 06 PARTNERS: THE TALENT ============ */}
  {(isPartners) ? (
  <div style={screenPad}>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "22px" }}>
      <div>
        {kicker('SEGMENT 06 — TWO OPERATORS, ONE SYSTEM')}
        <h1 style={h1s}>The Talent</h1>
        <div style={subs}>You two are the single points of failure. Energy in, calls out, camera on. Burnout in week 5 kills the number — this desk is non-optional.</div>
      </div>
      <div style={{ fontSize: "10.5px", fontWeight: 800, letterSpacing: ".16em", color: "var(--muted)" }}>{todayLabel}</div>
    </div>

    <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
      {partnerTabs.map((p, i) => (
        <Hover as="button" key={i} onClick={p.onClick} baseStyle={{ display: "flex", alignItems: "center", gap: "12px", background: p.bg, border: "1px solid " + p.bd, borderRadius: "4px", padding: "11px 18px", cursor: "pointer", textAlign: "left", transition: ".12s" }} hoverStyle={{ borderColor: "var(--gold)" }}>
          <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "19px", color: p.initC }}>{p.init}</span>
          <span>
            <span style={{ display: "block", fontWeight: 800, fontSize: "12.5px", color: p.nameC }}>{p.name}</span>
            <span style={{ display: "block", fontSize: "9px", fontWeight: 700, letterSpacing: ".14em", color: "var(--dim)", marginTop: "2px" }}>{p.role}</span>
          </span>
        </Hover>
      ))}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "20px 22px" }}>
        <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)" }}>TODAY'S CHECK-IN · {curPartnerName}</div>
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".14em", color: "var(--dim)", textTransform: "uppercase" }}>Energy</div>
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
            {energyScale.map((e, i) => (
              <button key={i} onClick={e.onClick} style={{ flex: 1, background: e.bg, border: "1px solid " + e.bd, color: e.fg, fontFamily: "var(--num)", fontWeight: 700, fontSize: "16px", padding: "9px 0", cursor: "pointer", borderRadius: "3px", transition: ".12s" }}>{e.n}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".14em", color: "var(--dim)", textTransform: "uppercase" }}>Sleep (hrs)</div>
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
            {sleepScale.map((e, i) => (
              <button key={i} onClick={e.onClick} style={{ flex: 1, background: e.bg, border: "1px solid " + e.bd, color: e.fg, fontFamily: "var(--num)", fontWeight: 700, fontSize: "16px", padding: "9px 0", cursor: "pointer", borderRadius: "3px", transition: ".12s" }}>{e.n}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px", marginTop: "14px" }}>
          {fToggles.map((t, i) => (
            <div key={i} onClick={t.onClick} style={{ display: "flex", alignItems: "center", gap: "9px", background: "var(--deep)", border: "1px solid " + t.bd, borderRadius: "3px", padding: "11px 12px", cursor: "pointer", transition: ".12s" }}>
              <span style={{ width: "20px", height: "20px", borderRadius: "2px", border: "2px solid " + t.box, background: t.boxBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, color: t.cc, flexShrink: 0 }}>{t.check}</span>
              <span style={{ fontSize: "12.5px", color: "var(--white)" }}>{t.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "14px" }}>
          <label style={{ display: "block", fontSize: "9.5px", fontWeight: 800, letterSpacing: ".14em", color: "var(--dim)", textTransform: "uppercase", marginBottom: "6px" }}>One line — how's the head today?</label>
          <textarea value={noteVal} onChange={onNote} placeholder="Honest. Nobody reads this but you two." style={{ width: "100%", minHeight: "62px", background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "3px", color: "var(--white)", padding: "10px 12px", fontFamily: "var(--sans)", fontSize: "12px", lineHeight: "1.5", resize: "vertical" }}></textarea>
        </div>
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "20px 22px" }}>
        <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--muted)" }}>LAST 7 DAYS · {curPartnerName}</div>
        <div style={{ display: "flex", gap: "7px", marginTop: "8px" }}>
          {weekStrip.map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "3px", padding: "9px 4px" }}>
              <div style={{ fontSize: "9px", fontWeight: 800, color: "var(--dim)" }}>{d.dw}</div>
              <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "18px", margin: "3px 0", color: d.nc }}>{d.n}</div>
              <div style={{ fontSize: "8px", letterSpacing: "1px" }}><span style={{ color: d.d1 }}>●</span><span style={{ color: d.d2 }}>●</span></div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)", marginTop: "20px" }}>NON-NEGOTIABLE HABITS</div>
        <div style={{ marginTop: "8px" }}>
          {habitsView.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: "13px", color: "var(--white)" }}>{h.name} <span style={{ fontSize: "8.5px", fontWeight: 800, letterSpacing: ".1em", color: "var(--dim)", border: "1px solid var(--line)", borderRadius: "2px", padding: "2px 6px", marginLeft: "6px" }}>{h.owner}</span></span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "14px", color: "var(--gold)" }}>{h.streak}<span style={{ color: "var(--dim)", fontSize: "9px", fontWeight: 800, letterSpacing: ".08em" }}> {h.streakL}</span></span>
                <div onClick={h.onToggle} style={{ width: "28px", height: "28px", borderRadius: "3px", border: "2px solid " + h.box, background: h.boxBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "13px", color: h.cc, cursor: "pointer", transition: ".12s" }}>{h.check}</div>
              </div>
            </div>
          ))}
        </div>
        <Hover as="button" onClick={addHabit} baseStyle={{ width: "100%", background: "transparent", border: "1px dashed var(--line)", borderRadius: "3px", color: "var(--muted)", fontWeight: 800, fontSize: "9.5px", letterSpacing: ".14em", textTransform: "uppercase", padding: "11px", marginTop: "10px", cursor: "pointer", transition: ".15s" }} hoverStyle={{ borderColor: "var(--gold)", color: "var(--white)" }}>+ ADD HABIT</Hover>
      </div>
    </div>

    <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "20px 22px", marginTop: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)" }}>GOALS — BUSINESS & THE REST OF YOUR LIVES</div>
        <Hover as="button" onClick={addGoal} baseStyle={{ background: "transparent", border: "1px solid var(--line)", borderRadius: "3px", color: "var(--muted)", fontWeight: 800, fontSize: "9.5px", letterSpacing: ".12em", padding: "7px 12px", cursor: "pointer", transition: ".15s" }} hoverStyle={{ borderColor: "var(--gold)", color: "var(--white)" }}>+ ADD GOAL</Hover>
      </div>
      <div style={{ marginTop: "10px" }}>
        {goalsView.map((g, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
            <div onClick={g.onToggle} style={{ marginTop: "1px", width: "22px", height: "22px", borderRadius: "3px", border: "2px solid " + g.box, background: g.boxBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "12px", color: g.cc, cursor: "pointer", flexShrink: 0, transition: ".12s" }}>{g.check}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "13.5px", color: g.tc, textDecoration: g.deco }}>{g.text}</span>
              <span style={{ fontWeight: 800, fontSize: "8.5px", letterSpacing: ".12em", padding: "2px 7px", marginLeft: "9px", border: "1px solid " + g.typeC, borderRadius: "2px", color: g.typeC, whiteSpace: "nowrap" }}>{g.type}</span>
              <span style={{ fontWeight: 800, fontSize: "8.5px", letterSpacing: ".12em", padding: "2px 7px", marginLeft: "6px", border: "1px solid var(--line)", borderRadius: "2px", color: "var(--dim)", whiteSpace: "nowrap" }}>{g.owner}</span>
              {(g.hasBar) ? (<>
                <div style={{ height: "7px", background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "3px", marginTop: "9px", overflow: "hidden" }}><div style={{ height: "100%", width: `${g.pct}%`, background: "var(--gold)" }}></div></div>
                <div style={{ fontSize: "10.5px", color: "var(--dim)", marginTop: "4px" }}>{g.progLabel}</div>
              </>) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
  ) : null}

  {/* ============ 07 DOCUMENTS: TAPE LIBRARY ============ */}
  {(isDocs) ? (
  <div style={screenPad}>
    <div style={{ marginBottom: "22px" }}>
      {kicker('SEGMENT 07 — ONE SOURCE OF TRUTH')}
      <h1 style={h1s}>Tape Library</h1>
      <div style={{ ...subs, maxWidth: "600px" }}>Every artifact the OS runs on — the spec, the scripts, the brand, the lists. Click a tape to link or open it.</div>
    </div>

    {docsView.map((g, i) => (
      <div key={i} style={{ marginBottom: "22px" }}>
        <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)", marginBottom: "10px" }}>{g.cat}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {g.items.map((it, j) => (
            <Hover as="div" key={j} onClick={it.onClick} baseStyle={{ display: "flex", alignItems: "center", gap: "13px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "12px 14px", cursor: "pointer", transition: ".12s" }} hoverStyle={{ borderColor: "var(--gold)" }}>
              <div style={{ fontSize: "8.5px", fontWeight: 800, letterSpacing: ".08em", color: "var(--gold)", border: "1px solid var(--line)", borderRadius: "3px", padding: "5px 0", minWidth: "46px", textAlign: "center", flexShrink: 0 }}>{it.fmt}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", color: "var(--white)", fontWeight: 700, lineHeight: "1.2" }}>{it.name}</div>
                <div style={{ fontSize: "10.5px", color: "var(--muted)", marginTop: "2px" }}>{it.meta}</div>
              </div>
              {(it.hasTag) ? (
                <span style={{ fontSize: "8px", fontWeight: 900, letterSpacing: ".12em", color: "var(--golddark)", background: "var(--gold)", borderRadius: "2px", padding: "3px 6px", flexShrink: 0 }}>{it.tag}</span>
              ) : null}
            </Hover>
          ))}
        </div>
      </div>
    ))}
  </div>
  ) : null}

  {/* ============ 08 STRATEGY: THE GAME PLAN ============ */}
  {(isStrategy) ? (
  <div style={screenPad}>
    <div style={{ marginBottom: "22px" }}>
      {kicker('SEGMENT 08 — WHY THE ENGINE IS BUILT THIS WAY')}
      <h1 style={h1s}>The Game Plan</h1>
      <div style={{ ...subs, maxWidth: "600px" }}>Read it when a shiny distraction shows up and threatens the one thing.</div>
    </div>

    <div style={{ position: "relative", background: "rgba(255,184,28,.07)", border: "1px solid rgba(255,184,28,.4)", borderLeft: "5px solid var(--gold)", borderRadius: "4px", padding: "24px 28px", marginBottom: "22px", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: "6px", top: "-38px", fontFamily: "var(--num)", fontWeight: 700, fontSize: "140px", color: "rgba(255,184,28,.08)", lineHeight: 1 }}>★</div>
      <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".24em", color: "var(--gold)" }}>THE THESIS</div>
      <div style={{ fontFamily: "var(--num)", fontWeight: 600, fontSize: "28px", lineHeight: "1.2", marginTop: "10px", maxWidth: "900px", color: "var(--white)" }}>{stratThesis}</div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "22px" }}>
      {stratPillars.map((p, i) => (
        <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "4px solid var(--gold)", borderRadius: "4px", padding: "18px 20px" }}>
          <div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)" }}>{p.k}</div>
          <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "19px", color: "var(--white)", marginTop: "7px", lineHeight: "1.1", textTransform: "uppercase" }}>{p.t}</div>
          <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.6", marginTop: "8px" }}>{p.d}</div>
        </div>
      ))}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "18px 20px" }}>
        <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)" }}>THE THREE BETS</div>
        <div style={{ marginTop: "10px" }}>
          {stratBets.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: "11px", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: "12.5px", lineHeight: "1.55", color: "var(--white)" }}><span style={{ color: "var(--gold)", fontWeight: 900, flexShrink: 0 }}>›</span><span>{b}</span></div>
          ))}
        </div>
      </div>
      <div style={{ background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "4px", padding: "18px 20px" }}>
        <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--dim)" }}>WHAT WE DON'T DO</div>
        <div style={{ marginTop: "10px" }}>
          {stratAnti.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: "11px", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: "12.5px", lineHeight: "1.55", color: "var(--muted)" }}><span style={{ color: "var(--live)", fontWeight: 900, flexShrink: 0 }}>✕</span><span>{a}</span></div>
          ))}
        </div>
      </div>
    </div>
  </div>
  ) : null}

  {/* ============ 09 PLANS: THE SEASON ============ */}
  {(isPlans) ? (
  <div style={screenPad}>
    <div style={{ marginBottom: "22px" }}>
      {kicker('SEGMENT 09 — FOUR QUARTERS, TWO DEADLINES, ONE NUMBER')}
      <h1 style={h1s}>The Season</h1>
      <div style={{ ...subs, maxWidth: "600px" }}>Sign {goalFmt} by {sellByLabel}. Collect it by {deadlineLabel}. Everything on this page serves that.</div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "22px" }}>
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "4px solid var(--gold)", borderRadius: "4px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "18px" }}>
        <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "46px", color: "var(--gold)", lineHeight: ".9" }}>{sellDays}</div>
        <div><div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".2em", color: "var(--dim)" }}>DAYS TO SIGN</div><div style={{ fontWeight: 800, fontSize: "15px", color: "var(--white)", marginTop: "3px" }}>{goalFmt} CONTRACTED · {sellByLabel}</div></div>
      </div>
      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderTop: "4px solid var(--line)", borderRadius: "4px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "18px" }}>
        <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "46px", color: "var(--white)", lineHeight: ".9" }}>{deadDays}</div>
        <div><div style={{ fontSize: "9.5px", fontWeight: 800, letterSpacing: ".2em", color: "var(--dim)" }}>DAYS TO COLLECT</div><div style={{ fontWeight: 800, fontSize: "15px", color: "var(--white)", marginTop: "3px" }}>{goalFmt} BANKED · {deadlineLabel}</div></div>
      </div>
    </div>

    <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)", marginBottom: "11px" }}>THE FOUR QUARTERS</div>
    <div style={{ marginBottom: "22px" }}>
      {plansPhases.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: "16px", alignItems: "flex-start", background: "var(--panel)", border: "1px solid var(--line)", borderLeft: "4px solid " + p.c, borderRadius: "4px", padding: "16px 18px", marginBottom: "10px" }}>
          <div style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "26px", color: p.c, flexShrink: 0, width: "44px", lineHeight: 1 }}>{p.n}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "18px", color: "var(--white)", textTransform: "uppercase" }}>{p.t}</span>
              <span style={{ fontSize: "8.5px", fontWeight: 800, letterSpacing: ".12em", color: p.c, border: "1px solid " + p.c, borderRadius: "2px", padding: "2px 7px" }}>{p.when}</span>
              <span style={{ fontSize: "8.5px", fontWeight: 800, letterSpacing: ".14em", color: "var(--dim)", marginLeft: "auto" }}>{p.state}</span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.6", marginTop: "6px" }}>{p.d}</div>
          </div>
        </div>
      ))}
    </div>

    <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "4px", padding: "18px 20px" }}>
      <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)" }}>THIS WEEK'S MOVES · Q1</div>
      <div style={{ marginTop: "10px" }}>
        {planMoves.map((m, i) => (
          <div key={i} onClick={m.onClick} style={{ display: "flex", alignItems: "center", gap: "11px", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: "12px", cursor: "pointer" }}>
            <span style={{ width: "17px", height: "17px", borderRadius: "2px", border: "1.5px solid " + m.box, background: m.boxBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--golddark)", flexShrink: 0, fontWeight: 900 }}>{m.check}</span>
            <span style={{ color: m.tc }}>{m.text}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
  ) : null}

  {/* ============ 10-16: THE BACK OFFICE (engine screens, broadcast-toned) ============ */}
  {(this.state.view === 'clients') ? this.renderClientsTab() : null}
  {(this.state.view === 'invoices') ? this.renderInvoicesTab() : null}
  {(this.state.view === 'proposals') ? this.renderProposalsTab() : null}
  {(this.state.view === 'scheduling') ? this.renderSchedulingTab() : null}
  {(this.state.view === 'kpis') ? this.renderKpisTab() : null}
  {(this.state.view === 'expenses') ? this.renderExpensesTab() : null}
  {(this.state.view === 'rookie') ? this.renderRookieTab() : null}

  {/* BOTTOMLINE TICKER */}
  {(tickerOn) ? (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 35, display: "flex", alignItems: "stretch", background: "#04070d", borderTop: "1px solid var(--line)" }}>
      <div style={{ background: "var(--gold)", color: "var(--golddark)", fontWeight: 900, fontSize: "10.5px", letterSpacing: ".18em", display: "flex", alignItems: "center", padding: "9px 16px", whiteSpace: "nowrap" }}>CI WIRE</div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center" }}>
        <div style={{ display: "inline-flex", whiteSpace: "nowrap", animation: animTicker, fontSize: "11px", fontWeight: 600, letterSpacing: ".1em", color: "var(--muted)" }}>
          {tickerSpan('a')}
          {tickerSpan('b')}
        </div>
      </div>
    </div>
  ) : null}

  {/* TOAST */}
  {(toast) ? (
    <div style={{ position: "fixed", bottom: "52px", left: "50%", transform: "translateX(-50%)", background: "var(--gold)", color: "var(--golddark)", padding: "10px 22px", fontWeight: 900, fontSize: "11px", letterSpacing: ".14em", zIndex: 90, borderRadius: "3px", boxShadow: "0 8px 20px rgba(0,0,0,.5)" }}>{toast}</div>
  ) : null}

  {/* ===================== BOOT: GOING LIVE ===================== */}
  {(booting) ? (
    <div onClick={dismissBoot} style={{ position: "fixed", inset: 0, zIndex: 120, background: "var(--deep)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "24px", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", height: "10px" }}>
        <div style={{ flex: 1, background: "var(--gold)" }}></div><div style={{ flex: 1, background: "var(--white)" }}></div><div style={{ flex: 1, background: "var(--muted)" }}></div><div style={{ flex: 1, background: "var(--panel2)" }}></div><div style={{ flex: 1, background: "var(--live)" }}></div>
      </div>
      <div onClick={skipBoot} style={{ position: "absolute", top: "26px", right: "22px", fontSize: "9.5px", fontWeight: 900, letterSpacing: ".18em", color: "var(--golddark)", background: "var(--gold)", padding: "7px 12px", cursor: "pointer", zIndex: 3, borderRadius: "3px" }}>[ESC] SKIP →</div>

      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <div style={{ width: "84px", height: "84px", borderRadius: "12px", overflow: "hidden", margin: "0 auto 18px", border: "1px solid var(--line)" }}>
          <img src="/brand/ci-mark.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <div style={{ fontWeight: 900, fontSize: "26px", letterSpacing: ".1em" }}>CREATIVE IMPACT</div>
        <div style={{ fontSize: "9px", fontWeight: 800, letterSpacing: ".4em", color: "var(--dim)", marginTop: "7px" }}>IMPACT SPORTS NET · CHARLOTTE, NC</div>

        {(countShow) ? (
          <div key={countNum} style={{ fontFamily: "var(--num)", fontWeight: 700, fontSize: "170px", lineHeight: 1, color: "var(--gold)", margin: "26px 0 10px", animation: animCount }}>{countNum}</div>
        ) : null}
        {(bootReady) ? (<>
          <div style={{ margin: "30px 0 14px", display: "inline-flex", alignItems: "center", gap: "10px", background: "var(--live)", padding: "12px 24px", borderRadius: "4px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#fff", animation: animPulse }}></span>
            <span style={{ fontWeight: 900, fontSize: "17px", letterSpacing: ".22em" }}>WE'RE LIVE</span>
          </div>
          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: ".2em", color: "var(--muted)" }}>CLICK ANYWHERE TO ENTER THE BOOTH<span style={{ animation: "blink 1s steps(1) infinite" }}>_</span></div>
        </>) : null}
        {(countShow) ? (
          <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: ".26em", color: "var(--muted)" }}>GOING LIVE — STAND BY</div>
        ) : null}
      </div>
    </div>
  ) : null}

</div>

      </>
    );
  }
}

export default Cockpit;
