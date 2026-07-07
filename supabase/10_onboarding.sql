-- ============================================================================
-- Churlish OS — Client Dashboard build, Phase 2: Onboarding Engine
-- Offer-specific magic-link intake forms that auto-fill the brand kit.
-- Run once in the Supabase SQL Editor (after 09). Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.onboarding_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name       text not null default '',
  offer_id   uuid references public.offers(id) on delete set null,
  intro_copy text,
  sections   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.onboarding_templates enable row level security;
drop policy if exists own_rows on public.onboarding_templates;
create policy own_rows on public.onboarding_templates for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.onboarding_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  template_id  uuid not null references public.onboarding_templates(id) on delete cascade,
  status       text not null default 'sent',   -- sent | in_progress | submitted | processed
  magic_token  text not null default gen_random_uuid()::text,
  sent_at      timestamptz not null default now(),
  submitted_at timestamptz,
  responses    jsonb not null default '{}'::jsonb
);
create unique index if not exists onboarding_token_idx on public.onboarding_runs(magic_token);
create index if not exists onboarding_client_idx on public.onboarding_runs(client_id);
alter table public.onboarding_runs enable row level security;
drop policy if exists own_rows on public.onboarding_runs;
create policy own_rows on public.onboarding_runs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public: the client's form page reads its run + template by magic token.
create or replace function public.get_onboarding(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'status', r.status,
    'client', coalesce(c.name, ''),
    'responses', r.responses,
    'template', jsonb_build_object('name', t.name, 'intro_copy', t.intro_copy, 'sections', t.sections)
  )
  from public.onboarding_runs r
  join public.onboarding_templates t on t.id = r.template_id
  left join public.clients c on c.id = r.client_id
  where r.magic_token = p_token
  limit 1;
$$;
revoke all on function public.get_onboarding(text) from public;
grant execute on function public.get_onboarding(text) to anon, authenticated;

