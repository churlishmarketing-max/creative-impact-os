-- ============================================================================
-- Churlish OS — Phase 1: Clients / CRM
-- Run this once in the Supabase SQL Editor (after schema.sql). Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name         text not null default '',   -- business name
  contact_name text,                        -- the person
  email        text,
  phone        text,
  industry     text,                        -- roofing / dental / HVAC / law / fitness / realty …
  status       text not null default 'Lead',-- Lead / Active / Past
  source       text,                        -- Facebook / Referral / Cold / …
  ladder       text,                        -- Diagnostic / Tournament / Tool Sprint / Retainer
  renewal_date date,                        -- drives the day-60/75 renewal play
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists clients_user_idx on public.clients(user_id);

-- Link the existing pipeline to clients (a client climbs the ladder over many deals)
alter table public.deals add column if not exists client_id uuid references public.clients(id) on delete set null;

drop trigger if exists touch_clients on public.clients;
create trigger touch_clients before update on public.clients
  for each row execute function public.touch_updated_at();

alter table public.clients enable row level security;
drop policy if exists own_rows on public.clients;
create policy own_rows on public.clients for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
