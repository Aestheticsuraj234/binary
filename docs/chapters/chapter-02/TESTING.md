# Chapter 2: Testing

```bash
pnpm setup   # once: Postgres + migrations + seed
pnpm test    # migrates first, then runs every package's tests
```

## Suites

| Suite                                | File                                                | Tests                                                                                                                                                                                                                        |
| ------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositories                         | `packages/db/src/repositories/repositories.test.ts` | find user by id; find by email ignoring case; unknown email returns `undefined`; template upsert creates; upsert updates instead of duplicating (5)                                                                          |
| Schema rules                         | `packages/db/src/schema/schema.test.ts`             | agent defaults (`api`, `ask_first`); thread with an agent is accepted; thread with neither agent nor room is rejected; one key per provider per user; vector search returns the closest memory; deleting a user cascades (6) |
| Auth API (Chapter 1, now on Drizzle) | `apps/api/src/app.test.ts`                          | 6, unchanged behaviour                                                                                                                                                                                                       |
| Validation (Chapter 1)               | `packages/shared/src/auth-schemas.test.ts`          | 4                                                                                                                                                                                                                            |

All database tests use a real Postgres with pgvector and clean up the rows
they create (a test user is deleted at the end, which cascades).

## Results

| Check                                            | Result                                                 |
| ------------------------------------------------ | ------------------------------------------------------ |
| Tests on the dev database                        | 21 / 21 passed                                         |
| Tests on a **brand-new** database (simulates CI) | 21 / 21 passed; migrations ran once; 24 tables created |
| Prettier, ESLint                                 | Clean                                                  |
| Type-check (api, web, mobile, shared, db)        | 5 / 5 passed                                           |
| Web production build                             | Passed                                                 |
| Seed run twice                                   | 4 templates, 1 demo user, no duplicates                |
| Seed with `NODE_ENV=production`                  | Demo user skipped                                      |

## Browser verification (Playwright, Chromium)

Re-run of the Chapter 1 flows against the Drizzle-backed API, at
1440×900 and 390×844:

| Step                                                 | Desktop | Phone |
| ---------------------------------------------------- | ------- | ----- |
| Signed-out `/` → `/sign-in`                          | ✓       | ✓     |
| Short password error                                 | ✓       | ✓     |
| Sign-up → "Welcome, Suraj."                          | ✓       | ✓     |
| Sign-out → `/sign-in`                                | ✓       | ✓     |
| Wrong password → "Invalid email or password"         | ✓       | ✓     |
| Sign-in → home                                       | ✓       | ✓     |
| Seeded `demo@binary.dev` signs in → "Welcome, Demo." | ✓       | n/a   |

## Not covered

- The mobile app was not changed in this chapter and was not re-bundled.
- Migration _rollback_ is not tested; Drizzle migrations are forward-only.
