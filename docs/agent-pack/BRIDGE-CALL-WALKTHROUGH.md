# Fleet Bridge — Phone Call Walkthrough

**Who's on the call:** Brandon (owns the OS / Vercel) + Ja'Rel (builds the agents).
**Goal:** open the connection so Ja'Rel's agents report into the OS fleet dashboard.
**Time:** ~15 minutes.
**Done when:** a test line from Ja'Rel appears on Brandon's `/fleet` page.

Nothing here is risky or hard to undo. The worst case is a typo in a password,
and you'll know immediately because the OS will say so.

---

## BEFORE THE CALL — Brandon only (2 min)

1. Open your password manager → create a new item called
   **"Creative Impact OS — Fleet Secret."**
2. Use its password generator: **40+ characters**, letters and numbers.
   (Avoid symbols like `'` `"` `$` — they can confuse command lines.)
3. Save it. Do NOT text or email it yet — that happens on the call, securely.

You never type this secret into a chat window, a document, or a website other
than Vercel.

---

## PART 1 — Brandon adds the secret to Vercel (5 min)
*Ja'Rel: just listen, nothing for you yet.*

1. Go to **vercel.com** and sign in.
2. Click the project **creative-impact-os**.
3. Top nav: **Settings**.
4. Left sidebar: **Environment Variables**.
5. In the **Key** field type exactly: `FLEET_INGEST_SECRET`
   - All caps, underscores, no spaces. Typos here are the #1 failure.
6. In the **Value** field: paste the secret from your password manager.
7. Leave **Production / Preview / Development** all checked.
8. Click **Save**.

**Say out loud:** "Secret saved."

## PART 2 — Brandon redeploys (2 min)
Environment variables do nothing until a fresh deploy. This step is not optional.

1. Top nav: **Deployments**.
2. Find the newest deployment at the top of the list.
3. Click the **⋯** (three dots) on its right side → **Redeploy**.
4. A dialog appears → click **Redeploy** to confirm.
5. Wait for the status dot to turn **Ready** (about 1–2 minutes).

**Say out loud:** "Deploy is Ready."

## PART 3 — Confirm the bridge is armed (1 min)
Brandon: tell Claude "the secret is set" and it will probe the endpoint from
outside and confirm. You're looking for the answer to change from
`not_configured` to `unauthorized` — that means the lock now exists and is
correctly rejecting anyone without the key.

*(If you're not in a Claude session: skip this, Part 5 proves it anyway.)*

## PART 4 — Brandon sends Ja'Rel the secret, securely (2 min)

Use your password manager's share feature:
- **1Password:** open the item → **Share** → set expiry (1 day) → copy link.
- **Bitwarden:** **Send** → paste the secret → set expiry → copy link.
- **LastPass / Dashlane:** any "share item" / "one-time link" feature.

Send Ja'Rel the **link** (text/Slack is fine — the link is the protection, and
it expires). Never send the raw secret itself in a message.

**Ja'Rel:** open the link, copy the secret, store it wherever your Cowork
skills read secrets from. Never paste it into a skill file, a repo, or a doc.

## PART 5 — Ja'Rel runs the bridge test (3 min)

Ja'Rel: run this from a Claude Cowork session (Bash) or your own terminal.
Replace `PASTE_SECRET_HERE` with the real value:

```bash
curl -s -X POST https://os.creativeimpactmedia.co/api/fleet/ingest \
  -H "Content-Type: application/json" \
  -H "x-os-secret: PASTE_SECRET_HERE" \
  -d '{"agent":"bridge-test","title":"bridge test — 1 ping","summary":"If Brandon can read this on the fleet page, the bridge works."}'
```

*(On Windows PowerShell the single quotes behave differently — easiest fix is
to run it from Git Bash / WSL, or from a Cowork Bash session.)*

**Read the response out loud to Brandon:**

| What you see | What it means | What to do |
|---|---|---|
| `{"ok":true}` | **Success.** Go to Part 6. | Nothing — celebrate |
| `{"ok":false,"error":"unauthorized"}` | Secret doesn't match | Re-copy it; check for a trailing space at either end |
| `{"ok":false,"error":"not_configured"}` | Vercel var missing or no redeploy | Brandon: recheck Parts 1 & 2 (spelling + Redeploy) |
| `{"ok":false,"error":"no_owner"}` | Database has no owner row | Stop — tell Claude, it's a setup issue |
| Nothing / connection error | Wrong URL or offline | Check the URL is exactly as written above |

## PART 6 — Brandon confirms it landed (2 min)

1. Go to **https://os.creativeimpactmedia.co** and log in.
2. Click tab **05 AGENT FLEET** → button **⚡ LIVE RUN REPORTS**
   (or go straight to `https://os.creativeimpactmedia.co/fleet`).
3. Look at the **LIVE RUN FEED** at the bottom. You should see
   **bridge-test — bridge test · 1 ping** with a timestamp.

**Expected and fine:** `bridge-test` also shows under
**"⚠ Reporting but not on the roster."** That's correct — `bridge-test` is a
throwaway name, not a real registered unit. Real agents won't do this as long
as their name matches their roster key.

**Say out loud:** "I see it." — the bridge is open. You're done.

---

## PART 7 — What happens from here (no action today)

- Ja'Rel builds agents in the order in `START-HERE.md`:
  **Maria Hill** (daily inbox brief) first, then Black Widow, Jessica Jones,
  Ironheart, Speed.
- Every agent ends every run with the same POST — just with its own
  `agent` key, a real `title` (with numbers), and a real `summary`.
- Those runs appear on Brandon's `/fleet` page and on the OS ticker
  automatically. No further setup, ever.
- **Rule to remember:** an agent's `agent` value must match its roster `key`.
  If Ja'Rel renames a unit, he syncs the roster first (`/api/fleet/roster`,
  see `INTEGRATION.md`) so it lands on its own card instead of the warning list.

## Blockers Brandon still owes, per agent

- **Maria Hill** needs read access to the `hello@creativeimpactmedia.co`
  mailbox — that mailbox doesn't exist yet (it comes with the Resend/email
  build). Ja'Rel can build the agent's logic before then, but it can't run
  live until the inbox exists.
- **Black Widow v2** (reading the OS board directly) needs a **read-only**
  Supabase key from Brandon. v1 works without it — Brandon pastes the board in.
