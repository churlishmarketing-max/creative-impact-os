-- ============================================================================
-- CREATIVE IMPACT OS — ONE-SHOT DATABASE SETUP
-- ============================================================================
-- HOW TO USE (Brandon):
--   1. Create your login user FIRST: Supabase → Authentication → Users →
--      Add user → your email + a strong password → Create.
--   2. Supabase → SQL Editor → New query. Open this file in Notepad,
--      Ctrl+A, Ctrl+C, paste it here, hit RUN. Green 'Success' = done.
--   3. Delete this query tab afterward (never re-run old tabs).
-- Safe to re-run as a whole: every block guards against duplicates.
-- ============================================================================


-- ▶▶▶ schema.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Stage 1 schema
-- Single user. All money stored as INTEGER CENTS. Everything behind RLS.
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- bump updated_at on every write -------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- SPRINT — one row per user: the editable targets + dates ------------------------
create table if not exists public.sprint (
  user_id        uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  target_cents   bigint not null default 10000000,         -- $100,000
  sellby_date    date   not null default '2026-10-31',
  deadline_date  date   not null default '2026-12-31',
  one_thing_title text  default 'Sell out August''s four capture days',
  one_thing_body  text  default '',
  updated_at     timestamptz not null default now()
);

-- DEALS — the pipeline (now real & editable) -------------------------------------
create table if not exists public.deals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name         text not null default '',
  offer        text not null default '',
  value_cents  bigint not null default 0,
  stage        text not null default 'Lead',  -- Lead / Audit Booked / Audit Done / Proposal / Signed / Collected / Lost
  expected_date date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists deals_user_idx on public.deals(user_id);

-- WEEKS — Friday Five + floor, one row per ISO week ------------------------------
create table if not exists public.weeks (
  user_id          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  week_key         text not null,                 -- e.g. 2026-W27 (ISO year-week)
  calls            int  not null default 0,
  offers_out       int  not null default 0,
  signed_cents     bigint not null default 0,
  collected_cents  bigint not null default 0,
  founder_free_pct int,                           -- 0..100, null = blank
  manual           jsonb not null default '{}'::jsonb,  -- { "pitch": true, "proof": false }
  updated_at       timestamptz not null default now(),
  primary key (user_id, week_key)
);

-- LOG ENTRIES — the sys.log panel (manual seed for Stage 1) ----------------------
create table if not exists public.log_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  tag        text not null default 'EV',     -- KF / BB / RR / EV / WT / AL
  message    text not null default '',
  color      text                            -- optional css color token
);
create index if not exists log_user_idx on public.log_entries(user_id, created_at desc);

-- APP STATE — founder check-ins, habits, goals, ops checklists (one jsonb doc) ---
create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  founder    jsonb not null default '{}'::jsonb,
  habits     jsonb not null default '[]'::jsonb,
  goals      jsonb not null default '[]'::jsonb,
  ops        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- updated_at triggers ------------------------------------------------------------
drop trigger if exists touch_sprint    on public.sprint;
drop trigger if exists touch_deals     on public.deals;
drop trigger if exists touch_weeks     on public.weeks;
drop trigger if exists touch_app_state on public.app_state;
create trigger touch_sprint    before update on public.sprint    for each row execute function public.touch_updated_at();
create trigger touch_deals     before update on public.deals     for each row execute function public.touch_updated_at();
create trigger touch_weeks     before update on public.weeks     for each row execute function public.touch_updated_at();
create trigger touch_app_state before update on public.app_state for each row execute function public.touch_updated_at();

-- Row Level Security — a user can only ever see/touch their own rows -------------
alter table public.sprint      enable row level security;
alter table public.deals       enable row level security;
alter table public.weeks       enable row level security;
alter table public.log_entries enable row level security;
alter table public.app_state   enable row level security;

drop policy if exists own_rows on public.sprint;
drop policy if exists own_rows on public.deals;
drop policy if exists own_rows on public.weeks;
drop policy if exists own_rows on public.log_entries;
drop policy if exists own_rows on public.app_state;

create policy own_rows on public.sprint      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.deals       for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.weeks       for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.log_entries for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on public.app_state   for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ▶▶▶ 02_clients.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Phase 1: Clients / CRM
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

-- ▶▶▶ 03_invoices.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Phase 2: Invoices
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

-- ▶▶▶ 04_proposals.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Phase 3: Proposals + e-sign
-- Run once in the Supabase SQL Editor (after 03_invoices.sql). Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.proposals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id    uuid references public.clients(id) on delete set null,
  number       text not null default '',
  title        text default '',
  intro        text,
  items        jsonb not null default '[]'::jsonb,  -- [{desc, qty, unit_cents}]
  amount_cents bigint not null default 0,
  terms        text,                                -- the contract language
  status       text not null default 'draft',       -- draft / sent / accepted / declined
  token        text not null default gen_random_uuid()::text,
  signer_name  text,
  signer_ip    text,
  accepted_at  timestamptz,
  deal_id      uuid,                                -- deal created on acceptance
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists proposals_user_idx on public.proposals(user_id);
create unique index if not exists proposals_token_idx on public.proposals(token);

drop trigger if exists touch_proposals on public.proposals;
create trigger touch_proposals before update on public.proposals
  for each row execute function public.touch_updated_at();

