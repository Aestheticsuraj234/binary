# Chapter 6: Review

**Branch:** `feat/chapter-06-tools` → `main`
**Reviewer:** Claude, a self-review.

## Google TypeScript Style Guide

- Named exports; default exports only for Next.js pages.
- No `any`, no non-null assertions. One `as AddressInfo` in the test MCP
  server (Node's `address()` returns a union); none in app code.
- Interfaces for contracts (`AgentTool`, `ToolPolicy`, `AppConnection`),
  one function type (`AppConnector`, `UrlGuard`).
- `private readonly` constructor dependencies (`Toolbox`,
  `ToolboxFactory`, `ToolCallLog`).
- `UPPER_SNAKE_CASE` constants (`TOOL_RISKS`, `BLOCKED_RESULT`,
  `MAX_STEPS`, `CONNECT_TIMEOUT_MS`, `MAX_TEXT_LENGTH`).
- Lint and Prettier pass.

## Findings and fixes

| #   | Severity        | Finding                                                                                                                                         | Fix                                                                                                                                                                  |
| --- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | High (security) | `fetch_web_page` takes model-chosen URLs. Without a guard, a prompt in a page could make it reach `localhost:4000`, a router or cloud metadata. | `publicUrlsOnly` resolves the host and refuses private, loopback, link-local, CGNAT and IPv6-mapped ranges. Redirects are followed by hand and re-checked. 16 tests. |
| 2   | High (safety)   | Running write tools now would let a connected app send, refund or delete without asking.                                                        | `readOnlyPolicy` blocks write and computer tools until Chapter 8; a test proves the shop's refund never ran.                                                         |
| 3   | Medium          | `toConnectedApp` guessed the status from the tool count, so an app with zero tools would keep a stale "error".                                  | The status is passed in explicitly.                                                                                                                                  |
| 4   | Medium          | Rows from one `INSERT` share `created_at`, so tool calls could come back out of order.                                                          | Each call is saved with its real start time; a test checks the order.                                                                                                |
| 5   | Low             | Page text included the `<title>` merged into the body.                                                                                          | `htmlToText` drops `<head>`; the title is returned on its own.                                                                                                       |
| 6   | Low (design)    | Risky badges first used Tailwind's amber directly.                                                                                              | A `--warning` token, documented in the design system.                                                                                                                |
| 7   | Low (scope)     | The `AppError` hierarchy from Chapter 4's scope was missing; malformed JSON was a 500 in every chapter.                                         | `AppError` + `parseBody` + `app.onError`; every route refactored; Chapter 5's tests still pass unchanged.                                                            |

## Simplifications

- One policy object, no rules engine.
- Connections opened per request, no pool.
- No per-agent tool lists: every agent gets every tool (there's no table
  for it; Chapter 8's approval modes cover per-agent behaviour).
- Tool call details are a native `<details>`, with no new component
  library.

## Accepted trade-offs

- **One MCP connection per message** for every connected app; fine for a
  handful of apps.
- **Tool calls aren't replayed to the model in later messages**: history is
  text only. The model sees results within the answer that used them.
- **The app URL is stored in plain text**; the form tells users to keep
  secrets in the encrypted Authorization field.
- **Built-in `fetch_web_page` reads at most 8,000 characters** and doesn't
  run JavaScript; a real browser is Chapter 10.
- **UI copy mentions "later chapters"**, as earlier chapters did. Revisit
  before a public release.

## Open items

- Real Composio and real-model smoke test (TESTING.md).
- **Live updates (LISTEN/NOTIFY) are still missing.** Found again here: a
  reload during an answer shows it missing until the next load, although it
  is saved.
