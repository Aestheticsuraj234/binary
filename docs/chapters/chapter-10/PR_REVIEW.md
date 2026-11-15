# Chapter 10: Review

**Branch:** `feat/chapter-10-browser` → `main`
**Reviewer:** Claude, a self-review.

## Google TypeScript Style Guide

- Named exports; default exports only for Next.js pages.
- No `any`, no non-null assertions and no casts in app code:
  - unknown tool output is read with `Reflect.get`
  - the page's element list is parsed with Zod
  - the availability map is built key by key (a cast there was replaced)
- The in-page script is a string, so the API never needs DOM types.
- Errors keep their `cause` (lint: `preserve-caught-error`).
- Lint and Prettier pass.

## Findings and fixes

| #   | Severity                             | Finding                                                                                                                                                                                             | Fix                                                                                                                                                                                                                                                  |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | High (security)                      | The browser runs on this server, inside its network. A page (or a prompt in one) could send it to `localhost`, the router or a database through a link, a redirect, a form post or even an `<img>`. | Every request in the chat's context goes through `UrlGuard` (`publicUrlsOnly`). Refused requests are aborted, and refused navigations are reported. Tested with a link and an image to a "private" server, and with the real guard against loopback. |
| 2   | High (safety)                        | Clicking and typing can buy, send or delete.                                                                                                                                                        | `browser_click` and `browser_type` are `computer` risk, so they ask first in every mode. A waiting row opens to show the ref and the text.                                                                                                           |
| 3   | Medium (cost)                        | Screenshots in base64 would cost thousands of tokens per step.                                                                                                                                      | `withoutImages` (now shared) swaps `screenshot` for a note. Tested: the prompt has the page text and the note, not the image.                                                                                                                        |
| 4   | Medium (resources)                   | Browsers live in the API's memory.                                                                                                                                                                  | At most 5 open; idle timers (unref'd) close them after 10 minutes; deleting a chat closes its browser; `closeAll()` runs on SIGINT and SIGTERM and in test teardown.                                                                                 |
| 5   | Medium (UX)                          | A stale ref waited Playwright's 5-second timeout and then failed vaguely.                                                                                                                           | Check the ref first and fail at once: "Nothing on the page has ref N now. Read the page again (browser_read) for fresh refs." Found by a test.                                                                                                       |
| 6   | Medium (tooling)                     | After `SandboxView` was renamed, `pnpm typecheck` still passed: turbo reused the web app's cached result, because `typecheck` did not depend on its dependencies.                                   | `typecheck` now `dependsOn: ["^typecheck"]`. CI was unaffected, since it has no cache.                                                                                                                                                               |
| 7   | Low (Chapter 9 bug)                  | The Apps page said to put `E2B_API_KEY` in `apps/api/.env`, but the API reads the root `.env`.                                                                                                      | Now says `.env`.                                                                                                                                                                                                                                     |
| 8   | Low (robustness)                     | An `alert()` would hang a page, and downloads would land on the server.                                                                                                                             | Dialogs are dismissed and downloads are off. New tabs are followed. Tested with an alert page and a `target=_blank` link.                                                                                                                            |
| 9   | Low (design)                         | Chapter 9's sandbox-only list and stop, and positional `createDependencies(…, undefined, undefined, provider)`.                                                                                     | `ComputerSessions` base class; `/api/computers`; option objects.                                                                                                                                                                                     |
| 10  | Medium (UX, found with a real model) | GPT-5.5 wrote text, called a tool, then wrote more, and the two joined as "…the same values.I've prepared…". `writeReply` simply added the pieces together.                                         | Text after a tool call starts a new paragraph, the same in the stream and in what is saved. Tested: "Let me check.\n\nAnswer using…", and the deltas add up to the saved text.                                                                       |
| 11  | Medium (UX, found with a real model) | Models write math as LaTeX `\[…\]` and `\(…\)`; the chat showed it raw.                                                                                                                             | `@streamdown/math` (KaTeX), plus `normalizeMath` in `shared`, which rewrites both forms to `$$…$$` outside code. Single `$` is never math, so prices stay prices. 4 tests.                                                                           |
| 12  | Low (Chapter 4 bug)                  | The dev overlay showed a hydration warning on Today and the hire form: Sunny's rays use `Math.cos` and `Math.sin`, whose last digits differ between Node and Chromium.                              | Coordinates are rounded to two decimals. No warning since.                                                                                                                                                                                           |

## Simplifications

- One Chromium, many contexts: no process per chat.
- Refs instead of an accessibility tree: one small script.
- The guard is Chapter 6's function, injected, so tests can allow their
  local site.

## Accepted trade-offs

- **In memory:**
  - A restart closes every browser, and their rows close on the next look.
  - A routine run on the Trigger.dev worker opens its browser in the worker.
    A click it asks for and you approve later runs in the API, finds no
    browser and says so.
- **Guard gaps:**
  - DNS can change between the guard's lookup and Chromium's own (DNS
    rebinding).
  - WebSockets aren't routed.
  - Both would need a proxy to close fully.
- **Not a VM:** pages run in Chromium's own sandbox on this machine.
  E2B Desktop (Chapter 11) is the isolated option.
- **Signed out every time:** no saved logins; each new browser starts
  fresh.
- **What the agent sees:**
  - the first 80 elements and 6,000 characters of text
  - no iframes or shadow DOM
  - no scrolling or vision
- **`/api/sandboxes` is gone.** Chapter 9's docs describe it as it was.

## Open items

- Try more real sites, and sites behind a login.
- Live updates (LISTEN/NOTIFY) are still missing (Chapters 5 and 8).
