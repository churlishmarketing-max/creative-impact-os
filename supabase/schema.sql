-- ============================================================================
-- Churlish OS — Stage 1 schema
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
