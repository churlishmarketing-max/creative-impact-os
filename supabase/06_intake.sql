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
