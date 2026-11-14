# Chapter 1: Implementation

## Plan

1. Create the monorepo: pnpm workspaces, Turborepo, shared TypeScript config,
   ESLint (Google style rules), Prettier.
2. Start Postgres with Docker Compose (pgvector image, ready for later chapters).
3. Build the API: Hono server, Better Auth with email + password, a session
   middleware and one protected route (`GET /api/me`).
4. Put the form validation in `packages/shared` so every app uses it.
5. Build the web app: sign-up, sign-in and a protected home page, using
   shadcn/ui and the Binary design tokens.
6. Build the mobile app: the same three screens in Expo Router, with the
   session kept in secure storage.
7. Test, lint, type-check, build, and verify the UI in a real browser.

## Acceptance criteria

- [x] `pnpm install`, `pnpm setup` and `pnpm dev` start the whole system.
- [x] A visitor can create an account on the web and lands on the home page.
- [x] A user can sign out and sign back in. A wrong password shows an error.
- [x] Visiting `/` while signed out redirects to `/sign-in`.
- [x] Visiting `/sign-in` while signed in redirects to `/`.
- [x] Form errors (short password, bad email) show the same message on web
      and mobile.
- [x] `GET /api/me` returns the user with a session and `401` without.
- [x] The mobile app signs up, signs in and signs out, and bundles for Android.
- [x] The API refuses to start with a missing or placeholder secret.
- [x] Lint, type-check, tests and the web build all pass.

## File-by-file

### Root

| File                       | Why it exists                                             |
| -------------------------- | --------------------------------------------------------- |
| `package.json`             | Workspace scripts: `setup`, `dev`, `lint`, `test`, …      |
| `pnpm-workspace.yaml`      | Lists `apps/*` and `packages/*` as workspace packages     |
| `turbo.json`               | Runs `build`, `typecheck`, `test` across packages         |
| `eslint.config.mjs`        | Google TypeScript Style Guide rules (see PR_REVIEW.md)    |
| `.prettierrc.json`         | Single quotes, semicolons, trailing commas (Google style) |
| `docker-compose.yml`       | Postgres 16 with pgvector                                 |
| `.env.example`             | Every setting with a comment; copy to `.env`              |
| `.github/workflows/ci.yml` | Lint, type-check, test (with Postgres), build             |

### `packages/shared`

- `constants.ts`: `APP_NAME`, `APP_TAGLINE`, `APP_SCHEME` (`binary`).
- `auth-schemas.ts`: `signInSchema` and `signUpSchema` (Zod). Exported as
  TypeScript source; Next.js compiles it via `transpilePackages`, Metro and
  `tsx` compile it on the fly.

### `apps/api`

- `src/env.ts`: validates environment variables with Zod at startup.
- `src/db.ts`: one `pg.Pool`.
- `src/auth.ts`: the Better Auth instance. Email + password, trusted origins
  (web URL, `binary://`, and `exp://` only outside production), and the
  `expo()` plugin.
- `src/app.ts`: the Hono app. CORS for the web origin with credentials, the
  Better Auth handler on `/api/auth/*`, a middleware that puts the session on
  the context, `GET /health` and `GET /api/me`.
- `src/index.ts`: starts the server with `@hono/node-server`.
- `scripts/migrate.ts`: creates or updates the auth tables using Better Auth's
  `getMigrations`. No ORM yet; Chapter 2 introduces Drizzle.

### `apps/web`

- `next.config.ts`: loads the root `.env` with Node's built-in
  `process.loadEnvFile`, and compiles `@binary/shared`.
- `src/lib/env.ts`: validates `NEXT_PUBLIC_API_URL`, so a missing value fails
  with a clear message rather than `undefined/api/...`.
- `src/lib/auth-client.ts`: the browser auth client.
- `src/lib/session.ts`: `getSession()` for server components; forwards the
  cookie to the API.
- `src/app/(auth)/layout.tsx`: split auth layout; redirects signed-in users.
- `src/app/(auth)/sign-in|sign-up/page.tsx`: render the forms.
- `src/components/auth/*`: the two forms and a small `FormField`.
- `src/app/page.tsx`: protected home page; redirects signed-out users.
- `src/components/ui/*`: shadcn/ui components (button, input, label, card, avatar).

### `apps/mobile`

- `app.json`: name, `scheme: "binary"`, dark UI.
- `src/lib/auth-client.ts`: auth client with the `expoClient` plugin and
  `expo-secure-store`.
- `src/lib/theme.ts`: design tokens as constants.
- `src/app/_layout.tsx`: a header-less stack.
- `src/app/index.tsx`: home; redirects to `/sign-in` when signed out.
- `src/app/sign-in.tsx`, `sign-up.tsx`: the forms.
- `src/components/*`: `AuthScreen`, `TextField`, `PrimaryButton`.

## Decisions

| Decision                                        | Why                                                                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Better Auth creates its own tables in Chapter 1 | Keeps the ORM (Chapter 2) out of this chapter. The Better Auth CLI is not needed: `getMigrations` runs from a small script.                                                    |
| One root `.env` for API + web                   | One file to edit. The API loads it with `--env-file`; Next.js with `process.loadEnvFile` (Next's own `loadEnvConfig` caches the app folder's env and ignores a second folder). |
| Server-side session check in Next.js            | No flash of the wrong page. The session cookie is shared across ports on `localhost`, so the web server forwards it to the API.                                                |
| Plain `StyleSheet` on mobile, not NativeWind    | The scope doc listed NativeWind, but it needs Babel, Metro and a separate Tailwind v3 setup. Plain styles + a shared `theme.ts` are simpler for beginners.                     |
| TypeScript 6.0, not 7.0                         | `typescript-eslint` supports TypeScript below 6.1.                                                                                                                             |
| Forms without a form library                    | Two or three fields each. `FormData` + the shared Zod schema is enough and easier to read.                                                                                     |
| Dark theme only                                 | One coherent look; avoids doubling every token.                                                                                                                                |

## How this connects to the next chapters

- **Chapter 2** replaces `scripts/migrate.ts` with Drizzle migrations and adds
  every entity from the scope doc. The four auth tables stay as they are.
- **Chapter 4** (agents) uses the `session` set by the middleware in `app.ts`
  to scope every agent to its owner.
- The `pgvector` image is already in place for **Chapter 12** (memory).
