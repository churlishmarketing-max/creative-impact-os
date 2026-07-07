-- ============================================================================
-- Creative Impact OS — Client Dashboard build, Phase 4: Automations
-- Stage-entered emails, referral codes + tracked links.
-- Run once in the Supabase SQL Editor (after 13). Safe to re-run — but note
-- the UPDATE below re-enables email_on_enter on the four default stages, so
-- if you deliberately turn one off later, don't re-run this file.
-- ============================================================================

create extension if not exists pgcrypto;

-- Which stages trigger a client-facing "your project moved" email (queued for
-- approval in COMMS when the client advances into them).
alter table public.pipeline_stages add column if not exists email_on_enter boolean not null default false;

update public.pipeline_stages set email_on_enter = true
where name in ('Strategy','Production','Review/Delivery','Live/Optimize')
  and template_id in (select id from public.pipeline_templates where name = 'Creative Impact Default');

-- REFERRAL CODES — one per client; /r/<code> counts the click and redirects.
create table if not exists public.referral_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id  uuid not null references public.clients(id) on delete cascade unique,
  code       text not null unique,
  clicks     int  not null default 0,
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
drop policy if exists own_rows on public.referral_codes;
create policy own_rows on public.referral_codes for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
