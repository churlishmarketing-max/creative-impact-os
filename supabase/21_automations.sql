-- ============================================================================
-- Creative Impact OS — Automations engine (user-defined + Jarvis-created)
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- This is the configurable layer that sits ON TOP of the hardcoded lifecycle
-- automations in lib/automations.ts. Rows here are created by the operator on
-- the AUTOMATIONS tab or by Jarvis, and dispatched by the daily Vercel cron.
--
-- Cadence note: the Vercel Hobby plan allows ONE cron run per day, so the
-- smallest real granularity is "once on the days it's due". Everything is
-- modelled that way; moving to Vercel Pro later only adds more dispatch
-- windows, it does not change this schema.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.automations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name          text not null default '',
  description   text,

  -- WHEN. cadence: daily | weekdays | weekly | monthly | manual
  cadence       text not null default 'daily',
  day_of_week   int,                       -- 0=Sun .. 6=Sat, for cadence='weekly'
  day_of_month  int,                       -- 1..31, for cadence='monthly'

  -- WHAT. action: leak_sweep | board_digest | log_marker
  action        text not null default 'log_marker',
  action_config jsonb not null default '{}'::jsonb,

  enabled       boolean not null default true,

  -- Run bookkeeping
  last_run_at   timestamptz,
  last_status   text,                       -- ok | error | skipped
  last_result   text,
  run_count     int not null default 0,

  created_by    text not null default 'operator',   -- operator | jarvis
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists automations_user_idx on public.automations(user_id, enabled);

drop trigger if exists touch_automations on public.automations;
create trigger touch_automations before update on public.automations
  for each row execute function public.touch_updated_at();

alter table public.automations enable row level security;
drop policy if exists own_rows on public.automations;
create policy own_rows on public.automations for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Seed: two useful automations, DISABLED by default so nothing fires until the
-- operator turns them on. Only inserts when the table is empty, so re-running
-- this file never duplicates or resurrects something deliberately removed.
-- ----------------------------------------------------------------------------
insert into public.automations (user_id, name, description, cadence, day_of_week, action, enabled, created_by)
select a.user_id, s.name, s.description, s.cadence, s.day_of_week, s.action, false, 'operator'
from (select user_id from public.app_state limit 1) a
cross join (values
  ('Revenue leak sweep',
   'Black Widow: unpaid invoices past due, proposals gone quiet, stalled deals, and unsold capture days — each with a dollar figure. Posts to the fleet feed.',
   'weekly', 1, 'leak_sweep'),
  ('Monday board digest',
   'Snapshot of collected / signed / open pipeline / coverage and what is due, posted to the fleet feed.',
   'weekly', 1, 'board_digest')
) as s(name, description, cadence, day_of_week, action)
where not exists (select 1 from public.automations);
