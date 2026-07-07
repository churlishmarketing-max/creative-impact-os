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
