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
