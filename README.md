# Binary

An open-source personal AI assistant you run yourself. Hire AI coworkers with
a role, tools and memory, and let them work on your computer, in sandboxes and
in browsers, while you approve every risky action from the web or your phone.

Binary is built chapter by chapter on YouTube
([@codebysuraj](https://youtube.com/@codebysuraj)). Each chapter adds one
feature and is documented in [`docs/chapters`](docs/chapters).

> **Status:** Chapter 12 of 15 (see [the plan](docs/CHAPTERS.md)). Hire
> cartoon characters as agents, chat with them (streamed, saved, Markdown),
> give them tools and MCP apps, and set up routines they run on a schedule,
> by webhook or on demand, on Trigger.dev. Each character has a permission
> level: tools that change things ask first, and you approve or reject them
> in the chat or in the **Today** inbox. Characters with a cloud sandbox
> (E2B) run code, commands and files, and charts show up in the chat.
> Characters with a browser (Playwright) open, read, click and type on the
> public web, with a screenshot of every step. Pair your own computer with the
> Runner to let characters work in folders you share, think with Claude Code
> or Codex, or use a cloud desktop you can watch live. Characters remember
> you across chats, and search your documents (Knowledge) and cite them.

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

Two services are optional, each turned on by one key in `.env`:
`TRIGGER_SECRET_KEY` runs routines on Trigger.dev
([Chapter 7](docs/chapters/chapter-07/README.md)), and `E2B_API_KEY` gives
characters a cloud sandbox to run code in
([Chapter 9](docs/chapters/chapter-09/README.md)). Characters' browsers
([Chapter 10](docs/chapters/chapter-10/README.md)) need Chromium, which
`pnpm setup` downloads; on an older checkout, run `pnpm browsers:install`.

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

| Command                                                         | What it does                                        |
| --------------------------------------------------------------- | --------------------------------------------------- |
| `pnpm dev`                                                      | Start the API and web app                           |
| `pnpm mobile`                                                   | Start the Expo dev server                           |
| `pnpm trigger:dev`                                              | Run routines on Trigger.dev (optional, Ch. 7)       |
| `pnpm browsers:install`                                         | Download Chromium for characters' browsers (Ch. 10) |
| `pnpm runner pair <CODE>` / `pnpm runner start --folder <path>` | Let characters work on this computer (Ch. 11)       |
| `pnpm test`                                                     | Migrate, then run all tests (needs Postgres)        |
| `pnpm db:migrate`                                               | Apply pending database migrations                   |
| `pnpm db:generate`                                              | Create a migration after changing the schema        |
| `pnpm db:studio`                                                | Browse the database in Drizzle Studio               |
| `pnpm db:seed`                                                  | Add the templates and demo account again            |
| `pnpm lint`                                                     | Check code style (Google TypeScript Style)          |
| `pnpm typecheck`                                                | Type-check every app and package                    |
| `pnpm format`                                                   | Format every file with Prettier                     |
| `pnpm build`                                                    | Production build                                    |

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

- [The 15 chapters](docs/CHAPTERS.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Chapter 1: Project init and authentication](docs/chapters/chapter-01/README.md)
- [Chapter 2: Database and ORM layer](docs/chapters/chapter-02/README.md)
- [Chapter 3: AI engine layer and API key vault](docs/chapters/chapter-03/README.md)
- [Chapter 4: Agents](docs/chapters/chapter-04/README.md)
- [Chapter 5: Chat](docs/chapters/chapter-05/README.md)
- [Chapter 6: Tool system and MCP apps](docs/chapters/chapter-06/README.md)
- [Chapter 7: Durable jobs and routines](docs/chapters/chapter-07/README.md)
- [Chapter 8: Approvals, permissions and Today](docs/chapters/chapter-08/README.md)
- [Chapter 9: Cloud sandboxes with E2B](docs/chapters/chapter-09/README.md)
- [Chapter 10: Browser automation with Playwright](docs/chapters/chapter-10/README.md)
- [Chapter 11: Controlling your computer with the Runner](docs/chapters/chapter-11/README.md)
- [Chapter 12: Memory and knowledge](docs/chapters/chapter-12/README.md)
