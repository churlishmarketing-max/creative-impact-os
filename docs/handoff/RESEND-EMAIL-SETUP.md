# Turning on email — Resend, step by step

For Brandon. No code. About **1–2 hours of clicking, then a wait** for DNS to
propagate. This is Roadmap item #3 — the biggest silent failure in the system.
Right now a prospect can book an Authority Audit and **nobody is told.** This
fixes that, and it also switches on signed-proposal alerts, onboarding
auto-responses, the 3-day nudge, and every Anchor draft.

---

## First, the mental model (read this — it saves confusion later)

Two different things, often mixed up:

- **Resend** is the *sending* service. It's the mail room that puts Creative
  Impact's outgoing email on the internet. It does **not** give you an inbox.
- **`hello@creativeimpactmedia.co`** is a *receiving* mailbox — a real inbox a
  human logs into. It does **not** exist yet (that's Roadmap #4, a separate
  Google Workspace or Zoho step). Every notification is BCC'd to it.

You can finish Resend and start getting booking alerts **before** the mailbox
exists, as long as the BCC address is some inbox you can actually read (your
Gmail works as a stand-in until `hello@` is real).

**Sending happens from a subdomain on purpose.** The OS sends as
`hello@os.creativeimpactmedia.co` (note the `os.`), not the bare
`creativeimpactmedia.co`. That protects the main domain's reputation — cold
outreach and transactional mail never share a sender. Don't change this without
a reason.

---

## Before you start

1. **A brand-new Resend account.** Resend's free tier allows **one** verified
   domain, and Churlish already used theirs on the old account. Creative Impact
   needs its **own** account. Sign up with the Creative Impact email (ideally
   the `hello@` mailbox once it exists, or your Gmail for now).
2. **Access to DNS** for `creativeimpactmedia.co` — wherever the domain is
   managed (the registrar or Cloudflare). You'll be adding a handful of records.
   If Emmanuel or someone else controls DNS, get them on the call.
3. **Access to Vercel** for the `creative-impact-os` project (to add the keys).

---

## Step 1 — Create the Resend account (10 min)

1. Go to **resend.com** and sign up. Verify your email, log in.
2. You'll land on the dashboard. Ignore the "send your first email" quickstart —
   we're wiring the domain, not sending a test from their playground.

## Step 2 — Add and verify the sending domain (20 min clicking + up to a few hours waiting)

This is the only fiddly part. Take it slowly.

1. In Resend, go to **Domains → Add Domain**.
2. Enter exactly:  `os.creativeimpactmedia.co`
   - Yes, with the `os.` in front. That's the subdomain we send from.
   - Pick the region closest to Charlotte if asked (**US East**).
3. Resend now shows you a **table of DNS records** — usually one **MX**, one or
   two **TXT** (SPF + DKIM), and an optional **DMARC** TXT. **These values are
   generated for your domain — copy them from Resend, don't invent them.**
4. Open your DNS provider in another tab. For **each** record Resend lists, add
   a matching record: same **Type**, same **Name/Host**, same **Value**,
   same **Priority** (for the MX one).

   **The #1 mistake — the Name/Host field.** Because we're verifying a
   *nested* subdomain (`os.creativeimpactmedia.co`), the host names look long.
   Resend might show a record for `send.os.creativeimpactmedia.co`. Depending on
   your DNS provider, you type that into the Host box as either:
   - the full `send.os.creativeimpactmedia.co`, **or**
   - just `send.os` (the provider adds `.creativeimpactmedia.co` for you).

   Get this wrong and it silently never verifies. If unsure, add it **both**
   ways is *not* safe — instead, check one existing record to see which style
   your provider uses (does your current `os` record show as `os` or
   `os.creativeimpactmedia.co`?) and match that style.
5. Save the records at the DNS provider. Then in Resend click **Verify**.
6. It may say "pending" — that's normal. DNS can take anywhere from 5 minutes to
   a few hours. Grab coffee, click **Verify** again later. When every row goes
   green, the domain is live.