alter table public.proposals enable row level security;
drop policy if exists own_rows on public.proposals;
create policy own_rows on public.proposals for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public read of one proposal by token (for the client's accept page).
create or replace function public.get_proposal_by_token(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'number', p.number, 'title', p.title, 'intro', p.intro, 'items', p.items,
    'amount_cents', p.amount_cents, 'terms', p.terms, 'status', p.status,
    'signer_name', p.signer_name, 'accepted_at', p.accepted_at,
    'client', coalesce(c.name, ''), 'token', p.token)
  from public.proposals p left join public.clients c on c.id = p.client_id
  where p.token = p_token limit 1;
$$;
revoke all on function public.get_proposal_by_token(text) from public;
grant execute on function public.get_proposal_by_token(text) to anon, authenticated;

-- Accept + e-sign: records the signature and creates a Signed deal in the pipeline.
-- SECURITY DEFINER so the (logged-out) client can accept via their secret link,
-- but it only ever touches the one token-matched proposal.
create or replace function public.accept_proposal(p_token text, p_signer text, p_ip text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare pr public.proposals; new_deal uuid;
begin
  select * into pr from public.proposals where token = p_token;
  if pr.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if pr.status = 'accepted' then return jsonb_build_object('ok', true, 'already', true); end if;

  insert into public.deals (user_id, client_id, name, offer, value_cents, stage)
  values (pr.user_id, pr.client_id, coalesce(nullif(pr.title, ''), 'Proposal'),
          coalesce(pr.title, ''), pr.amount_cents, 'Signed')
  returning id into new_deal;

  update public.proposals
    set status = 'accepted', signer_name = p_signer, signer_ip = p_ip,
        accepted_at = now(), deal_id = new_deal
  where id = pr.id;

  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.accept_proposal(text, text, text) from public;
grant execute on function public.accept_proposal(text, text, text) to anon, authenticated;

-- ▶▶▶ 05_booking.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Phase 4: Native scheduling (bookings)
-- Run once in the Supabase SQL Editor (after 04_proposals.sql). Safe to re-run.
-- Availability config lives in app_state.ops.__booking (set from the app).
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id  uuid references public.clients(id) on delete set null,
  name       text,
  email      text,
  phone      text,
  notes      text,
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  status     text not null default 'booked',  -- booked / cancelled
  created_at timestamptz not null default now()
);
create index if not exists bookings_user_idx on public.bookings(user_id, start_at);

alter table public.bookings enable row level security;
drop policy if exists own_rows on public.bookings;
create policy own_rows on public.bookings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public: the booking page reads the availability config + already-taken future
-- slots, by the operator's booking token (stored in app_state.ops.__booking).
create or replace function public.get_booking(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'config', a.ops->'__booking',
    'taken', coalesce((
      select jsonb_agg(b.start_at)
      from public.bookings b
      where b.user_id = a.user_id and b.status = 'booked' and b.start_at > now()
    ), '[]'::jsonb)
  )
  from public.app_state a
  where a.ops->'__booking'->>'token' = p_token
  limit 1;
$$;
revoke all on function public.get_booking(text) from public;
grant execute on function public.get_booking(text) to anon, authenticated;

-- Public: create a booking (guards against double-booking the same start time).
create or replace function public.create_booking(
  p_token text, p_name text, p_email text, p_phone text, p_notes text,
  p_start timestamptz, p_end timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select user_id into uid from public.app_state where ops->'__booking'->>'token' = p_token;
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if exists (select 1 from public.bookings where user_id = uid and status = 'booked' and start_at = p_start) then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end if;
  insert into public.bookings (user_id, name, email, phone, notes, start_at, end_at)
  values (uid, nullif(p_name,''), nullif(p_email,''), nullif(p_phone,''), nullif(p_notes,''), p_start, p_end);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.create_booking(text,text,text,text,text,timestamptz,timestamptz) from public;
grant execute on function public.create_booking(text,text,text,text,text,timestamptz,timestamptz) to anon, authenticated;

-- ▶▶▶ 06_intake.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Phase 4b: Public intake form
-- Run once in the Supabase SQL Editor (after 05_booking.sql). Safe to re-run.
-- Reuses the clients table; form config lives in app_state.ops.__intake.
-- ============================================================================

-- Public read of the intake form config by token.
create or replace function public.get_intake(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select a.ops->'__intake'
  from public.app_state a
  where a.ops->'__intake'->>'token' = p_token
  limit 1;
$$;
revoke all on function public.get_intake(text) from public;
grant execute on function public.get_intake(text) to anon, authenticated;

-- Public submit: creates a Lead client for the form's owner.
create or replace function public.submit_intake(
  p_token text, p_name text, p_contact text, p_email text, p_phone text, p_industry text, p_notes text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select user_id into uid from public.app_state where ops->'__intake'->>'token' = p_token;
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  insert into public.clients (user_id, name, contact_name, email, phone, industry, status, source, notes)
  values (uid, coalesce(nullif(p_name,''),'New lead'), nullif(p_contact,''), nullif(p_email,''),
          nullif(p_phone,''), nullif(p_industry,''), 'Lead', 'Intake', nullif(p_notes,''));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.submit_intake(text,text,text,text,text,text,text) from public;
grant execute on function public.submit_intake(text,text,text,text,text,text,text) to anon, authenticated;

-- ▶▶▶ 07_hardening.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Hardening pass (review findings)
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- create_booking now rejects past/absurd times so a public booking link can't
-- be abused to book outside any reasonable window.
-- ============================================================================

create or replace function public.create_booking(
  p_token text, p_name text, p_email text, p_phone text, p_notes text,
  p_start timestamptz, p_end timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select user_id into uid from public.app_state where ops->'__booking'->>'token' = p_token;
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  -- Sanity guards: future only, within 90 days, sane duration (5 min – 4 hrs).
  if p_start <= now() or p_start > now() + interval '90 days'
     or p_end <= p_start or p_end - p_start > interval '4 hours'
     or p_end - p_start < interval '5 minutes' then
    return jsonb_build_object('ok', false, 'error', 'invalid_time');
  end if;

  if exists (select 1 from public.bookings where user_id = uid and status = 'booked' and start_at = p_start) then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end if;

  insert into public.bookings (user_id, name, email, phone, notes, start_at, end_at)
  values (uid, nullif(p_name,''), nullif(p_email,''), nullif(p_phone,''), nullif(p_notes,''), p_start, p_end);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.create_booking(text,text,text,text,text,timestamptz,timestamptz) from public;
grant execute on function public.create_booking(text,text,text,text,text,timestamptz,timestamptz) to anon, authenticated;

-- ▶▶▶ 08_growth.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Growth pack: Expenses, KPIs, Client email threads
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

-- ▶▶▶ 09_client_dashboard.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Client Dashboard build, Phase 1
-- offers, pipeline templates/stages, brand kits, work items, client docs,
-- client activity events; extends clients; seeds the ladder + a demo client.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- OFFERS ---------------------------------------------------------------------
create table if not exists public.offers (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name                text not null default '',
  slug                text not null default '',
  type                text not null default 'one_off',   -- retainer | one_off | coaching | diagnostic
  price_monthly_cents bigint,
  min_term_months     int,
  created_at          timestamptz not null default now()
);
create unique index if not exists offers_slug_idx on public.offers(user_id, slug);
alter table public.offers enable row level security;
drop policy if exists own_rows on public.offers;
create policy own_rows on public.offers for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PIPELINE TEMPLATES + STAGES --------------------------------------------------
create table if not exists public.pipeline_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name       text not null default '',
  offer_id   uuid references public.offers(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.pipeline_templates enable row level security;
drop policy if exists own_rows on public.pipeline_templates;
create policy own_rows on public.pipeline_templates for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  template_id uuid not null references public.pipeline_templates(id) on delete cascade,
  name        text not null default '',
  sort_order  int not null default 0,
  stall_days  int,                          -- idle threshold before nudge (null = never)
  created_at  timestamptz not null default now()
);
create index if not exists pipeline_stages_tpl_idx on public.pipeline_stages(template_id, sort_order);
alter table public.pipeline_stages enable row level security;
drop policy if exists own_rows on public.pipeline_stages;
create policy own_rows on public.pipeline_stages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- EXTEND CLIENTS ---------------------------------------------------------------
alter table public.clients add column if not exists offer_id uuid references public.offers(id) on delete set null;
alter table public.clients add column if not exists pipeline_stage_id uuid references public.pipeline_stages(id) on delete set null;
alter table public.clients add column if not exists stage_entered_at timestamptz;
alter table public.clients add column if not exists onboarded_at timestamptz;
alter table public.clients add column if not exists completed_at timestamptz;

-- BRAND KITS -------------------------------------------------------------------
create table if not exists public.brand_kits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id     uuid not null references public.clients(id) on delete cascade unique,
  logo_url      text,
  logo_dark_url text,
  favicon_url   text,
  colors        jsonb not null default '[]'::jsonb,  -- [{name, hex, usage}]
  fonts         jsonb not null default '[]'::jsonb,  -- [{role, family, weight, source}]
  voice_notes   text,
  do_not        jsonb not null default '[]'::jsonb,  -- banned words / visual rules
  assets        jsonb not null default '[]'::jsonb,  -- [{label, url}]
  updated_at    timestamptz not null default now()
);
drop trigger if exists touch_brand_kits on public.brand_kits;
create trigger touch_brand_kits before update on public.brand_kits
  for each row execute function public.touch_updated_at();
alter table public.brand_kits enable row level security;
drop policy if exists own_rows on public.brand_kits;
create policy own_rows on public.brand_kits for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- WORK ITEMS -------------------------------------------------------------------
create table if not exists public.work_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  title         text not null default '',
  description   text,
  status        text not null default 'in_progress',  -- backlog|in_progress|in_review|delivered|completed
  type          text not null default 'other',        -- video|ad|doc|web|social|strategy|other
  due_date      date,
  delivered_at  timestamptz,
  completed_at  timestamptz,
  external_link text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists work_items_client_idx on public.work_items(client_id, status);
drop trigger if exists touch_work_items on public.work_items;
create trigger touch_work_items before update on public.work_items
  for each row execute function public.touch_updated_at();
alter table public.work_items enable row level security;
drop policy if exists own_rows on public.work_items;
create policy own_rows on public.work_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CLIENT DOCS (block editor lands later; table now) ------------------------------
create table if not exists public.client_docs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  title      text not null default 'Untitled',
  content    jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
drop trigger if exists touch_client_docs on public.client_docs;
create trigger touch_client_docs before update on public.client_docs
  for each row execute function public.touch_updated_at();
alter table public.client_docs enable row level security;
drop policy if exists own_rows on public.client_docs;
create policy own_rows on public.client_docs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CLIENT ACTIVITY FEED -----------------------------------------------------------
create table if not exists public.client_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  kind       text not null default 'note',   -- note|stage|work|email|onboarding|system
  message    text not null default '',
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists client_events_idx on public.client_events(client_id, created_at desc);
alter table public.client_events enable row level security;
drop policy if exists own_rows on public.client_events;
create policy own_rows on public.client_events for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SEEDS ---------------------------------------------------------------------------
do $$
declare uid uuid; tpl uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found — create your account first.'; end if;

  -- The Creative Impact offer ladder (edit freely later)
  insert into public.offers (user_id, name, slug, type, price_monthly_cents, min_term_months) values
    (uid, 'Authority Audit',      'authority-audit',      'diagnostic', null,   null),  -- free 30-min door-opener
    (uid, 'Story Capture Pilot',  'story-capture-pilot',  'one_off',    240000, null),  -- $2,400 single capture day
    (uid, 'Authority Engine',     'authority-engine',     'retainer',   350000, 3),     -- $3,500/mo · 3-mo min
    (uid, 'Market Domination',    'market-domination',    'retainer',   600000, 3)      -- $6,000/mo · expansion
  on conflict (user_id, slug) do nothing;

  -- Default delivery pipeline template + stages (the four-downs loop, post-signature)
  select id into tpl from public.pipeline_templates where user_id = uid and name = 'Creative Impact Default';
  if tpl is null then
    insert into public.pipeline_templates (user_id, name) values (uid, 'Creative Impact Default') returning id into tpl;
    insert into public.pipeline_stages (user_id, template_id, name, sort_order, stall_days) values
      (uid, tpl, 'Signed',            0, null),
      (uid, tpl, 'Onboarding',        1, 3),
      (uid, tpl, 'Pre-Pro',           2, 5),
      (uid, tpl, 'Capture Day',       3, 7),
      (uid, tpl, 'Edit & Deploy',     4, 7),
      (uid, tpl, 'Live/Optimize',     5, 14),
      (uid, tpl, 'Renew/Expand',      6, null),
      (uid, tpl, 'Advocacy',          7, null);
  end if;
  -- No demo client is seeded — the roster starts real and stays real.
end $$;

-- ▶▶▶ 10_onboarding.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Client Dashboard build, Phase 2: Onboarding Engine
-- Offer-specific magic-link intake forms that auto-fill the brand kit.
-- Run once in the Supabase SQL Editor (after 09). Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.onboarding_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name       text not null default '',
  offer_id   uuid references public.offers(id) on delete set null,
  intro_copy text,
  sections   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.onboarding_templates enable row level security;
drop policy if exists own_rows on public.onboarding_templates;
create policy own_rows on public.onboarding_templates for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.onboarding_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  template_id  uuid not null references public.onboarding_templates(id) on delete cascade,
  status       text not null default 'sent',   -- sent | in_progress | submitted | processed
  magic_token  text not null default gen_random_uuid()::text,
  sent_at      timestamptz not null default now(),
  submitted_at timestamptz,
  responses    jsonb not null default '{}'::jsonb
);
create unique index if not exists onboarding_token_idx on public.onboarding_runs(magic_token);
create index if not exists onboarding_client_idx on public.onboarding_runs(client_id);
alter table public.onboarding_runs enable row level security;
drop policy if exists own_rows on public.onboarding_runs;
create policy own_rows on public.onboarding_runs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public: the client's form page reads its run + template by magic token.
create or replace function public.get_onboarding(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'status', r.status,
    'client', coalesce(c.name, ''),
    'responses', r.responses,
    'template', jsonb_build_object('name', t.name, 'intro_copy', t.intro_copy, 'sections', t.sections)
  )
  from public.onboarding_runs r
  join public.onboarding_templates t on t.id = r.template_id
  left join public.clients c on c.id = r.client_id
  where r.magic_token = p_token
  limit 1;
$$;
revoke all on function public.get_onboarding(text) from public;
grant execute on function public.get_onboarding(text) to anon, authenticated;

-- Public: autosave answers as the client types (merge into responses).
create or replace function public.save_onboarding(p_token text, p_responses jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.onboarding_runs
    set responses = coalesce(responses, '{}'::jsonb) || coalesce(p_responses, '{}'::jsonb),
        status = case when status = 'sent' then 'in_progress' else status end
  where magic_token = p_token and status in ('sent', 'in_progress');
  if not found then return jsonb_build_object('ok', false, 'error', 'locked_or_missing'); end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.save_onboarding(text, jsonb) from public;
grant execute on function public.save_onboarding(text, jsonb) to anon, authenticated;

-- SEED TEMPLATES (one per offer; each asks only what that offer needs) ---------
do $$
declare uid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found.'; end if;

  -- brand-kit fields are repeated per template so each stays editable independently
  if not exists (select 1 from public.onboarding_templates where user_id = uid and name = 'Authority Engine — Full Intake') then
    insert into public.onboarding_templates (user_id, name, offer_id, intro_copy, sections) values
    (uid, 'Authority Engine — Full Intake',
     (select id from public.offers where user_id = uid and slug = 'authority-engine'),
     'Welcome aboard. This is everything we need to build your engine — 10 minutes now saves us a week of back-and-forth.',
     '[
       {"title":"The business","fields":[
         {"key":"contact","label":"Best contact name","type":"text","required":true,"maps_to":"client.contact"},
         {"key":"phone","label":"Best phone","type":"text","maps_to":"client.phone"},
         {"key":"industry","label":"Industry","type":"text","maps_to":"client.industry"},
         {"key":"website","label":"Website","type":"url","maps_to":"custom"},
         {"key":"goal","label":"The one number you want moved in 90 days","type":"textarea","required":true,"maps_to":"custom"}
       ]},
       {"title":"Brand kit","fields":[
         {"key":"logo","label":"Logo link (Drive/Dropbox — highest-res you have)","type":"url","maps_to":"kit.logo_url"},
         {"key":"color_primary","label":"Primary brand color","type":"color","maps_to":"kit.color.primary"},
         {"key":"color_accent","label":"Accent color","type":"color","maps_to":"kit.color.accent"},
         {"key":"font_headline","label":"Headline font (name it — or say ''pick for us'')","type":"text","maps_to":"kit.font.headline"},
         {"key":"font_body","label":"Body font","type":"text","maps_to":"kit.font.body"},
         {"key":"voice","label":"How should you sound? (customers'' words, not marketing''s)","type":"textarea","maps_to":"kit.voice"},
         {"key":"do_not","label":"Never say / never show (one per line)","type":"textarea","maps_to":"kit.do_not"},
         {"key":"brand_assets","label":"Brand guide / asset folder link","type":"url","maps_to":"kit.asset.Brand assets"}
       ]},
       {"title":"The capture day","fields":[
         {"key":"locations","label":"Where do we shoot? (shop, job sites, office — list what shows the real work)","type":"textarea","required":true,"maps_to":"custom"},
         {"key":"on_camera","label":"Who''s comfortable on camera? Who should we warm up?","type":"textarea","maps_to":"custom"},
         {"key":"story","label":"The story a stranger should walk away knowing","type":"textarea","maps_to":"custom"},
         {"key":"blackouts","label":"Days/times we can NEVER shoot","type":"text","maps_to":"custom"}
       ]},
       {"title":"The funnel","fields":[
         {"key":"lead_path","label":"How does someone find you today, start to booked job?","type":"textarea","required":true,"maps_to":"custom"},
         {"key":"spend","label":"Monthly marketing spend (all-in)","type":"select","options":["Under $1k","$1k–$5k","$5k–$15k","$15k+"],"maps_to":"custom"},
         {"key":"crm","label":"Where do leads live now (CRM / spreadsheet / inbox)?","type":"text","maps_to":"custom"}
       ]}
     ]'::jsonb);

    insert into public.onboarding_templates (user_id, name, offer_id, intro_copy, sections) values
    (uid, 'Story Capture Pilot — Intake',
     (select id from public.offers where user_id = uid and slug = 'story-capture-pilot'),
     'One half-day, one story. Point us at the good stuff and we''ll do the rest.',
     '[
       {"title":"The shoot","fields":[
         {"key":"contact","label":"Best contact name","type":"text","required":true,"maps_to":"client.contact"},
         {"key":"phone","label":"Best phone","type":"text","maps_to":"client.phone"},
         {"key":"locations","label":"Where do we shoot?","type":"textarea","required":true,"maps_to":"custom"},
         {"key":"story","label":"If a stranger watches one video about you, what should they walk away knowing?","type":"textarea","required":true,"maps_to":"custom"},
         {"key":"logo","label":"Logo link","type":"url","maps_to":"kit.logo_url"},
         {"key":"color_primary","label":"Primary brand color","type":"color","maps_to":"kit.color.primary"},
         {"key":"do_not","label":"Never say / never show (one per line)","type":"textarea","maps_to":"kit.do_not"}
       ]}
     ]'::jsonb);

    insert into public.onboarding_templates (user_id, name, offer_id, intro_copy, sections) values
    (uid, 'Market Domination — Expansion Intake',
     (select id from public.offers where user_id = uid and slug = 'market-domination'),
     'Two capture days a month, multi-platform. Tell us where to point the extra firepower.',
     '[
       {"title":"Expansion targets","fields":[
         {"key":"contact","label":"Best contact name","type":"text","required":true,"maps_to":"client.contact"},
         {"key":"working","label":"What''s working best from the Engine so far?","type":"textarea","required":true,"maps_to":"custom"},
         {"key":"channels","label":"Where do we expand?","type":"multiselect","options":["YouTube (long-form)","Google Ads","Meta Ads","LinkedIn","TikTok","Email/newsletter"],"maps_to":"custom"},
         {"key":"second_location","label":"Second location / crew / service line to feature?","type":"textarea","maps_to":"custom"},
         {"key":"goal","label":"The 6-month number that would make this a no-brainer","type":"textarea","required":true,"maps_to":"custom"}
       ]}
     ]'::jsonb);
  end if;
end $$;

-- ▶▶▶ 11_agents.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Client Dashboard build, Phase 3: Agent layer (Anchor)
-- agents + email_log (the approval queue). Run once after 10. Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.agents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name           text not null default '',
  title          text not null default '',
  avatar_url     text,
  from_email     text not null default '',
  voice_prompt   text not null default '',
  signature_html text not null default '',
  created_at     timestamptz not null default now()
);
alter table public.agents enable row level security;
drop policy if exists own_rows on public.agents;
create policy own_rows on public.agents for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.email_log (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  client_id         uuid references public.clients(id) on delete cascade,
  agent_id          uuid references public.agents(id) on delete set null,
  kind              text not null default 'manual',      -- onboarding_welcome | onboarding_confirmation | stage | nudge | referral | manual
  to_email          text,
  subject           text default '',
  body              text default '',
  status            text not null default 'draft_pending_approval',  -- draft_pending_approval | sent | failed | rejected
  sent_at           timestamptz,
  resend_message_id text,
  created_at        timestamptz not null default now()
);
create index if not exists email_log_client_idx on public.email_log(client_id, created_at desc);
create index if not exists email_log_status_idx on public.email_log(user_id, status);
alter table public.email_log enable row level security;
drop policy if exists own_rows on public.email_log;
create policy own_rows on public.email_log for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed Anchor (client-facing producer: outreach, booking, lifecycle email) --------
do $$
declare uid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found.'; end if;
  if not exists (select 1 from public.agents where user_id = uid and name = 'Anchor') then
    insert into public.agents (user_id, name, title, from_email, voice_prompt, signature_html) values
    (uid, 'Anchor', 'Client Producer, Creative Impact', 'anchor@os.creativeimpactmedia.co',
'You are Anchor, the client producer for Creative Impact — a Charlotte, NC marketing partnership between Emmanuel Bibbs (visual director, ten years shooting this city) and Brandon King (creative director, the Authority Engine). You handle outreach, audit booking, onboarding, and lifecycle communication with clients.

VOICE: plainspoken, warm but efficient, zero corporate gloss. Short sentences. Write like a sharp producer who respects the reader''s time. Local — you know Charlotte; never fake it. No hype words (game-changing, seamless, elevate, unlock). No exclamation points. One idea per paragraph.

HARD RULES:
- You are an AI and you never pretend otherwise. If asked, say so plainly.
- Never fabricate numbers, results, or claims. If you don''t have a fact, don''t use one.
- Banned CTAs: "Book a call", "Learn more", "Click here". CTAs are benefit-led and low-effort ("Reply with a day that works and the audit''s on the calendar").
- The Authority Audit is free and ends with a written plan either way — never pitch-slap it.
- Keep emails under 150 words unless the task demands more.
- Never discuss pricing changes, refunds, or legal terms — route those to Brandon and Emmanuel.',
'<div style="margin-top:18px;padding-top:12px;border-top:1px solid #24385c;font-size:12px;color:#8ea3c4;line-height:1.6"><b style="color:#f4f7fc">Anchor</b> · Client Producer (AI) · Creative Impact<br>creativeimpactmedia.co</div>');
  end if;
end $$;

-- ▶▶▶ 12_rookie_chaining.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Onboarding chaining (Part 1 -> Part 2) + Showrunner (OS operator AI)
-- Run once in the Supabase SQL Editor (after 11). Safe to re-run.
-- ============================================================================

-- A template can chain to a follow-up form; submitting Part 1 auto-creates the
-- Part 2 run and Anchor auto-sends the link.
alter table public.onboarding_templates
  add column if not exists next_template_id uuid references public.onboarding_templates(id) on delete set null;

-- Showrunner — the operator-facing OS agent (chat copilot; acts inside the OS).
do $$
declare uid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found.'; end if;
  if not exists (select 1 from public.agents where user_id = uid and name = 'Showrunner') then
    insert into public.agents (user_id, name, title, from_email, voice_prompt, signature_html) values
    (uid, 'Showrunner', 'OS Supervisor (AI), Creative Impact', 'showrunner@os.creativeimpactmedia.co',
'You are Showrunner, the operator-side AI inside Creative Impact OS — the broadcast control room for Emmanuel Bibbs and Brandon King''s Charlotte marketing partnership. You are the supervisor in the booth, not a chatbot: they give an order, you execute it against the OS and report back.

VOICE: terse, precise, control-room calm. Confirm every action with the exact numbers ("Logged: 3 calls, 2 audits, $3,500 signed"). No filler, no cheerleading, no emoji.

RULES:
- Use your tools for ANY change to the OS. Never claim you did something without a successful tool result.
- If an instruction is ambiguous (which deal? which client?), ask ONE sharp clarifying question instead of guessing.
- Never invent numbers. If asked about the board, read it from context or the get_board tool.
- You cannot delete anything in v1 — say so if asked, and tell them to do it in the UI.
- Client-facing email is Anchor''s voice, not yours — hand it off with draft_client_email.
- You are an AI and say so if asked.',
'');
  end if;
end $$;

-- ▶▶▶ 13_full_onboarding_forms.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — The real onboarding flow, transcribed from HoneyBook:
--   Automation 1: "Onboarding Information — Part 1" (brand/company intake)
--   Automation 2: "Audience Clarity Form — Part 2"  (offer + avatar psychology)
-- Part 1 chains to Part 2 (auto-sent on submission). Part 1 is wired to the
-- Authority Engine offer (the old seeded AE template is detached, not deleted).
-- Run once in the Supabase SQL Editor (after 12). Safe to re-run.
-- ============================================================================

do $$
declare uid uuid; pt1 uuid; pt2 uuid; ae_offer uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found.'; end if;
  if exists (select 1 from public.onboarding_templates where user_id = uid and name = 'Onboarding Information — Part 1') then
    return; -- already installed
  end if;

  select id into ae_offer from public.offers where user_id = uid and slug = 'authority-engine';

  -- ---------------- PART 2 (created first so Part 1 can chain to it) ----------
  insert into public.onboarding_templates (user_id, name, offer_id, intro_copy, sections)
  values (uid, 'Audience Clarity Form — Part 2', null,
$t$Welcome to Creative Impact's Audience Clarity Form (Pt. 2). It should take about 30 minutes, depending on how much you already have mapped out. The purpose is simple: give us a crystal-clear picture of who you serve and how we can capture their attention through story-driven video. We'll use this with the notes we've already collected to fine-tune our process.$t$,
$j$[
 {"title":"Part 1: Tell us what you offer",
  "intro":"This section helps us grasp the essence of your product or service so we can pinpoint the strongest market position and translate its value into a story that grabs — and holds — your audience's attention. The more detail you share, the sharper your final message will be.",
  "fields":[
   {"key":"business_name","label":"Business Name","type":"text","required":true,"maps_to":"custom"},
   {"key":"sixth_grader","label":"How would you describe what you do/sell to a 6th grader who's never heard of you?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"competitors_top3","label":"Who are your top 3 competitors?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"unique_vs_competition","label":"How is what you do/sell unique, better, or different compared to your competition? What does your product/service do that theirs doesn't?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"best_case","label":"What is the best-case scenario that could come from using your product/service/program? (Be specific — physical, mental, emotional, financial. Answers like \"business growth\" don't count.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"unique_mechanism","label":"What unique strategy, system, process, tool, or technique do you use to get customers/clients that result? How does it work?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"features_mechanisms","label":"List all the different features, mechanisms, and characteristics your product/service uses to help customers achieve that best-case scenario. (What allows it to get results? How does it work?)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"pain_alleviated","label":"What pain does it alleviate? (People buy to increase pleasure or minimize pain — this is the pain side.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"other_solutions","label":"What other solutions is your market using to alleviate that pain? How effective are they?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"sales_process","label":"Briefly describe your sales process. (E.g. lead submits application > 15 min qualification call > 60 min sales call > sale.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"fulfillment_steps","label":"Describe, step by step, how your product/service is fulfilled. (First step after the sale? Step 2? Step 3?)","type":"textarea","required":true,"maps_to":"custom"}
  ]},
 {"title":"Part 2: Your Avatar",
  "intro":"Now that we're clear on WHAT we're selling, we need WHO. Manifest a single person — a current customer you want a thousand more of, a combination of past customers, or a fictitious person. Focus on ONE person; give single numbers, not ranges. The clients who do this properly are rewarded with faster, longer-lasting, more profitable results.",
  "fields":[
   {"key":"avatar_name","label":"Give your avatar a name (like Greg)","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_age","label":"How old is your avatar?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_gender","label":"What is your avatar's gender?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_relationship","label":"What is your avatar's relationship status? (Married, divorced, engaged, de facto, single?)","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_kids","label":"How many kids does your avatar have?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_home_life","label":"What is your avatar's family/home life like?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_wear","label":"What does your avatar wear?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_job","label":"What does your avatar do for a living?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_income","label":"How much does your avatar make?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_follows","label":"Who does your avatar follow online? (Facebook, Instagram, Twitter, LinkedIn — specific names/pages.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_watches","label":"What shows/channels/videos does your avatar watch? (Netflix, TV, YouTube, podcasts.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_hangouts","label":"Where does your avatar hang out online? (Industry forums, Facebook groups, Reddit threads — names and links if possible.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_heroes","label":"Who are your avatar's heroes? Who do they look up to? (E.g. The Rock, Oprah, Michael Jordan, Gary Vee, family, industry influencers.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_daily","label":"What are some things your avatar does on a daily basis?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_weekends","label":"What does your avatar get up to on the weekends?","type":"textarea","required":true,"maps_to":"custom"}
  ]},
 {"title":"Their psychology",
  "intro":"You've got the external picture. Now go deeper — their frustrations, fears, desires, and aspirations. Describe each in rich detail: the physical, mental, emotional, and financial consequences.",
  "fields":[
   {"key":"biggest_frustration","label":"What is your avatar's biggest frustration?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"awake_at_night","label":"What keeps your avatar awake at night, eyes open, staring at the ceiling?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"afraid_of","label":"What is your avatar afraid of?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"pisses_off","label":"What pisses your avatar off?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"top3_frustrations","label":"What are your avatar's top 3 daily frustrations?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"wants_now","label":"What does your avatar want right now? Why?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"aspirations","label":"What are your avatar's aspirations and ambitions? Why?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"secret_desire","label":"What does your avatar secretly, ardently desire most? Why?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"trends","label":"What trends are occurring, or will occur, in your avatar's life?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"decision_bias","label":"Is there a built-in bias to the way your avatar makes decisions? (E.g. engineers are exceptionally analytical.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"want_to_believe","label":"What does your avatar WANT to believe about their frustrations and desires? (E.g. \"making money is easy.\")","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"dislikes_about_industry","label":"What does your avatar dislike about you, your industry, or what you sell? (E.g. overhyped promises, Lamborghini marketers.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"emotions","label":"What are the emotions associated with your avatar's frustrations and desires?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"must_demonstrate","label":"What must you demonstrate to be true in order for your avatar to want to do business with you?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"must_realize","label":"What does your avatar have to realize in their own life/business to want to do business with you? (Paradigm shifts, limiting beliefs to overcome.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"objections","label":"What objections might your avatar have to doing business with you?","type":"textarea","required":true,"maps_to":"custom"}
  ]}
]$j$::jsonb)
  returning id into pt2;

  -- ---------------- PART 1 (chains to Part 2) ---------------------------------
  insert into public.onboarding_templates (user_id, name, offer_id, next_template_id, intro_copy, sections)
  values (uid, 'Onboarding Information — Part 1', ae_offer, pt2,
$t$This quick exercise helps us learn about your brand, gather your logos & assets, and understand the heart of your story — your "why," mission, vision, and goals. The more context you share, the more precisely we can craft videos that amplify your message. There are no right or wrong answers — just an opportunity for us to get to know you better.$t$,
$j$[
 {"title":"Your business",
  "fields":[
   {"key":"business_name","label":"Business Name","type":"text","required":true,"maps_to":"custom"},
   {"key":"business_email","label":"Business Email","type":"text","required":true,"maps_to":"client.email"},
   {"key":"business_phone","label":"Business Phone Number","type":"text","required":true,"maps_to":"client.phone"},
   {"key":"business_address","label":"Business Address","type":"text","maps_to":"custom"},
   {"key":"social_handles","label":"Business Social Media Handles","type":"textarea","maps_to":"custom"},
   {"key":"website","label":"Website URL","type":"url","required":true,"maps_to":"custom"},
   {"key":"what_you_sell","label":"What does your company sell or do / what job is your business looking to do? (Example: Landscaping, but only want to target residential)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"mission_vision","label":"What is the mission/vision of your brand/company?","type":"textarea","required":true,"maps_to":"kit.voice"},
   {"key":"competition","label":"Who is your competition? What is their Instagram link?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"anything_else","label":"Anything else we should know about your company/business that we missed?","type":"textarea","maps_to":"custom"},
   {"key":"brand_assets","label":"Please share a link to all brand assets and logos (Drive/Dropbox folder)","type":"url","maps_to":"kit.asset.Brand assets"}
  ]}
]$j$::jsonb)
  returning id into pt1;

  -- Detach the old seeded Authority Engine template so Part 1 is what fires.
  update public.onboarding_templates
    set offer_id = null
  where user_id = uid and name = 'Authority Engine — Full Intake';
end $$;

-- ▶▶▶ 14_automations.sql ▶▶▶

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

-- ▶▶▶ 15_status_docs.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — Client Dashboard build, Phase 5: Status page + docs
-- Read-only client status portal (magic link, like pay/proposal links).
-- client_docs already exists (09) — the editor is app-side, no schema change.
-- Run once in the Supabase SQL Editor (after 14). Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- Every client gets a permanent portal token (existing rows are backfilled
-- row-by-row because gen_random_uuid() is volatile).
alter table public.clients add column if not exists portal_token text default gen_random_uuid()::text;
update public.clients set portal_token = gen_random_uuid()::text where portal_token is null;
create unique index if not exists clients_portal_token_idx on public.clients(portal_token);

-- Public: the client's read-only status view. Exposes ONLY client-safe data:
-- name, pipeline position, work board, brand kit visuals, stage/work events.
-- Never: money, notes, emails, internal flags.
create or replace function public.get_client_status(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'client', jsonb_build_object('name', c.name, 'contact', coalesce(c.contact_name, '')),
    'stage_id', c.pipeline_stage_id,
    'stages', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.sort_order)
      from public.pipeline_stages s
      where s.template_id = (select template_id from public.pipeline_stages where id = c.pipeline_stage_id)
    ), '[]'::jsonb),
    'work', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'title', w.title, 'status', w.status, 'type', w.type, 'due', w.due_date, 'link', w.external_link) order by w.sort_order)
      from public.work_items w where w.client_id = c.id
    ), '[]'::jsonb),
    'kit', (
      select jsonb_build_object('logo', k.logo_url, 'colors', k.colors, 'fonts', k.fonts)
      from public.brand_kits k where k.client_id = c.id
    ),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('kind', e.kind, 'message', e.message, 'at', e.created_at) order by e.created_at desc)
      from (
        select kind, message, created_at from public.client_events
        where client_id = c.id and kind in ('stage', 'work', 'onboarding')
        order by created_at desc limit 12
      ) e
    ), '[]'::jsonb)
  )
  from public.clients c
  where c.portal_token = p_token
  limit 1;
$$;
revoke all on function public.get_client_status(text) from public;
grant execute on function public.get_client_status(text) to anon, authenticated;

-- ▶▶▶ 16_broadcast.sql ▶▶▶

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

-- ▶▶▶ seed.sql ▶▶▶

-- ============================================================================
-- Creative Impact OS — starting state (sprint targets + partner-desk defaults).
-- Run AFTER you have created your single user account, in the Supabase SQL Editor.
-- It finds your (one) user automatically. Safe to re-run — it won't duplicate.
--
-- NOTE: unlike the old Churlish seed, this seeds NO deals, NO weekly numbers and
-- NO log entries. The board starts empty and fills with real work — no phantom
-- numbers, ever. Demo data lives only in local design mode.
-- ============================================================================

do $$
declare uid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then
    raise exception 'No user found. Create your account first (Authentication → Users), then re-run this.';
  end if;

  -- SPRINT (targets + dates + the one thing) — upsert
  insert into public.sprint (user_id, target_cents, sellby_date, deadline_date, one_thing_title, one_thing_body)
  values (uid, 10000000, '2026-10-31', '2026-12-31',
          'Sell out August''s four capture days',
          'Free 30-minute Authority Audit as the door-opener, booked from the Charlotte cold list. Until all four slots are sold, nothing else on this board matters.')
  on conflict (user_id) do update
    set target_cents = excluded.target_cents,
        sellby_date = excluded.sellby_date,
        deadline_date = excluded.deadline_date,
        one_thing_title = excluded.one_thing_title,
        one_thing_body = excluded.one_thing_body;

  -- APP STATE (partner desk: habits / goals with owners; check-ins start empty)
  insert into public.app_state (user_id, founder, ops, habits, goals)
  values (
    uid, '{}'::jsonb, '{}'::jsonb,
    '[{"id":"h1","name":"3 sales conversations","owner":"BK","days":{}},
      {"id":"h2","name":"Camera on something","owner":"EB","days":{}},
      {"id":"h3","name":"Move my body","owner":"BOTH","days":{}}]'::jsonb,
    '[{"id":"g1","text":"$100K collected by Dec 31","type":"business","owner":"BOTH","target":100000,"done":false},
      {"id":"g2","text":"Sell out August''s four capture days","type":"business","owner":"BK","target":0,"done":false},
      {"id":"g3","text":"Ship the 500-brands Charlotte archive reel","type":"business","owner":"EB","target":0,"done":false},
      {"id":"g4","text":"Protect health through the sprint — no week-5 wall","type":"life","owner":"BOTH","target":0,"done":false}]'::jsonb
  )
  on conflict (user_id) do nothing;
end $$;
