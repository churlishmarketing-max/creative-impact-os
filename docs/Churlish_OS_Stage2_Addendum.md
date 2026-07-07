# CHURLISH OS — STAGE 2 ADDENDUM
### Part 11, standalone — drop into the Claude Code brief you already have

> **This is only the new section.** Append it to your existing brief right after Part 10 / the gut-check. Parts 1–10 (Stage 1) are unchanged — nothing else to re-import.

## PART 11 — STAGE 2: THE EVE PANEL + COWORK BRIDGE  (January — after Stage 1 ships)

> ### ⛔ DO NOT BUILD THIS DURING THE SPRINT.
> This entire section is the **reward**, not the task. Build it only when **both** are true: (1) Stage 1 is live and you're using it daily, and (2) the August 31 signing deadline is behind you. This is exactly the build that eats a ten-week window. It is documented here so it's ready in January — not so it gets started in July. If you're reading this before Aug 31, close the file and go hold a call.

When you *are* ready, Stage 2 has three pieces, built in this order: **EVE in the cockpit (text)** → **voice** → **the Cowork bridge / auto-feed.** Same stack as Stage 1 (Next.js + Supabase + Vercel) — this all bolts onto the app you already shipped.

---

### 11A — EVE in the cockpit (the API chat panel)

**What it is:** a chat panel inside the OS where you talk to EVE. She's *board-aware* (she can see your live numbers) and she can *act* (update the board, reach your tools) — not just chat.

**Where it lives:** a new **"EVE" tab** in the left nav, or a slide-out drawer reachable from every module. (Founder OS stays its own tab; EVE is separate.)

**The four wires that make her real:**

1. **System prompt — who EVE is.** Load EVE's persona from an editable file: her voice, the Churlish doctrine, the banned-words list, and the plan context. *(This is a separate deliverable — ask Claude in chat for "EVE's system prompt / persona spec." It's also usable in Cowork today, see 11C.)*
2. **Live context — what she knows.** On every message, inject the current OS state into the prompt: this week's Friday Five, a pipeline summary, the sprint phase, collected-vs-target, and coverage. Pull it from the same Supabase the OS reads, so she answers from the real board instead of guessing.
3. **Tools / function calling — what she can do.** Define functions wired to Supabase so EVE can write, not just talk. Minimum set:
   - `log_friday_five(week, calls_held, offers_out, signed_cents, collected_cents, founder_free_pct)`
   - `add_deal(name, stage, value_cents)` · `update_deal_stage(deal_id, stage)` · `set_deal_value(deal_id, value_cents)`
   - `set_one_thing(title, body)`
   - `add_log_entry(agent_code, message)` · `mark_agent_run(agent_code, status)`

   Each one executes a Supabase write. EVE calls them through the Anthropic API's tool-use, so "log my Friday Five: 4 calls, 3 offers, 8,250 signed, 5,000 collected" becomes a real database update.
4. **MCP connectors — what she can reach.** Wire your existing connectors (HubSpot, Apollo, Slack, Gmail) into EVE's toolset via the API's MCP connector, so "who replied this week?" reads Gmail/HubSpot and "queue these five for Blue Beetle" writes.

**Tech notes (for whoever builds it):**
- The Anthropic API key lives **server-side only** — a Next.js API route (e.g. `/api/eve`). The browser talks to your own endpoint; that endpoint calls Anthropic. Never put the key in the client.
- Use the Messages API with `tools` (and the MCP connector for #4). Pick the model by cost: a Sonnet-class model for everyday speed, an Opus-class model when you want heavier reasoning.
- Stream the responses so it feels live.
- Persist EVE's chat threads in a Supabase `messages` table so the conversation survives a refresh.

**Guardrails:** EVE's writes should be **confirmable** — show what she's about to change, or make board-altering actions take a click. Don't let a hallucinated tool call silently rewrite the board. Log every tool call she makes into the sys.log so there's a trail.

**Done looks like:** you type "log my Friday Five: 4 calls, 3 offers, 8,250 signed, 5,000 collected" → EVE writes it → the Command Center shows it on refresh. You ask "where's my coverage?" → she answers from live data, not a guess.

---

### 11B — Voice (the "speak to EVE" layer)

Add this **only after 11A text chat works.** It's a layer on top, not the foundation.

- Use the browser **Web Speech API**: `SpeechRecognition` to turn your mic into text in EVE's input, `SpeechSynthesis` to read her replies aloud.
- Keep it **push-to-talk** (a mic button) — not always-listening.
- If the built-in browser voices feel robotic, upgrade to a higher-quality TTS via API later. Start with the free browser layer.

---

### 11C — The Cowork bridge (the board feeds itself)

**Goal:** let Cowork — and your agent fleet — read and write the *same* OS database and files, so the numbers and the sys.log update themselves instead of you typing them.

**Two mechanisms (confirmed against current Cowork docs):**
1. **A custom remote-MCP connector pointed at the OS.** Stand up a small MCP server that exposes the same functions EVE uses (`log_friday_five`, `add_deal`, …) over the public internet, then add it in Claude under **Customize → Connectors → +** as a custom connector. **Constraint:** custom connectors are reached from *Anthropic's cloud*, not your local machine, so the server must be reachable over the public internet — Vercel/Supabase already are. Now a Cowork task like "update the pipeline from this week's replies" runs against the live board.
2. **Files.** Point Cowork at the **Vault folder** (it has local file read/write) for the docs and CSV exports.

**The agent fleet as Cowork scheduled tasks / a plugin:**
- Each agent becomes a **scheduled Cowork task** — e.g. *Kid Flash* every morning: pull Apollo via the connector → write tiered leads to the OS DB via the MCP connector. *Blue Beetle*: work the sequences. *Watchtower*: daily audit → write status into the sys.log.
- Bundle your Churlish skills + connectors + sub-agents into a single **Cowork plugin** so Claude shows up as the Churlish operator from the first task.
- **Caveat, stated plainly:** Cowork is **desktop-only, non-syncing, and has to stay awake with the app open** — scheduled tasks only run while your machine is on. So Cowork is the *operator on your desk*; the always-available cloud cockpit is the OS itself, on Vercel. Don't expect Cowork to run the fleet while your laptop's shut.

**Honest unknown:** building a custom MCP server against Supabase is real work, and the custom-connector setup flow changes — confirm the current steps in Anthropic's docs (Customize → Connectors → custom remote MCP) when you start.

---

### 11D — Build order within Stage 2
1. **EVE text panel (11A)** — biggest payoff, lowest risk. Do first.
2. **Voice (11B)** — once text works.
3. **Cowork bridge + fleet automation (11C)** — the auto-feed; most integration risk. Do last.

### 11E — What to ask Claude (in chat) to hand the builder
- **EVE's system prompt / persona spec** — the contents of wire #1 (11A). Paste-ready, and usable in Cowork today.
- **The tool/function schema** — the exact JSON for the EVE functions in 11A #3.

Both are quick to produce when you're ready. Neither is a reason to start Stage 2 early.

*Churlish Media · Churlish OS · Stage 1 + Stage 2 build brief · churlishmedia.com · 402-819-8168*
