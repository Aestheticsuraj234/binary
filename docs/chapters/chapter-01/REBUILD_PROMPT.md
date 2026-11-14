# Rebuild prompt: Chapter 1, project init and authentication

> Paste everything below into a coding agent working in an empty folder. It
> rebuilds a functionally equivalent Chapter 1 of **Binary** without any
> other context.

---

You are a senior full-stack engineer and teacher. Build Chapter 1 of
**Binary**, an open-source personal AI assistant. This chapter delivers a
monorepo where a user can sign up, sign in and sign out on the web and on a
phone. Nothing about AI agents is built yet.

## Non-negotiable code rules

1. **Follow the Google TypeScript Style Guide**
   (https://google.github.io/styleguide/tsguide.html): `const` over `let`,
   never `var`; `===`; no `any` (use `unknown`); no non-null assertions and no
   unsafe casts; named exports (default exports only where Next.js, Expo
   Router or a config file requires them); `PascalCase` types/components,
   `camelCase` values, `UPPER_SNAKE_CASE` constants; function declarations for
   named functions; single quotes; comments that explain _why_.
2. **Beginner-friendly code:** short files and functions, early returns, no
   nested ternaries, no custom hooks, no wrapper functions, no form library,
   minimal `try/catch`. Prefer clear over clever.
3. Enforce rule 1 with ESLint (`typescript-eslint`) and Prettier.

## Stack (use these versions or newer compatible ones)

- Node 22+, pnpm 10 workspaces, Turborepo 2
- TypeScript **6.0.x** (typescript-eslint supports < 6.1)
- API: Hono 4 + `@hono/node-server`, Better Auth 1.7 + `@better-auth/expo`, `pg` 8, Zod 4, `tsx`
- Web: Next.js 16 (App Router), React 19.3.0, Tailwind CSS 4, shadcn/ui
  (new-york, zinc), `radix-ui`, `lucide-react`, `geist` font package
- Mobile: Expo SDK 58, Expo Router, `expo-secure-store`, `expo-network`,
  `expo-linking`, `expo-constants`, `expo-web-browser`. Install with
  `pnpm expo install`.
- Tests: Vitest 5
- Postgres 16 via Docker image `pgvector/pgvector:pg16`

## Folder structure

```text
binary/
├── apps/
│   ├── api/       src/{env,db,auth,app,index}.ts, src/app.test.ts, scripts/migrate.ts, vitest.config.ts
│   ├── web/       next.config.ts, src/app/{layout,page,globals.css}, src/app/(auth)/{layout,sign-in/page,sign-up/page}.tsx,
│   │              src/components/{brand/logo,auth/form-field,auth/sign-in-form,auth/sign-up-form,home/sign-out-button}.tsx,
│   │              src/components/ui/{button,input,label,card,avatar}.tsx, src/lib/{utils,env,auth-client,session}.ts
│   └── mobile/    app.json, src/app/{_layout,index,sign-in,sign-up}.tsx, src/components/{auth-screen,text-field,primary-button}.tsx,
│                  src/lib/{auth-client,theme}.ts, .env.example
├── packages/
│   ├── config/    tsconfig.base.json (strict, noUncheckedIndexedAccess, verbatimModuleSyntax, Bundler resolution)
│   └── shared/    src/{index,constants,auth-schemas,auth-schemas.test}.ts (exports TS source via "exports": {".": "./src/index.ts"})
├── docs/DESIGN_SYSTEM.md, docs/chapters/chapter-01/*
├── .github/workflows/ci.yml, docker-compose.yml, .env.example, eslint.config.mjs, .prettierrc.json, turbo.json
└── package.json, pnpm-workspace.yaml (with onlyBuiltDependencies: [esbuild])
```

Package names: `@binary/api`, `@binary/web`, `@binary/mobile`,
`@binary/shared`, `@binary/config`.

## Root scripts

`setup` = `docker compose up -d && pnpm --filter @binary/api db:migrate`;
`dev` = turbo `dev` for api + web; `mobile` = start Expo; `lint` = `eslint .`;
`typecheck`, `test`, `build` via turbo; `format` / `format:check` with Prettier
(`singleQuote: true`, `trailingComma: 'all'`, `bracketSpacing: false`).

## Environment

One root `.env` (from `.env.example`) read by the API and web:

```text
DATABASE_URL=postgres://binary:binary@localhost:5432/binary
BETTER_AUTH_SECRET=change-me          # must be replaced; 32+ chars required
BETTER_AUTH_URL=http://localhost:4000
WEB_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Mobile uses `apps/mobile/.env` with `EXPO_PUBLIC_API_URL=http://<laptop-wifi-ip>:4000`.

## Shared package

- `APP_NAME = 'Binary'`, `APP_TAGLINE = 'AI coworkers that get real work done.'`,
  `APP_SCHEME = 'binary'`.
- `signInSchema` = `{email: z.email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.')}`.
- `signUpSchema` = `{name: trimmed, 1–80 chars ('Enter your name.'), email, password: 8–128 chars ('Password must be at least 8 characters.')}`.
- Export the inferred types `SignInInput` and `SignUpInput`.

## API contracts

- `src/env.ts`: Zod-parse `DATABASE_URL` (url), `BETTER_AUTH_SECRET` (min 32,
  message `'BETTER_AUTH_SECRET must be at least 32 characters.'`),
  `BETTER_AUTH_URL` (url), `WEB_URL` (url), `PORT` (coerce number, default 4000).
- `src/auth.ts`: `betterAuth({baseURL, secret, database: pool, emailAndPassword: {enabled: true, minPasswordLength: 8}, trustedOrigins: [WEB_URL, 'binary://', ...(production ? [] : ['exp://', 'exp://**'])], plugins: [expo()]})`.
  Export `type Session = typeof auth.$Infer.Session`.
- `src/app.ts` (export `app`):
  - `app.use('/api/*', cors({origin: WEB_URL, credentials: true, allowMethods: ['GET','POST','OPTIONS']}))`
  - `app.on(['GET','POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))`
  - middleware on `/api/*` that sets `c.set('session', await auth.api.getSession({headers}))`
  - `GET /health` → `{status: 'ok'}`
  - `GET /api/me` → `401 {error: 'Not signed in.'}` or `200 {user}`
- `scripts/migrate.ts`: `getMigrations(auth.options)` from
  `better-auth/db/migration`; run when `toBeCreated`/`toBeAdded` is non-empty;
  end the pool. Run with `tsx --env-file=../../.env`.
- Tables created: `user`, `session`, `account`, `verification`.

## Web implementation

- `next.config.ts`: if the root `.env` exists, `process.loadEnvFile(path)`
  (do **not** use `@next/env` `loadEnvConfig`, which is cached for the app
  folder); `transpilePackages: ['@binary/shared']`.
- `src/lib/env.ts`: `API_URL = z.url('Set NEXT_PUBLIC_API_URL in the root .env file (see .env.example).').parse(process.env.NEXT_PUBLIC_API_URL)`.
- `src/lib/auth-client.ts`: `createAuthClient({baseURL: API_URL})` from
  `better-auth/react`; export `type Session = typeof authClient.$Infer.Session`.
- `src/lib/session.ts` (`import 'server-only'`): `getSession()` fetches
  `${API_URL}/api/auth/get-session` with `headers: {cookie: (await cookies()).toString()}`
  and `cache: 'no-store'`; returns `null` when not ok.
- `(auth)/layout.tsx`: redirect to `/` if signed in. Two columns on `lg`: left
  `bg-card` brand panel (logo, tagline as `text-4xl`, three lucide feature rows
  with lime icons, footer "Open source. Runs on your own machine."), right
  centered `max-w-sm` form. Phones show only the logo and the form.
- Forms (client components): read `FormData`, `safeParse` with the shared
  schema, show the first issue in `<p role="alert" class="text-sm text-destructive">`,
  call `authClient.signIn.email` / `signUp.email`, on success
  `router.replace('/')` then `router.refresh()`. Button text switches to
  "Signing in…" / "Creating account…" while pending. Link to the other form.
- `page.tsx` (home): redirect to `/sign-in` if signed out. Header (h-16, border-b):
  logo left; avatar with initials, email (hidden on small screens) and a ghost
  "Sign out" button right. Body (`max-w-3xl`): pill badge "You're signed in",
  `Welcome, {firstName}.`, a dashed-border empty-state card "No agents yet".
- Add shadcn components with `pnpm dlx shadcn@latest add button input label card avatar`.
  **Check** the generated imports use `@/lib/utils`, not a package called `cn`.

## Mobile implementation

- `app.json`: `name: 'Binary'`, `slug: 'binary'`, `scheme: 'binary'`,
  `userInterfaceStyle: 'dark'`, `backgroundColor: '#09090b'`,
  `main: 'expo-router/entry'` in package.json, routes under `src/app`.
- `auth-client.ts`: `createAuthClient({baseURL: process.env.EXPO_PUBLIC_API_URL, plugins: [expoClient({scheme: 'binary', storagePrefix: 'binary', storage: SecureStore})]})`.
- `index.tsx`: `authClient.useSession()`; spinner while pending; `<Redirect href="/sign-in" />`
  when signed out; otherwise a header (Binary, "Sign out") and the welcome +
  "No agents yet" card.
- `sign-in.tsx` / `sign-up.tsx`: controlled `TextField`s, the same shared
  schemas and messages, `PrimaryButton` (lime, 48px high), `router.replace('/')`
  on success, inside an `AuthScreen` (SafeAreaView, KeyboardAvoidingView,
  ScrollView, lime "01" logo tile, title, subtitle, error text).
- Style with `StyleSheet` and `theme.ts` constants. No styling library.

## Design system

Dark only. Tokens: background `#09090b`, card `#111113`, foreground `#fafafa`,
muted-foreground `#a1a1aa`, secondary/accent `#1c1c1f`, border/input `#27272a`,
primary and ring **`#d1fe17`** (acid lime), primary-foreground `#0a0a0a`,
destructive `#f87171`, radius `0.75rem`. Font Geist Sans / Geist Mono. Lime only for the
main action, focus rings and small icon accents. No gradients, glows or extra
animation. Logo: 32px lime rounded tile with mono "01" + "Binary". Document
everything in `docs/DESIGN_SYSTEM.md`.

## Tests

- `packages/shared`: valid sign-up passes; short password and invalid email fail
  with the exact messages; sign-in requires a password.
- `apps/api` (real Postgres; `vitest.config.ts` sets test env defaults and a
  32+ char secret): run migrations in `beforeAll`; delete the test user and
  end the pool in `afterAll`. Test `/health`; sign-up returns a cookie containing
  `session_token` (send `Origin: http://localhost:3000`); wrong password is 401;
  sign-in then `/api/me` with the cookie returns the user (`toMatchObject`);
  `/api/me` without a cookie is 401; an `OPTIONS` preflight from the web origin
  returns `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials: true`.

## CI

GitHub Actions on push/PR: Postgres service (`pgvector/pgvector:pg16`), then
`pnpm install --frozen-lockfile`, `format:check`, `lint`, `typecheck`, `test`,
and `pnpm --filter @binary/web build`.

## Acceptance criteria

- `pnpm install && cp .env.example .env` (set the secret) `&& pnpm setup && pnpm dev`
  runs the API on :4000 and web on :3000.
- Sign-up, sign-in, sign-out and wrong-password errors work on web and mobile.
- Signed-out `/` redirects to `/sign-in`; signed-in `/sign-in` redirects to `/`.
- The API exits with a clear message while the secret is `change-me`.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` and the web
  build all pass; `pnpm expo export --platform android` bundles the mobile app.

## Expected output

A monorepo matching the structure above, a root `README.md` with setup and
troubleshooting, `docs/DESIGN_SYSTEM.md`, and `docs/chapters/chapter-01/`
containing README, IMPLEMENTATION, ARCHITECTURE, TESTING, PR_REVIEW, this
prompt, and Mermaid diagrams (system overview + ER diagram, request flows,
mobile/setup flows) under `architecture/`.
