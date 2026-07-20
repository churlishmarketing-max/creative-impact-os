# Creative Impact OS — State of Play

**Read this first. It is auto-loaded into every Claude Code session in this repo.**
Last updated: 2026-07-19.

---

## Who is who

- **Brandon King** — owner/operator. **Not a developer.** Needs click-by-click
  dashboard instructions, not shell one-liners. Runs sales + strategy (BK).
- **Emmanuel Bibbs** — partner, visual director, Charlotte (EB). Shares the OS
  login with Brandon; does not have a separate account (see Standing Rules).
- **Ja'Rel** — contractor building the AI agent fleet. Works on the **same
  physical PC** under a **separate Windows user** and a **separate Creative
  Impact Claude account** (deliberate: walls off Churlish Media, keeps agent
  ownership with Brandon, keeps the subscription a clean CI expense).

Creative Impact is a **separate business** from Churlish Media. This repo is a
rebranded clone of the Churlish OS engine. Nothing here should carry Churlish
branding, pricing, or contract language.

## The number

**$100,000 collected by 2026-12-31, signed by 2026-10-31.** The stated One
Thing is *"sell out August's four capture days."*

Worth knowing, because it isn't written in the seeded goal text: four capture
days at $2,400 is **$9,600**. Hitting $100K realistically means roughly **ten
signed Authority Engine retainers** ($3,500/mo × 3-month term = $10,500 each).
The capture days are the wedge, not the number.

---

## What is LIVE right now

- **https://os.creativeimpactmedia.co** — deployed, custom domain valid, whole
  app behind login. This is production.
- **Database** — Supabase project `eiotngsqhyqnzmoofuie`, fully built.
  `SETUP_CREATIVE_IMPACT.sql` was run once, successfully.
- **The cockpit** — all 16 tabs render and save: pipeline, clients, invoices,
  proposals, scheduling, KPIs, expenses, shoots, partner desk, fleet page.
- **Public booking** — `/go/book` captures leads and files them to the roster.
  (The *notification email* does not send — see Dormant.)
- **The board is EMPTY BY DESIGN.** No deals, no weekly numbers, no log lines,
  no shoots. That is correct, not a broken migration. Real data gets entered by
  humans. Demo numbers deliberately never ship to production.

## What is DORMANT (code is deployed, waiting on one credential)

| Surface | Blocked by | Notes |
|---|---|---|
| All outbound email — booking alerts, Anchor drafts, client reply threads | Resend not set up | Needs a **new** Resend account: free tier = one custom domain, Churlish used theirs |
| Authority Diagnostic checkout ($750) | `STRIPE_SECRET_KEY` | **Deferred on purpose** — no CI bank account yet. Not forgotten |
| Fleet bridge (`/api/fleet/ingest`, `/api/fleet/roster`) | `FLEET_INGEST_SECRET` | Returns `not_configured` until set. This is what Ja'Rel's agents need |
| Clarity Engine bridge | `CLARITY_WEBHOOK_SECRET` | Lovable half not built either |
| Showrunner console (tab 16) + Anchor email drafting | `ANTHROPIC_API_KEY` | **Status unverified** — test by opening tab 16 and typing anything |
| Facebook lead import | FB_* vars | Parked |
| Android APK | assetlinks | Parked. Note `/.well-known/assetlinks.json` currently 404s — the proxy exempts the path but the route needs work. Setting the env var alone won't fix it |

## Environment variables

**Confirmed SET in Vercel:** `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`,
`REFERRAL_TARGET_URL`.

**Confirmed NOT set:** `FLEET_INGEST_SECRET`, `STRIPE_SECRET_KEY`, all Resend
vars, `CLARITY_WEBHOOK_SECRET`. **Unknown:** `ANTHROPIC_API_KEY`.

Full descriptions live in `.env.local.example`. Two cautions:
- `NEXT_PUBLIC_*` values are **baked at build time** — changing one in Vercel
  does nothing until you **Redeploy**.
