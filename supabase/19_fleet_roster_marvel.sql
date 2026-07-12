-- ============================================================================
-- CREATIVE IMPACT OS — Fleet roster: MARVEL PLACEHOLDER EDITION.
-- Use this INSTEAD of 19_fleet_roster.sql (that one seeds the Creative Impact DC
-- fleet). Every unit here is a PLACEHOLDER: the real agents and skills get
-- built by Ja'Rel through his own Claude account, then wired to
-- /api/fleet/ingest (run reports) and /api/fleet/roster (roster updates).
-- Until then the /fleet page renders the org chart with "no runs reported."
--
-- DC → Marvel mapping (same role, new name):
--   EVE→FRIDAY · Fable Mind→The Ancient One · Watchtower→The Watcher
--   Voice Guard→Daredevil · Avatar Bible→Cerebro · LLM Council→The Illuminati
--   YouTube Council→The Bugle Desk · Suicide Squad→Thunderbolts
--   Board of Directors→Hellfire Club · Kid Flash→Quicksilver
--   Blue Beetle→Falcon · Red Robin→Spider-Man · Iris West→Ben Urich
--   Guardian→Luke Cage · Cassandra Cain→Echo · Martian Manhunter→Professor X
--   Doctor Mid-Nite→Doctor Strange · Brother Eye→E.D.I.T.H. · Oracle→Maria Hill
--   Pennyworth→Anchor (broadcast name, per Brandon 2026-07-12) · Cyborg→War Machine · Steele→Ironheart
--   The Flash→Speed · Lois Lane→Trish Walker · The Question→Jessica Jones
--   Huntress→Black Widow · Alfred→Stan (the editor) · Rookie→Showrunner (broadcast name)
--   Diagnostic Agent→Banner
-- Dropped as Creative Impact-specific: HLP units, MindCTRL council, client files.
--
-- Run once in the Creative Impact Supabase SQL Editor (after the fleet_reports
-- migration). Safe to re-run (upserts the seed).
-- ============================================================================

create table if not exists public.fleet_roster (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  key       text not null,               -- kebab id; matches fleet_reports.agent
  name      text not null default '',
  alias     text not null default '',
  division  text not null default 'fleet',  -- command | war-rooms | fleet | production | systems | clients
  job       text not null default '',
  triggers  text not null default '',
  schedule  text,                        -- null = on demand / event-driven
  loc       text not null default 'WS',  -- WS (workspace skill) | CC (Claude Code fleet) | OS (native)
  sort      int not null default 100,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);
