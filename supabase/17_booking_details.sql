-- ============================================================================
-- Creative Impact OS — Booking upgrade: full lead capture on the public booker.
-- Adds business/website/socials/reason to bookings, exposes the offer list to
-- the booking page, and auto-creates/links a Lead client on every booking.
-- Run once in the SQL Editor (after 16). Safe to re-run.
-- ============================================================================

alter table public.bookings add column if not exists details jsonb not null default '{}'::jsonb;

-- The booking page also needs the offer names for the "what are you reaching
-- out for?" select.
create or replace function public.get_booking(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'config', a.ops->'__booking',
    'offers', coalesce((
      select jsonb_agg(o.name order by o.created_at)
      from public.offers o where o.user_id = a.user_id
    ), '[]'::jsonb),
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

-- Booking now carries details AND becomes a Lead in the roster automatically
-- (matched by email if they already exist). p_details has a default so the
-- previous app version keeps working until the deploy lands.
create or replace function public.create_booking(
  p_token text, p_name text, p_email text, p_phone text, p_notes text,
  p_start timestamptz, p_end timestamptz, p_details jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid; cid uuid; biz text;
begin
  select user_id into uid from public.app_state where ops->'__booking'->>'token' = p_token;
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if exists (select 1 from public.bookings where user_id = uid and status = 'booked' and start_at = p_start) then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end if;

  -- find-or-create the client (Lead) so no booking is ever a dead end
  if nullif(p_email, '') is not null then
    select id into cid from public.clients
      where user_id = uid and lower(email) = lower(p_email) limit 1;
    if cid is null then
      biz := coalesce(nullif(p_details->>'business', ''), nullif(p_name, ''), p_email);
      insert into public.clients (user_id, name, contact_name, email, phone, status, source, notes)
      values (uid, biz, nullif(p_name, ''), lower(p_email), nullif(p_phone, ''), 'Lead', 'Booking',
              nullif(concat_ws(E'\n',
                case when nullif(p_details->>'website','') is not null then 'Website: ' || (p_details->>'website') end,
                case when nullif(p_details->>'socials','') is not null then 'Socials: ' || (p_details->>'socials') end
              ), ''))
      returning id into cid;
    end if;
    insert into public.client_events (user_id, client_id, kind, message)
    values (uid, cid, 'system', 'Booked a call' ||
      coalesce(' — ' || nullif(p_details->>'reason', ''), ''));
  end if;

  insert into public.bookings (user_id, client_id, name, email, phone, notes, start_at, end_at, details)
  values (uid, cid, nullif(p_name,''), nullif(p_email,''), nullif(p_phone,''), nullif(p_notes,''), p_start, p_end, coalesce(p_details, '{}'::jsonb));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.create_booking(text,text,text,text,text,timestamptz,timestamptz,jsonb) from public;
grant execute on function public.create_booking(text,text,text,text,text,timestamptz,timestamptz,jsonb) to anon, authenticated;
-- retire the old signature so there's exactly one
drop function if exists public.create_booking(text,text,text,text,text,timestamptz,timestamptz);