- `FB_APP_ID` is undocumented in the template and **falls back to a hardcoded
  ID belonging to a different project**. Must be set before using Facebook.

---

## STANDING RULES — read before changing anything

1. **Never create a second Supabase auth user.** The engine is
   single-workspace; every security policy is `auth.uid() = user_id`. A second
   user sees a completely empty OS, which reads as *"all our data is gone."*
   Emmanuel uses the **shared** login. This is by design, not a limitation.
2. **Never re-run `SETUP_CREATIVE_IMPACT.sql`.** `GO_LIVE.md` calls it
   "safe to re-run" — **that is wrong.** The embedded seed uses
   `ON CONFLICT DO UPDATE` on the sprint row and will silently reset the
   target, dates, and THE ONE THING to defaults, wiping cockpit edits. It also
   re-arms client-facing stage emails. The success message looks green either way.
3. **Never commit a secret.** `.gitignore` covers `.env*`. The real risk is
   pasting a key into a tracked file while debugging. Record *where* a
   credential lives, never its value.
4. **Keep this repo out of OneDrive.** It lives at `C:\dev\creative-impact-os`.
   OneDrive file locks break `npm install` and corrupt builds.
5. **The dev server runs on port 3000** (`npm run dev` → http://localhost:3000).
6. **Any new public page or API route must be added to the allow-list in
   `proxy.ts`** or it silently redirects to `/login` with no error explaining why.
7. **Local dev with no `.env.local` runs in demo mode** — the login gate turns
   OFF and fake numbers appear. Expected. Never mistake those for the real
   board, and never re-enter them into production.

## Credential recovery — do this before the old PC is wiped

**There is no password-reset path on the OS login.** No forgot-password link,
no signup, and the `os@creativeimpactmedia.co` mailbox does not exist yet, so a
Supabase reset email would go nowhere. Recovery requires Supabase dashboard
access.

**Write down and store in a password manager, on paper, or both:**
- The OS login email + password (the shared Supabase auth user)
- Supabase account login (project `eiotngsqhyqnzmoofuie`)
- Vercel account login — **Vercel holds the only copy** of
  `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `REFERRAL_TARGET_URL`. There is
  no `.env.local` anywhere to restore from. Read them out before touching
  project settings.
- GitHub account (`churlishmarketing-max`)
- The DNS host where `creativeimpactmedia.co` is managed

---

## Docs in this repo — what to trust

| Doc | Status |
|---|---|
| `HANDOFF.md` (this file) | **CURRENT — source of truth** |
| `docs/handoff/NEW-PC-SETUP.md` | **CURRENT** — install + clone + run |
| `docs/handoff/ROADMAP.md` | **CURRENT** — ordered remaining work |
| `docs/agent-pack/**` | **CURRENT** — Ja'Rel's fleet build pack |
| `design/README.md` | Design authority (tokens, screens, copy). Ignore its "no codebase exists yet" framing and its demo numbers |
| `GO_LIVE.md` | **HISTORICAL** for Steps 1–4 (all done). Still useful: the add-later checklist and the Stripe `sk_live_` vs `mk_` warning. **Its "safe to re-run" SQL claim is wrong** |
| `README.md` | **HISTORICAL** — describes first-time setup that is complete. Do not follow |
| `docs/authority-diagnostic/**` | Spec, mostly **already built**. Audit the code before writing anything new. `schema.sql` there is a SPEC, not a migration — the real one is `supabase/16_diagnostic.sql` |

## Ownership & continuity (open decision)

Repo, Vercel project, and domain all currently sit under Brandon's
**Churlish-named** personal GitHub/Vercel accounts, even though Creative Impact
is a partnership with Emmanuel. Worth deciding — alongside forming the entity
and bank account — whether to move the repo to a Creative Impact GitHub org and
the Vercel project to a CI team. **Much cheaper to do before Ja'Rel's agent
work accumulates than after** (a transfer changes clone URLs and requires
re-pointing Vercel).

Also: each agent Ja'Rel finishes should have its instructions committed to
`docs/agent-pack/built/` so the fleet survives any account or staffing change.
