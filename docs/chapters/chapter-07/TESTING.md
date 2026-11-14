# Chapter 7: Testing

```bash
pnpm test
```

Routine tests build the app with a `RecordingRunner`. It runs jobs through
the real `InProcessRunner`, so tests can wait with `idle()`, and records
every `saveSchedule` / `removeSchedule` call. That checks exactly what the
API asks Trigger.dev to do, without a Trigger.dev account.

## New suites

| Suite                | File                                     | Tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routine schema       | `packages/shared/src/routines.test.ts`   | scheduled routine; no schedule; bad cron message; preset names (4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Routine repositories | `packages/db/.../repositories.test.ts`   | owner-only listing through the agent; `findForJob` carries the owner; schedule keeps its id; a removed schedule is reported; webhook on and off; run lifecycle, newest first, latest per routine (6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Routine helpers      | `apps/api/src/routines/routines.test.ts` | the prompt alone; a webhook body fenced as data; secret hash only and matches; wrong or empty secret refused; run title in the schedule's zone; "UTC" without one; every browser spelling of a zone maps to Trigger.dev's name; an unknown zone is refused (8)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Routines + webhooks  | `apps/api/src/routes/routines.test.ts`   | **Create:** 401; someone else's agent 400; an unknown time zone is refused before saving; **a refused schedule leaves no half-made routine**; saved with schedule, time zone and webhook, secret once, schedule sent to the runner; secret never in a later response (4). **Run:** Run now → 202 queued → succeeded, with a transcript (prompt + answer) titled after the routine; **never runs twice**; missing key → failed with the reason (3). **Webhooks:** wrong secret 401, unknown 404; body reaches the model inside `<webhook-body>`; switched off → 409; a new secret kills the old one (4). **Edit:** new time keeps the schedule id; clearing removes it from the runner; webhook off, then on with a new secret (3). **Another user:** list empty; get, edit, run and delete all 404 (1). **Delete:** 204, the schedule removed from the runner, then 404 (1) |

All Chapter 6 tests still pass after the reply pipeline moved into
`writeReply` and the tests switched to `@binary/db/test-utils`.

## Results

| Check                   | Result                                                                |
| ----------------------- | --------------------------------------------------------------------- |
| All tests               | 187 / 187 (shared 20, db 37, api 130). Chapter 6 had 151.             |
| ESLint, Prettier        | Clean                                                                 |
| Type-check (5 packages) | Passed (including the Trigger.dev tasks and runner against SDK 4.8.5) |
| Migration               | `0002_trigger-timezone.sql`: one `ALTER TABLE`; then no changes       |
| Web production build    | Passed, including `/routines`, `/routines/new`, `/routines/[id]`      |

## Browser verification (in-process runner)

These ran against the production build, the real API and database, and a
fake model that waits 2 s before answering, so "Running" is visible. The
browser's time zone was set to Asia/Kolkata. 26 checks:

| Step                                                                                                         | Result |
| ------------------------------------------------------------------------------------------------------------ | ------ |
| Routines: sidebar link active; "Trigger.dev is not connected" notice; empty state                            | ✓      |
| New routine: a bad cron ("every day") is explained                                                           | ✓      |
| Create with "Weekdays at 9:00" and a webhook: `whsec_…` shown once with a warning; the copy button copies it | ✓      |
| Routine page: "Run by Sunny · Weekdays at 9:00 (Asia/Calcutta)"; the secret is not on the page               | ✓      |
| Run now: appears at once, then **Running** (polling), then **Done** with a duration                          | ✓      |
| Transcript: the prompt and the answer as a saved chat titled "Morning plan · …"; the run is in Recent chats  | ✓      |
| Webhook from outside (fetch): wrong secret 401; right secret 202; that run succeeds too                      | ✓      |
| The agent's answer shows the webhook body ("Issue #42: login is broken")                                     | ✓      |
| Switch off: webhook 409; the list shows Off, the schedule and Webhook badges                                 | ✓      |
| Phone (390px): list, routine and new pages don't scroll sideways                                             | ✓      |
| Delete: back to "No routines yet"; the webhook URL is now 404                                                | ✓      |
| Unexpected console or server errors                                                                          | None   |

Found and fixed during the run (see PR_REVIEW): the sidebar missed finished
runs, the curl example widened the page on phones, and transcript titles
were in UTC.

## Live check on Trigger.dev

This ran against the real project `proj_redvmhgdglygdseurohf`, with
`pnpm dev`, `trigger dev` (local worker `20261114.1`, tasks `run-routine`
and `routine-schedule`) and the DEV secret key. A throwaway account with a
**fake** Anthropic key was used, so no real model was called; runs end as
"failed: invalid x-api-key", which still travels the whole durable path.
The account was deleted afterwards.

| Step                                                                                                                                           | Result                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `GET /api/routines` reports `schedulesEnabled: true` (the Trigger.dev runner)                                                                  | ✓                                              |
| Create a routine with `*/2 * * * *` in `Asia/Kolkata`                                                                                          | ✓ 201; saved as `Asia/Calcutta` (after fix #9) |
| Run now → `run-routine` run `run_06gtm307…` on the worker, "Success (634ms)"; the routine run is recorded as failed with the provider's reason | ✓                                              |
| The cron fired by itself at 22:44 → `routine-schedule` run `run_06gtm39u…`, "Success (629ms)"; the routine shows 2 runs                        | ✓                                              |
| Clear the schedule → 200; no further `routine-schedule` runs at 22:46 or 22:48                                                                 | ✓                                              |

**The task said "Success" while the routine run said "failed".** That's
intended: `runRoutine` records the failure on the run, so the Trigger.dev
task completes cleanly instead of retrying a run that can't succeed.

The first live attempt found two bugs, now fixed and covered by tests:
Trigger.dev refused `Asia/Kolkata`, and a refused schedule left a
half-created routine. See PR_REVIEW #9 and #10.
