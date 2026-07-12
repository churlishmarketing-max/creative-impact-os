# OS Integration — how every agent phones home

Two endpoints, one shared secret. Both live on the OS:
base URL `https://os.creativeimpactmedia.co` (until the domain lands, use
`https://creative-impact-os.vercel.app` — same app).

**Auth:** every request carries the header `x-os-secret: <SECRET>` where
`<SECRET>` is the value of `FLEET_INGEST_SECRET` in the OS's Vercel env
(Brandon shares it with you via password manager). Keep it in a local secrets
file on your rig (e.g. `~/.creative-impact/os-secret`), never hardcoded in a
skill or committed to a repo.

---

## 1. Run reports — POST /api/fleet/ingest

Every agent ends EVERY run with this call. It lands in `fleet_reports`
(powering the `/fleet` dashboard cards + history) and drops a line on the
OS's live ticker, tagged with the agent's initials.

```bash
curl -s -X POST https://os.creativeimpactmedia.co/api/fleet/ingest \
  -H "Content-Type: application/json" \
  -H "x-os-secret: $OS_SECRET" \
  -d '{
    "agent": "maria-hill",
    "title": "Inbox triage — 14 threads, 2 need Brandon",
    "summary": "The full run report — findings, actions taken, what needs an operator. Same content you would hand Brandon face to face.",
    "payload": { "optional": "structured data for later" },
    "run_at": "2026-07-12T13:00:00Z"
  }'
```

Rules:
- `agent` — the unit's kebab-case roster key (lowercase; see each brief).
- `title` — one line, **must carry a number** ("14 threads, 2 escalations").
  Max 200 chars.
- `summary` — the real report, max 20,000 chars. No filler.
- `payload` — optional JSON blob for structured data. `run_at` optional ISO
  timestamp (defaults to now).
- Escape quotes properly, or write the JSON to a temp file and use `-d @file`.
- If the POST fails, say so in your final output and retry **once**, never more.

Responses: `{ ok: true }` on success · 403 = wrong secret · 400 = missing
agent/content or the OS isn't configured yet.

## 2. Roster sync — POST /api/fleet/roster

Whenever a unit is created, renamed, rescoped, or retired, sync the OS
manifest so `/fleet` never drifts from reality:

```bash
# create or update
curl -s -X POST https://os.creativeimpactmedia.co/api/fleet/roster \
  -H "Content-Type: application/json" -H "x-os-secret: $OS_SECRET" \
  -d '{"action":"upsert","unit":{"key":"maria-hill","name":"Maria Hill","alias":"Comms Triage","division":"fleet","job":"Daily inbox brief — what matters, what waits, what needs the operator.","triggers":"daily schedule · \"run comms triage\"","schedule":"Daily","loc":"CC"}}'

# retire
curl -s -X POST https://os.creativeimpactmedia.co/api/fleet/roster \
  -H "Content-Type: application/json" -H "x-os-secret: $OS_SECRET" \
  -d '{"action":"remove","key":"old-unit-key"}'
```

Field limits: key ≤60 (kebab-case), name ≤120, alias ≤120, job ≤600,
triggers ≤300, schedule ≤80. `division` ∈ command · war-rooms · fleet ·
production · systems · clients. `loc` ∈ WS · CC · OS.

## 3. Test the bridge (do this first, before building anything)

```bash
curl -s -X POST https://os.creativeimpactmedia.co/api/fleet/ingest \
  -H "Content-Type: application/json" -H "x-os-secret: $OS_SECRET" \
  -d '{"agent":"bridge-test","title":"bridge test — 1 ping","summary":"If Brandon can read this on /fleet, the bridge works."}'
```

Brandon confirms it appears at `os.creativeimpactmedia.co/fleet` under the
Live Run Feed. Then you're clear to build.

## The report-home block (paste at the end of every agent's instructions)

> ## Report home (always, last step of every run)
> When the run is complete, POST the run report to Creative Impact OS
> (`/api/fleet/ingest`, header `x-os-secret` from the local secrets file).
> `agent` = this unit's roster key. `title` = one-line headline **with
> numbers**. `summary` = the full report — findings, actions, what needs an
> operator. If the POST fails, mention it in the final message; retry once, max.
