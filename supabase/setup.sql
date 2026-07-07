-- ============================================================================
-- Creative Impact OS — ONE-SHOT SETUP. Paste this whole file into the Supabase SQL
-- Editor and click Run. Creates the tables, then loads the starting data.
-- Safe to re-run. Requires your user to already exist (Authentication > Users).
-- ============================================================================

-- ============================================================================
-- Creative Impact OS — Stage 1 schema
-- Single user. All money stored as INTEGER CENTS. Everything behind RLS.
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- bump updated_at on every write -------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- SPRINT — one row per user: the editable targets + dates ------------------------
create table if not exists public.sprint (
  user_id        uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  target_cents   bigint not null default 15000000,         -- $150,000
  sellby_date    date   not null default '2026-08-31',
  deadline_date  date   not null default '2026-12-31',
  one_thing_title text  default 'Publish the $750 Authority Diagnostic',
  one_thing_body  text  default '',
  updated_at     timestamptz not null default now()
);

-- DEALS — the pipeline (now real & editable) -------------------------------------
create table if not exists public.deals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name         text not null default '',
  offer        text not null default '',
  value_cents  bigint not null default 0,
  stage        text not null default 'Lead',  -- Lead / Diagnostic Sent / Diagnostic Done / Proposal / Signed / Collected / Lost
  expected_date date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists deals_user_idx on public.deals(user_id);

-- WEEKS — Friday Five + floor, one row per ISO week ------------------------------
create table if not exists public.weeks (
  user_id          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  week_key         text not null,                 -- e.g. 2026-W27 (ISO year-week)
  calls            int  not null default 0,
  offers_out       int  not null default 0,
  signed_cents     bigint not null default 0,
  collected_cents  bigint not null default 0,
  founder_free_pct int,                           -- 0..100, null = blank
  manual           jsonb not null default '{}'::jsonb,  -- { "pitch": true, "proof": false }
  updated_at       timestamptz not null default now(),
  primary key (user_id, week_key)
);

-- LOG ENTRIES — the sys.log panel (manual seed for Stage 1) ----------------------
create table if not exists public.log_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  tag        text not null default 'EV',     -- KF / BB / RR / EV / WT / AL
  message    text not null default '',
  color      text                            -- optional css color token
);
create index if not exists log_user_idx on public.log_entries(user_id, created_at desc);

-- APP STATE — founder check-ins, habits, goals, ops checklists (one jsonb doc) ---
create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  founder    jsonb not null default '{}'::jsonb,
  habits     jsonb not null default '[]'::jsonb,
  goals      jsonb not null default '[]'::jsonb,
  ops        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- updated_at triggers ------------------------------------------------------------
drop trigger if exists touch_sprint    on public.sprint;
drop trigger if exists touch_deals     on public.deals;
drop trigger if exists touch_weeks     on public.weeks;
drop trigger if exists touch_app_state on public.app_state;
create trigger touch_sprint    before update on public.sprint    for each row execute function public.touch_updated_at();
create trigger touch_deals     before update on public.deals     for each row execute function public.touch_updated_at();
create trigger touch_weeks     before update on public.weeks     for each row execute function public.touch_updated_at();
create trigger touch_app_state before update on public.app_state for each row execute function public.touch_updated_at();

-- Row Level Security — a user can only ever see/touch their own rows -------------
alter table public.sprint      enable row level security;
alter table public.deals       enable row level security;
alter table public.weeks       enable row level security;
alter table public.log_entries enable row level security;
alter table public.app_state   enable row level security;

drop policy if exists own_rows on public.sprint;
drop policy if exists own_rows on public.deals;
drop policy if exists own_rows on public.weeks;
drop policy if exists own_rows on public.log_entries;
drop policy if exists own_rows on public.app_state;

