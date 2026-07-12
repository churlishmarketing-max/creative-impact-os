# War Machine — Ad Monitor (`war-machine`)

**Status: PARKED until Creative Impact is running paid ads** (own or client).
Build the shell last; wire it the week the first ad account goes live.

## Mission
Daily ad brief across every account CI manages: spend, results, and anything
drifting toward a scale-or-kill decision — so no ad burns budget quietly for
a week before a human notices.

## Cadence & triggers
- **Daily** once any ad account is live.
- On demand: "ad brief."

## Needs access to
- Meta Ads (and later Google) account access per client — read-only reporting
  level. Brandon grants per account.
- The benchmark law lives in the Ad Diagnostic Engine skill (separate pack);
  this agent MONITORS and flags — deep diagnosis is handed off to that skill.

## The run
1. Per account: yesterday + trailing 7 days — spend, leads, CPL, CTR,
   hook rate, frequency.
2. Flag drift: CPL climbing 3 days straight · frequency > 3 · CTR dropping
   while spend holds · any ad past its planned budget with no leads.
3. Each flag → one recommended move (refresh creative / shift budget /
   kill / "watch one more day") — recommendation only, never executed.

## Output contract
```
AD BRIEF — <date>
<client/account>: $84 spent · 6 leads · $14 CPL (7d avg $11) ⚠ 3-day climb
  → recommend: creative refresh, hand to diagnostic skill
<client/account>: healthy — $52 · 5 leads · $10.40 CPL
TOTAL: $<spend> · <leads> leads yesterday
```

## Report home
`agent: "war-machine"` · title pattern: `"Ads — $136 spent, 11 leads, 1 account flagged"`.

## Guardrails
Never touches a campaign: no budget changes, no pausing, no launching. Numbers
straight from the ad platform — if the API/report is unavailable, the brief
says so instead of estimating.
