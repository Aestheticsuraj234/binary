# Binary: chapters

Binary is a personal AI assistant you run locally: AI agents (coworkers) that
chat with you, use apps, run long jobs, and control a sandbox, a browser or
your own computer, with your approval. Web (Next.js) + mobile (Expo).

15 chapters, one feature each. One tool per job: E2B for sandboxes,
Playwright for browsers, Trigger.dev for long-running jobs, Postgres +
pgvector + LISTEN/NOTIFY (no Redis), MCP for apps (including Composio),
Vercel AI SDK for OpenAI / Anthropic / Gemini.

| #   | Chapter                                   | What it adds                                                                                                              | Status     |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Project init and authentication setup     | Turborepo + pnpm monorepo, Hono API, Better Auth (email/password), sign-up/sign-in on web and mobile, design system, CI   | ✅ Done    |
| 2   | Database and ORM layer setup              | Drizzle ORM, full schema (24 tables, 16 enums), pgvector, migrations, Repository pattern, seed data                       | ✅ Done    |
| 3   | AI engine layer and API key vault         | Encrypted API keys (AES-256-GCM), AgentEngine (Strategy) + EngineFactory (Factory), multi-provider playground, app shell  | ✅ Done    |
| 4   | Agents and templates                      | Agent CRUD API + web UI: name, role, model, approval mode; create from templates; layers, DTOs, AppError hierarchy        | ✅ Done ¹  |
| 5   | Real-time chat and threads                | Chat with an agent, streaming replies, threads and history, live updates via Postgres LISTEN/NOTIFY                       | ✅ Done ²  |
| 6   | Tool system and MCP apps                  | Tool registry with risk levels (read / write / computer), connect apps through MCP servers, including Composio            | ✅ Done ³  |
| 7   | Durable jobs and routines                 | Long-running tasks and scheduled routines (cron, webhook, manual) on Trigger.dev, with run history                        | ✅ Done ⁴  |
| 8   | Approvals, permissions and Today inbox    | Approve or reject risky actions, per-agent approval modes, a "Today" inbox of everything waiting for you                  | ✅ Done ⁵  |
| 9   | Cloud sandboxes with E2B                  | Agents run code and commands in isolated E2B sandboxes                                                                    | ✅ Done ⁶  |
| 10  | Browser automation with Playwright        | Agents browse, click, fill forms and read pages in a headless browser                                                     | ✅ Done ⁷  |
| 11  | Controlling your computer with the Runner | A local Runner that lets agents control your own computer; Claude Code / Codex engines; E2B Desktop                       | ✅ Done ⁸  |
| 12  | Memory and knowledge                      | Long-term memory and knowledge with pgvector similarity search                                                            | ✅ Done ⁹  |
| 13  | Multi-agent teams and rooms               | Several agents working together in rooms, routed by @mention or automatically                                             | ✅ Done ¹⁰ |
| 14  | Mobile app and voice                      | The full experience on the Expo app, plus voice input                                                                     | ✅ Done ¹¹ |
| 15  | Ready to share                            | A README with every feature and real screenshots, a setup guide from env keys to every service, verified on a fresh clone | ✅ Done ¹² |

¹ Chapter 4 also became a character-first redesign (part 2). Two scope items
were left out: the **approval mode** field (its behaviour belongs to Chapter
8, so it is exposed there) and the **`AppError` hierarchy**, which Chapter 6 added (tools bring several
new kinds of failure).

² Chapter 5 also gained Markdown rendering (part 2). **Live updates via
Postgres LISTEN/NOTIFY are not built yet**: chats stream to the tab that
sent the message, but other open tabs and devices only update on reload.

³ Chapter 6 blocked **write** and **computer** tools until Chapter 8 could
ask you first. Since Chapter 8 they ask, depending on the agent's approval
mode.

⁴ Chapter 7 was verified on a real Trigger.dev project (Run now, a cron
firing, schedule removal). Without Trigger.dev, routines run inside the API
and schedules don't fire.

⁵ Chapter 8 asks without holding anything open: a request is a row, decided
once, and the agent follows up in its chat. Agents hired before it keep the
database default, **Ask first**; new ones start on **Auto-approve reads**.
Requests don't expire yet, and the Today count updates on page load (still
no LISTEN/NOTIFY).

⁶ Chapter 9 gives each chat its own E2B sandbox, started on the first
approved run and stopped after 10 idle minutes. It is optional: without
`E2B_API_KEY`, characters have no sandbox. Verified on real E2B (code,
charts, files, stop) with a scripted model.

⁷ Chapter 10 runs Playwright Chromium inside the API, one context per chat.
Opening and reading pages run on their own; clicking and typing ask first.
Every request the browser makes is limited to public addresses. Browsers
live in memory, so a restart closes them. Chapter 9's `/api/sandboxes`
became `/api/computers`, for sandboxes and browsers alike. Verified with
real models (Claude Sonnet 5.5 in the browser, GPT-5.5 in an E2B sandbox),
which also added math rendering to chat answers.

⁸ Chapter 11's Runner long-polls the API and enforces the shared folders on
your computer. Its jobs live in the API's memory, so routines on the
Trigger.dev worker can't reach your computer yet. Claude Code and Codex are
covered with stand-in CLIs. The cloud desktop was verified on real E2B with
Claude Sonnet. Adds one migration (`devices.token_hash`).

⁹ Chapter 12 embeds with OpenAI's `text-embedding-3-small` (or Google's
`gemini-embedding-001`) into pgvector; Anthropic-only users have no memory
or knowledge until they add one of those keys. Memories are per character,
knowledge per user. Verified with real embeddings and Claude Sonnet.
Adds one migration (`0004_knowledge`).

¹⁰ Chapter 13's rooms answer in turn (at most 4 answers per message), with
@mentions, automatic routing by the lead's model, and hand-offs. No
migration. Verified with a real room mixing Claude and GPT models.

¹¹ Chapter 14's app has four tabs (Crew, Rooms, Today, You) and both kinds
of chat, streamed; hiring, apps, keys and routines stay on the web. Voice
input is transcribed on the API with the user's OpenAI key
(`gpt-4o-mini-transcribe`), with their characters' names as a hint, and
lands in the message box. Decisions from the phone are saved as `mobile`.
No migration. Verified with a real recording and on the iOS simulator.

¹² Chapter 15 changed from "usage tracking, testing and deployment" to
making Binary ready to share with students: the README, 27 real
screenshots, `docs/SETUP.md`, and a whole-system architecture overview.
Following the guide on a fresh clone found and fixed three problems
(`pnpm trigger:dev` couldn't build since Chapter 10, tests ignored
`DATABASE_URL` in `.env`, an install warning). Deployment, usage tracking
and browser end-to-end tests are left for later.

## Every chapter ships with

- Plan and acceptance criteria, then code, tests, lint, typecheck and build
- A review against the Google TypeScript Style Guide
- Diagrams in `docs/chapters/chapter-XX/architecture/`
- Docs: README, IMPLEMENTATION, ARCHITECTURE, TESTING, PR_REVIEW, REBUILD_PROMPT
- Its own `feat/chapter-XX-*` branch with Conventional Commits, merged into `main`

After Chapter 15: the whole-system architecture is in
[Chapter 15](chapters/chapter-15/ARCHITECTURE.md), and the setup guide in
[`SETUP.md`](SETUP.md). Still to come: `docs/REBUILD_PROJECT_PROMPT.md`.
