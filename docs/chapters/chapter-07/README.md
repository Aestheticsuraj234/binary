# Chapter 7: Durable jobs and routines

**Goal:** characters work when you are not watching. A routine is a job a
character does again and again, like "every weekday at 9:00, plan my day".
It runs on a schedule, when a webhook calls, or when you press **Run now**.
Every run leaves a transcript you can open like any chat.

![A routine with its run history](screenshots/routine.png)

## What you get

- **Routines** (`/routines`): pick a character, say what to do, and choose
  what starts it.
  - **Schedule:** presets ("Weekdays at 9:00") or any cron expression, in
    _your_ time zone.
  - **Webhook:** other services start it with a URL and a secret. The
    secret is shown once and stored only as a hash.
  - **Run now**, always.
  - **On / off:** switched-off routines ignore their schedule and webhook.
- **Run history:** queued, running, done or failed, with how long it took,
  the error when it failed, and a **Transcript** link. The page checks back
  every 2 s while a run is unfinished.
- **Transcripts are chats:** each run gets its own thread, titled after the
  routine ("Morning plan · 14 Nov, 22:20"). It shows up in Recent chats,
  tool calls included.
- **Trigger.dev:** with `TRIGGER_SECRET_KEY` set, runs are durable
  Trigger.dev tasks (`run-routine`). Schedules are real Trigger.dev cron
  schedules (`routine-schedule`), one per routine, in its time zone.
- **Without Trigger.dev:** routines still run, inside the API. Schedules are
  saved but don't fire, and the Routines page says so.
- **Webhook safety:** the body is fenced off and labelled as data, so text
  in it can't steer the agent (prompt injection).

## Files in this chapter's docs

| File                                   | What's in it                                          |
| -------------------------------------- | ----------------------------------------------------- |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Plan, acceptance criteria, file-by-file, decisions    |
| [ARCHITECTURE.md](ARCHITECTURE.md)     | JobRunner, the run lifecycle, webhooks, API contracts |
| [TESTING.md](TESTING.md)               | Tests and results                                     |
| [PR_REVIEW.md](PR_REVIEW.md)           | Review findings and fixes                             |
| [REBUILD_PROMPT.md](REBUILD_PROMPT.md) | Standalone prompt to rebuild this chapter             |
| [architecture/](architecture)          | Components, a run end to end, schedules and webhooks  |
| [screenshots/](screenshots)            | Routines, a routine, the webhook secret, phone        |

## Run it

One small migration adds `triggers.timezone`:

```bash
pnpm db:migrate
pnpm dev
```

That's enough for Run now and webhooks. For durable runs and schedules,
connect Trigger.dev:

1. Create a project at [cloud.trigger.dev](https://cloud.trigger.dev).
2. Put your project's ref in `apps/api/trigger.config.ts`, and its **DEV**
   secret key (API keys) in the root `.env` as `TRIGGER_SECRET_KEY`.
3. Log in once: `pnpm --filter @binary/api exec trigger login` (it opens a
   browser).
4. Run the worker next to the app: `pnpm trigger:dev`. It prints "Local
   worker ready" and the two tasks, `run-routine` and `routine-schedule`.

The Trigger.dev packages (`@trigger.dev/sdk`, `@trigger.dev/build` and the
`trigger.dev` CLI) are pinned to the same version, 4.8.5, as Trigger.dev
requires.

In development, Trigger.dev only fires schedules while `pnpm trigger:dev` is
running.

## What comes next

Chapter 8 adds approvals: write tools stop being blocked and start asking.
Routines can then pause for your answer, which is the reason runs are
durable jobs.
