# Chapter 15: Architecture of the whole system

The big picture, after 14 chapters. Diagrams:
[the whole system](architecture/system-overview.md),
[one message end to end](architecture/request-flow.md),
[which key turns on what](architecture/integration-flow.md).

## The apps and packages

| Part              | What it does                                                                                                           | Since  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| `apps/api`        | Hono on Node. Auth, every route, engines, tools, computers, routines, memory, rooms. The only part that holds secrets. | Ch. 1  |
| `apps/web`        | Next.js 16. Server components load data with the user's cookie; client components stream chats.                        | Ch. 1  |
| `apps/mobile`     | Expo. Crew, rooms, Today and chats, with voice input. Talks to the same API.                                           | Ch. 14 |
| `apps/runner`     | A small CLI on your computer. Long-polls the API for jobs; runs them inside the folders you share.                     | Ch. 11 |
| `packages/db`     | Drizzle schema (26 tables), migrations, and one repository class per area.                                             | Ch. 2  |
| `packages/shared` | Types, Zod schemas and constants used by every app, so a rule is written once.                                         | Ch. 1  |

## Layers in the API

```text
routes/        HTTP: parse with a shared Zod schema, check ownership, call a service
  ↓
services       chat/reply.ts (writeReply), rooms/room-turn.ts, approvals/decide.ts,
               routines/run-routine.ts, memory/agent-memory.ts, voice/transcriber.ts
  ↓
engines/       EngineFactory.forAgent → ApiEngine (AI SDK) or RunnerEngine (Claude Code, Codex)
tools/         ToolboxFactory → Toolbox: built-in, MCP, sandbox, browser, desktop, runner, memory
computers/     SandboxSessions, BrowserSessions, DesktopSessions (one per chat)
  ↓
@binary/db     repositories → Postgres (+ pgvector)
```

`container.ts` is the **composition root**: the one place where classes are
created and wired. Tests call `createDependencies` with fakes (a mock model,
a fake sandbox, a fake transcriber…), so no test reaches a real provider.

## The main flows

- **Sign in (Ch. 1):** Better Auth sets a session cookie. The web sends it
  with `credentials: 'include'`; the phone keeps it in secure storage and
  adds it by hand.
- **A message (Ch. 5, 6, 8, 12):** `writeReply` builds the system prompt
  (character, personality, memories, room), loads the history, and streams
  the engine's answer as NDJSON (`delta`, `tool`, `done`, `error`). Each tool
  call goes through the **policy**: read tools run, write and computer
  tools follow the character's approval mode, and a waiting call becomes an
  approval in **Today**.
- **An approval (Ch. 8):** `decideApproval` records the decision once
  (two devices can't both win), runs the tool with the same toolbox, saves
  a note, and lets the character carry on.
- **Computers (Ch. 9–11):** one sandbox, browser or desktop per chat,
  started on first use and stopped when idle or when the chat is deleted.
  Your computer is reached through the Runner's long-poll queue.
- **Routines (Ch. 7):** a schedule, a webhook or Run now creates a run.
  With Trigger.dev it's a durable job; without, it runs in the API.
- **Memory and knowledge (Ch. 12):** embeddings in pgvector; a character's
  memories go into its prompt, and `search_knowledge` returns cited
  passages.
- **Rooms (Ch. 13):** `runRoomTurn` picks who answers (mentions, the lead's
  model, or the lead), then each answers in turn with the others' words
  as context; @mentions hand work on, at most 4 answers.
- **Voice (Ch. 14):** the phone records, the API transcribes with the
  user's OpenAI key and the characters' names as a hint.

## Patterns worth knowing

| Pattern          | Where                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------- |
| Repository       | `packages/db/src/repositories/*`: every query in one place, always scoped to the user |
| Strategy         | `AgentEngine` (API, Claude Code, Codex); `SandboxProvider`; `DesktopProvider`         |
| Factory          | `EngineFactory`, `ToolboxFactory`, `EmbedderFactory`                                  |
| Template Method  | `ComputerSessions`: start, reuse, idle-stop, shared by sandbox, browser and desktop   |
| Composition root | `apps/api/src/container.ts`                                                           |
| Error hierarchy  | `AppError` → `ValidationError`, `NotFoundError`, `MissingProviderKeyError`, …         |
| Shared schemas   | One Zod schema validates a form in the web, and the same body in the API              |

## Data (26 tables)

| Area         | Tables                                                                             |
| ------------ | ---------------------------------------------------------------------------------- |
| Auth         | `users`, `sessions`, `accounts`, `verifications`                                   |
| Characters   | `agents`, `agent_templates`, `provider_keys` (encrypted), `skills`, `agent_skills` |
| Chat         | `threads`, `messages`, `tool_calls`, `approval_requests`                           |
| Apps         | `mcp_servers` (encrypted authorization)                                            |
| Routines     | `routines`, `triggers`, `routine_runs`, `tasks`                                    |
| Computers    | `computer_sessions`, `devices`                                                     |
| Memory       | `memories`, `knowledge_documents`, `knowledge_chunks` (vectors)                    |
| Rooms        | `rooms`, `room_members`                                                            |
| Not used yet | `usage_records` (token and cost tracking, a future chapter)                        |

## Security, in one list

- AI keys and MCP tokens are encrypted with AES-256-GCM (`ENCRYPTION_KEY`);
  only the last 4 characters are ever shown. They never reach a browser or
  phone.
- Every query is scoped to the signed-in user; another user's id is a 404.
- Risky tools ask first; a decision can't be made twice.
- Browsers and web fetches can't reach private or local addresses.
- The Runner can only touch the folders you share, with a hashed token.
- Webhook bodies are passed to the model as data, never as instructions.
