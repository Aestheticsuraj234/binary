# Binary

An open-source personal AI assistant you run yourself. Hire AI coworkers with
a role, tools and memory, and let them work on your computer, in sandboxes and
in browsers, while you approve every risky action from the web or your phone.

Binary is built chapter by chapter on YouTube
([@codebysuraj](https://youtube.com/@codebysuraj)). Each chapter adds one
feature and is documented in [`docs/chapters`](docs/chapters).

> **Status:** Chapter 4 of 15. Accounts work on web and mobile, the full
> database schema is in place, you can connect your own OpenAI, Anthropic
> or Gemini key, and you can hire cartoon characters as agents, each with a
> job and a personality, and talk to them. Saved chats arrive in Chapter 5.

## What's inside

| Path              | What it is                                                  |
| ----------------- | ----------------------------------------------------------- |
| `apps/api`        | Hono API server with Better Auth (port 4000)                |
| `apps/web`        | Next.js web app with shadcn/ui and Tailwind CSS (port 3000) |
| `apps/mobile`     | Expo (React Native) app with Expo Router                    |
| `packages/db`     | Drizzle schema, migrations, client and repositories         |
| `packages/shared` | Validation schemas and constants used by every app          |
| `packages/config` | Shared TypeScript settings                                  |
| `docs`            | Design system and per-chapter documentation                 |

## Run it locally

### 1. Prerequisites

- [Node.js](https://nodejs.org) 22 or newer
- [pnpm](https://pnpm.io): run `corepack enable` once
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), for Postgres

### 2. Install

```bash
git clone <this-repo> binary
cd binary
pnpm install
cp .env.example .env
```

Open `.env` and replace both `change-me` values (`BETTER_AUTH_SECRET` and
`ENCRYPTION_KEY`) with real secrets. Run this once for each:

```bash
openssl rand -base64 32
```

The API refuses to start until you do. That's on purpose. Keep
`ENCRYPTION_KEY` safe: it encrypts the API keys users save, and changing it
later makes those keys unreadable.

### 3. Set up the database

```bash
pnpm setup
```

This starts Postgres in Docker, creates every table and adds starter data:
four agent templates and a demo account (`demo@binary.dev` /
`binary-demo-password`).

### 4. Start the API and web app

```bash
pnpm dev
```

Open http://localhost:3000, sign in with the demo account or create your
own, add an API key under **API keys**, then hire a character on
**Discover** or try the **Playground**.

### 5. Run the mobile app (optional)

Your phone can't reach `localhost` on your laptop, so point it at your laptop's
Wi-Fi IP address:

```bash
cp apps/mobile/.env.example apps/mobile/.env
# macOS: find your IP with `ipconfig getifaddr en0`, then put it in apps/mobile/.env
pnpm mobile
```

Scan the QR code with the [Expo Go](https://expo.dev/go) app. Your phone and
laptop must be on the same Wi-Fi.

## Everyday commands

| Command            | What it does                                 |
| ------------------ | -------------------------------------------- |
| `pnpm dev`         | Start the API and web app                    |
| `pnpm mobile`      | Start the Expo dev server                    |
| `pnpm test`        | Migrate, then run all tests (needs Postgres) |
| `pnpm db:migrate`  | Apply pending database migrations            |
| `pnpm db:generate` | Create a migration after changing the schema |
| `pnpm db:studio`   | Browse the database in Drizzle Studio        |
| `pnpm db:seed`     | Add the templates and demo account again     |
| `pnpm lint`        | Check code style (Google TypeScript Style)   |
| `pnpm typecheck`   | Type-check every app and package             |
| `pnpm format`      | Format every file with Prettier              |
| `pnpm build`       | Production build                             |

## Troubleshooting

- **Port 5432 already in use.** Another Postgres is running. Stop it, or change
  the port in `docker-compose.yml` and `DATABASE_URL`.
- **Port 3000 or 4000 already in use.** Stop the other dev server and run
  `pnpm dev` again.
- **The web app shows `NEXT_PUBLIC_API_URL` errors.** Check that `.env` exists
  in the repo root and contains `NEXT_PUBLIC_API_URL=http://localhost:4000`.
- **API says `ENCRYPTION_KEY must be 32 bytes`.** Coming from Chapter 2? Add
  `ENCRYPTION_KEY=` with the output of `openssl rand -base64 32` to `.env`.
- **The playground shows a provider error.** The key may be wrong, or the
  model id may have been renamed by the provider; pick another model.
- **Coming from Chapter 1?** Chapter 2 moved to new, plural table names, so
  old accounts are gone. Run `pnpm setup` again and sign up or use the demo
  account. See [Chapter 2](docs/chapters/chapter-02/README.md#coming-from-chapter-1).
- **The phone can't sign in.** Check `apps/mobile/.env` uses your laptop's IP,
  not `localhost`, and that the API is running.

## Code style

Binary follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html),
enforced by ESLint and Prettier. Code is written to be read by beginners:
short functions, early returns, and no clever abstractions.

## Docs

- [Design system](docs/DESIGN_SYSTEM.md)
- [Chapter 1: Project init and authentication](docs/chapters/chapter-01/README.md)
- [Chapter 2: Database and ORM layer](docs/chapters/chapter-02/README.md)
- [Chapter 3: AI engine layer and API key vault](docs/chapters/chapter-03/README.md)
- [Chapter 4: Agents](docs/chapters/chapter-04/README.md)
