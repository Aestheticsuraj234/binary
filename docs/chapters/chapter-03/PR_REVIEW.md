# Chapter 3: Review

**Branch:** `feat/chapter-03-ai-engine` → `main` (merged locally)
**Reviewer:** Claude, a self-review. No separate review tool was available
and the repo is local-only.

## Google TypeScript Style Guide

- Named exports throughout; default exports only for Next.js pages/layouts.
- Interfaces for contracts (`AgentEngine`, `AppDependencies`, props); one
  function type (`LanguageModelFactory`).
- Classes take dependencies through `private readonly` constructor params.
- No `any`, no non-null assertions. `as const` only for literal tuples.
- `UPPER_SNAKE_CASE` for module constants (`PROVIDERS`, `PROVIDER_INFO`,
  `ALGORITHM`, `IV_BYTES`, `LINKS`, `DEFAULT_MODELS`).
- Lint and Prettier pass.

## Findings and fixes

| #   | Severity                      | Finding                                                                                             | Fix                                                                                                   |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | High (robustness, from Ch. 1) | With the API down, every web page crashed with a 500 because the server-side session fetch threw.   | `getFromApi` treats a network failure like an error response (`null`), so pages behave as signed out. |
| 2   | High (UX, from Ch. 1)         | With the API down, sign-in/sign-up buttons stayed on "Signing in…" forever: the auth client throws. | All four forms (web + mobile) show "Could not reach the server. Is the API running?"                  |
| 3   | Medium                        | The playground column and key form would also hang if the API was unreachable.                      | Same `.catch(() => null)` pattern, with a clear message.                                              |
| 4   | Medium (UI)                   | Header was 420px wide on a 390px phone (horizontal scroll).                                         | Avatar and "Sign out" label hidden below `sm`; icon button keeps an `aria-label`.                     |
| 5   | Medium (design system)        | Three lime "Save" buttons on one screen broke the one-lime-action rule.                             | Save uses the `secondary` variant.                                                                    |
| 6   | Low                           | Home page had three repeated ternaries.                                                             | One `nextStep` object chosen once.                                                                    |
| 7   | Low                           | The shadcn CLI again installed an unrelated `cn` package and wrote `from "cn"` imports.             | Fixed imports, removed the package. **Check `components/ui` imports after every `shadcn add`.**       |
| 8   | Low                           | `cookieFrom` duplicated in two test files.                                                          | Moved to `src/test-helpers.ts`.                                                                       |

## Simplifications

- No class per provider: a three-line lookup object.
- No `/api/models` endpoint: the list is shared code.
- No data-fetching library yet: server components read, client components
  `fetch` + `router.refresh()`.
- No streaming in the playground.

## Accepted trade-offs

- `response.json()` results are trusted as the declared type (our own API).
- `durationMs` includes key lookup and decryption (microseconds), not only
  the provider call.
- Changing `ENCRYPTION_KEY` makes saved keys unreadable; there is no key
  rotation yet. Documented in the chapter README.

## Open items

- Real-provider smoke test needs real keys (see TESTING.md).
- Jojopen MCP still not connected; Mermaid used.
