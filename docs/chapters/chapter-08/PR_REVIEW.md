# Chapter 8: Review

**Branch:** `feat/chapter-08-approvals` → `main`
**Reviewer:** Claude, a self-review.

## Google TypeScript Style Guide

- Named exports; default exports only for Next.js pages.
- No `any`, no non-null assertions, no casts: flags on unknown tool output
  are read with `Reflect.get`, and the mode select maps its value with
  `APPROVAL_MODES.find`.
- `UPPER_SNAKE_CASE` constants (`APPROVAL_MODES`, `AWAITING_APPROVAL_RESULT`,
  `MAX_RESULT_LENGTH`).
- Lint and Prettier pass.

## Findings and fixes

| #   | Severity           | Finding                                                                                                                         | Fix                                                                                                                                                            |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | High (correctness) | Two approve clicks (or two devices) racing could both run the tool.                                                             | `decide()` is one conditional `UPDATE … WHERE status = 'pending' RETURNING`; the loser gets 409. Tested: approve twice, one refund.                            |
| 2   | Medium (UX)        | The browser walkthrough showed the decision note as raw JSON (`Result: {"content":[…],"isError":false}`).                       | The saved note is readable ("You approved shop refund order."); the raw result goes to the model in a hidden instruction; the tool row still shows it. Tested. |
| 3   | Medium (UX)        | A `key` on the Today inbox (ids of the list) remounted it after every decision, wiping the outcome message the user should see. | Removed; the inbox keeps its own list state. Caught while writing it.                                                                                          |
| 4   | Medium (behaviour) | Agents hired before this chapter have the DB default `ask_first`, so they now ask even before reads.                            | Kept as the safest reading of an unconfigured agent; documented in the README with how to switch. New agents default to Auto-approve reads.                    |
| 5   | Low                | Building `approval_mode` from the shared list would reorder a Postgres enum and need a migration.                               | That enum stays literal, with a note; `approval_status` (same order) uses the shared list.                                                                     |
| 6   | Low (style)        | A helper first used an `as` cast; `failed` had a starting value nobody read (lint).                                             | `Reflect.get`; declared without a value.                                                                                                                       |

## Simplifications

- No waiting processes, no Trigger.dev waitpoints: a request is a row.
- The follow-up is an ordinary `writeReply` turn, saved as a `tool` note
  plus an assistant reply.
- One policy table instead of rules per tool.

## Accepted trade-offs

- **No expiry yet.** `approval_status.expired` exists but nothing expires
  requests; old ones wait until decided.
- **The decision runs inside the request.** A slow tool or model makes
  Approve wait. A job (Chapter 7's runner) could take this over.
- **"Today" is the last 24 hours**, not the user's calendar day.
- **Decisions are from `web` only** until the mobile app (Chapter 14).
- **The chat renders three message kinds with a nested ternary.** A small
  `MessageRow` component would read better as the kinds grow.

## Open items

- A real-model and real-app try (TESTING.md).
- Live updates (LISTEN/NOTIFY) are still missing: a request from a
  routine shows up on the next page load, not instantly.
