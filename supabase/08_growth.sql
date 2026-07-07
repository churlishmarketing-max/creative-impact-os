-- ============================================================================
-- Churlish OS — Growth pack: Expenses, KPIs, Client email threads
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- EXPENSES -------------------------------------------------------------------
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  spent_on     date not null default current_date,
  vendor       text not null default '',
  category     text not null default 'Software',   -- Software / Ads / Contractors / Gear / Fees / Other
  amount_cents bigint not null default 0,
  recurring    boolean not null default false,      -- true = monthly subscription
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists expenses_user_idx on public.expenses(user_id, spent_on desc);
drop trigger if exists touch_expenses on public.expenses;
create trigger touch_expenses before update on public.expenses
  for each row execute function public.touch_updated_at();
alter table public.expenses enable row level security;
drop policy if exists own_rows on public.expenses;
create policy own_rows on public.expenses for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- KPIs -----------------------------------------------------------------------
create table if not exists public.kpis (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name       text not null default '',
  unit       text not null default '#',       -- '#' / '$' / '%'
  target     numeric,                          -- per-period target (null = no target)
  cadence    text not null default 'weekly',   -- weekly / monthly
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists kpis_user_idx on public.kpis(user_id, sort);
alter table public.kpis enable row level security;
drop policy if exists own_rows on public.kpis;
create policy own_rows on public.kpis for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.kpi_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kpi_id     uuid not null references public.kpis(id) on delete cascade,
  period_key text not null,                    -- '2026-W27' (weekly) or '2026-07' (monthly)
  value      numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (kpi_id, period_key)
);
create index if not exists kpi_entries_user_idx on public.kpi_entries(user_id, kpi_id);
alter table public.kpi_entries enable row level security;
drop policy if exists own_rows on public.kpi_entries;
create policy own_rows on public.kpi_entries for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CLIENT EMAIL THREADS ---------------------------------------------------------
create table if not exists public.email_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  client_id  uuid references public.clients(id) on delete set null,
  direction  text not null default 'out',      -- out / in
  from_email text,
  to_email   text,
  subject    text default '',
  body       text default '',
  resend_id  text,
  created_at timestamptz not null default now()
);
create index if not exists email_user_idx on public.email_messages(user_id, client_id, created_at);
alter table public.email_messages enable row level security;
drop policy if exists own_rows on public.email_messages;
create policy own_rows on public.email_messages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