create policy own_rows on public.sprint      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.deals       for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.weeks       for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.log_entries for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.app_state   for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ============================================================================
-- Creative Impact OS — Stage 1 seed data (mirrors the mockup's starting numbers)
-- Run AFTER you have created your single user account, in the Supabase SQL Editor.
-- It finds your (one) user automatically. Safe to re-run — it won't duplicate.
-- ============================================================================

do $$
declare uid uuid;
declare wk text := to_char(now(), 'IYYY"-W"IW');   -- current ISO year-week, matches the app
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then
    raise exception 'No user found. Create your account first (Authentication → Users), then re-run this.';
  end if;

  -- SPRINT (targets + dates) — upsert
  insert into public.sprint (user_id, target_cents, sellby_date, deadline_date, one_thing_title)
  values (uid, 15000000, '2026-08-31', '2026-12-31', 'Publish the $750 Authority Diagnostic')
  on conflict (user_id) do update
    set target_cents = excluded.target_cents,
        sellby_date = excluded.sellby_date,
        deadline_date = excluded.deadline_date;

  -- APP STATE (founder / habits / goals / ops) — upsert with mockup defaults
  insert into public.app_state (user_id, founder, ops, habits, goals)
  values (
    uid, '{}'::jsonb, '{}'::jsonb,
    '[{"id":"h1","name":"3 sales conversations","days":{}},
      {"id":"h2","name":"Move my body","days":{}},
      {"id":"h3","name":"Camera on something","days":{}}]'::jsonb,
    '[{"id":"g1","text":"$150K collected by Dec 31","type":"business","target":150000,"done":false},
      {"id":"g2","text":"Publish the $750 Diagnostic this week","type":"business","target":0,"done":false},
      {"id":"g3","text":"Protect health through the sprint — no week-5 wall","type":"life","target":0,"done":false}]'::jsonb
  )
  on conflict (user_id) do nothing;

  -- CURRENT WEEK (Friday Five) — only if not already present
  insert into public.weeks (user_id, week_key, calls, offers_out, signed_cents, collected_cents, founder_free_pct, manual)
  values (uid, wk, 4, 3, 825000, 500000, 38, '{"pitch":true}'::jsonb)
  on conflict (user_id, week_key) do nothing;

  -- DEALS — only seed if the pipeline is empty for this user
  if not exists (select 1 from public.deals where user_id = uid) then
    insert into public.deals (user_id, name, offer, value_cents, stage, expected_date) values
      (uid, 'Cornerstone Plumbing', 'Authority Diagnostic',    75000,  'Collected',       null),
      (uid, 'Vela Roofing',         'Ad Creative Tournament',  250000, 'Collected',       null),
      (uid, 'Brightline Dental',    '48-Hour Tool Sprint',     500000, 'Collected',       null),
      (uid, 'Maple & Co Realty',    'Authority Engine',        350000, 'Collected',       null),
      (uid, 'Ironside Fitness',     'Authority System',        500000, 'Collected',       null),
      (uid, 'Northstar HVAC',       'Authority Launchpad',     250000, 'Collected',       null),
      (uid, 'Harbor & Vine Law',    'Authority Diagnostic',    75000,  'Collected',       null),
      (uid, 'Cedar Park Dental',    'CRF Subscription',        240000, 'Collected',       null),
      (uid, 'Atlas Moving',         'Ad Creative Tournament',  250000, 'Collected',       null),
      (uid, 'Summit Realty',        'Authority System',        500000, 'Collected',       null),
      (uid, 'Forge Athletics',      '48-Hour Tool Sprint',     500000, 'Collected',       null),
      (uid, 'Delta Signs',          'Authority Diagnostic',    75000,  'Signed',          null),
      (uid, 'Quill & Co',           'Ad Creative Tournament',  250000, 'Signed',          null),
      (uid, 'Tower Electric',       '48-Hour Tool Sprint',     500000, 'Signed',          null),
      (uid, 'Lumen Studios',        'Authority Diagnostic',    75000,  'Diagnostic Sent', '2026-07-01'),
      (uid, 'Riverside Roofing',    'Authority Diagnostic',    75000,  'Lead',            '2026-07-02'),
      (uid, 'Granite Law',          'Authority Diagnostic',    75000,  'Diagnostic Sent', '2026-07-03'),
      (uid, 'Vertex HVAC',          'Authority Engine',        350000, 'Diagnostic Done', '2026-07-04'),
      (uid, 'Peak Dental',          'Ad Creative Tournament',  250000, 'Lead',            '2026-07-05'),
      (uid, 'Beacon Realty',        'Authority System',        500000, 'Proposal',        '2026-07-06'),
      (uid, 'Cobalt Realty',        'Authority Diagnostic',    75000,  'Diagnostic Sent', '2026-07-08'),
      (uid, 'Oak & Iron',           'Authority Launchpad',     250000, 'Proposal',        '2026-07-09'),
      (uid, 'Anchor Marine',        'Authority System',        500000, 'Diagnostic Done', '2026-07-10');
  end if;

  -- LOG ENTRIES — only seed if empty for this user
  if not exists (select 1 from public.log_entries where user_id = uid) then
    insert into public.log_entries (user_id, created_at, tag, color, message) values
      (uid, now() - interval '6 hour',  'KF', 'var(--red)',   'sourced 18 prospects · roofing / NE metro'),
      (uid, now() - interval '5 hour',  'BB', '#3fb97a',       'sequence dispatched · 14 sends, 0 bounces'),
      (uid, now() - interval '4 hour',  'BB', '#3fb97a',       'booked call · Lumen Studios · 15:00'),
      (uid, now() - interval '3 hour',  'RR', 'var(--cream)',  'rendered 6 ad variants · Vela tournament'),
      (uid, now() - interval '2 hour',  'WT', 'var(--muted)',  'fleet audit · all units on-brand · green'),
      (uid, now() - interval '1 hour',  'EV', 'var(--red)',    'ledger reconciled · collected +$5,000'),
      (uid, now() - interval '20 min',  'KF', 'var(--red)',    'tiered list updated · 142 active leads');
  end if;
end $$;
