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
    (uid, 'Authority Diagnostic', 'authority-diagnostic', 'diagnostic', 75000,  null),  -- $750 written ad-account teardown
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