> **Do not touch the existing `os.creativeimpactmedia.co` web record** (the A or
> CNAME that makes the app load). Email records (MX/TXT on `send.os…` and
> `resend._domainkey.os…`) sit alongside it and don't affect the website.

## Step 3 — Create the API key (2 min)

1. In Resend: **API Keys → Create API Key.**
2. Name it `creative-impact-os`. Permission: **Sending access** is enough.
3. Copy the key (starts with `re_`). **You see it once.** Paste it straight into
   the Vercel step below (or your password manager) — never into a chat, a file
   in the repo, or an email.

## Step 4 — Add the keys in Vercel and redeploy (10 min)

1. Go to **Vercel → the `creative-impact-os` project → Settings → Environment
   Variables.**
2. Add these, one at a time (Name on the left, Value on the right). Set the
   environment to **Production** (and Preview if you want test deploys to send):

   | Name | Value |
   |---|---|
   | `RESEND_API_KEY` | the `re_…` key from Step 3 |
   | `EMAIL_FROM` | `Creative Impact <hello@os.creativeimpactmedia.co>` |
   | `EMAIL_BCC` | `hello@creativeimpactmedia.co` (or your Gmail until that mailbox exists) |

   Those three names are exact — the code reads them by these names. A typo
   means email silently stays off.
3. **Redeploy.** Env vars only take effect on a new deployment: **Deployments →
   the latest one → the ⋯ menu → Redeploy.** Wait for it to finish (green).

## Step 5 — Test with a real booking (10 min)

1. Open your live booking link (from the cockpit: **13 SCHEDULING → copy link**).
2. Book a slot as if you were a prospect — use an email you can check.
3. Within a minute you should get **two** emails:
   - one to the **prospect** address ("You're booked in") with a **calendar
     invite attached**, and
   - one to the **operator** (`EMAIL_BCC`) with the full lead details.
4. Open the attached invite on your phone — it should drop the call onto your
   calendar **in your own local time**. (Book a 2:00 PM Charlotte slot and an
   operator in Omaha sees 1:00 PM — that conversion is automatic.)

If nothing arrives, jump to Troubleshooting.

---

## Later — inbound replies (Roadmap #20, not now)

When you want client replies to file back into the CRM thread, you add two more
Vercel vars and one webhook. **Skip until the basics above work.**

| Name | Value |
|---|---|
| `EMAIL_REPLY_TO` | `crm@in.creativeimpactmedia.co` |
| `RESEND_WEBHOOK_SECRET` | `whsec_…` from the Resend webhook you create for the `email.received` event |

Inbound also needs an **MX record on a separate `in.` subdomain** pointing at
Resend's inbound host — the exact value comes from Resend's Inbound setup screen.
Do this as its own task with the roadmap open.

---

## Troubleshooting

- **Domain won't verify after a few hours.** Almost always the Name/Host style
  (Step 2, item 4). Re-check that the host matches how your provider displays
  other records. Also confirm you didn't paste a trailing space into the Value.
- **No email at all after a real booking.** Check Vercel: are all three var
  names spelled exactly right, and did you **redeploy** after adding them? The
  code no-ops silently when `RESEND_API_KEY` is missing — by design, so a
  half-configured system doesn't throw errors at prospects.
- **Prospect email lands in spam.** Add the optional **DMARC** record from
  Step 2 if you skipped it (`_dmarc.os…` → `v=DMARC1; p=none;`), and send a few
  real ones — reputation warms up with volume.
- **You see the emails but the operator copy doesn't arrive.** `EMAIL_BCC` is
  pointing at a mailbox that doesn't exist yet. Point it at your Gmail until
  `hello@creativeimpactmedia.co` is real (Roadmap #4).

---

## What this unblocks once it's green

Booking alerts · signed-proposal notifications · onboarding auto-responses ·
the 3-day nudge · every Anchor draft that emails a client · the daily cron
(Roadmap #18) stops silently no-op'ing. It does **not** create the `hello@`
inbox — that's still Roadmap #4.
