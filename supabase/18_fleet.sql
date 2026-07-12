-- ============================================================================
-- Creative Impact OS — Fleet reports: the Cowork agents phone their runs home.
-- Agents keep RUNNING in Claude Cowork (that's where their horsepower is);
-- this table is where their results land so the cockpit shows real telemetry.
-- Run once in the SQL Editor (after 17). Safe to re-run.
-- ============================================================================

create table if not exists public.fleet_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  agent      text not null default '',            -- kid-flash | blue-beetle | guardian | iris-west | ...
  title      text not null default '',            -- one-line headline of the run
  summary    text not null default '',            -- the run report (plain text / markdown)
  payload    jsonb not null default '{}'::jsonb,  -- structured extras (counts, links, per-client notes)
  run_at     timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists fleet_reports_idx on public.fleet_reports(user_id, agent, run_at desc);
create index if not exists fleet_reports_time_idx on public.fleet_reports(user_id, run_at desc);
alter table public.fleet_reports enable row level security;
drop policy if exists own_rows on public.fleet_reports;
create policy own_rows on public.fleet_reports for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
