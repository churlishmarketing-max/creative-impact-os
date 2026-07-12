-- Authority Diagnostic — Supabase schema
-- Assumes Churlish OS already has: clients(id uuid pk, ...), and an auth model
-- where clients map to auth.users. Adjust FK targets to the existing tables;
-- do NOT create a parallel clients table.

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
create type diagnostic_status as enum (
  'created','paid','intake_sent','intake_in_progress','intake_complete',
  'analyzing','draft_ready','in_review','approved','delivered',
  'follow_up','converted','closed'
);

create type diagnostic_action as enum ('scale','tweak','refresh','kill','insufficient_data');

-- ─────────────────────────────────────────────
-- BENCHMARKS AS DATA (Churlish OS owns data; agents read, never hardcode)
-- ─────────────────────────────────────────────
create table benchmark_configs (
  key           text primary key,             -- 'default_local_service_meta', 'hvac', ...
  label         text not null,
  industry      text,
  thresholds    jsonb not null,               -- per-metric band edges, see scoring-engine.md §2
  projection    jsonb not null default '{"target_hook_rate":0.27,"relief_bonus":1.15,"cap_multiple":2.5}',
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- CORE PIPELINE
-- ─────────────────────────────────────────────
create table diagnostics (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references clients(id),
  status             diagnostic_status not null default 'created',
  benchmark_key      text not null default 'default_local_service_meta' references benchmark_configs(key),
  stripe_session_id  text unique,
  stripe_payment_id  text,
  amount_cents       integer not null default 75000,
  intake_token_hash  text,                    -- single-use signed token, hashed
  credit_deadline    date,                    -- delivered_at + 90 days
  converted_at       timestamptz,
  trace_id           text not null,           -- fleet-standard trace id
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on diagnostics (status);
create index on diagnostics (client_id);

create table diagnostic_intakes (
  diagnostic_id  uuid primary key references diagnostics(id) on delete cascade,
  payload        jsonb not null default '{}', -- full form state (autosaved)
  -- normalized hot fields for admin board / queries:
  industry       text,
  website_url    text,
  landing_url    text,
  date_range     daterange,
  is_retargeting text,                        -- 'yes' | 'no' | 'mixed'
  anomalies      jsonb not null default '[]', -- soft-validation warnings
  screenshots    text[] not null default '{}',-- storage paths
  submitted_at   timestamptz,
  updated_at     timestamptz not null default now()
);

-- Raw inputs + OS-computed metrics. Raw and computed live together so every
-- ratio is auditable against its own denominators (Fable Law 6).
create table diagnostic_metrics (
  diagnostic_id  uuid primary key references diagnostics(id) on delete cascade,
  raw            jsonb not null,   -- spend, impressions, reach, plays_3s, views_50, link_clicks, clicks_all, leads
  computed       jsonb not null,   -- cpl, hook_rate, hold_rate, efficiency, link_ctr, ctr_all, optin, cpc_link, cpc_all, cpm, frequency (nulls preserved)
  ratings        jsonb not null,   -- per-metric band rating against benchmark_key
  matrix_1       text,             -- cell key, e.g. 'okay_hook__bad_efficiency'
  matrix_2       text,
  freq_override  boolean not null default false,
  action         diagnostic_action,
  computed_at    timestamptz not null default now()
);

create table diagnostic_reports (
  id             uuid primary key default gen_random_uuid(),
  diagnostic_id  uuid not null references diagnostics(id) on delete cascade,
  version        integer not null default 1,
  report         jsonb not null,              -- full report JSON per report-blueprint.md §7
  internal_notes text,                        -- adversary pass — admin only, RLS-blocked from clients
  data_gaps      jsonb not null default '[]',
  confidence     jsonb not null default '[]',
  is_approved    boolean not null default false,
  approved_by    uuid,                        -- Brandon's user id
  approved_at    timestamptz,
  pdf_path       text,                        -- rendered on approval
  delivered_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (diagnostic_id, version)
);

-- Fleet-standard audit trail: every transition, every actor, every payload.
create table diagnostic_events (
  id             bigint generated always as identity primary key,
  diagnostic_id  uuid not null references diagnostics(id) on delete cascade,
  trace_id       text not null,
  actor          text not null check (actor in ('client','agent','brandon','system','stripe','documenso')),
  event          text not null,               -- 'status_change','intake_saved','agent_run_started', ...
  from_status    diagnostic_status,
  to_status      diagnostic_status,
  payload        jsonb not null default '{}',
  created_at     timestamptz not null default now()
);
create index on diagnostic_events (diagnostic_id, created_at);

-- ─────────────────────────────────────────────
-- RLS — clients see only their own APPROVED+DELIVERED report; admin sees all.
-- internal_notes never crosses to the client role.
-- ─────────────────────────────────────────────
alter table diagnostics        enable row level security;
alter table diagnostic_intakes enable row level security;
alter table diagnostic_metrics enable row level security;
alter table diagnostic_reports enable row level security;
alter table diagnostic_events  enable row level security;

-- Client read on own delivered report (adjust to the OS's existing client-auth mapping):
create policy client_read_own_report on diagnostic_reports for select
  using (
    is_approved and delivered_at is not null
    and diagnostic_id in (
      select d.id from diagnostics d
      join clients c on c.id = d.client_id
      where c.auth_user_id = auth.uid()
    )
  );
-- Expose to clients through a VIEW that excludes internal_notes/confidence:
create view client_diagnostic_reports as
  select id, diagnostic_id, version, report, pdf_path, delivered_at
  from diagnostic_reports
  where is_approved and delivered_at is not null;

-- Intake write via token flow happens through a service-role API route, not direct RLS.
-- Admin (Brandon) role: full access policies via the OS's existing admin claim.

-- ─────────────────────────────────────────────
-- SEED
-- ─────────────────────────────────────────────
insert into benchmark_configs (key, label, industry, is_default, thresholds) values
('default_local_service_meta', 'Local high-ticket service — Meta', null, true,
 '{"cpl":{"excellent":[0,30],"good":[31,50],"fair":[51,80],"bad":[81,null]},
   "efficiency":{"exceptional":[0.5,null],"sweet":[0.4,0.49],"good":[0.3,0.39],"fair":[0.2,0.29],"poor":[null,0.2]},
   "hook_rate":{"excellent":[0.3,null],"good":[0.2,0.29],"fair":[0.1,0.19],"poor":[null,0.1]},
   "link_ctr":{"excellent":[0.012,null],"good":[0.008,0.0119],"fair":[0.005,0.0079],"poor":[null,0.005]},
   "ctr_all":{"excellent":[0.025,null],"good":[0.015,0.0249],"fair":[0.01,0.0149],"poor":[null,0.01]},
   "optin":{"excellent":[0.2,null],"good":[0.1,0.19],"fair":[0.05,0.09],"poor":[null,0.05]},
   "cpc_link":{"excellent":[0,1.5],"good":[1.51,3],"fair":[3.01,5],"poor":[5,null]},
   "cpc_all":{"excellent":[0,0.5],"good":[0.51,1.5],"fair":[1.51,3],"poor":[3,null]},
   "cpm":{"excellent":[0,10],"good":[10,20],"fair":[20,40],"poor":[40,null]},
   "frequency":{"optimal":[1,2],"caution":[2,3],"high_risk":[3,5],"fatigue":[5,null]}}'),
('hvac', 'HVAC — Midwest metro', 'hvac', false,
 '{"cpl":{"healthy_note":"$35–$75 healthy HVAC range","excellent":[0,35],"good":[35,75],"fair":[76,110],"bad":[110,null]},
   "hook_rate":{"target_note":"25–30% target","excellent":[0.3,null],"good":[0.25,0.29],"fair":[0.12,0.24],"poor":[null,0.12]}}');
-- hvac row overrides only what differs; engine falls through to default for the rest.
