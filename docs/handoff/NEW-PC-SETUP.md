# New PC Setup — from nothing to running

For Brandon. Assumes a fresh Windows PC with no developer tools on it.
**Time: about 45 minutes**, most of it downloads.

Read `HANDOFF.md` at the repo root first — it's the state of play.

---

## Before you leave the old PC

**Do these three things or you will be locked out of your own system.**

1. **Push any uncommitted work.** Open the old repo folder and run
   `git push origin main`. Then run `git status -sb` — it must say
   `## main...origin/main` with **no** "[ahead N]".
2. **Write down every credential** (see the recovery list in `HANDOFF.md`).
   Especially the **OS login password** — there is no password-reset link on
   the login page, and the recovery mailbox doesn't exist yet.
3. **Read the Vercel environment variables out** into your password manager.
   Vercel holds the ONLY copy of `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`.
   Vercel → project → Settings → Environment Variables → reveal each → save.

**Do not copy the project folder itself.** You'll clone it fresh — cleaner, and
it avoids dragging 640 MB of machine-specific build junk across.

---

## Step 1 — Install Node.js (10 min)

Node is what runs the app.

1. Go to **nodejs.org**.
2. Download the **LTS** version (currently 22.x). The app requires **Node 20.9
   or newer** — LTS is safely above that.
3. Run the installer. Accept all defaults. Say **yes** if it offers to add Node
   to your PATH.
4. Verify: open **PowerShell** (Start → type "PowerShell") and run:
   ```
   node --version
   ```
   You want `v22.x.x` or at minimum `v20.9.0`. If it says "not recognized,"
   close PowerShell, open a new one, and try again.

## Step 2 — Install Git (5 min)

Git is how the code syncs with GitHub.

1. Go to **git-scm.com/download/win** — the download starts automatically.
2. Run the installer. Accept all defaults (there are many screens; defaults are
   correct for all of them).
3. Verify in a **new** PowerShell window:
   ```
   git --version
   ```
4. Set your identity (this labels your commits):
   ```
   git config --global user.name "Creative Impact OS"
   git config --global user.email "churlishmarketing@gmail.com"
   ```

## Step 3 — Get the code (5 min)

```
mkdir C:\dev
cd C:\dev
git clone https://github.com/churlishmarketing-max/creative-impact-os.git
cd creative-impact-os
```

GitHub will ask you to sign in — a browser window opens, approve it there.

> **Do not put this anywhere inside OneDrive.** `C:\dev` exactly. OneDrive's
> file locking breaks installs and corrupts builds.

> **Zip alternative:** if you'd rather not deal with GitHub sign-in, unzip the
> handoff zip to `C:\dev\creative-impact-os` instead — it includes the full
> history and the GitHub connection, so `git push` will work once you sign in.

## Step 4 — Install the app's dependencies (10 min)

```
npm install
```

This downloads ~385 MB and takes several minutes. Warnings scroll past — those
are normal. You only care about errors at the very end.

> This is the step that creates `node_modules`. If a Claude session ever tells
> you it can't find `node_modules/next/dist/docs/`, this step hasn't run yet.

## Step 5 — Run it (2 min)

```
npm run dev
```

Wait for **Ready**, then open **http://localhost:3000**.

You'll see the OS with **fake demo data** and **no login required**. That is
correct and expected — with no local database credentials, the app runs in
design mode. It is NOT your real board. Your real board is always at
os.creativeimpactmedia.co.

Press **Ctrl+C** in PowerShell to stop it. Or just double-click
`START_PREVIEW.bat` in the project folder to do all of this in one click.

## Step 6 — Install Claude Code (10 min)

This is how you keep building.

1. Install Claude Code (claude.ai/code has current instructions for Windows).
2. Open it and point it at the project folder: `C:\dev\creative-impact-os`.
3. Sign in with the **Creative Impact** Claude account — not your personal
   Churlish one.
4. Test that it inherited the context. Ask it:
   > "Read HANDOFF.md and tell me what's live and what's blocked."

   If it answers with the dormant list (Resend, Stripe, fleet secret), the
   handoff worked and you can pick up exactly where we left off.

---

## Optional — run against the REAL database locally

Only do this if you specifically need to test against live data. Day to day,
design mode (Step 5) is safer and enough.

1. Copy `.env.local.example` to `.env.local` in the project folder.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` from Supabase → Settings → API.
3. Restart `npm run dev`. The login gate switches on and you'll see real data.

**`.env.local` is git-ignored and must never be committed.** And remember:
you're now touching production data from your laptop.

---

## Windows gotchas

- **PowerShell doesn't support `&&`** to chain commands. Run them one line at
  a time, or use Git Bash (installed with Git).
- **`curl` in PowerShell is not real curl** — it's an alias that breaks
  curl syntax. Use `curl.exe`, or the PowerShell-native
  `Invoke-RestMethod` versions given in the agent pack walkthrough.
- **Notepad adds `.txt`** to filenames. When saving files without extensions,
  set "Save as type" to **All Files**.
