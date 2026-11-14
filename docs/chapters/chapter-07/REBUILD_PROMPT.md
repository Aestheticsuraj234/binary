# Rebuild prompt: Chapter 7, Durable jobs and routines

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 6 (tools, MCP apps, `AppError`).

---

You are a senior full-stack engineer and teacher. Add **routines** to
Binary: jobs a character runs on a schedule, by webhook or on demand, as
durable Trigger.dev tasks, with run history. The tables `routines`,
`triggers` (type cron|webhook|manual, cron, webhook_secret) and
`routine_runs` (status queued|running|succeeded|failed, error, thread_id,
started_at, finished_at) already exist. Work on `feat/chapter-07-routines`.

## Code rules

Google TypeScript Style Guide (named exports; default exports only for
Next.js pages and `trigger.config.ts`; no `any` or casts in app code;
`UPPER_SNAKE_CASE` constants). Keep it beginner-friendly.

## Packages

In `apps/api`: `@trigger.dev/sdk@4.8.5`, and `trigger.dev@4.8.5` as a dev
dependency. The CLI binary is `trigger`.

Notes on Trigger.dev:

- `schedules.create` requires a `deduplicationKey` and accepts `timezone`
  and `externalId`.
- In development, schedules only fire while `trigger dev` runs, and `dev`
  needs `trigger login`.

If adding the SDK makes pnpm install a second `drizzle-orm` for the API,
remove the API's direct `drizzle-orm` dependency. Export test cleanup
helpers from `@binary/db/test-utils` instead (`deleteUsersByEmail`,
`deleteTemplateBySlug`).

## Shared (`src/routines.ts`)

- `SCHEDULE_PRESETS`:
  - hourly, `0 * * * *`
  - every day 9:00, `0 9 * * *`
  - weekdays 9:00, `0 9 * * 1-5`
  - Mondays 9:00, `0 9 * * 1`
- `describeSchedule(cron)` returns the preset's label, or the cron itself.
- `routineInputSchema`:
  - `{agentId: uuid ("Choose who runs this routine."), name 1–80, prompt 1–4000, enabled, timezone, webhook}`
  - `schedule`: cron or null. Five fields matching `/^[\d*/,-]+( [\d*/,-]+){4}$/`, with the message `Use five cron fields, like "0 9 * * 1-5".`
- `RUN_STATUSES`, which the DB enum is built from.
- `RoutineRun {id, status, error, threadId, createdAt, startedAt, finishedAt}`.
- `Routine {id, name, prompt, enabled, agent {id, name, avatar}, schedule {cron, timezone} | null, webhookId, lastRun, createdAt}`.

## Database

- **Migration `0002_trigger-timezone`:** add `triggers.timezone text`.
  Document that `webhook_secret` holds a SHA-256 hash.
- **`RoutineRepository`.**
  - `create`.
  - `listForUser` and `findForUser`: inner-join `agents` and filter by
    `agents.user_id`. Select the routine columns plus `agent: {id, name, avatar}`.
  - `findForJob(id)`: adds `userId` and `agentId`.
  - `update`, `delete`.
- **`TriggerRepository`.**
  - `listForRoutines(ids)`.
  - `setSchedule(routineId, cron | null, timezone)`: update the existing
    cron row (**keeping its id**), insert one, or delete it. Returns
    `{trigger, removedId}`.
  - `setWebhook(routineId, hash | null)`.
  - `findWithRoutine(id)` → `{id, type, webhookSecret, routineId, enabled}`.
- **`RoutineRunRepository`.**
  - `create`, `find`.
  - `listForRoutine(id, limit)`, newest first.
  - `latestForRoutines(ids)`, using `selectDistinctOn`.
  - `markRunning(id, threadId)` and `finish(id, {status, error?})`.

## API

1. **`chat/reply.ts`.** Move chat's pipeline into
   `writeReply(deps, {userId, agent, engine, threadId, content, title?, onEvent?})`:
   - Use the history (last 20), save the user message, and rename the
     thread on its first message (to `title`, or `titleFrom`).
   - Open the toolbox and stream with the `readOnlyPolicy` tools, calling
     `onEvent` for each delta and tool event.
   - Throw `ProviderError` on failure.
   - Otherwise save the answer and tool calls, touch the thread, and return
     the `ChatMessage`.
   - The chat route then streams `onEvent` plus `done`, or an `error`.
2. **`routines/run-routine.ts`.**
   - `routineMessage(prompt, input?)` appends `<webhook-body>` with a
     data-not-instructions line.
   - `runTitle(name, date, timeZone?)` gives "Name · 14 Nov, 22:20", in the
     schedule's zone or with " UTC".
   - `runRoutine(deps, {runId, input})`:
     - Skip the run unless it's `queued`.
     - Load the routine and agent; if either is gone, the run fails with
       "The routine no longer exists.".
     - Create the engine. Its errors become the run's failure reason.
     - Create a thread, `markRunning`, then `writeReply` with the title.
     - Finish `succeeded`, or `failed` with the `AppError` message (other
       errors are logged and get a generic message).
3. **`routines/webhook-secret.ts`.** `newWebhookSecret()` returns
   `whsec_` + 24 random bytes in base64url, plus its SHA-256 hex hash.
   `secretMatches` compares with `timingSafeEqual`.
