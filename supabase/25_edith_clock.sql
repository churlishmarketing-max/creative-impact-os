-- ============================================================================
-- Creative Impact OS — EDITH's clock (run AFTER 24_edith.sql). Safe to re-run.
--
-- Vercel Hobby only runs a cron once a day, but EDITH has 5-minute and
-- 1-hour sends. So the database keeps time instead: every minute pg_cron
-- checks whether any EDITH email is due (or it's 7:30 AM ET and the digest
-- hasn't gone out), and only then pings the OS. On a quiet minute it does
-- nothing and calls nothing.
--
-- The ping carries a random key that lives in edith_runtime (service-only),
-- so no secret is pasted anywhere. Turning EDITH on or off is NOT done here:
-- with edith_live off, the clock still runs and EDITH only writes her log.
--
-- To stop the clock entirely:  select cron.unschedule('edith-tick');
-- ============================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'edith-tick';

select cron.schedule('edith-tick', '* * * * *', $job$
  select net.http_post(
    url     := 'https://os.creativeimpactmedia.co/api/edith/tick',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-edith-key', r.tick_key),
    body    := '{}'::jsonb
  )
  from public.edith_runtime r
  where exists (
          select 1 from public.edith_steps s
          where s.user_id = r.user_id and s.status = 'scheduled' and s.due_at <= now()
        )
     or (    to_char(now() at time zone 'America/New_York', 'HH24:MI') between '07:30' and '07:45'
         and (r.digest_sent_on is null or r.digest_sent_on < (now() at time zone 'America/New_York')::date));
$job$);