-- Public: autosave answers as the client types (merge into responses).
create or replace function public.save_onboarding(p_token text, p_responses jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.onboarding_runs
    set responses = coalesce(responses, '{}'::jsonb) || coalesce(p_responses, '{}'::jsonb),
        status = case when status = 'sent' then 'in_progress' else status end
  where magic_token = p_token and status in ('sent', 'in_progress');
  if not found then return jsonb_build_object('ok', false, 'error', 'locked_or_missing'); end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.save_onboarding(text, jsonb) from public;
grant execute on function public.save_onboarding(text, jsonb) to anon, authenticated;

-- SEED TEMPLATES (one per offer; each asks only what that offer needs) ---------
do $$
declare uid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found.'; end if;

  -- shared brand-kit section fields are repeated per template so each stays editable independently
  if not exists (select 1 from public.onboarding_templates where user_id = uid and name = 'Authority Engine — Full Intake') then
    insert into public.onboarding_templates (user_id, name, offer_id, intro_copy, sections) values
    (uid, 'Authority Engine — Full Intake',
     (select id from public.offers where user_id = uid and slug = 'authority-engine'),
     'Welcome aboard. This is everything we need to build your engine — 10 minutes now saves us a week of back-and-forth.',
     '[
       {"title":"The business","fields":[
         {"key":"contact","label":"Best contact name","type":"text","required":true,"maps_to":"client.contact"},
         {"key":"phone","label":"Best phone","type":"text","maps_to":"client.phone"},
         {"key":"industry","label":"Industry","type":"text","maps_to":"client.industry"},
         {"key":"website","label":"Website","type":"url","maps_to":"custom"},
         {"key":"goal","label":"The one number you want moved in 90 days","type":"textarea","required":true,"maps_to":"custom"}
       ]},
       {"title":"Brand kit","fields":[
         {"key":"logo","label":"Logo link (Drive/Dropbox — highest-res you have)","type":"url","maps_to":"kit.logo_url"},
         {"key":"color_primary","label":"Primary brand color","type":"color","maps_to":"kit.color.primary"},
         {"key":"color_accent","label":"Accent color","type":"color","maps_to":"kit.color.accent"},
         {"key":"font_headline","label":"Headline font (name it — or say ''pick for us'')","type":"text","maps_to":"kit.font.headline"},
         {"key":"font_body","label":"Body font","type":"text","maps_to":"kit.font.body"},
         {"key":"voice","label":"How should you sound? (customers'' words, not marketing''s)","type":"textarea","maps_to":"kit.voice"},
         {"key":"do_not","label":"Never say / never show (one per line)","type":"textarea","maps_to":"kit.do_not"},
         {"key":"brand_assets","label":"Brand guide / asset folder link","type":"url","maps_to":"kit.asset.Brand assets"}
       ]},
       {"title":"The funnel","fields":[
         {"key":"lead_path","label":"How does someone find you today, start to booked job?","type":"textarea","required":true,"maps_to":"custom"},
         {"key":"spend","label":"Monthly marketing spend (all-in)","type":"select","options":["Under $1k","$1k–$5k","$5k–$15k","$15k+"],"maps_to":"custom"},
         {"key":"crm","label":"Where do leads live now (CRM / spreadsheet / inbox)?","type":"text","maps_to":"custom"}
       ]}
     ]'::jsonb);

    insert into public.onboarding_templates (user_id, name, offer_id, intro_copy, sections) values
    (uid, 'Authority Lite — Intake',
     (select id from public.offers where user_id = uid and slug = 'authority-lite'),
     'Quick intake — just the essentials so we can start shipping.',
     '[
       {"title":"Basics","fields":[
         {"key":"contact","label":"Best contact name","type":"text","required":true,"maps_to":"client.contact"},
         {"key":"phone","label":"Best phone","type":"text","maps_to":"client.phone"},
         {"key":"logo","label":"Logo link","type":"url","maps_to":"kit.logo_url"},
         {"key":"color_primary","label":"Primary brand color","type":"color","maps_to":"kit.color.primary"},
         {"key":"voice","label":"How should you sound?","type":"textarea","maps_to":"kit.voice"},
         {"key":"goal","label":"What does a win look like in 90 days?","type":"textarea","required":true,"maps_to":"custom"}
       ]}
     ]'::jsonb);

    insert into public.onboarding_templates (user_id, name, offer_id, intro_copy, sections) values
    (uid, 'CRF Growth — Intake',
     (select id from public.offers where user_id = uid and slug = 'crf-growth'),
     'Point us at the footage and the channels — we take it from there.',
     '[
       {"title":"Footage + channels","fields":[
         {"key":"footage","label":"Footage source (Drive/Dropbox/Frame.io link)","type":"url","required":true,"maps_to":"kit.asset.Footage"},
         {"key":"channels","label":"Where do we post?","type":"multiselect","options":["Instagram","TikTok","YouTube Shorts","Facebook","LinkedIn"],"maps_to":"custom"},
         {"key":"cadence","label":"Posting cadence","type":"select","options":["3x/week","5x/week","Daily"],"maps_to":"custom"},
         {"key":"logo","label":"Logo link","type":"url","maps_to":"kit.logo_url"},
         {"key":"color_primary","label":"Primary brand color","type":"color","maps_to":"kit.color.primary"},
         {"key":"do_not","label":"Never say / never show (one per line)","type":"textarea","maps_to":"kit.do_not"}
       ]}
     ]'::jsonb);

    insert into public.onboarding_templates (user_id, name, offer_id, intro_copy, sections) values
    (uid, 'Crucible — Deep Diagnostic Intake',
     (select id from public.offers where user_id = uid and slug = 'crucible-core'),
     'The deeper you go here, the harder the diagnostic hits. Nothing you write leaves the room.',
     '[
       {"title":"The state of it","fields":[
         {"key":"contact","label":"Best contact name","type":"text","required":true,"maps_to":"client.contact"},
         {"key":"revenue","label":"Trailing 12-month revenue (rough)","type":"text","required":true,"maps_to":"custom"},
         {"key":"bottleneck","label":"What do YOU think the bottleneck is?","type":"textarea","required":true,"maps_to":"custom"},
         {"key":"tried","label":"What have you already tried? How did it go?","type":"textarea","maps_to":"custom"},
         {"key":"numbers","label":"Link any numbers you have (dashboards, sheets)","type":"url","maps_to":"kit.asset.Numbers"}
       ]}
     ]'::jsonb);

    insert into public.onboarding_templates (user_id, name, offer_id, intro_copy, sections) values
    (uid, 'Spark — Product Brand Intake',
     (select id from public.offers where user_id = uid and slug = 'spark'),
     'Tell us about the product like you''d tell a friend — we''ll translate it into the campaign.',
     '[
       {"title":"The product","fields":[
         {"key":"product","label":"What is it, in one sentence?","type":"textarea","required":true,"maps_to":"custom"},
         {"key":"buyer","label":"Who buys it, and why do they care?","type":"textarea","required":true,"maps_to":"custom"},
         {"key":"logo","label":"Logo link","type":"url","maps_to":"kit.logo_url"},
         {"key":"color_primary","label":"Primary brand color","type":"color","maps_to":"kit.color.primary"},
         {"key":"color_accent","label":"Accent color","type":"color","maps_to":"kit.color.accent"},
         {"key":"assets","label":"Product photos / b-roll folder link","type":"url","maps_to":"kit.asset.Product assets"}
       ]}
     ]'::jsonb);
  end if;
end $$;
