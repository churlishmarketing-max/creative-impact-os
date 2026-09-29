-- 26 · Close-a-Spot release forms + EDITH's prospect finder (2026-09-29)
-- Run once in the Supabase SQL editor. Safe to re-run.
--
--   1. Release forms: every Spotlight business gets its own release link
--      (/spotlight/release/<release_token>). Everyone who appears on camera —
--      owner, staff, customers — signs it; each signature is saved under that
--      business with the exact text they agreed to.
--   2. The finder: /find in Discord (or "find HVAC companies in Charlotte" to
--      EDITH) creates a hunt; a clock works through it a few businesses a
--      minute and EDITH posts each one to Discord.
--   3. The finder's clock: a second pg_cron job, same key as EDITH's, that
--      fires only while a hunt is running.

-- 1 · Release forms ------------------------------------------------------------
alter table public.spotlight_prospects
  add column if not exists release_token text not null default gen_random_uuid()::text;
create unique index if not exists spotlight_prospects_release_token_idx on public.spotlight_prospects(release_token);

create table if not exists public.spotlight_releases (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade default auth.uid(),
  prospect_id    uuid not null references public.spotlight_prospects(id) on delete cascade,
  first_name     text not null,
  last_name      text not null,
  email          text not null,
  consent        boolean not null,
  consent_text   text not null,              -- the exact release they agreed to
  consent_version text not null,             -- short hash of consent_text
  source         text not null default 'link', -- link | in person
  ip             text,
  user_agent     text,
  signed_at      timestamptz not null default now()
);
create index if not exists spotlight_releases_prospect_idx on public.spotlight_releases(prospect_id, signed_at desc);

-- 2 · The finder ---------------------------------------------------------------
create table if not exists public.prospect_hunts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  vertical        text not null,
  area            text not null,
  count           int  not null default 10,
  status          text not null default 'queued',   -- queued | enriching | done | failed
  candidates      jsonb not null default '[]'::jsonb,
  requested_by    text,
  channel_id      text,                             -- the Discord channel to report to
  error           text,
  attempts        int  not null default 0,
  step_started_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists prospect_hunts_active_idx on public.prospect_hunts(user_id, status, created_at);

do $$ declare t text; begin
  foreach t in array array['spotlight_releases','prospect_hunts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- 3 · The finder's clock ---------------------------------------------------------
select cron.unschedule(jobid) from cron.job where jobname = 'finder-tick';

select cron.schedule('finder-tick', '* * * * *', $job$
  select net.http_post(
    url     := 'https://os.creativeimpactmedia.co/api/finder/tick',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-edith-key', r.tick_key),
    body    := '{}'::jsonb,
    timeout_milliseconds := 58000
  )
  from public.edith_runtime r
  where exists (
    select 1 from public.prospect_hunts h
    where h.user_id = r.user_id and h.status in ('queued', 'enriching')
  );
$job$);

-- Check: select jobname, schedule, active from cron.job;   → edith-tick AND finder-tick
