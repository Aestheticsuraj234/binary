# Chapter 7: Implementation

## Plan

1. Research Trigger.dev 4.8.5. Its schedules need a `deduplicationKey` and
   take a `timezone`; `trigger dev` needs `login` and fires schedules only
   while it runs.
2. Shared: the routine form schema, schedule presets, and the routine and
   run views.
3. DB: a `triggers.timezone` migration; routine, trigger and run
   repositories.
4. API: move chat's reply pipeline into `writeReply`; `runRoutine`; the
   `JobRunner` Strategy (in-process and Trigger.dev); Trigger.dev tasks;
   routines and webhook routes.
5. Web: the Routines list, new and detail pages, run history with polling,
   and webhook details.
6. Test with a recording job runner and a fake model; verify in a browser.

## Acceptance criteria

- [x] A user can create, edit, switch off and delete routines run by their
      own characters.
- [x] Schedules from presets or cron, saved in the user's time zone and
      synced to the job runner. Editing keeps the schedule's id, and
      clearing or deleting removes it.
- [x] Webhooks: a URL and a secret shown once, stored as a hash. Wrong
      secret → 401, switched off → 409. The body reaches the agent fenced
      as data.
- [x] Run now queues a run at once; runs move queued → running →
      done/failed and the page follows them.
- [x] Each run's transcript is a saved chat (with tools), linked from the
      run and listed in Recent chats.
- [x] A failed run records why ("Add your Anthropic API key…").
- [x] A run never executes twice.
- [x] Without Trigger.dev the app still works and says what's missing; with
      it, runs and schedules go to Trigger.dev.
- [x] Users can't see, edit, run or delete each other's routines.
- [x] Lint, format, type-check, tests and the build pass; no sideways scroll
      at 390px.
- [x] Verified against a live Trigger.dev project: Run now, a cron firing
      by itself, and the schedule's removal (TESTING.md).

## File-by-file

### `packages/shared`

| File              | Purpose                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `src/routines.ts` | `SCHEDULE_PRESETS`, `describeSchedule`, `routineInputSchema`, `RUN_STATUSES`, `Routine`, `RoutineRun` |

### `packages/db`

| File                                          | Purpose                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `drizzle/0002_trigger-timezone.sql`           | `ALTER TABLE triggers ADD COLUMN timezone text`                                            |
| `src/schema/automation.ts`, `enums.ts`        | `timezone` column; `run_status` from `RUN_STATUSES`                                        |
| `src/repositories/routine-repository.ts`      | create, list and find (joined through agents for the owner), `findForJob`, update, delete  |
| `src/repositories/trigger-repository.ts`      | `setSchedule` (keeps the id, reports a removed one), `setWebhook`, `findWithRoutine`       |
| `src/repositories/routine-run-repository.ts`  | create, find, `listForRoutine`, `latestForRoutines` (DISTINCT ON), `markRunning`, `finish` |
| `src/test-utils.ts` (`@binary/db/test-utils`) | `deleteUsersByEmail`, `deleteTemplateBySlug`, so app tests never import drizzle-orm        |

### `apps/api`

| File                             | Purpose                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/chat/reply.ts`              | `writeReply`: one turn with tools, saved; used by chat and routines                       |
| `src/routines/run-routine.ts`    | `runRoutine`, `routineMessage` (fences webhook input), `runTitle`                         |
| `src/routines/timezone.ts`       | `canonicalTimezone`: the zone name Trigger.dev accepts (`Asia/Kolkata` → `Asia/Calcutta`) |
| \1                               | `newWebhookSecret` (`whsec_` + 24 bytes, SHA-256), `secretMatches` (constant time)        |
| `src/jobs/job-runner.ts`         | `JobRunner`, `Schedule`, `InProcessRunner` (with `idle()` for tests)                      |
| `src/jobs/trigger-dev-runner.ts` | `TriggerDevRunner`: `tasks.trigger`, `schedules.create`, `del`                            |
| `src/trigger/routines.ts`        | Tasks `run-routine` and `routine-schedule`                                                |
| `trigger.config.ts`              | The project ref, dirs, 600 s max duration                                                 |
| `src/routes/routines.ts`         | Routines CRUD, Run now, new webhook secret                                                |
| `src/routes/hooks.ts`            | The public webhook endpoint                                                               |
| `src/routes/threads.ts`          | Now a thin wrapper around `writeReply`                                                    |
| `src/env.ts`, `container.ts`     | Optional `TRIGGER_SECRET_KEY`; picks the runner; an injectable `makeJobs` for tests       |

### `apps/web`

| File                                          | Purpose                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/app/(app)/routines/page.tsx`             | List with schedule, webhook, off and last-run badges; Trigger.dev notice            |
| `src/app/(app)/routines/new/page.tsx`         | New routine (or "hire a character first")                                           |
| `src/app/(app)/routines/[id]/page.tsx`        | One routine                                                                         |
| `src/components/routines/routine-form.tsx`    | Name, character, prompt, schedule (preset or cron), webhook, on/off                 |
| `src/components/routines/routine-editor.tsx`  | `NewRoutine` (shows the secret once), `RoutineEditor` (form, webhook, delete, runs) |
| `src/components/routines/run-history.tsx`     | Run now, runs list, 2 s polling, sidebar refresh when a run finishes                |
| `src/components/routines/webhook-details.tsx` | URL, the one-time secret, a curl example, copy buttons, new secret                  |
| `src/components/routines/run-status.tsx`      | `RunStatusBadge`, `RunTime`, `runDuration`                                          |

## Decisions

| Decision                                           | Why                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A `JobRunner` Strategy with an in-process fallback | The app works and tests run without a Trigger.dev account; Trigger.dev adds durability and schedules.        |
| `runRoutine` skips runs that aren't `queued`       | Job systems may deliver twice; a run must never answer twice.                                                |
| One `run-routine` attempt                          | Failures are recorded on the run; a blind retry would skip anyway. Provider-specific retries can come later. |
| Reuse the chat pipeline (`writeReply`)             | Runs get tools, the policy, saved tool calls and a transcript for free, and there's one place to change.     |
| Webhook secret: hash only, shown once              | Same rule as API keys: a database leak must not let anyone start routines.                                   |
| Webhook body fenced as data                        | A webhook is someone else's text; it must not give the agent instructions.                                   |
| Time zone per schedule (one migration)             | "9:00" means the user's 9:00; Trigger.dev supports time zones natively.                                      |
| Keep a trigger's id when its schedule changes      | Trigger.dev's schedule is keyed by it (`externalId` and `deduplicationKey`).                                 |
| Polling every 2 s while a run is unfinished        | Live updates (LISTEN/NOTIFY) aren't built yet; polling stops when nothing is running.                        |
| One schedule and one webhook per routine           | Covers the real cases with a simple form; the table allows more later.                                       |
