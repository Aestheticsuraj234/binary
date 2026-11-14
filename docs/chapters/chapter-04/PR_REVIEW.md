# Chapter 4: Review

**Branch:** `feat/chapter-04-agents` → `main`
**Reviewer:** Claude, a self-review.

## Google TypeScript Style Guide

- Named exports throughout; default exports only for Next.js pages.
- No `any`, no non-null assertions. The one `as` is in the test-only
  `readJson<T>` helper, documented as "our own API". The provider `<select>`
  value goes through `providerSchema.parse` instead of a cast.
- Classes take dependencies as `private readonly` constructor parameters.
- `UPPER_SNAKE_CASE` module constants (`AGENT_COLUMNS`, `NOT_FOUND`,
  `HIRE_AGENT`).
- Lint and Prettier pass.

## Findings and fixes

| #   | Severity    | Finding                                                                                                                                                            | Fix                                                                                                                |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Medium (UI) | The browser walkthrough showed the Provider and Model selects at their content width (≈190px on a 340px phone column). shadcn's `NativeSelect` wrapper is `w-fit`. | `*:w-full` on the field wrappers, with a comment. The shadcn file stays untouched.                                 |
| 2   | Medium      | A non-uuid id (`/api/agents/abc`) would reach Postgres, which rejects it with a 500.                                                                               | Routes check `z.uuid()` first and answer 404. Tested in the API and in the browser.                                |
| 3   | Medium      | The playground's provider error handling would have been copied into the run route.                                                                                | Moved into `engineErrorResponse(c, error)`, used by both. The playground tests still pass unchanged.               |
| 4   | Low (UX)    | A `key={updatedAt}` on the edit form would remount it after saving and wipe the "Saved." message.                                                                  | Removed. The inputs already hold the saved values.                                                                 |
| 5   | Low         | The shared `Agent` type first said `provider` and `model` were always set, but the columns are nullable.                                                           | The type now matches the database. `ModelBadge` shows "No model", and the run route answers 400 "Choose a model…". |
| 6   | Low         | The header's initials code would have been copied for agent avatars.                                                                                               | `lib/initials.ts`, used by both.                                                                                   |

## Simplifications

- No new engine, no new Strategy: an agent reuses Chapter 3's
  `EngineFactory` unchanged.
- One form component for hiring and editing.
- No skills, approvals, engine choice or avatar upload. Their columns exist,
  but their features belong to later chapters.
- No chat history or streaming (Chapter 5).

## Accepted trade-offs

- Malformed JSON in a request body still gives a 500, as in every earlier
  route. A shared JSON error handler would fix all routes at once later.
- `PUT` replaces every editable field (no partial `PATCH`). The form always
  sends them all.
- An agent whose provider key is later removed stays listed. Running it says
  "Add your … API key in Settings first."
- `durationMs` includes the agent lookup (one indexed query).

## Open items

- Real-provider smoke test needs real keys (see TESTING.md).
- The repo docker-compose Postgres shares port 5432 with any local Postgres.
  On the machine that built this chapter, a local Postgres held the port, so
  tests ran against a separate container on 5433 via `DATABASE_URL`.
