-- ============================================================================
-- Churlish OS — Client Dashboard build, Phase 3: Agent layer (Pennyworth)
-- agents + email_log (the approval queue). Run once after 10. Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.agents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name           text not null default '',
  title          text not null default '',
  avatar_url     text,
  from_email     text not null default '',
  voice_prompt   text not null default '',
  signature_html text not null default '',
  created_at     timestamptz not null default now()
);
alter table public.agents enable row level security;
drop policy if exists own_rows on public.agents;
create policy own_rows on public.agents for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.email_log (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  client_id         uuid references public.clients(id) on delete cascade,
  agent_id          uuid references public.agents(id) on delete set null,
  kind              text not null default 'manual',      -- onboarding_welcome | onboarding_confirmation | stage | nudge | referral | manual
  to_email          text,
  subject           text default '',
  body              text default '',
  status            text not null default 'draft_pending_approval',  -- draft_pending_approval | sent | failed | rejected
  sent_at           timestamptz,
  resend_message_id text,
  created_at        timestamptz not null default now()
);
create index if not exists email_log_client_idx on public.email_log(client_id, created_at desc);
create index if not exists email_log_status_idx on public.email_log(user_id, status);
alter table public.email_log enable row level security;
drop policy if exists own_rows on public.email_log;
create policy own_rows on public.email_log for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed Pennyworth ---------------------------------------------------------------
do $$
declare uid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found.'; end if;
  if not exists (select 1 from public.agents where user_id = uid and name = 'Pennyworth') then
    insert into public.agents (user_id, name, title, from_email, voice_prompt, signature_html) values
    (uid, 'Pennyworth', 'Client Concierge, Churlish Media', 'pennyworth@churlishos.app',
'You are Pennyworth, the client concierge for Churlish Media — a one-operator creative studio run by Brandon King. You handle onboarding and lifecycle communication with clients.

VOICE: plainspoken, warm but efficient, zero corporate gloss. Short sentences. Write like a sharp concierge who respects the reader''s time. No hype words (game-changing, seamless, elevate, unlock). No exclamation points. One idea per paragraph.

HARD RULES:
- You are an AI and you never pretend otherwise. If asked, say so plainly.
- Never fabricate numbers, results, or claims. If you don''t have a fact, don''t use one.
- Banned CTAs: "Book a call", "Learn more", "Click here". CTAs are benefit-led and low-effort ("Reply with the link and we start today").
- Keep emails under 150 words unless the task demands more.
- Never discuss pricing changes, refunds, or legal terms — route those to Brandon.',
'<div style="margin-top:18px;padding-top:12px;border-top:1px solid #26262c;font-size:12px;color:#8b867d;line-height:1.6"><b style="color:#ece8e1">Pennyworth</b> · Client Concierge (AI) · Churlish Media<br>churlishmedia.com</div>');
  end if;
end $$;
