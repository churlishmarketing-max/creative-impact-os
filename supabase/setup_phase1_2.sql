-- Churlish OS — Clients + Invoices (Phase 1 & 2). Paste all, Run once.

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


-- ============================================================================
-- Churlish OS — Phase 2: Invoices
-- Run once in the Supabase SQL Editor (after 02_clients.sql). Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.invoices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id         uuid references public.clients(id) on delete set null,
  number            text not null default '',
  title             text default '',
  items             jsonb not null default '[]'::jsonb,  -- [{desc, qty, unit_cents}]
  amount_cents      bigint not null default 0,
  currency          text not null default 'usd',
  status            text not null default 'draft',       -- draft / sent / paid / void
  due_date          date,
  notes             text,
  token             text not null default gen_random_uuid()::text,  -- secret for the public pay link
  stripe_session_id text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists invoices_user_idx on public.invoices(user_id);
create unique index if not exists invoices_token_idx on public.invoices(token);

drop trigger if exists touch_invoices on public.invoices;
create trigger touch_invoices before update on public.invoices
  for each row execute function public.touch_updated_at();

alter table public.invoices enable row level security;
drop policy if exists own_rows on public.invoices;
create policy own_rows on public.invoices for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public read of a SINGLE invoice by its secret token (for the client pay page).
-- SECURITY DEFINER bypasses RLS but only ever returns the one token-matched row,
-- and never lists invoices — so the rest of your data stays private.
create or replace function public.get_invoice_by_token(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'number', i.number,
    'title', i.title,
    'items', i.items,
    'amount_cents', i.amount_cents,
    'currency', i.currency,
    'status', i.status,
    'due_date', i.due_date,
    'notes', i.notes,
    'client', coalesce(c.name, ''),
    'token', i.token
  )
  from public.invoices i
  left join public.clients c on c.id = i.client_id
  where i.token = p_token
  limit 1;
$$;
revoke all on function public.get_invoice_by_token(text) from public;
grant execute on function public.get_invoice_by_token(text) to anon, authenticated;
