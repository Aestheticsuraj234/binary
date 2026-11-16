# Binary

**AI coworkers you run yourself.** Hire cartoon characters with a job, a
personality and a model to think with. They use tools and apps, run code,
browse the web, work on your computer, remember you, and work together in
rooms, while you approve every risky step from the web or your phone.

Binary is open source and built chapter by chapter on YouTube
([@codebysuraj](https://youtube.com/@codebysuraj)). Every chapter is
documented in [`docs/chapters`](docs/chapters), so you can follow along,
or rebuild any part yourself.

![Your crew on the home page](docs/screenshots/home.png)

**→ [Set it up in 10 minutes](docs/SETUP.md)**

## Contents

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [How it's built](#how-its-built)
- [Project structure](#project-structure)
- [Everyday commands](#everyday-commands)
- [The course: 15 chapters](#the-course-15-chapters)
- [Code style](#code-style)

## What it does

### Characters with a job

Hire from templates or start blank. Each character has a role,
instructions, a model (OpenAI, Anthropic or Google, with **your own
keys**), a permission level and, optionally, a computer.

| Discover and hire                          | Edit a character                                     |
| ------------------------------------------ | ---------------------------------------------------- |
| ![Discover](docs/screenshots/discover.png) | ![Edit a character](docs/screenshots/agent-edit.png) |

### Chat that streams, with tools

Answers stream in word by word, with Markdown, code and math. Every tool a
character uses shows up in its answer, and the character on stage reacts:
thinking, talking, happy, or "oops".

| A browser step, with its screenshot                            | Code in a cloud sandbox, with its chart                  |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| ![Nova reads a GitHub page](docs/screenshots/chat-browser.png) | ![Bolt plots a chart](docs/screenshots/chat-sandbox.png) |

### Apps and tools (MCP)

Built-in tools work at once. Connect any [MCP](https://modelcontextprotocol.io)
server (DeepWiki, or Gmail, GitHub and Slack through Composio), and
characters can use its tools.

| Apps & tools                               | A character using DeepWiki                           |
| ------------------------------------------ | ---------------------------------------------------- |
| ![Apps & tools](docs/screenshots/apps.png) | ![Mimi asks DeepWiki](docs/screenshots/chat-mcp.png) |

### You approve risky actions

Tools are **read**, **write** or **computer**. Each character has a
permission level, from "Plan only" to "Accept edits". Anything risky waits
for you, in the chat or in the **Today** inbox, which also shows what your
routines did.

| Waiting in the chat                                    | Today                                |
| ------------------------------------------------------ | ------------------------------------ |
| ![Bolt asks first](docs/screenshots/chat-approval.png) | ![Today](docs/screenshots/today.png) |

### Computers: sandbox, browser, desktop, yours

- **Cloud sandbox** ([E2B](https://e2b.dev)): Python and shell, files,
  charts.
- **Browser** (Playwright): opens, reads, clicks and types on the public
  web, with a screenshot of every step.
- **Cloud desktop** (E2B Desktop): a Linux desktop it uses with the mouse
  and keyboard. You can watch live.
- **Your computer** (the Runner): works in folders you share, or thinks
  with **Claude Code** or **Codex**.

| A cloud desktop                                           | Pair your computer                                     |
| --------------------------------------------------------- | ------------------------------------------------------ |
| ![Claude on a desktop](docs/screenshots/chat-desktop.png) | ![Your computers](docs/screenshots/computers-pair.png) |

### Memory and knowledge

Characters remember lasting facts about you across chats, and search your
documents by meaning (pgvector) and cite them.

| Moss answers from the handbook, your way                        | Knowledge                                    | Memory                                 |
| --------------------------------------------------------------- | -------------------------------------------- | -------------------------------------- |
| ![Moss cites the handbook](docs/screenshots/chat-knowledge.png) | ![Knowledge](docs/screenshots/knowledge.png) | ![Memory](docs/screenshots/memory.png) |

### Routines

Give a character a job to do on a schedule, by webhook or on demand. Runs
are durable jobs on [Trigger.dev](https://trigger.dev), each with its full
transcript.

| Routines                                   | A routine                                     | Its run                                           |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------------------- |
| ![Routines](docs/screenshots/routines.png) | ![Morning plan](docs/screenshots/routine.png) | ![Sunny's plan](docs/screenshots/routine-run.png) |

### Rooms: a team in one chat

Put 2–6 characters in a room. @Mention who should answer, or let the lead
pick. They see each other's answers and hand work over with @mentions.

![The Launch crew splits the work](docs/screenshots/room.png)

### On your phone, by voice

The Expo app has your crew, rooms and Today, with streaming chats and
approvals. Tap the mic and talk: your words land in the box.

| Crew                                      | Chat                                      | Room                                      | Today                                       | Voice                                       |
| ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| ![Crew](docs/screenshots/mobile-crew.png) | ![Chat](docs/screenshots/mobile-chat.png) | ![Room](docs/screenshots/mobile-room.png) | ![Today](docs/screenshots/mobile-today.png) | ![Voice](docs/screenshots/mobile-voice.png) |

### And more

| Playground: one prompt, every provider         | API keys, encrypted                        | Sign in                                  |
| ---------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| ![Playground](docs/screenshots/playground.png) | ![API keys](docs/screenshots/settings.png) | ![Sign in](docs/screenshots/sign-in.png) |

The web app works on a phone-sized screen too
([see it](docs/screenshots/web-phone.png)).

## Quick start

You need Node.js 22+, Docker Desktop and one AI key (OpenAI, Anthropic or
Google).

```bash
git clone https://github.com/Aestheticsuraj234/binary.git
cd binary
corepack enable
pnpm install
cp .env.example .env
# Replace both "change-me" values in .env with: openssl rand -base64 32
pnpm setup
pnpm dev
```

Open http://localhost:3000, sign in with `demo@binary.dev` /
`binary-demo-password`, add a key on **API keys**, and hire a character.

**[The setup guide](docs/SETUP.md)** covers every `.env` line, where to
get each key, every optional feature (E2B, Trigger.dev, MCP apps, the
Runner, Claude Code and Codex, the mobile app, voice) and troubleshooting.

## How it's built

```mermaid
flowchart LR
  subgraph clients["Clients"]
    W["Web app<br/>Next.js 16 · shadcn/ui · Tailwind"]
    M["Mobile app<br/>Expo · Expo Router"]
    R["Runner<br/>on your computer"]
  end

  subgraph api["API (Hono, Node)"]
    A["Better Auth<br/>sessions"]
    E["Engines<br/>Vercel AI SDK · Claude Code · Codex"]
    T["Tools<br/>built-in · MCP · computers"]
    J["Jobs<br/>routines"]
  end

  DB[("Postgres + pgvector<br/>Drizzle ORM")]
  P(["OpenAI · Anthropic · Google"])
  X(["E2B · Playwright Chromium · MCP servers"])
  TD(["Trigger.dev"])

  W & M -->|"REST + NDJSON streams"| api
  R -->|"long-poll"| api
  api --> DB
  E --> P
  T --> X
  J --> TD
```

| Layer    | Tech                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| Monorepo | pnpm workspaces, Turborepo, TypeScript (strict)                              |
| API      | Hono, Better Auth, Vercel AI SDK, Zod, MCP SDK, Playwright, E2B, Trigger.dev |
| Data     | Postgres 16, pgvector, Drizzle ORM (Repository pattern)                      |
| Web      | Next.js 16 (App Router), React 19, shadcn/ui, Tailwind CSS 4                 |
| Mobile   | Expo SDK 58, Expo Router, react-native-svg, expo-audio                       |
| Quality  | Vitest, ESLint (Google TypeScript Style), Prettier, GitHub Actions           |

The whole system, piece by piece: the
[architecture overview](docs/ARCHITECTURE.md).

## Project structure

| Path              | What it is                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `apps/api`        | Hono API with Better Auth, engines, tools, routines (port 4000)                                  |
| `apps/web`        | Next.js web app (port 3000)                                                                      |
| `apps/mobile`     | Expo (React Native) app with Expo Router                                                         |
| `apps/runner`     | The Runner: lets characters work on your computer                                                |
| `packages/db`     | Drizzle schema, migrations, client and repositories                                              |
| `packages/shared` | Types, validation schemas and constants every app uses                                           |
| `packages/config` | Shared TypeScript settings                                                                       |
| `docs`            | [Setup](docs/SETUP.md), [design system](docs/DESIGN_SYSTEM.md), [the chapters](docs/CHAPTERS.md) |

## Everyday commands

| Command                                                         | What it does                                        |
| --------------------------------------------------------------- | --------------------------------------------------- |
| `pnpm setup`                                                    | Postgres in Docker, tables, starter data, Chromium  |
| `pnpm dev`                                                      | Start the API and web app                           |
| `pnpm mobile`                                                   | Start the Expo dev server                           |
| `pnpm trigger:dev`                                              | Run routines on Trigger.dev (optional)              |
| `pnpm runner pair <CODE>` / `pnpm runner start --folder <path>` | Let characters work on this computer                |
| `pnpm browsers:install`                                         | Download Chromium for characters' browsers          |
| `pnpm test`                                                     | Run all tests (needs Postgres)                      |
| `pnpm lint` / `pnpm typecheck` / `pnpm format`                  | Code style, types, formatting                       |
| `pnpm build`                                                    | Production build                                    |
| `pnpm db:migrate` / `pnpm db:generate`                          | Apply migrations / create one after a schema change |
| `pnpm db:studio`                                                | Browse the database in Drizzle Studio               |
| `pnpm db:seed`                                                  | Add the templates and demo account again            |

## The course: 15 chapters

Each chapter adds one feature: a short README, one diagram, and a
natural prompt you paste into your own coding agent to build it yourself.
[The plan](docs/CHAPTERS.md).

| #   | Chapter                                                                                   |
| --- | ----------------------------------------------------------------------------------------- |
| 1   | [Project init and authentication](docs/chapters/chapter-01/README.md)                     |
| 2   | [Database and ORM layer](docs/chapters/chapter-02/README.md)                              |
| 3   | [AI engine layer and API key vault](docs/chapters/chapter-03/README.md)                   |
| 4   | [Agents](docs/chapters/chapter-04/README.md)                                              |
| 5   | [Chat](docs/chapters/chapter-05/README.md)                                                |
| 6   | [Tool system and MCP apps](docs/chapters/chapter-06/README.md)                            |
| 7   | [Durable jobs and routines](docs/chapters/chapter-07/README.md)                           |
| 8   | [Approvals, permissions and Today](docs/chapters/chapter-08/README.md)                    |
| 9   | [Cloud sandboxes with E2B](docs/chapters/chapter-09/README.md)                            |
| 10  | [Browser automation with Playwright](docs/chapters/chapter-10/README.md)                  |
| 11  | [Controlling your computer with the Runner](docs/chapters/chapter-11/README.md)           |
| 12  | [Memory and knowledge](docs/chapters/chapter-12/README.md)                                |
| 13  | [Multi-agent teams and rooms](docs/chapters/chapter-13/README.md)                         |
| 14  | [Mobile app and voice](docs/chapters/chapter-14/README.md)                                |
| 15  | [Ready to share: README, screenshots and setup guide](docs/chapters/chapter-15/README.md) |

## Code style

Binary follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html),
enforced by ESLint and Prettier. Code is written to be read by beginners:
short functions, early returns, and no clever abstractions. The look is
in the [design system](docs/DESIGN_SYSTEM.md).
