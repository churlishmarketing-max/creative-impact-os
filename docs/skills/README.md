# Creative Impact — Skill Pack #1

Two skills, ported from the Churlish fleet and rebuilt for Creative Impact
(Brandon King + Emmanuel Bibbs, Charlotte NC).

| Skill | Was | Owns |
|---|---|---|
| **Robbie Robertson** | Perry White | The email desk — every one-off, high-stakes email, plus the Desk Law that gates all fleet email |
| **Kate Bishop** | Starfire | Social media director — calendar, drafting, design, AI imagery, the Approval Inbox, publishing, the Friday scoreboard |

Both names follow the Creative Impact fleet's Marvel convention. Robbie
Robertson ran the Daily Bugle city desk — Perry White's Marvel counterpart, so
the persona transfers exactly.

---

## What changed in the port

**Business context.** Churlish Media / Omaha → Creative Impact / Charlotte. The
Churlish offer ladder → CI's ladder (Audit free → Diagnostic $750 → Pilot
$2,400 → Engine $3,500/mo 3-mo min → Domination $6,000/mo). Contact is
`hello@creativeimpactmedia.co` throughout.

**Two founders, not one.** Every approval gate now reads *"either Brandon or
Emmanuel can approve."* One founder's sign-off is sufficient; neither skill
waits on the second. Sign-off blocks and signatures updated to match — whoever
signs is whoever approved.

**Voice law inlined.** Both skills declared `churlish-voice-guard` as a hard
dependency. Creative Impact has no equivalent yet (the fleet roster reserves
that slot as "Daredevil," unbuilt), so the essential law — banned words, banned
CTAs, the one-CTA rule, the read-it-aloud test — is written **into each skill**.
They work standalone today. When Daredevil ships, extract it and defer to it.

**Design law = the broadcast palette.** Kate Bishop enforces navy `#0a1322` /
gold `#ffb81c` / white `#f4f7fc`, alert red `#ff3040` **once per composition**,
Oswald + Archivo. ⚠️ **This is flagged inside the skill as unratified** —
Emmanuel is the visual director, and if he sets a different public-facing brand
kit, his kit replaces the table. Kate raises it on first run.

**Fleet names remapped.** Blue Beetle→Falcon · Red Robin→Spider-Man · Iris
West→Ben Urich · Guardian→Luke Cage · Cassandra Cain→Echo · Martian
Manhunter→Professor X · Oracle→Maria Hill · Huntress→Black Widow ·
Pennyworth→Anchor · Watchtower→The Watcher · EVE→FRIDAY. Matches the roster
already seeded in the OS.

**No synthetic character roster.** Churlish's Mari/Khari/Cam bibles are gone.
Creative Impact's imagery comes from real capture-day footage of real Charlotte
owners — the image doctrine now says plainly: never generate a synthetic person
to stand in for a real client. The character-consistency craft is kept for the
day CI ever builds a roster.

**Fleet reporting added.** Both skills end every run by POSTing to the OS at
`/api/fleet/ingest`, so their work shows on the `/fleet` dashboard and the
ticker — same contract as the rest of the fleet.

---

## Installing

Each folder is a complete skill: a `SKILL.md` plus its `references/`.

1. Drop `robbie-robertson/` and `kate-bishop/` into your skills directory
   (alongside the other installed skills — the same place `fable-mind`,
   `perry-white` etc. live).
2. Restart the Claude session so the skills are re-scanned.
3. Test each one:
   - *"Run Robbie — a prospect just replied asking what it costs."*
   - *"Kate, draft this week's batch for Creative Impact's IG."*

Keep folder names exactly as-is — the `name:` in each SKILL.md front matter
must match its folder.

**Which account?** Install these in the **Creative Impact** Claude account
(the separate one), not the personal Churlish account. That keeps the two
businesses' fleets from bleeding into each other.

---

## Registering them on the OS fleet page

Optional but recommended — it makes both units appear on
`os.creativeimpactmedia.co/fleet` alongside the rest of the roster. Requires
`FLEET_INGEST_SECRET` to be set in Vercel first.

Run these from PowerShell, swapping in the secret:

```powershell
$secret = "<FLEET_INGEST_SECRET>"
$uri = "https://os.creativeimpactmedia.co/api/fleet/roster"
$hdr = @{ "x-os-secret" = $secret }

$robbie = @{ action="upsert"; unit=@{
  key="robbie-robertson"; name="Robbie Robertson"; alias="The Email Desk";
  division="production"; loc="WS";
  job="Every one-off, high-stakes email — replies, revivals, objections, collections, escalations. Owns the Desk Law that gates all fleet email.";
  triggers="run Robbie · write an email · reply to this · they ghosted · chase this invoice" } } | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json" -Headers $hdr -Body $robbie

$kate = @{ action="upsert"; unit=@{
  key="kate-bishop"; name="Kate Bishop"; alias="Social Media Director";
  division="fleet"; loc="WS"; schedule="Weekly · Monday batch, Friday scoreboard";
  job="Owns organic social end-to-end: calendar, drafting, design, AI imagery, the Approval Inbox, publishing, the Friday scoreboard.";
  triggers="run Kate · draft this week's posts · approval inbox · social scoreboard" } } | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json" -Headers $hdr -Body $kate
```

Both should return `ok : True`.

---

## Known gaps — deliberate, not oversights

- **Daredevil (voice law) isn't built.** The essentials are inlined in both
  skills instead. Building it properly needs Brandon and Emmanuel to define
  Creative Impact's actual voice — worth doing, but not guessable.
- **The brand kit is unratified.** See the design-law note above.
- **Canva templates don't exist yet.** Kate stops and names the gap rather than
  shipping off-brand — setup step 1 in her checklist.
- **No client voice files.** `professor-x` (the voice forge) isn't built, so
  drafting for a client account runs on inferred voice — both skills flag this
  out loud rather than pretending otherwise.
