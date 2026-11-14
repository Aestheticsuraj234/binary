# Chapter 2: Review

**Branch:** `feat/chapter-02-database-orm` → `main` (merged locally)
**Reviewer:** Claude, a self-review. No separate PR review tool was available,
and the repo is local-only, so there is no hosted PR or CI run.

## Google TypeScript Style Guide

- Named exports everywhere; default exports only in `drizzle.config.ts` and
  `vitest.config.ts`, which require them (each marked).
- `camelCase` columns in TypeScript, `PascalCase` classes and types,
  `UPPER_SNAKE_CASE` for `EMBEDDING_DIMENSIONS`, `DEMO_USER`, `TEMPLATES`.
- No `any`, no non-null assertions. One `as const` (allowed: a const
  assertion, not a cast) in a test.
- Comments explain _why_: the check constraint, `SET NULL` vs `CASCADE`,
  `numeric` for money, why repositories have no create-user method.
- Lint and Prettier pass.

## Findings and fixes

| #   | Severity              | Finding                                                                                            | Fix                                                                                                         |
| --- | --------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | High (security)       | The seed would create `demo@binary.dev` with a password printed in the repo, even in production.   | Skipped when `NODE_ENV=production`; verified.                                                               |
| 2   | High (CI correctness) | Each test file ran migrations; on a fresh database, packages could race to create the same tables. | Turbo runs `@binary/db#db:migrate` once before `test`; tests no longer migrate. Verified on a new database. |
| 3   | Medium                | `drizzle-orm` was a runtime dependency of the API although only its tests import it.               | Moved to `devDependencies`.                                                                                 |
| 4   | Low                   | Prettier reformatted drizzle-kit's generated snapshot files.                                       | `packages/db/drizzle` added to `.prettierignore`.                                                           |
| 5   | Low (docs)            | Docs first said 17 enums.                                                                          | Corrected to 16 after counting the generated SQL.                                                           |

## Simplifications

- No Drizzle `relations()` yet: foreign keys define the model; nested-query
  helpers come when a chapter needs them.
- No generic `BaseRepository<T>`: two small, explicit classes are easier to read.
- No repositories for tables nothing uses yet; each feature chapter adds its own.
- The seed calls Better Auth's `signUpEmail` instead of hashing passwords itself.

## Accepted trade-offs

- Chapter 1 accounts are not migrated (singular → plural tables). It's
  local test data; the chapter README gives a one-line cleanup.
- Embedding size is fixed at 1536 for now.

## Open items (not blocking)

- Jojopen MCP still not connected; Mermaid used.
- Not on GitHub yet; `.github/workflows/ci.yml` will run these tests (its
  Postgres service image includes pgvector).
