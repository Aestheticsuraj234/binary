# Binary: chapters

Binary is a personal AI assistant you run locally: AI agents (coworkers) that
chat with you, use apps, run long jobs, and control a sandbox, a browser or
your own computer, with your approval. Web (Next.js) + mobile (Expo).

15 chapters, one feature each. One tool per job: E2B for sandboxes,
Playwright for browsers, Trigger.dev for long-running jobs, Postgres +
pgvector + LISTEN/NOTIFY (no Redis), MCP for apps (including Composio),
Vercel AI SDK for OpenAI / Anthropic / Gemini.

| #   | Chapter                                   | What it adds                                                                                                             | Status    |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------- |
| 1   | Project init and authentication setup     | Turborepo + pnpm monorepo, Hono API, Better Auth (email/password), sign-up/sign-in on web and mobile, design system, CI  | ✅ Done   |
| 2   | Database and ORM layer setup              | Drizzle ORM, full schema (24 tables, 16 enums), pgvector, migrations, Repository pattern, seed data                      | ✅ Done   |
| 3   | AI engine layer and API key vault         | Encrypted API keys (AES-256-GCM), AgentEngine (Strategy) + EngineFactory (Factory), multi-provider playground, app shell | ✅ Done   |
| 4   | Agents and templates                      | Agent CRUD API + web UI: name, role, model, approval mode; create from templates; layers, DTOs, AppError hierarchy       | ✅ Done ¹ |
| 5   | Real-time chat and threads                | Chat with an agent, streaming replies, threads and history, live updates via Postgres LISTEN/NOTIFY                      | ✅ Done ² |
| 6   | Tool system and MCP apps                  | Tool registry with risk levels (read / write / computer), connect apps through MCP servers, including Composio           | ✅ Done ³ |
| 7   | Durable jobs and routines                 | Long-running tasks and scheduled routines (cron, webhook, manual) on Trigger.dev, with run history                       | ✅ Done ⁴ |
| 8   | Approvals, permissions and Today inbox    | Approve or reject risky actions, per-agent approval modes, a "Today" inbox of everything waiting for you                 | ✅ Done ⁵ |
| 9   | Cloud sandboxes with E2B                  | Agents run code and commands in isolated E2B sandboxes                                                                   | Planned   |
| 10  | Browser automation with Playwright        | Agents browse, click, fill forms and read pages in a headless browser                                                    | Planned   |
| 11  | Controlling your computer with the Runner | A local Runner that lets agents control your own computer; Claude Code / Codex engines; E2B Desktop                      | Planned   |
| 12  | Memory and knowledge                      | Long-term memory and knowledge with pgvector similarity search                                                           | Planned   |
| 13  | Multi-agent teams and rooms               | Several agents working together in rooms, routed by @mention or automatically                                            | Planned   |
| 14  | Mobile app and voice                      | The full experience on the Expo app, plus voice input                                                                    | Planned   |
| 15  | Usage tracking, testing and deployment    | Token and cost tracking, end-to-end tests, final setup README so anyone can run it locally                               | Planned   |

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

## Every chapter ships with

- Plan and acceptance criteria, then code, tests, lint, typecheck and build
- A review against the Google TypeScript Style Guide
- Diagrams in `docs/chapters/chapter-XX/architecture/`
- Docs: README, IMPLEMENTATION, ARCHITECTURE, TESTING, PR_REVIEW, REBUILD_PROMPT
- Its own `feat/chapter-XX-*` branch with Conventional Commits, merged into `main`

After Chapter 15: integration review, full test suite, master architecture
diagram and `docs/REBUILD_PROJECT_PROMPT.md`.
