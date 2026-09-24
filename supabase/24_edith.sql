-- ============================================================================
-- Creative Impact OS — EDITH (the Charlotte Spotlight email engine)
-- Run once in the Supabase SQL Editor, AFTER 22_spotlight.sql. Safe to re-run.
--
-- EDITH's contacts ARE the Spotlight prospects: this adds the fields the
-- templates merge (specific detail, form answer, call time, spot number, ...)
-- to spotlight_prospects rather than creating a second contact model.
-- Then: events (what happened), enrollments (who is in which sequence), steps
-- (every scheduled / held / sent email — the send log), tasks for humans, and
-- a service-only runtime row holding the clock's key.
-- ============================================================================

create extension if not exists pgcrypto;

alter table public.spotlight_prospects
  add column if not exists first_name        text,
  add column if not exists tags              text[] not null default '{}',
  add column if not exists specific_detail   text,        -- one human-written sentence; SEQ1 can't start without it
  add column if not exists q5_answer         text,        -- "What would you want Charlotte to finally understand about your business?"
  add column if not exists call_time         timestamptz,
  add column if not exists call_end          timestamptz,
  add column if not exists call_link         text,
  add column if not exists rebook_link       text,
  add column if not exists call_outcome      text,        -- undecided | not_fit | closed
  add column if not exists spot_number       int,
  add column if not exists episode_number    int,
  add column if not exists not_fit_reason    text,
  add column if not exists what_would_change text,
  add column if not exists cut_link          text,
  add column if not exists reach_number      text,
  add column if not exists reach_screenshot  text,
  add column if not exists do_not_contact    boolean not null default false,
  add column if not exists unsubscribed_at   timestamptz,
  add column if not exists u_token           text not null default gen_random_uuid()::text;
create unique index if not exists spotlight_utoken_idx on public.spotlight_prospects(u_token);

-- What happened (the OS emits these; sequences subscribe to them).
create table if not exists public.edith_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  prospect_id uuid references public.spotlight_prospects(id) on delete cascade,  -- null = broadcast (episode events)
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  source      text,
  at          timestamptz not null default now()
);
create index if not exists edith_events_idx on public.edith_events(user_id, prospect_id, at);

-- Who is in which sequence. ONE active enrollment per contact per sequence.
create table if not exists public.edith_enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  prospect_id uuid not null references public.spotlight_prospects(id) on delete cascade,
  seq         text not null,
  status      text not null default 'active',   -- active | completed | exited
  enrolled_at timestamptz not null default now(),
  ended_at    timestamptz,
  end_reason  text,
  context     jsonb not null default '{}'::jsonb
);
create unique index if not exists edith_one_active_idx on public.edith_enrollments(prospect_id, seq) where status = 'active';
create index if not exists edith_enr_idx on public.edith_enrollments(user_id, status);

-- Every email EDITH will send, is holding, sent, or logged (the send log).
create table if not exists public.edith_steps (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  enrollment_id uuid not null references public.edith_enrollments(id) on delete cascade,
  prospect_id   uuid not null references public.spotlight_prospects(id) on delete cascade,
  seq           text not null,
  step          text not null,
  template_id   text,
  kind          text not null default 'email',      -- email | internal
  status        text not null default 'scheduled',  -- scheduled | waiting | held | sending | sent | logged | done | skipped | cancelled | failed
  due_at        timestamptz,
  anchor        text,
  hold_reason   text,
  to_email      text,
  subject       text,
  body          text,
  sent_at       timestamptz,
  error         text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists edith_steps_due_idx on public.edith_steps(status, due_at);
create index if not exists edith_steps_prospect_idx on public.edith_steps(prospect_id, status);
drop trigger if exists touch_edith_steps on public.edith_steps;
create trigger touch_edith_steps before update on public.edith_steps
  for each row execute function public.touch_updated_at();

-- Work for humans (EDITH never does these): write the specific detail, call
-- the lead, log the call outcome, fill a held field, the Friday receipt pull.
create table if not exists public.ops_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  source      text not null default 'edith',
  prospect_id uuid references public.spotlight_prospects(id) on delete cascade,
  key         text not null,
  title       text not null,
  detail      text,
  due_at      timestamptz,
  status      text not null default 'open',   -- open | done
  created_at  timestamptz not null default now(),
  done_at     timestamptz
);
create unique index if not exists ops_tasks_open_key_idx on public.ops_tasks(user_id, key) where status = 'open';
create index if not exists ops_tasks_idx on public.ops_tasks(user_id, status, due_at);

do $$ declare t text; begin
  foreach t in array array['edith_events','edith_enrollments','edith_steps','ops_tasks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- The clock's key + digest bookkeeping. RLS on with NO policy: only the
-- service role (the server) and the database's own scheduler can read it.
create table if not exists public.edith_runtime (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  tick_key       text not null default encode(gen_random_bytes(24), 'hex'),
  last_tick_at   timestamptz,
  digest_sent_on date
);
alter table public.edith_runtime enable row level security;
insert into public.edith_runtime(user_id)
  select user_id from public.app_state
  on conflict (user_id) do nothing;
