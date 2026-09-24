-- ============================================================================
-- Creative Impact OS — Nationwide lane (Hardscape & Landscape) lead log
-- Run once in the Supabase SQL Editor. Safe to re-run. Touches no other table.
--
-- One row per lead from the Meta qualifier form. The grade (A-D) is computed
-- by the OS from the five form answers (lib/nationwide.ts, Section 06).
-- Plan checkmarks, decisions, the Friday tracker rows, and ad status live in
-- app_state.ops.__nationwide, so this is the only table the lane needs.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.lane_leads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  lane            text not null default 'hardscape',

  -- the form (Meta prefills name/phone/email; state rides on the lead record)
  lead_at         timestamptz not null default now(),   -- when they submitted
  full_name       text,
  phone           text,
  email           text,
  state           text,
  company         text,
  web             text,                                  -- website or Instagram
  ad              text,                                  -- which ad (CI-HL | script | cut | hook)
  q_install       text,     -- hardscape | designbuild | both | maintenance
  q_revenue       text,     -- under250 | 250to500 | 500to1m | 1mto3m | 3mplus
  q_owner         text,     -- yes | marketing | no
  q_adspend       text,     -- 0 | under1k | 1kto3k | 3kplus
  grade           text,     -- A | B | C | D (null = gate questions unanswered)

  -- speed to lead + the call
  stage           text not null default 'new',  -- new | attempting | booked | held | closed | lost | closed_out | filtered
  stage_at        timestamptz not null default now(),
  first_call_at   timestamptz,
  call_attempts   int not null default 0,
  texts_sent      int not null default 0,
  specific_job    text,     -- the one job from their site the caller names in 30s
  decision_makers text,     -- partner / spouse who joins the call
  call_day        text,
  call_time       text,
  zoom_link       text,
  booked_for      timestamptz,
  booked_at       timestamptz,  -- event stamps: the Friday tracker counts
  held_at         timestamptz,  -- bookings / held calls / closes by the week
  closed_at       timestamptz,  -- they HAPPENED, straight from this log
  temperature     int,      -- stage 7: 1-10 (never quote a price under 8)
  situation       jsonb not null default '{}'::jsonb,  -- stage 2 numbers: crews, avg job, great job, last ten, close ratio
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists lane_leads_user_idx on public.lane_leads(user_id, lane, stage);
create index if not exists lane_leads_when_idx on public.lane_leads(user_id, lead_at);

drop trigger if exists touch_lane_leads on public.lane_leads;
create trigger touch_lane_leads before update on public.lane_leads
  for each row execute function public.touch_updated_at();

alter table public.lane_leads enable row level security;
drop policy if exists own_rows on public.lane_leads;
create policy own_rows on public.lane_leads for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
