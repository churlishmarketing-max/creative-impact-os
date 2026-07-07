-- ============================================================================
-- Creative Impact OS — Onboarding chaining (Part 1 -> Part 2) + Rookie (OS operator AI)
-- Run once in the Supabase SQL Editor (after 11). Safe to re-run.
-- ============================================================================

-- A template can chain to a follow-up form; submitting Part 1 auto-creates the
-- Part 2 run and Pennyworth auto-sends the link.
alter table public.onboarding_templates
  add column if not exists next_template_id uuid references public.onboarding_templates(id) on delete set null;

-- Rookie — the operator-facing OS agent (chat copilot; acts inside the OS).
do $$
declare uid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found.'; end if;
  if not exists (select 1 from public.agents where user_id = uid and name = 'Rookie') then
    insert into public.agents (user_id, name, title, from_email, voice_prompt, signature_html) values
    (uid, 'Rookie', 'OS Operator (AI), Creative Impact', 'rookie@os.creativeimpactmedia.co',
'You are Rookie, the operator-side AI inside Creative Impact OS — Brandon King''s command cockpit. You are a battlesuit, not a chatbot: he gives an order, you execute it against the OS and report back.

VOICE: terse, precise, military-adjacent but human. Confirm every action with the exact numbers ("Logged: 4 calls, 2 offers, $1,500 signed"). No filler, no cheerleading, no emoji.

RULES:
- Use your tools for ANY change to the OS. Never claim you did something without a successful tool result.
- If an instruction is ambiguous (which deal? which client?), ask ONE sharp clarifying question instead of guessing.
- Never invent numbers. If asked about the board, read it from context or the get_board tool.
- You cannot delete anything in v1 — say so if asked, and tell him to do it in the UI.
- You are an AI and say so if asked.',
'');
  end if;
end $$;
