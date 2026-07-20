# Fleet Bridge — Setup Walkthrough (in-house PC)

**Setup:** Ja'Rel builds the Creative Impact fleet on Brandon's second PC,
in a Claude account Brandon owns.
**Goal:** open the connection so those agents report into the OS fleet dashboard.
**Time:** ~30 minutes (most of it account setup, done once).
**Done when:** a test line appears on the `/fleet` page of the OS.

Nothing here is risky or hard to undo. The worst case is a typo, and the OS
tells you exactly which one.

---

## STEP 0 — The account decision (do this first)

**Create a NEW Claude account for Creative Impact.** Brandon owns the email,
password, and recovery. Ja'Rel signs into that account on the second PC.

**Do NOT use Brandon's personal Claude account.** It holds all of Churlish
Media — the fleet, client avatars, financials, chat history. A separate CI
account keeps Churlish walled off, keeps the fleet in Brandon's control, and
makes the subscription a clean Creative Impact expense to split with Emmanuel.

Suggested login: an address on the Creative Impact domain (e.g.
`os@creativeimpactmedia.co` — same one used for the OS login, or a dedicated
one). Store the credentials in Brandon's password manager.

> Heads up: agent work needs a paid Claude plan. Budget that as a Creative
> Impact operating cost, not a personal one.

---

## STEP 1 — Prep the second PC (10 min, Brandon)

1. **Give Ja'Rel his own Windows user account** on that PC:
   Settings → Accounts → Other users → **Add account**.
   Keeps his work separate from Brandon's files. Standard user is fine.
2. Sign in as that user, open a browser, go to **claude.ai**.
3. Sign in with the **Creative Impact** Claude account from Step 0.
4. Confirm it's the right account — it should be empty, with none of the
   Churlish projects or chat history in the sidebar. If you see Churlish
   work, you're in the wrong account. Sign out and try again.

## STEP 2 — Put the secret on that PC (5 min, Brandon)

Because the PC is in your house, **Ja'Rel never has to handle the raw secret.**
You type it in once, yourself.

1. In your password manager, generate a **40+ character** password
   (letters and numbers; skip symbols like `'` `"` `$` — they break command
   lines). Save it as **"Creative Impact OS — Fleet Secret."**
2. On the second PC, signed in as Ja'Rel's user, open **Notepad**.
3. Paste the secret — nothing else, no quotes, no label, no trailing spaces.
4. Save as: `C:\Users\<Ja'Rel's username>\.creative-impact\os-secret.txt`
   (create the `.creative-impact` folder first; in the Save dialog set
   "Save as type" to **All Files** so it doesn't become `.txt.txt`).
5. Tell Ja'Rel: "the secret is in that file — read it from there, never copy
   it into a skill or a repo."

## STEP 3 — Add the secret to Vercel (5 min, Brandon)

The same value has to exist on the OS side, or it will reject every report.

1. **vercel.com** → sign in → project **creative-impact-os**.
2. Top nav **Settings** → left sidebar **Environment Variables**.
3. Key: `FLEET_INGEST_SECRET` — all caps, underscores, no spaces.
   *(Typos here are the #1 failure.)*
4. Value: paste the same secret from Step 2.
5. Leave Production / Preview / Development all checked → **Save**.

## STEP 4 — Redeploy (2 min, Brandon)

Environment variables do nothing until a fresh deploy. Not optional.

1. Top nav **Deployments**.
2. Newest deployment at the top → **⋯** (three dots) → **Redeploy** → confirm.
3. Wait for **Ready** (1–2 minutes).

## STEP 5 — Test the bridge from that PC (3 min)

On the second PC, open **PowerShell** (Start → type "PowerShell") and paste
this whole block. It reads the secret from the file — nothing to retype:

```powershell
$secret = (Get-Content "$env:USERPROFILE\.creative-impact\os-secret.txt" -Raw).Trim()
$body = @{
  agent   = "bridge-test"
  title   = "bridge test - 1 ping"
  summary = "If this shows on the fleet page, the bridge works."
} | ConvertTo-Json
Invoke-RestMethod -Uri "https://os.creativeimpactmedia.co/api/fleet/ingest" `
  -Method Post -ContentType "application/json" `
  -Headers @{ "x-os-secret" = $secret } -Body $body
```

**What you should see:** `ok : True`

| If you see instead | What it means | Fix |
|---|---|---|
| `unauthorized` (403) | Secret in the file ≠ secret in Vercel | Recheck Step 2 vs Step 3 — usually a stray space |
| `not_configured` (400) | Vercel var missing, or no redeploy | Recheck Steps 3 & 4 |
| `no_owner` (400) | Database has no owner row | Stop — ask Claude, it's a setup issue |
| "Cannot find path" | Secret file isn't where Step 2 put it | Check the filename — likely saved as `.txt.txt` |
| Connection error | Wrong URL or offline | Compare the URL character by character |

## STEP 6 — Confirm it landed (2 min, Brandon)

1. Go to **https://os.creativeimpactmedia.co** and log in.
2. Tab **05 AGENT FLEET** → **⚡ LIVE RUN REPORTS**
   (or go straight to `/fleet`).
3. In the **LIVE RUN FEED**, you should see **bridge-test** with a timestamp.

**Expected, not a bug:** `bridge-test` also appears under
**"⚠ Reporting but not on the roster."** That's correct — it's a throwaway
name, not a registered unit. Real agents land on their own cards as long as
their name matches their roster key.

The bridge is open. Everything after this is just building agents.

---

## What's different now that the fleet is in-house

- **Ownership solved.** The agents live in a Claude account Brandon controls.
  Still worth committing each finished agent's instructions to the repo
  (`docs/agent-pack/built/`) so they survive account changes too.
- **The secret never travels.** No password-manager share links, no expiring
  sends. It lives in one file on one machine.
- **Data access is simpler.** When Maria Hill needs the `hello@` inbox or
  Black Widow needs a read-only board key, those credentials live on a machine
  in Brandon's house rather than a contractor's laptop.
- **Billing is clean.** One CI subscription, a Creative Impact expense.

## Still owed before certain agents can run live

- **Maria Hill** needs the `hello@creativeimpactmedia.co` mailbox to exist —
  it doesn't yet (it arrives with the Resend/email build). The agent can be
  built now; it just can't run live until the inbox is real.
- **Black Widow v2** needs a **read-only** Supabase key from Brandon.
  v1 works without it — Brandon pastes the board in.
