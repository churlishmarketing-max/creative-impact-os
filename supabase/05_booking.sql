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
