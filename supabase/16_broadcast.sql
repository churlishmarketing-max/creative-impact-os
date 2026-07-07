-- ============================================================================
-- Creative Impact OS — Broadcast additions: capture days + deliverables tracker.
-- Run once in the Supabase SQL Editor (after 15_status_docs.sql). Safe to re-run.
-- Additive only — no engine tables are modified. Partner check-ins ride the
-- existing app_state.founder jsonb (keys 'EB|YYYY-MM-DD' / 'BK|YYYY-MM-DD').
-- ============================================================================

create extension if not exists pgcrypto;

-- Capture days ("shoots"): one half-day per client, per month. status OPEN
-- means an unsold slot — the gold dashed "TICKETS AVAILABLE" card in the UI.
create table if not exists public.shoots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  shoot_date date not null,
  client     text not null default '',
  kind       text not null default 'STORY CAPTURE · HALF-DAY',
  status     text not null default 'OPEN',  -- OPEN / BOOKED / CONFIRMED / SHOT
  created_at timestamptz not null default now()
);
create index if not exists shoots_user_idx on public.shoots(user_id, shoot_date);

alter table public.shoots enable row level security;
drop policy if exists own_rows on public.shoots;
create policy own_rows on public.shoots for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Deliverables tracker: clips shipped per live client this month (target 8–12),
-- plus a free-text meta line (photos, ads live, next milestone).
create table if not exists public.deliverables (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name       text not null,
  clips      int  not null default 0,
  meta       text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists deliverables_user_idx on public.deliverables(user_id);

alter table public.deliverables enable row level security;
drop policy if exists own_rows on public.deliverables;
create policy own_rows on public.deliverables for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