4. **`jobs/job-runner.ts`.**
   - `JobRunner {schedulesEnabled, enqueue(job), saveSchedule({triggerId, cron, timezone}), removeSchedule(triggerId)}`.
   - `InProcessRunner(run)`: `enqueue` isn't awaited; schedules are no-ops
     and `schedulesEnabled` is false; `idle()` waits for pending runs.
5. **`jobs/trigger-dev-runner.ts`.**
   - `configure({secretKey})`.
   - `enqueue` calls `tasks.trigger<typeof runRoutineTask>('run-routine', job)`.
   - `saveSchedule` calls `schedules.create({task: 'routine-schedule', cron, timezone, externalId: triggerId, deduplicationKey: 'trigger-' + triggerId})`.
   - `removeSchedule` uses `for await (s of schedules.list())`, then
     `del(s.id)` when `s.externalId` matches.
6. **`trigger/routines.ts`.**
   - `task({id: 'run-routine', maxDuration: 600, retry: {maxAttempts: 1}})`
     runs `runRoutine(createDependencies(), job)`.
   - `schedules.task({id: 'routine-schedule'})` finds the trigger by
     `payload.externalId`, skips it unless it's an enabled cron trigger,
     creates a run, and calls `runRoutine`.
   - `trigger.config.ts` uses the literal project ref, dirs
     `./src/trigger`, and `maxDuration: 600`.
   - Script: `trigger:dev = trigger dev --env-file ../../.env` (and a root
     alias).
7. **Env and container.**
   - Optional `TRIGGER_SECRET_KEY`; empty means unset.
   - `createDependencies(createModel, connect, makeJobs = defaultJobs)`:
     with the key it uses `TriggerDevRunner`, otherwise `InProcessRunner`
     calling `runRoutine`.
   - Add `routines`, `triggers` and `routineRuns`. Tests set
     `TRIGGER_SECRET_KEY: ''`.
8. **`routes/routines.ts` (`requireUser`).**
   - Assemble views with triggers and the latest runs.
   - `applyTriggers(id, input, existing)`:
     - Call `setSchedule`, then `jobs.removeSchedule(removedId)` and
       `jobs.saveSchedule(trigger)`. A Trigger.dev error becomes a 502
       "Trigger.dev could not save the schedule: …".
     - Webhook off → remove it. On and already present → keep it.
       Newly on → a new secret, which is returned once.
   - Endpoints: `GET /`, `POST /` (the agent must be the user's own, else
     400), `GET /:id` (20 runs), `PUT /:id`, `DELETE /:id` (removes the
     schedule first), `POST /:id/runs` (202) and
     `POST /:id/webhook-secret`.
9. **`routes/hooks.ts` (no session).** `POST /routines/:triggerId` with
   `X-Binary-Secret`: 404 if not a webhook, 401 for a wrong secret, 409 if
   switched off. Take the body (first 10,000 characters), then create and
   enqueue a run → `202 {runId}`. Mount it at `/api/hooks`.

## Web

- A sidebar "Routines" link (Repeat icon).
- **`/routines`.**
  - Title and a lime "New routine".
  - A warning-colored notice when `schedulesEnabled` is false.
  - An empty state.
  - Cards with the character's face, name, an Off badge, the character's
    name, schedule and Webhook badges, and the last run's status and time.
- **`RoutineForm`.**
  - Name and "Who runs it" side by side, then "What to do".
  - A Schedule select (none, the presets, custom) with a cron input for
    custom; "Times use <zone>".
  - Webhook and "Switched on" checkboxes.
  - The time zone is the existing one, or the browser's
    `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **`NewRoutine`.** No secret → push to the routine. With a secret → show
  `WebhookDetails` and "I copied it, open the routine".
- **`RoutineEditor`.**
  - A grid with `*:min-w-0`.
  - The form (Save is secondary), `WebhookDetails` with the secret just
    returned, and a ghost Delete with a confirmation.
  - `RunHistory`.
- **`RunHistory`.**
  - A lime "Run now".
  - Each run shows a status badge, the time (`suppressHydrationWarning`),
    the duration, a Transcript link (`/agents/<agentId>?chat=<threadId>`)
    and the error.
  - Poll every 2 s while any run is unfinished; `router.refresh()` once all
    are finished.
- **`WebhookDetails`.** The URL with a copy button; the one-time secret in a
  warning box with a copy button; a curl example; "New secret".

## Tests

Shared (4); DB (6); helpers (6); routes (16, with a `RecordingRunner` that
wraps `InProcessRunner` and records schedule calls). Cover what TESTING.md
lists: the secret shown once, never running twice, the webhook body
fenced, 409 when off, a new secret killing the old one, schedule ids kept,
removal on clear and delete, and owner isolation.

## Docs

`docs/chapters/chapter-07/` (README with the Trigger.dev setup,
IMPLEMENTATION, ARCHITECTURE, TESTING including the live-Trigger.dev steps,
PR_REVIEW, this prompt), diagrams and screenshots. Add the env vars to
`.env.example`, add `TRIGGER_SECRET_KEY` to turbo's `globalEnv`, and update
CHAPTERS, the README and the design system.

## Acceptance criteria

- Run now and webhooks work without Trigger.dev, and the page says
  schedules need it.
- With Trigger.dev: runs and schedules appear in its dashboard.
- 187 tests, along with lint, format, type-check and the build.
- No sideways scroll at 390px.
