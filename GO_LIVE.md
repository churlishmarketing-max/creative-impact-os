# Creative Impact OS — Go-Live Runbook (base level)

**Scope:** Supabase + Vercel + `os.creativeimpactmedia.co` + your shared login.
**Deferred on purpose:** Stripe (no bank account yet), Resend email, Facebook
leads, Android APK. Each is add-later with zero code changes — just env vars.

**One login, two operators.** The OS is single-workspace by design: every piece
of data belongs to ONE account, and the Partner Desk (06 · PARTNERS) splits the
day-to-day between EB and BK *inside* that account. So you and Emmanuel share
one login (e.g. `os@creativeimpactmedia.co` + a strong password you both keep
in a password manager). A second Supabase user would see an empty, separate OS
— don't create one.

---

## Step 1 — GitHub (5 min, Brandon)

1. github.com → **+** → **New repository**.
2. Owner `churlishmarketing-max` · name `creative-impact-os` · **Private** · no README → **Create repository**.
3. Tell the session it's created — it pushes the code from `C:\dev\creative-impact-os`.

## Step 2 — Supabase (15 min, Brandon)

1. supabase.com → **New project**. Org: your existing one is fine (projects are
   isolated). Name `creative-impact-os`, region **East US (North Virginia)**
   (closest to Charlotte), generate a strong DB password (save it, you rarely
   need it again) → **Create**.
2. **Create the shared login BEFORE the SQL:** Authentication → Users →
   **Add user** → email `os@creativeimpactmedia.co` (or any address you both
   control) + a strong password → **Create user**. (Auto Confirm stays on.)
3. SQL Editor → **New query**. On your PC: open
   `C:\dev\creative-impact-os\supabase\SETUP_CREATIVE_IMPACT.sql` in Notepad →
   Ctrl+A → Ctrl+C → paste into the editor → **RUN**. Wait for green
   **Success**. This builds every table AND loads the Creative Impact seeds
   ($100K sprint, offer ladder, Anchor + Showrunner, intake forms, Marvel
   fleet roster). It's safe to re-run as a whole.
4. **Delete the query tab afterward.** Never re-run old tabs later.
5. Project Settings → **API** → copy three values into a notepad:
   - Project URL
   - `anon` **public** key
   - `service_role` **secret** key (server-only — treat like a password)

## Step 3 — Vercel (15 min, Brandon)

1. vercel.com → **Add New… → Project** → Import `creative-impact-os`.
2. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role secret |
   | `CRON_SECRET` | any long random string (password generator, 30+ chars) |
   | `REFERRAL_TARGET_URL` | `https://creativeimpactmedia.co` |
   | `ANTHROPIC_API_KEY` | *(optional now)* from console.anthropic.com — this is what brings Showrunner's console and Anchor's email drafting to life |

3. **Deploy.** In ~1 minute you get `creative-impact-os.vercel.app` — log in
   with the shared account and the empty board is live.
4. Remember: the `NEXT_PUBLIC_*` values are baked at **build** time — if you
   ever change them, hit **Redeploy**.

## Step 4 — the domain (10 min, Brandon)

Yes — `os.creativeimpactmedia.co` rides your existing domain. No new purchase.

1. Vercel → the project → **Settings → Domains** → add
   `os.creativeimpactmedia.co`. Vercel shows you the record it wants
   (a CNAME).
2. Go wherever `creativeimpactmedia.co`'s DNS lives (the registrar or site
   host — same place Emmanuel's site is managed). Add:
   - Type **CNAME** · Name/Host **os** · Value **cname.vercel-dns.com**
3. Back in Vercel the domain flips to **Valid** within minutes (worst case an
   hour). Done: **https://os.creativeimpactmedia.co** is the OS.

## What "base level" means day one

- Cockpit, pipeline, clients, invoices (no pay links yet), proposals,
  scheduling, KPIs, expenses, shoots, partner desk — all live and synced.
- The board starts **empty by design** — no demo numbers ever ship to the real
  database. The Wire stays quiet until real agent runs report in.
- Public booking (`/go/book`) works and files leads to your roster; the
  notification email waits on Resend.
- `/diagnostic` page renders but checkout says "isn't configured yet" until
  Stripe exists. `/fleet` shows the 44-unit placeholder roster.

## Add-later checklist (each is just env vars + a dashboard)

1. **Resend** (email: booking alerts, Anchor drafts, client threads) — new
   Resend account, verify `os.creativeimpactmedia.co`, keys per
   `.env.local.example`. Also create the `hello@creativeimpactmedia.co`
   mailbox/forwarder you and Emmanuel both read.
2. **Stripe** — once the Creative Impact bank account exists: separate Stripe
   account, `STRIPE_SECRET_KEY` = the **sk_live_** secret key (NOT an `mk_`
   management key — that mistake cost Churlish a day) + `STRIPE_WEBHOOK_SECRET`.
3. **Facebook leads**, **Android APK**, **Clarity bridge** — per
   `.env.local.example`, whenever wanted.