alter table public.fleet_roster enable row level security;
drop policy if exists own_rows on public.fleet_roster;
create policy own_rows on public.fleet_roster for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
declare uid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found.'; end if;

  insert into public.fleet_roster (user_id, key, name, alias, division, job, triggers, schedule, loc, sort) values
  -- COMMAND LAYER (5)
  (uid,'friday','FRIDAY','Executive Operator','command','Default operating layer. Runs the weekly loop, routes every job to the right specialist, enforces the goal ledger.','TO BUILD · "FRIDAY" · operator mode · plan my week','Boots every session','WS',1),
  (uid,'the-ancient-one','The Ancient One','The Doctrine','command','Model-agnostic reasoning doctrine: interview-first, absence hunting, adversary pass, numbers over adjectives, ship with receipts.','TO BUILD · start of any session · any strategic/pricing output','Boots every session','WS',2),
  (uid,'the-watcher','The Watcher','Fleet Supervisor','command','Verifies every agent ran and produced clean, on-brand output. Flags failures and drift, escalates red items.','TO BUILD · "run The Watcher" · evaluator mode','Daily','WS',3),
  (uid,'daredevil','Daredevil','The Law','command','Brand voice + visual law: banned words, banned CTAs, structure, color law, typography — enforced before anything ships.','TO BUILD · before ANY branded output',null,'WS',4),
  (uid,'cerebro','Cerebro','The Dossier','command','Stores and serves client avatar profiles so every skill writes to a real person.','TO BUILD · "avatar for [client]"',null,'WS',5),
  -- WAR ROOMS (4)
  (uid,'the-illuminati','The Illuminati','The Tribunal','war-rooms','Blind advisor panel + peer review + chairman verdict on real decisions: Green-light / Reshape / Kill + cheapest 48-hr test.','TO BUILD · "council this" · decisions with stakes',null,'WS',10),
  (uid,'the-bugle-desk','The Bugle Desk','Packaging War Room','war-rooms','Multi-seat board for video ideas, titles, thumbnails, hooks, channel calls. Kills yes-man feedback before publish.','TO BUILD · "would this get the click"',null,'WS',11),
  (uid,'thunderbolts','Thunderbolts','The Hit Squad','war-rooms','Four-move assassination of a business/offer/funnel: Kill Order, Absence Detector, Decision Archaeology, tribunal.','TO BUILD · "find the fatal flaw"',null,'WS',12),
  (uid,'hellfire-club','Hellfire Club','The Boardroom','war-rooms','Portfolio war room ruling against the long-term revenue goals; sequences ventures and protects focus.','TO BUILD · "convene the board" · portfolio review',null,'WS',13),
  -- FLEET AGENTS (17)
  (uid,'quicksilver','Quicksilver','Lead Research','fleet','Sources, qualifies, tiers, verifies prospect lists. Feeds Falcon; keeps the funnel floor fed.','TO BUILD · "run Quicksilver" · list sourcing','Daily · morning','WS',20),
  (uid,'falcon','Falcon','Brand Outreach','fleet','Multi-touch email + LinkedIn outreach, routes replies, books 15-min calls.','TO BUILD · "run Falcon" · outreach · booking','Daily','WS',21),
  (uid,'spider-man','Spider-Man','Short-Form & Ad Creative','fleet','Multiplies raw footage into walls of clips + ad variations, on-voice and CTA-clean. Owns ad refreshes.','TO BUILD · "run Spidey" · shorts · ad creative','Daily','WS',22),
  (uid,'ben-urich','Ben Urich','The Reporter','fleet','7-day sweep of niche news, platform shifts, local angles, competitor headlines — filed as content angles with expiry dates.','TO BUILD · "anything timely"','Weekly · Monday AM','WS',23),
  (uid,'luke-cage','Luke Cage','The Renewal Saver','fleet','Watches every retainer contract clock + account health; builds receipts-based renewal cases before the window opens.','TO BUILD · churn signals','Weekly','WS',24),
  (uid,'echo','Echo','The Receipts Scorer','fleet','Scores drafts against actual historical performance — the tape, not theory. Refuses to fake a score with no data.','TO BUILD · "score this"',null,'WS',25),
  (uid,'professor-x','Professor X','The Voice Forge','fleet','Extracts a client''s real voice into a voice file; the whole fleet wears it. Mandatory before the first copy deliverable.','TO BUILD · "build a voice file"','Every onboarding','WS',26),
  (uid,'doctor-strange','Doctor Strange','Funnel Page Surgeon','fleet','Audits the page the click lands on. Mandatory pre-launch surgery on every funnel.','TO BUILD · "why isn''t my page converting"','Every funnel launch','WS',27),
  (uid,'edith','E.D.I.T.H.','Answer Engine Visibility','fleet','Makes the client THE answer when someone asks ChatGPT/Claude/Perplexity for "best X in [city]."','TO BUILD · AEO/GEO mentions',null,'WS',28),
  (uid,'maria-hill','Maria Hill','Comms Triage','fleet','Daily inbox brief — what matters, what waits, what needs the operator.','TO BUILD · daily inbox brief','Daily','CC',29),
  (uid,'anchor','Anchor','The Client Producer','fleet','Client-facing email agent inside the OS: outreach, audit booking, onboarding, lifecycle — plus the daily money brief when built.','Built into the OS · money brief TO BUILD','Daily','OS',30),
  (uid,'war-machine','War Machine','Ad Monitor','fleet','Daily ad brief — spend, results, anything drifting toward scale-or-kill.','TO BUILD · daily ad brief','Daily','CC',31),
  (uid,'ironheart','Ironheart','Production Board','fleet','Keeps the production board current — every project, status, deadline.','TO BUILD · board update','Daily','CC',32),
  (uid,'speed','Speed','Publish Queue','fleet','Runs the daily publish queue — what ships, where, when.','TO BUILD · publish queue','Daily','CC',33),
  (uid,'trish-walker','Trish Walker','Episode Kit','fleet','Builds the episode kit when a show episode drops.','TO BUILD · episode drop','Per episode','CC',34),
  (uid,'jessica-jones','Jessica Jones','The Intel Brief','fleet','Friday intel brief — market movement, competitor activity.','TO BUILD · Friday brief','Weekly · Friday','CC',35),
  (uid,'black-widow','Black Widow','Revenue Leak Sweep','fleet','Sweeps for money that should be landing and isn''t: unbilled scope, dormant offers, dropped follow-ups.','TO BUILD · "run the leak sweep"','Periodic','CC',36),
  -- PRODUCTION ENGINES (13)
  (uid,'stan','Stan','The AI Editor','production','Long-form video brain: animation plans, storyboards, visual-direction specs, placement tables.','TO BUILD · "storyboard this video"',null,'WS',40),
  (uid,'clip-finder','Clip Finder','General Clip Pass','production','All-client clip finder: hook-strength scoring, timestamps, platform targets.','TO BUILD · "find clips"',null,'WS',41),
  (uid,'content-calendar-engine','Content Calendar Engine','The Calendar','production','Monthly calendars with funnel tags, cadence, hooks, CTAs.','TO BUILD · "content calendar for [client]"','Monthly per client','WS',42),
  (uid,'ad-script-factory','Ad Script Factory','Call-Out Creative','production','Direct-response scripts: pattern interrupt, pain call-out, pivot, proof, offer, one CTA.','TO BUILD · "write an ad for"',null,'WS',43),
  (uid,'ad-diagnostic-engine','Ad Diagnostic Engine','Performance Law','production','Benchmarks + prescriptions for CPL/CTR/Hook Rate; scale-or-kill calls; enforces CTA standards.','TO BUILD · any ad metrics',null,'WS',44),
  (uid,'email-sequence-writer','Email Sequence Writer','The Nurture Desk','production','Ready-to-load nurture sequences with timing and trigger logic.','TO BUILD · "nurture sequence for"',null,'WS',45),
  (uid,'strategy-doc-builder','Strategy Doc Builder','The Gameplan Desk','production','Strategy docs, playbooks, KPI trackers — branded .docx/.xlsx with revenue models.','TO BUILD · "gameplan for"',null,'WS',46),
  (uid,'master-plan-formula','Master Plan Formula','The Strategic Formula','production','Brain-dump → 10-section master plan + 5-section exec summary.','TO BUILD · "master plan for [business]"',null,'WS',47),
  (uid,'master-plan-style','Master Plan Style','The Signature Render','production','The exact Master Plan visual system — HTML + PDF + DOCX.','TO BUILD · "Master Plan style"',null,'WS',48),
  (uid,'proposal-generator','Proposal Generator','The Pitch Desk','production','Proposal docs with tiered pricing and avatar pain language, send-ready.','TO BUILD · "proposal for [client]"',null,'WS',49),
  (uid,'invoice-scoper','Invoice Scoper','The Billing Desk','production','Campaign scope → billable line items for the OS.','TO BUILD · "invoice for [client]"',null,'WS',50),
  (uid,'editor-brief-generator','Editor Brief Generator','The Handoff Desk','production','Zero-follow-up briefs for editors, VAs, production team.','TO BUILD · "brief for [editor]"',null,'WS',51),
  (uid,'youtube-metadata','YouTube Metadata','The Publishing Desk','production','Titles, descriptions, tags, thumbnails, chapters for client channels.','TO BUILD · "title options"',null,'WS',52),
  -- SYSTEMS & PROTOCOLS (3)
  (uid,'verification-loop','Verification Loop','Ship With Receipts','systems','Definition of Done → evidence per item → edge-case stress test. Nothing flagship ships unproven.','TO BUILD · before any flagship build ships',null,'CC',60),
  (uid,'goal-runner','Goal Runner','The Build Rig','systems','Large multi-deliverable builds run to done with parallel sub-agents; graded by The Watcher, never self-approved.','TO BUILD · any large build',null,'CC',61),
  (uid,'session-handoff','Session Handoff','The Relay','systems','Packages session state when context fills, sessions run long, or models switch.','TO BUILD · context full · model switch',null,'CC',62),
  -- OS NATIVES (2)
  (uid,'showrunner','Showrunner','The Supervisor','systems','The OS console agent — reads the board, executes orders, drafts hand off to Anchor, never touches money or deletes.','Built into the OS',null,'OS',70),
  (uid,'banner','Banner','Diagnostic Agent','systems','Runs the paid diagnostic reports inside the OS: metrics, matrices, honest projections.','Built into the OS · connect when cloned',null,'OS',71)
  on conflict (user_id, key) do update set
    name = excluded.name, alias = excluded.alias, division = excluded.division,
    job = excluded.job, triggers = excluded.triggers, schedule = excluded.schedule,
    loc = excluded.loc, sort = excluded.sort, updated_at = now();
end $$;
