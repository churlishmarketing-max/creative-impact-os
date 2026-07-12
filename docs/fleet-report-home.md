# Fleet → OS reporting (the "phone home" step)

The Cowork agents keep running in Claude Cowork. To make their runs appear on
the OS Fleet dashboard (`os.creativeimpactmedia.co/fleet`) and the sys.log ticker, each
agent skill ends its run by POSTing a report to the OS.

## The block to add to each Cowork skill

Paste this at the END of each agent skill's instructions (kid-flash,
blue-beetle, red-robin, watchtower, guardian, iris-west, brother-eye,
cassandra-cain, doctor-mid-nite, martian-manhunter — adjust the agent name
per skill):

> ## Report home (always, last step of every run)
> When the run is complete, POST the run report to Creative Impact OS so it shows on
> the fleet dashboard. Use Bash:
>
> ```
> curl -s -X POST https://os.creativeimpactmedia.co/api/fleet/ingest \
>   -H "Content-Type: application/json" \
>   -H "x-os-secret: <THE SECRET>" \
>   -d '{"agent":"kid-flash","title":"<one-line headline of what this run produced, with numbers>","summary":"<the full run summary — same content you would report to Brandon>"}'
> ```
>
> Rules: `agent` is this skill's kebab-case name. `title` carries a number
> ("38 prospects sourced · 12 tier-one"). `summary` is the real report —
> findings, actions taken, what needs Brandon. Escape quotes properly (or
> write the JSON to a temp file and use `-d @file`). If the POST fails,
> mention it in your final message but never retry more than once.

`<THE SECRET>` = the same value as `CLARITY_WEBHOOK_SECRET` in Vercel (or set
a dedicated `FLEET_INGEST_SECRET` there — the endpoint accepts either).

## What the OS does with it

- Row in `fleet_reports` (agent, title, summary, payload, run_at)
- Line on the sys.log ticker tagged with the agent's initials (KF, IW, GU…)
- The `/fleet` page shows per-agent cards (latest run, run count) + full history

## Testing the bridge

```
curl -s -X POST https://os.creativeimpactmedia.co/api/fleet/ingest \
  -H "Content-Type: application/json" -H "x-os-secret: <THE SECRET>" \
  -d '{"agent":"watchtower","title":"bridge test — 1 ping","summary":"If you can read this on /fleet, the bridge works."}'
```
