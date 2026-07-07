-- ============================================================================
-- Churlish OS — The real onboarding flow, transcribed from HoneyBook:
--   Automation 1: "Onboarding Information — Part 1" (brand/company intake)
--   Automation 2: "Audience Clarity Form — Part 2"  (offer + avatar psychology)
-- Part 1 chains to Part 2 (auto-sent on submission). Part 1 is wired to the
-- Authority Engine offer (the old seeded AE template is detached, not deleted).
-- Run once in the Supabase SQL Editor (after 12). Safe to re-run.
-- ============================================================================

do $$
declare uid uuid; pt1 uuid; pt2 uuid; ae_offer uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception 'No user found.'; end if;
  if exists (select 1 from public.onboarding_templates where user_id = uid and name = 'Onboarding Information — Part 1') then
    return; -- already installed
  end if;

  select id into ae_offer from public.offers where user_id = uid and slug = 'authority-engine';

  -- ---------------- PART 2 (created first so Part 1 can chain to it) ----------
  insert into public.onboarding_templates (user_id, name, offer_id, intro_copy, sections)
  values (uid, 'Audience Clarity Form — Part 2', null,
$t$Welcome to Churlish Media's Audience Clarity Form (Pt. 2). It should take about 30 minutes, depending on how much you already have mapped out. The purpose is simple: give us a crystal-clear picture of who you serve and how we can capture their attention through story-driven video. We'll use this with the notes we've already collected to fine-tune our process.$t$,
$j$[
 {"title":"Part 1: Tell us what you offer",
  "intro":"This section helps us grasp the essence of your product or service so we can pinpoint the strongest market position and translate its value into a story that grabs — and holds — your audience's attention. The more detail you share, the sharper your final message will be.",
  "fields":[
   {"key":"business_name","label":"Business Name","type":"text","required":true,"maps_to":"custom"},
   {"key":"sixth_grader","label":"How would you describe what you do/sell to a 6th grader who's never heard of you?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"competitors_top3","label":"Who are your top 3 competitors?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"unique_vs_competition","label":"How is what you do/sell unique, better, or different compared to your competition? What does your product/service do that theirs doesn't?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"best_case","label":"What is the best-case scenario that could come from using your product/service/program? (Be specific — physical, mental, emotional, financial. Answers like \"business growth\" don't count.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"unique_mechanism","label":"What unique strategy, system, process, tool, or technique do you use to get customers/clients that result? How does it work?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"features_mechanisms","label":"List all the different features, mechanisms, and characteristics your product/service uses to help customers achieve that best-case scenario. (What allows it to get results? How does it work?)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"pain_alleviated","label":"What pain does it alleviate? (People buy to increase pleasure or minimize pain — this is the pain side.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"other_solutions","label":"What other solutions is your market using to alleviate that pain? How effective are they?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"sales_process","label":"Briefly describe your sales process. (E.g. lead submits application > 15 min qualification call > 60 min sales call > sale.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"fulfillment_steps","label":"Describe, step by step, how your product/service is fulfilled. (First step after the sale? Step 2? Step 3?)","type":"textarea","required":true,"maps_to":"custom"}
  ]},
 {"title":"Part 2: Your Avatar",
  "intro":"Now that we're clear on WHAT we're selling, we need WHO. Manifest a single person — a current customer you want a thousand more of, a combination of past customers, or a fictitious person. Focus on ONE person; give single numbers, not ranges. The clients who do this properly are rewarded with faster, longer-lasting, more profitable results.",
  "fields":[
   {"key":"avatar_name","label":"Give your avatar a name (like Greg)","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_age","label":"How old is your avatar?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_gender","label":"What is your avatar's gender?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_relationship","label":"What is your avatar's relationship status? (Married, divorced, engaged, de facto, single?)","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_kids","label":"How many kids does your avatar have?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_home_life","label":"What is your avatar's family/home life like?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_wear","label":"What does your avatar wear?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_job","label":"What does your avatar do for a living?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_income","label":"How much does your avatar make?","type":"text","required":true,"maps_to":"custom"},
   {"key":"avatar_follows","label":"Who does your avatar follow online? (Facebook, Instagram, Twitter, LinkedIn — specific names/pages.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_watches","label":"What shows/channels/videos does your avatar watch? (Netflix, TV, YouTube, podcasts.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_hangouts","label":"Where does your avatar hang out online? (Industry forums, Facebook groups, Reddit threads — names and links if possible.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_heroes","label":"Who are your avatar's heroes? Who do they look up to? (E.g. The Rock, Oprah, Michael Jordan, Gary Vee, family, industry influencers.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_daily","label":"What are some things your avatar does on a daily basis?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"avatar_weekends","label":"What does your avatar get up to on the weekends?","type":"textarea","required":true,"maps_to":"custom"}
  ]},
 {"title":"Their psychology",
  "intro":"You've got the external picture. Now go deeper — their frustrations, fears, desires, and aspirations. Describe each in rich detail: the physical, mental, emotional, and financial consequences.",
  "fields":[
   {"key":"biggest_frustration","label":"What is your avatar's biggest frustration?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"awake_at_night","label":"What keeps your avatar awake at night, eyes open, staring at the ceiling?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"afraid_of","label":"What is your avatar afraid of?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"pisses_off","label":"What pisses your avatar off?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"top3_frustrations","label":"What are your avatar's top 3 daily frustrations?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"wants_now","label":"What does your avatar want right now? Why?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"aspirations","label":"What are your avatar's aspirations and ambitions? Why?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"secret_desire","label":"What does your avatar secretly, ardently desire most? Why?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"trends","label":"What trends are occurring, or will occur, in your avatar's life?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"decision_bias","label":"Is there a built-in bias to the way your avatar makes decisions? (E.g. engineers are exceptionally analytical.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"want_to_believe","label":"What does your avatar WANT to believe about their frustrations and desires? (E.g. \"making money is easy.\")","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"dislikes_about_industry","label":"What does your avatar dislike about you, your industry, or what you sell? (E.g. overhyped promises, Lamborghini marketers.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"emotions","label":"What are the emotions associated with your avatar's frustrations and desires?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"must_demonstrate","label":"What must you demonstrate to be true in order for your avatar to want to do business with you?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"must_realize","label":"What does your avatar have to realize in their own life/business to want to do business with you? (Paradigm shifts, limiting beliefs to overcome.)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"objections","label":"What objections might your avatar have to doing business with you?","type":"textarea","required":true,"maps_to":"custom"}
  ]}
]$j$::jsonb)
  returning id into pt2;

  -- ---------------- PART 1 (chains to Part 2) ---------------------------------
  insert into public.onboarding_templates (user_id, name, offer_id, next_template_id, intro_copy, sections)
  values (uid, 'Onboarding Information — Part 1', ae_offer, pt2,
$t$This quick exercise helps us learn about your brand, gather your logos & assets, and understand the heart of your story — your "why," mission, vision, and goals. The more context you share, the more precisely we can craft videos that amplify your message. There are no right or wrong answers — just an opportunity for us to get to know you better.$t$,
$j$[
 {"title":"Your business",
  "fields":[
   {"key":"business_name","label":"Business Name","type":"text","required":true,"maps_to":"custom"},
   {"key":"business_email","label":"Business Email","type":"text","required":true,"maps_to":"client.email"},
   {"key":"business_phone","label":"Business Phone Number","type":"text","required":true,"maps_to":"client.phone"},
   {"key":"business_address","label":"Business Address","type":"text","maps_to":"custom"},
   {"key":"social_handles","label":"Business Social Media Handles","type":"textarea","maps_to":"custom"},
   {"key":"website","label":"Website URL","type":"url","required":true,"maps_to":"custom"},
   {"key":"what_you_sell","label":"What does your company sell or do / what job is your business looking to do? (Example: Landscaping, but only want to target residential)","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"mission_vision","label":"What is the mission/vision of your brand/company?","type":"textarea","required":true,"maps_to":"kit.voice"},
   {"key":"competition","label":"Who is your competition? What is their Instagram link?","type":"textarea","required":true,"maps_to":"custom"},
   {"key":"anything_else","label":"Anything else we should know about your company/business that we missed?","type":"textarea","maps_to":"custom"},
   {"key":"brand_assets","label":"Please share a link to all brand assets and logos (Drive/Dropbox folder)","type":"url","maps_to":"kit.asset.Brand assets"}
  ]}
]$j$::jsonb)
  returning id into pt1;

  -- Detach the old seeded Authority Engine template so Part 1 is what fires.
  update public.onboarding_templates
    set offer_id = null
  where user_id = uid and name = 'Authority Engine — Full Intake';
end $$;
