-- ============================================================================
-- Churlish OS — Client Dashboard build, Phase 5: Status page + docs
-- Read-only client status portal (magic link, like pay/proposal links).
-- client_docs already exists (09) — the editor is app-side, no schema change.
-- Run once in the Supabase SQL Editor (after 14). Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- Every client gets a permanent portal token (existing rows are backfilled
-- row-by-row because gen_random_uuid() is volatile).
alter table public.clients add column if not exists portal_token text default gen_random_uuid()::text;
update public.clients set portal_token = gen_random_uuid()::text where portal_token is null;
create unique index if not exists clients_portal_token_idx on public.clients(portal_token);

-- Public: the client's read-only status view. Exposes ONLY client-safe data:
-- name, pipeline position, work board, brand kit visuals, stage/work events.
-- Never: money, notes, emails, internal flags.
create or replace function public.get_client_status(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'client', jsonb_build_object('name', c.name, 'contact', coalesce(c.contact_name, '')),
    'stage_id', c.pipeline_stage_id,
    'stages', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.sort_order)
      from public.pipeline_stages s
      where s.template_id = (select template_id from public.pipeline_stages where id = c.pipeline_stage_id)
    ), '[]'::jsonb),
    'work', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'title', w.title, 'status', w.status, 'type', w.type, 'due', w.due_date, 'link', w.external_link) order by w.sort_order)
      from public.work_items w where w.client_id = c.id
    ), '[]'::jsonb),
    'kit', (
      select jsonb_build_object('logo', k.logo_url, 'colors', k.colors, 'fonts', k.fonts)
      from public.brand_kits k where k.client_id = c.id
    ),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('kind', e.kind, 'message', e.message, 'at', e.created_at) order by e.created_at desc)
      from (
        select kind, message, created_at from public.client_events
        where client_id = c.id and kind in ('stage', 'work', 'onboarding')
        order by created_at desc limit 12
      ) e
    ), '[]'::jsonb)
  )
  from public.clients c
  where c.portal_token = p_token
  limit 1;
$$;
revoke all on function public.get_client_status(text) from public;
grant execute on function public.get_client_status(text) to anon, authenticated;
