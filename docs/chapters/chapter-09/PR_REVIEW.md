# Chapter 9: Review

**Branch:** `feat/chapter-09-sandboxes` → `main`
**Reviewer:** Claude, a self-review.

## Google TypeScript Style Guide

- Named exports; default exports only for Next.js pages.
- No `any`, no non-null assertions and no casts:
  - unknown tool output is read with `Reflect.get`
  - selects map their value with `.find` over the shared list
  - E2B errors are told apart with `instanceof`
- `UPPER_SNAKE_CASE` constants (`IDLE_TIMEOUT_MS`, `RUN_TIMEOUT_MS`,
  `MAX_LOG_LENGTH`, `COMPUTER_KINDS`).
- Lint and Prettier pass.

## Findings and fixes

| #   | Severity             | Finding                                                                                                                                                               | Fix                                                                                                                                                                                                      |
| --- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | High (safety)        | A call waiting for approval showed only "Wants to use run code"; the code was inside a closed row, so you could approve code you hadn't read.                         | Waiting rows start open, and code and commands show as themselves, not as JSON. Checked in the browser.                                                                                                  |
| 2   | Medium (cost)        | Returning a chart's base64 PNG to the model would cost thousands of tokens per chart, in the reply and again in the approval follow-up.                               | `AgentTool.forModel` feeds the AI SDK's `toModelOutput` and `decideApproval`'s instruction; `run_code` swaps each PNG for a note. Tested: the PNG is saved, and the prompt has the note but not the PNG. |
| 3   | Medium (correctness) | Two tools called in the same step could each create a sandbox.                                                                                                        | `ChatSandbox.open()` memoizes its promise for the request.                                                                                                                                               |
| 4   | Medium (cost)        | Deleting a chat left its sandbox running until it timed out.                                                                                                          | `DELETE /api/threads/:id` stops it first. Tested.                                                                                                                                                        |
| 5   | Low (UX)             | Browser check: in dark mode the terminal output nearly disappeared; a single chart rendered at half width; on a phone the header squeezed the title to "Draw a cha…". | A border on the terminal; one chart spans the row (up to `max-w-xl`); "New chat" is icon-only on phones.                                                                                                 |
| 6   | Low (copy)           | The risk legend still said write tools are "Blocked until approvals arrive" and computer tools "Come in later chapters".                                              | Updated to what is true now.                                                                                                                                                                             |
| 7   | Low (supply chain)   | `@e2b/code-interpreter` pulled `e2b@2.64.0`, released a day earlier.                                                                                                  | Pinned to `e2b@2.60.0` (19 days old) with `pnpm.overrides`.                                                                                                                                              |
| 8   | Low (style)          | The sandbox lookup ran twice when creating one; the agent `PUT` used an unused rest variable (lint).                                                                  | One lookup passed along; the fields are listed explicitly.                                                                                                                                               |

## Simplifications

- One provider interface, and nothing E2B-specific above it. Chapter 11's
  E2B Desktop and Chapter 10's browser can follow the same shape.
- Timed-out sandboxes are found lazily, with no cleanup job.
- The existing approval flow does all the gating; the sandbox adds no
  rules of its own.

## Accepted trade-offs

- **Two requests in the same chat at once** (two tabs) could still start
  two sandboxes. The extra one is listed on Apps and times out after 10
  minutes.
- **Minutes are approximate:** time from start to last use. Billing and
  usage arrive in Chapter 15.
- **Sandboxes can reach the internet** (E2B's default). Approval is the
  guard; locking egress down is possible later with E2B's network options.
- **One E2B key for the whole install** (`.env`), not per user.
- **No file upload or download** between you and the sandbox yet.
- **Plan limits:** the free plan ends a sandbox after 1 hour however busy
  it is; the next run starts fresh and says so.

## Open items

- Try a real model in a chat. Real E2B is verified by the opt-in test and
  a browser walkthrough, but both used a fake model.
- Live updates (LISTEN/NOTIFY) are still missing (Chapters 5 and 8).
