-- Churlish OS — Phases 3-5 (proposals, bookings, intake). Select ALL (Ctrl+A), copy, paste into Supabase SQL Editor, Run.

-- ============================================================================
-- Churlish OS — Phase 3: Proposals + e-sign
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


-- ============================================================================
-- Churlish OS — Phase 4: Native scheduling (bookings)
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


-- ============================================================================
-- Churlish OS — Phase 4b: Public intake form
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
