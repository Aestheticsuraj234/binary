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

¹ Chapter 4 became a character-first redesign: every agent is played by a
cartoon character. Approval modes arrive in Chapter 8, and the `AppError`
hierarchy in Chapter 6.

² Chapter 5 also renders Markdown. Live updates across tabs (Postgres
LISTEN/NOTIFY) are not built: other tabs and devices update on reload.

³ Chapter 6 blocks `write` and `computer` tools. Since Chapter 8 they ask
first, depending on the agent's approval mode.

⁴ Without Trigger.dev, routines run inside the API and schedules don't fire.

⁵ An approval request is a saved row, decided once; the agent follows up in
its chat. New agents start on **Auto-approve reads**. Requests don't expire
yet.

⁶ One E2B sandbox per chat, started on the first approved run and stopped
after 10 idle minutes. Optional: without `E2B_API_KEY`, there's no sandbox.

⁷ Playwright Chromium runs inside the API, one browser per chat, limited to
public addresses. Reading runs on its own; clicking and typing ask first.

⁸ The Runner long-polls the API and enforces your shared folders. Routines
on the Trigger.dev worker can't reach your computer yet.

⁹ Embeddings need an OpenAI or Google key; with only an Anthropic key there's
no memory or knowledge. Memories are per character, knowledge per user.

¹⁰ Rooms answer in turn, at most 4 answers per message, routed by @mention
or by the lead's model.

¹¹ The app has four tabs (Crew, Rooms, Today, You). Hiring, apps, keys and
routines stay on the web. Voice uses your OpenAI key.

¹² Chapter 15 makes Binary ready to share: the README with real screenshots,
[`SETUP.md`](SETUP.md) and the [architecture overview](ARCHITECTURE.md). No
deployment, usage tracking or browser end-to-end tests yet.

## Every chapter folder has

- **README.md**: what the chapter adds, what you'll learn, how to try it
- **PROMPT.md**: a short brief to paste into your own coding agent. It says
  what to build and why, and what "done" looks like. The agent explores, plans
  and asks questions; the prompt doesn't dictate the code.
- **DIAGRAM.md**: one diagram of what the chapter adds
- **screenshots/**: a few images, when the chapter has a UI

The detailed plans, reviews and file-by-file notes of each chapter are in
the git history and on its `feat/chapter-XX-*` branch.
