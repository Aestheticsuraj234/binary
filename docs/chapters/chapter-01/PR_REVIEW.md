# Chapter 1: Review

**Branch:** `feat/chapter-01-init-auth` → `main` (merged locally)
**Reviewer:** Claude. A self-review against the checklist below. No separate
PR review tool was available, and the repo is local-only (no GitHub PR or
hosted CI yet), so this review is not independent.

## Checklist

| Area                                   | Result                                               |
| -------------------------------------- | ---------------------------------------------------- |
| Google TypeScript Style Guide          | Pass; see below                                      |
| Beginner-friendly / minimal complexity | Pass, after simplifications below                    |
| Security                               | Pass, after one fix                                  |
| Correctness                            | Pass; tests + browser verification                   |
| UI consistency with the design system  | Pass                                                 |
| Test coverage of important behavior    | Adequate for this chapter; gaps listed in TESTING.md |

## Google TypeScript Style Guide

Enforced by `eslint.config.mjs` and `.prettierrc.json`:

- `const` over `let`, never `var` (`prefer-const`, `no-var`)
- Strict equality (`eqeqeq`)
- No `any` (`@typescript-eslint/no-explicit-any`)
- No non-null assertions (`no-non-null-assertion`)
- Type-only imports marked (`consistent-type-imports`)
- Named exports only, except framework files that require default exports
  (Next.js pages/layouts, Expo Router screens, and config files, each marked)
- Naming: `PascalCase` types and components, `camelCase` values,
  `UPPER_SNAKE_CASE` constants (`naming-convention`)
- Single quotes, semicolons, trailing commas (Prettier)

Checked by hand:

- Comments explain _why_ (cookie sharing across ports, why `exp://` is
  trusted only in development, why `NEXT_PUBLIC_API_URL` is validated).
- Function declarations for named functions; arrow functions only as callbacks.
- No unsafe casts. One test used `body.user.email` on an `unknown` JSON body;
  it now uses `toMatchObject` instead of a type assertion.

## Findings and fixes

| #   | Severity           | Finding                                                                                                                                  | Fix                                                                                                |
| --- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | High (security)    | `.env.example` shipped a 48-character placeholder secret that **passed** validation, so a viewer could run with a publicly known secret. | Placeholder is now `change-me`, which fails the 32-character check with a clear message. Verified. |
| 2   | High (correctness) | Building the web app without `NEXT_PUBLIC_API_URL` produced `undefined/api/auth/get-session` and a 500 at runtime.                       | `src/lib/env.ts` validates it with Zod, so the build fails with an instruction instead.            |
| 3   | High (correctness) | Next.js's `loadEnvConfig` is cached for the app folder, so loading the root `.env` with it was silently ignored.                         | `next.config.ts` uses Node's `process.loadEnvFile` instead and drops the `@next/env` dependency.   |
| 4   | Medium             | The shadcn CLI resolved the `cn` helper to an unrelated npm package named `cn` and installed it.                                         | Imports point to `@/lib/utils`; the package is removed.                                            |
| 5   | Low                | The avatar showed the first two letters of the name ("SU").                                                                              | Shows initials ("SJ").                                                                             |

## Simplifications made

- Dropped the shadcn `dropdown-menu` component: a single "Sign out" button is
  enough.
- No form library (react-hook-form): `FormData` + the shared Zod schema.
- No NativeWind on mobile: plain `StyleSheet` + `theme.ts`.
- No Better Auth CLI dependency: `getMigrations` in a short script.
- No custom hooks; no wrapper around `fetch`.

## Accepted trade-offs

- `getSession()` returns `response.json()`, which is untyped JSON trusted as
  `Session`. The data comes from our own API; a runtime schema would add code
  without real safety today.
- Sign-in and sign-up forms repeat a little structure. Kept separate so each
  file reads top to bottom on its own.
- The session middleware queries the session on every `/api/*` request. That
  is fine at this size; caching can come with real traffic.

## Open items (not blocking)

- Connect the Jojopen MCP server so diagrams can be produced there
  (Mermaid fallback used).
- Push to GitHub to run `.github/workflows/ci.yml` on every PR.
- Choose a license before publishing the repo.
