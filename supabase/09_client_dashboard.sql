-- ============================================================================
-- Churlish OS — Client Dashboard build, Phase 1
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
declare uid uuid; tpl uuid; stg uuid; demo uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found — create your account first.'; end if;

  -- The offer ladder (edit freely later)
  insert into public.offers (user_id, name, slug, type, price_monthly_cents, min_term_months) values
    (uid, 'Authority Diagnostic',   'authority-diagnostic',   'diagnostic', 75000,  null),
    (uid, 'Ad Creative Tournament', 'ad-creative-tournament', 'one_off',    250000, null),
    (uid, '48-Hour Tool Sprint',    'tool-sprint-48h',        'one_off',    500000, null),
    (uid, 'Authority Engine',       'authority-engine',       'retainer',   350000, 3),
    (uid, 'Authority Lite',         'authority-lite',         'retainer',   null,   3),
    (uid, 'CRF Growth',             'crf-growth',             'retainer',   240000, 3),
    (uid, 'Crucible Core',          'crucible-core',          'coaching',   null,   null),
    (uid, 'Spark',                  'spark',                  'one_off',    null,   null)
  on conflict (user_id, slug) do nothing;

  -- Default pipeline template + the 8 stages
  select id into tpl from public.pipeline_templates where user_id = uid and name = 'Churlish Default';
  if tpl is null then
    insert into public.pipeline_templates (user_id, name) values (uid, 'Churlish Default') returning id into tpl;
    insert into public.pipeline_stages (user_id, template_id, name, sort_order, stall_days) values
      (uid, tpl, 'Signed',          0, null),
      (uid, tpl, 'Onboarding',      1, 3),
      (uid, tpl, 'Strategy',        2, 5),
      (uid, tpl, 'Production',      3, 7),
      (uid, tpl, 'Review/Delivery', 4, 3),
      (uid, tpl, 'Live/Optimize',   5, 14),
      (uid, tpl, 'Completed',       6, null),
      (uid, tpl, 'Advocacy',        7, null);
  end if;

  -- One real-shaped demo client (no real PII)
  select id into demo from public.clients where user_id = uid and name = 'GE Outdoors (Demo)';
  if demo is null then
    select id into stg from public.pipeline_stages where template_id = tpl and sort_order = 3; -- Production
    insert into public.clients (user_id, name, contact_name, email, industry, status, source, ladder, pipeline_stage_id, stage_entered_at, offer_id, notes)
    values (uid, 'GE Outdoors (Demo)', 'Gary Ellis', 'demo@example.com', 'Outdoor retail', 'Active', 'Referral', 'Retainer',
            stg, now() - interval '2 days',
            (select id from public.offers where user_id = uid and slug = 'authority-engine'),
            'Demo client seeded by the dashboard build — safe to delete.')
    returning id into demo;

    insert into public.brand_kits (user_id, client_id, colors, fonts, voice_notes, do_not, assets) values
      (uid, demo,
       '[{"name":"Forest","hex":"#1E4D2B","usage":"primary"},{"name":"Blaze","hex":"#E8722C","usage":"accent"},{"name":"Bone","hex":"#F2EFE6","usage":"background"},{"name":"Charcoal","hex":"#22241F","usage":"text"}]'::jsonb,
       '[{"role":"headline","family":"Bebas Neue","weight":400,"source":"google"},{"role":"body","family":"Inter","weight":400,"source":"google"}]'::jsonb,
       'Plainspoken, field-tested, zero corporate gloss. Talks like a guide, not a brochure.',
       '["No stock-photo energy","Never say ''solutions''","No exclamation points in ads"]'::jsonb,
       '[{"label":"Brand guide (PDF)","url":"https://example.com/brand.pdf"},{"label":"B-roll folder","url":"https://example.com/broll"}]'::jsonb);

    insert into public.work_items (user_id, client_id, title, status, type, due_date, external_link, sort_order) values
      (uid, demo, 'September launch ad set — 6 variants', 'in_progress', 'ad',    current_date + 4, null, 0),
      (uid, demo, 'Founder story film — edit v2',         'in_review',   'video', current_date + 2, 'https://example.com/review', 1),
      (uid, demo, 'Landing page — trail series',          'in_progress', 'web',   current_date + 9, null, 2),
      (uid, demo, 'Brand voice guide',                    'completed',   'doc',   null, null, 3),
      (uid, demo, 'Q2 creative tournament — scoreboard',  'delivered',   'ad',    null, 'https://example.com/scoreboard', 4);

    insert into public.client_events (user_id, client_id, kind, message, created_at) values
      (uid, demo, 'system',     'Client created (demo seed)',                       now() - interval '14 days'),
      (uid, demo, 'onboarding', 'Onboarding form submitted — brand kit populated',  now() - interval '12 days'),
      (uid, demo, 'stage',      'Advanced to Strategy',                             now() - interval '11 days'),
      (uid, demo, 'stage',      'Advanced to Production',                           now() - interval '2 days'),
      (uid, demo, 'work',       'Delivered: Q2 creative tournament — scoreboard',   now() - interval '1 day');
  end if;
end $$;
