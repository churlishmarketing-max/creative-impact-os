# Creative Impact OS — Stage 1

The Command Center cockpit, turned into a real, single-user web app. Same design
as the mockup; the numbers now live in a real database (Supabase), it's behind a
login, and it syncs across your phone and laptop.

**Scope:** Stage 1 is "real but manual." No agent integrations, no external APIs,
no auto-updating feed — that's the January project.

---

## What's here

```
app/
  cockpit/Cockpit.jsx   the cockpit, ported 1:1 from the mockup (do not redesign)
  cockpit.css           fonts (Oswald / Archivo) + broadcast keyframes
  login/page.tsx        the single sign-in screen
  page.tsx              the gated home (the cockpit)
lib/
  store.js              data layer — Supabase in real mode, localStorage in dev
  supabase/client.ts    browser Supabase client
proxy.ts                locks the WHOLE app behind login
supabase/
  SETUP_CREATIVE_IMPACT.sql  ONE-SHOT setup: paste this single file (after creating your auth user)
  schema.sql … 16 + seed.sql  the same setup as individual, ordered migrations
.env.local.example      copy to .env.local and paste your Supabase keys
```

Money is stored as integer **cents**. Countdowns, %-of-target, open pipeline,
coverage, and the Tripwire all compute themselves — you never type them.

---

## Setup (do these in order — every step is a free signup)

### 1. Supabase (your database + login)
1. Go to **https://supabase.com** -> **Start your project** -> sign in with GitHub or email.
2. **New project**. Name it `creative-impact-os`, pick a region near you, set a strong
   database password (save it somewhere), click **Create**. Wait ~2 minutes.
3. Left sidebar -> **SQL Editor** -> **New query**. Open `supabase/schema.sql` from
   this project, paste the whole thing in, click **Run**. You should see "Success".
4. Create your login: left sidebar -> **Authentication** -> **Users** -> **Add user**
   -> **Create new user**. Enter your email + a password. Turn ON
   **"Auto Confirm User"** (so you can log in immediately). Click **Create**.
5. Seed the starting numbers: **SQL Editor** -> **New query**, paste all of
   `supabase/SETUP_CREATIVE_IMPACT.sql`, click **Run**.
6. Get your keys: **Project Settings** (gear) -> **API**. Copy:
   - the **Project URL**
   - the **anon / publishable** key (NOT the `service_role` key)

### 2. Connect the app locally
1. In this folder, copy `.env.local.example` to a new file named `.env.local`.
2. Paste your two values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
   ```
3. Start it: `npm install` (first time only) then `npm run dev`.
   Open **http://localhost:3000** -> you'll be sent to the login -> sign in with the
   email/password you created. You should see the cockpit with your seeded data.
4. Test it: change a Friday Five number, refresh — it's still there.
   Add a deal in the Pipeline (**+ ADD DEAL**) — it persists.

### 3. GitHub (holds the code)
1. Go to **https://github.com** -> sign in / sign up.
2. **New repository** -> name it `creative-impact-os` -> **Private** -> **Create**.
3. Back here, push the code (run these in this folder):
   ```
   git init
   git add -A
   git commit -m "Creative Impact OS Stage 1"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/creative-impact-os.git
   git push -u origin main
   ```

### 4. Vercel (the live URL)
1. Go to **https://vercel.com** -> **Sign up** with GitHub.
2. **Add New... -> Project** -> import your `creative-impact-os` repo.
3. Before deploying, open **Environment Variables** and add the same two:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. In ~1 minute you get a live URL (e.g. `creative-impact-os.vercel.app`).
   Open it on your phone, log in, and you'll see the same data. Bookmark it.

---

## Notes
- **Secrets:** your keys live only in `.env.local` (local) and Vercel's env settings
  (live). They are never committed — `.gitignore` blocks `.env.local`.
- **The sys.log ticker** still animates with sample lines for the cockpit feel. It's
  cosmetic and not saved — the real agent-fed log is Stage 2. Say the word to remove it.
- **Without keys**, the app runs in a local-only dev mode (no login, data not synced)
  so the design stays viewable. The live app always uses Supabase.
