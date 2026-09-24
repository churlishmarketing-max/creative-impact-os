# CLAUDE CODE BUILD PROMPT — EDITH on the Creative Impact OS
Paste everything below the line into Claude Code from the OS repo root, with `edith-automations.yaml` and `EDITH_Email_Sequences.md` placed at `/automations/edith/`.

---

You are implementing EDITH, the automated email assistant for the Creative Impact OS (the Charlotte Spotlight funnel). Two source files govern this build and you do not deviate from them:

- `/automations/edith/edith-automations.yaml` — the manifest: sender, global rules, events, sequences, steps, exits, holds, tasks.
- `/automations/edith/EDITH_Email_Sequences.md` — the templates, keyed by `template_id` (e.g. `1-1`, `2-4`, `5b-1`). Each block has Trigger / Subject line / Preview text / body / CTA / Internal note.

## Step 1 — Inspect before you write
Read the repo. Find the existing models and services for contacts, tags, events/webhooks, email sending, and scheduling/queues. Report back in one screen: what exists, what's missing, and the exact mapping from the manifest's `events` and `contact_fields` to what the OS already has. Do not create a parallel contact model. If an event in the manifest has no emitter yet (e.g. `cut.delivered`, `promo.ended`), list where in the OS it should be emitted from and stub it with a clear TODO — never fake the event.

## Step 2 — Build the engine
Implement, in the OS's existing stack and conventions:
1. **Template store.** Parse `EDITH_Email_Sequences.md` into records: `template_id`, `subject`, `preview_text`, `body`, `cta`, `internal_note`, `merge_fields_used`. Append the signature block from the manifest to every body. Templates are read-only at runtime; edits go through a versioned file change, not the UI.
2. **Sequence engine.** Enrollment on events per `enroll_on` (with `when` / `unless_within` conditions), steps with `delay` + `anchor`, `at` expressions relative to contact fields (`call_time - 24h`, `film_date - 3d`, `promo.started + 15d`), `on_event` steps, variants, and `then` blocks (approval windows, reminders, task creation). One active enrollment per contact per sequence.
3. **Exit rules.** Every `stop_on` and per-sequence `exit_on` event cancels pending steps immediately. `email.replied` also routes the reply to Emmanuel's inbox and creates a task. Reply-keyword routing (`later`, `yes`, `stop`) per `reply_routing`.
4. **Holds.** Before every send, validate the template's merge fields against the contact. If any field in `merge_field_holds` is empty, do not send: mark the step `HELD`, create a task for a human with the missing field named, and retry when the field is filled.
5. **Send window + rate limit.** Enforce `send_window` in `America/New_York` and `max_emails_per_contact_per_24h`, with the exemptions the manifest names (time-anchored reminders in SEQ3/SEQ4 and `ignore_send_window: true` steps). A step that lands outside the window schedules to the next open slot.
6. **Compliance footers.** Physical address on SEQ1; unsubscribe link on SEQ1 and SEQ7; `contact.unsubscribed` sets `do_not_contact` and cancels everything.
7. **Kill switch.** `edith_live` flag. When false, the engine runs fully but writes to a send log instead of sending. Default false.
8. **Tasks for humans.** Create the OS tasks listed under `tasks_for_humans` and the `side_effects_on_enroll` tasks (speed-to-lead call, revisions).
9. **Daily digest.** One email to Emmanuel at 7:30 AM ET per `reporting`: sent, held (with reasons), replies routed, bookings, deposits, no-shows, sequence exits.

## Step 3 — Prove it
- Unit tests for: enrollment conditions, exit cancellation, hold logic, send-window scheduling, the `at:` expression parser, and reply-keyword routing.
- A dry-run script: seed five fake contacts (cold, inbound-no-book, booked-then-no-show, undecided-post-call, paid client) and advance a fake clock through 45 days. Print the send log as a timeline. Every send must show the resolved subject with merge fields filled — a blank field in the log is a failure.
- A one-command `npm run edith:dry-run` (or the repo's equivalent) that produces that timeline.

## Step 4 — Report
Deliver: the file list you changed, the event emitters you stubbed with TODOs, the dry-run timeline output, and a short list of anything in the manifest you could not implement as written and why. Do not flip `edith_live` to true. Do not edit template copy. Do not add emails, steps, or sequences that are not in the manifest.

Voice and copy are locked upstream. Your job is the machine.
