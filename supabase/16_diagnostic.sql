-- ============================================================================
-- Creative Impact OS — Authority Diagnostic (Phase 1) + Clarity Engine (OS side)
-- The $750 paid front-end offer as an OS product line:
-- checkout -> intake -> analysis -> Brandon approves -> token report link.
-- Run once in the Supabase SQL Editor (after 15). Safe to re-run.
-- Spec: docs/authority-diagnostic/ (SPEC.md is law).
-- ============================================================================

create extension if not exists pgcrypto;

-- BENCHMARKS AS DATA (agents read rows, never hardcode) -----------------------
create table if not exists public.benchmark_configs (
  key        text primary key,                -- 'default_local_service_meta', 'hvac', ...
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  label      text not null default '',
  industry   text,
  thresholds jsonb not null default '{}'::jsonb,
  projection jsonb not null default '{"target_hook_rate":0.27,"relief_bonus":1.15,"cap_multiple":2.5}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.benchmark_configs enable row level security;
drop policy if exists own_rows on public.benchmark_configs;
create policy own_rows on public.benchmark_configs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CLARITY SESSIONS (free tool, top of the ladder; synced from Lovable) --------
create table if not exists public.clarity_sessions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  email                   text,                -- normalized lowercase
  answers                 jsonb not null default '{}'::jsonb,
  board_read              jsonb,
  pdf_path                text,
  source                  text not null default 'lovable',   -- lovable | os_pwa
  external_id             text unique,         -- Lovable-side session id (idempotent sync)
  converted_diagnostic_id uuid,
  upsell_email_sent_at    timestamptz,         -- E0 dedupe
  created_at              timestamptz not null default now()
);
create index if not exists clarity_email_idx on public.clarity_sessions (lower(email));
alter table public.clarity_sessions enable row level security;
drop policy if exists own_rows on public.clarity_sessions;
create policy own_rows on public.clarity_sessions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CORE PIPELINE ----------------------------------------------------------------
-- status: created|paid|intake_sent|intake_in_progress|intake_complete|analyzing
--         |draft_ready|in_review|approved|delivered|follow_up|converted|closed
create table if not exists public.diagnostics (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  client_id          uuid not null references public.clients(id) on delete cascade,
  status             text not null default 'created',
  benchmark_key      text not null default 'default_local_service_meta',
  stripe_session_id  text unique,
  stripe_payment_id  text,
  amount_cents       bigint not null default 75000,
  is_comp            boolean not null default false,   -- operator-comped (first three are free)
  intake_token       text not null default gen_random_uuid()::text,
  report_token       text not null default gen_random_uuid()::text,
  clarity_session_id uuid references public.clarity_sessions(id) on delete set null,
  credit_deadline    date,                              -- delivered + 90 days
  converted_at       timestamptz,
  trace_id           text not null default ('dx_' || replace(gen_random_uuid()::text, '-', '')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index if not exists diagnostics_intake_token_idx on public.diagnostics(intake_token);
create unique index if not exists diagnostics_report_token_idx on public.diagnostics(report_token);
create index if not exists diagnostics_status_idx on public.diagnostics(user_id, status);
drop trigger if exists touch_diagnostics on public.diagnostics;
create trigger touch_diagnostics before update on public.diagnostics
  for each row execute function public.touch_updated_at();
alter table public.diagnostics enable row level security;
drop policy if exists own_rows on public.diagnostics;
create policy own_rows on public.diagnostics for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.diagnostic_intakes (
  diagnostic_id  uuid primary key references public.diagnostics(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  payload        jsonb not null default '{}'::jsonb,   -- full autosaved form state
  industry       text,
  website_url    text,
  landing_url    text,
  is_retargeting text,                                 -- yes | no | mixed
  anomalies      jsonb not null default '[]'::jsonb,   -- soft-validation warnings
  screenshots    jsonb not null default '[]'::jsonb,   -- [{path,name}] in storage
  site_text      text,                                 -- fetched homepage+landing extract
  submitted_at   timestamptz,
  updated_at     timestamptz not null default now()
);
alter table public.diagnostic_intakes enable row level security;
drop policy if exists own_rows on public.diagnostic_intakes;
create policy own_rows on public.diagnostic_intakes for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Raw + computed live together so every ratio is auditable (Fable Law 6).
create table if not exists public.diagnostic_metrics (
  diagnostic_id uuid primary key references public.diagnostics(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  raw           jsonb not null default '{}'::jsonb,
  computed      jsonb not null default '{}'::jsonb,    -- nulls preserved, never zeros
  ratings       jsonb not null default '{}'::jsonb,
  matrix_1      text,
  matrix_2      text,
  freq_override boolean not null default false,
  action        text,                                  -- scale|tweak|refresh|kill|insufficient_data
  computed_at   timestamptz not null default now()
);
alter table public.diagnostic_metrics enable row level security;
drop policy if exists own_rows on public.diagnostic_metrics;
create policy own_rows on public.diagnostic_metrics for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.diagnostic_reports (
  id             uuid primary key default gen_random_uuid(),
  diagnostic_id  uuid not null references public.diagnostics(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  version        int not null default 1,
  report         jsonb not null default '{}'::jsonb,   -- report-blueprint.md §7 contract
  internal_notes text,                                 -- adversary pass — NEVER client-visible
  data_gaps      jsonb not null default '[]'::jsonb,
  confidence     jsonb not null default '[]'::jsonb,
  is_approved    boolean not null default false,
  approved_at    timestamptz,
  delivered_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (diagnostic_id, version)
);
alter table public.diagnostic_reports enable row level security;
drop policy if exists own_rows on public.diagnostic_reports;
create policy own_rows on public.diagnostic_reports for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fleet-standard audit trail: every transition, every actor.
create table if not exists public.diagnostic_events (
  id            bigint generated always as identity primary key,
  diagnostic_id uuid not null references public.diagnostics(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  trace_id      text not null default '',
  actor         text not null default 'system',  -- client|agent|brandon|system|stripe
  event         text not null default '',
  from_status   text,
  to_status     text,
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists diagnostic_events_idx on public.diagnostic_events(diagnostic_id, created_at);
alter table public.diagnostic_events enable row level security;
drop policy if exists own_rows on public.diagnostic_events;
create policy own_rows on public.diagnostic_events for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PUBLIC REPORT ACCESS — token page; 404s until approved AND delivered. -------
create or replace function public.get_diagnostic_report(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'business', c.name,
    'report', r.report,
    'delivered_at', r.delivered_at,
    'credit_deadline', d.credit_deadline
  )
  from public.diagnostics d
  join public.clients c on c.id = d.client_id
  join public.diagnostic_reports r on r.diagnostic_id = d.id and r.is_approved and r.delivered_at is not null
  where d.report_token = p_token
  order by r.version desc
  limit 1;
$$;
revoke all on function public.get_diagnostic_report(text) from public;
grant execute on function public.get_diagnostic_report(text) to anon, authenticated;

-- STORAGE bucket for intake screenshots (written via service role only) -------
insert into storage.buckets (id, name, public)
values ('diagnostic-uploads', 'diagnostic-uploads', false)
on conflict (id) do nothing;

-- SEED benchmark configs (scoring-engine.md §2) --------------------------------
do $$
declare uid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found.'; end if;

  insert into public.benchmark_configs (key, user_id, label, industry, is_default, thresholds) values
  ('default_local_service_meta', uid, 'Local high-ticket service — Meta', null, true,
   '{"cpl":{"excellent":[0,30],"good":[31,50],"fair":[51,80],"bad":[81,null]},
     "efficiency":{"exceptional":[0.5,null],"sweet":[0.4,0.49],"good":[0.3,0.39],"fair":[0.2,0.29],"poor":[null,0.2]},
     "hook_rate":{"excellent":[0.3,null],"good":[0.2,0.29],"fair":[0.1,0.19],"poor":[null,0.1]},
     "hold_rate":{"excellent":[0.15,null],"good":[0.1,0.149],"fair":[0.05,0.099],"poor":[null,0.05]},
     "link_ctr":{"excellent":[0.012,null],"good":[0.008,0.0119],"fair":[0.005,0.0079],"poor":[null,0.005]},
     "ctr_all":{"excellent":[0.025,null],"good":[0.015,0.0249],"fair":[0.01,0.0149],"poor":[null,0.01]},
     "optin":{"excellent":[0.2,null],"good":[0.1,0.19],"fair":[0.05,0.09],"poor":[null,0.05]},
     "cpc_link":{"excellent":[0,1.5],"good":[1.51,3],"fair":[3.01,5],"poor":[5,null]},
     "cpc_all":{"excellent":[0,0.5],"good":[0.51,1.5],"fair":[1.51,3],"poor":[3,null]},
     "cpm":{"excellent":[0,10],"good":[10,20],"fair":[20,40],"poor":[40,null]},
     "frequency":{"optimal":[1,2],"caution":[2,3],"high_risk":[3,5],"fatigue":[5,null]}}'::jsonb),
  ('hvac', uid, 'HVAC — Midwest metro', 'hvac', false,
   '{"cpl":{"excellent":[0,35],"good":[35,75],"fair":[76,110],"bad":[110,null]},
     "hook_rate":{"excellent":[0.3,null],"good":[0.25,0.29],"fair":[0.12,0.24],"poor":[null,0.12]}}'::jsonb)
  on conflict (key) do nothing;
end $$;
