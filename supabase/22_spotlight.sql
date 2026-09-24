-- ============================================================================
-- Creative Impact OS — Charlotte Spotlight (prospects, stages, questionnaire)
-- Run once in the Supabase SQL Editor. Safe to re-run. Touches no other table.
--
-- One row per business in the Spotlight pipeline, from cold-list prospect to
-- published member. Pricing, the agreement template, and toggles live in
-- app_state.ops.__spotlight (edited on the SPOTLIGHT tab), not in this table,
-- so a price change is a settings change, never a migration.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.spotlight_prospects (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id          uuid references public.clients(id) on delete set null,

  -- WHO (the call opener runs on reviews + years + video situation)
  business           text not null default '',
  owner_name         text,
  email              text,
  phone              text,
  website            text,
  vertical           text,
  suburb             text,
  reviews            int,
  years              int,
  video_situation    text,                 -- none | minimal | some
  source             text,                 -- cold list | booking | referral | warm | ...

  -- WHERE THEY ARE
  stage              text not null default 'prospect',
  stage_at           timestamptz not null default now(),
  slot_month         text,                 -- e.g. 'October 2026'
  film_date          date,
  quote_mentioned    text,                 -- the solo-video quote they said they got
  season_named       text,                 -- the season/month they said matters
  not_now_month      text,                 -- 'Not now' lane: the month to call back
  notes              text,

  -- WEBSITE IMPORT (facts pulled off their site; nulls where the site is silent)
  profile            jsonb not null default '{}'::jsonb,

  -- COLD SEQUENCE (emails 1-6); last touch sent + when
  seq_step           int not null default 0,
  seq_last_at        timestamptz,

  -- MONEY + PAPER (the OS's own invoices and e-sign proposals)
  deposit_invoice_id uuid references public.invoices(id) on delete set null,
  balance_invoice_id uuid references public.invoices(id) on delete set null,
  agreement_id       uuid references public.proposals(id) on delete set null,

  -- THE QUESTIONNAIRE (sent after they become a member)
  q_token            text not null default gen_random_uuid()::text,
  questions          jsonb not null default '[]'::jsonb,  -- [{id, q, why, core}]
  answers            jsonb not null default '{}'::jsonb,  -- {id: {a, star}}
  q_sent_at          timestamptz,
  q_returned_at      timestamptz,
  member_at          timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists spotlight_user_idx on public.spotlight_prospects(user_id, stage);
create unique index if not exists spotlight_qtoken_idx on public.spotlight_prospects(q_token);

drop trigger if exists touch_spotlight on public.spotlight_prospects;
create trigger touch_spotlight before update on public.spotlight_prospects
  for each row execute function public.touch_updated_at();

alter table public.spotlight_prospects enable row level security;
drop policy if exists own_rows on public.spotlight_prospects;
create policy own_rows on public.spotlight_prospects for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
