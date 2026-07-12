# Wiring the Clarity Engine (Lovable) into Creative Impact OS

The OS side is live: `clarity_sessions` table, signed ingest webhook, checkout
email-matching, opt-in intake prefill, agent enrichment, and the E0 upsell
email (+24h). The Lovable app just needs to phone home. Two changes, both made
by telling Lovable's AI what to do.

## 1. Set the shared secret

In Vercel, add `CLARITY_WEBHOOK_SECRET` = a long random string. Remember it —
Lovable sends the same value.

## 2. Tell Lovable to call the webhook

Prompt for the Lovable editor (paste, adjusting the field names to whatever the
project actually calls them):

> When a user completes the Clarity Engine interview and their results are
> generated, POST the session to
> `https://os.creativeimpactmedia.co/api/clarity/ingest` with header
> `x-clarity-secret: <THE SECRET>` and JSON body:
> `{ "external_id": <the session's unique id>, "email": <the user's email>,
>    "answers": <the full interview answers object>,
>    "board_read": <the generated board result object>,
>    "created_at": <session timestamp ISO> }`
> Fire it once per completed session (retry once on failure). Don't block the
> user's results screen on it.

Also add the upsell block to the results screen + PDF final page (copy is in
`clarity-engine-integration.md` §5A — use it verbatim, CTA links to
`https://os.creativeimpactmedia.co/diagnostic`).

## 3. Backfill old sessions (optional)

Export existing sessions from the Lovable project's Supabase (Table Editor →
export CSV), then re-POST each row to the same webhook (or hand me the CSV and
I'll write the one-time import).

## 4. Configure the prefill field map (REQUIRED before prefill activates)

The OS never guesses the Clarity Engine's field names (spec §2). Once sessions
are syncing, open one in Supabase (`clarity_sessions.answers`), note the real
keys, then set the map in `app_state.ops.__clarity_map` — intake field →
clarity answer key:

```json
{ "market": "their_market_key", "why_us": "their_positioning_key",
  "proof": "their_proof_key", "ideal_customer": "their_avatar_key",
  "objection": "their_objection_key", "opening_line": "their_hook_key",
  "cta": "their_cta_key", "industry": "their_industry_key" }
```

(Ask Claude Code in a Creative Impact OS session to inspect a synced session and set
the map — 5 minutes.) Until the map exists, prefill silently stays off; Step 2
ad-account numbers NEVER prefill regardless.
