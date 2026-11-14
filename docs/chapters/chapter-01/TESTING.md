# Chapter 1: Testing

## Automated tests

Run everything (Postgres must be running: `pnpm setup` once):

```bash
pnpm test
```

| Suite      | File                                       | What it proves                                                                                                                                                                                                 |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validation | `packages/shared/src/auth-schemas.test.ts` | Valid sign-up passes; short password and bad email fail with the right message; sign-in needs a password (4 tests)                                                                                             |
| Auth API   | `apps/api/src/app.test.ts`                 | Health check; sign-up returns a session cookie; wrong password is `401`; sign-in + `GET /api/me` returns the user; `/api/me` without a session is `401`; CORS allows the web origin with credentials (6 tests) |

The API tests use the real Better Auth instance and a real Postgres database.
They run the migrations first and delete their test user afterwards. In CI,
Postgres runs as a service container (see `.github/workflows/ci.yml`).

## Other checks

```bash
pnpm format:check   # Prettier
pnpm lint           # ESLint with Google style rules
pnpm typecheck      # tsc in every app and package
pnpm --filter @binary/web build
```

Mobile bundling check (no device needed):

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000 pnpm expo export --platform android
```

## Results for this chapter

| Check                                 | Result                               |
| ------------------------------------- | ------------------------------------ |
| Unit + integration tests              | 10 / 10 passed                       |
| Prettier                              | All files formatted                  |
| ESLint                                | 0 problems                           |
| Type-check (api, web, mobile, shared) | 4 / 4 passed                         |
| Web production build                  | Passed (`/`, `/sign-in`, `/sign-up`) |
| Android bundle (`expo export`)        | Passed (3.3 MB Hermes bundle)        |

## Browser verification (Playwright, Chromium)

Run against the production build at desktop (1440×900) and phone (390×844)
widths:

| Step                                                           | Desktop | Phone |
| -------------------------------------------------------------- | ------- | ----- |
| Signed-out `/` redirects to `/sign-in`                         | ✓       | ✓     |
| Short password shows "Password must be at least 8 characters." | ✓       | ✓     |
| Sign-up lands on home: "Welcome, Suraj."                       | ✓       | ✓     |
| Sign-out returns to `/sign-in`                                 | ✓       | ✓     |
| Wrong password shows "Invalid email or password"               | ✓       | ✓     |
| Sign-in lands on home                                          | ✓       | ✓     |

## Not yet tested automatically

- The mobile screens on a real device or simulator. Bundling is verified;
  run `pnpm mobile` with Expo Go to try the flow by hand.
- Web UI flows in CI. The Playwright check above was run by hand; a
  Playwright suite in CI is planned for the testing chapter (15).
