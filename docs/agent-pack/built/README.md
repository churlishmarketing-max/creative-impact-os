# Built agents — as installed

These are the agent definitions as actually installed (Claude Code user-level
agents, `~/.claude/agents/`), converted from the briefs in `../agents/` with
frontmatter added. Committed here per the roadmap so the fleet survives any
account, plan, or contractor change.

Status at last commit:
- **jessica-jones, ironheart, speed** — installed, invocable on demand.
- **war-machine, trish-walker** — installed but PARKED per their briefs.
- **maria-hill, black-widow** — NOT yet converted/installed: the installing
  session's permission classifier blocked auto-writing agents that combine
  sensitive access (inbox / financial records) with the phone-home POST.
  Install manually from `../agents/` when ready.

None have run against the bridge yet — `FLEET_INGEST_SECRET` is not set
(roadmap #12) and no `~/.creative-impact/os-secret` file exists on the
install machine. Each agent skips the phone-home and says so until it does.
