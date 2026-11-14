# Rebuild prompt: Chapter 5, Chat

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 4 part 2 (characters, sidebar, Discover, in-page chat).

---

You are a senior full-stack engineer and teacher. Make chat in **Binary**
saved and streamed. The repo is pnpm + Turborepo: `apps/api` (Hono, Better
Auth, Drizzle, a composition root, `EngineFactory` → `ApiEngine`), `apps/web`
(Next.js 16, shadcn/ui, a character sidebar and an `AgentChat` component),
and `packages/db`, whose `threads` and `messages` tables already exist from
Chapter 2. Work on `feat/chapter-05-chat`. **No migration.**

## Code rules

Google TypeScript Style Guide: named exports, no `any`, no non-null
assertions, `UPPER_SNAKE_CASE` constants, comments explain _why_. Keep it
beginner-friendly: no data library, no custom hooks, no SSE parser package.

## Shared (`packages/shared/src/chat.ts`)

- `sendMessageSchema`: `content` trimmed 1–4000 ("Write a message first.").
- `ChatTurn {role: 'user' | 'assistant'; content}`.
- `ChatMessage {id, role: 'user' | 'assistant' | 'tool', content, createdAt}`.
- `Thread {id, agentId, title, createdAt, updatedAt}`.
- `ThreadSummary {id, title, updatedAt, agent: {id, name, avatar}}`.
- `ChatStreamEvent` = `{type: 'delta'; text}` | `{type: 'done'; message: ChatMessage}` | `{type: 'error'; error}`.
- Remove `runAgentSchema`, `chatTurnSchema` and `AgentRunResult`.

## Database

- `ThreadRepository(db)`:
  - `createForAgent(userId, agentId)` → `{id, agentId, title, createdAt, updatedAt}`
  - `findForUser(userId, id)`
  - `listRecentForUser(userId, limit)`: inner join with agents, select
    `{id, title, updatedAt, agent: {id, name, avatar}}`, `updatedAt` desc
  - `rename(userId, id, title)`
  - `touch(id)`: set `updatedAt`
  - `delete(userId, id)` → boolean
- `MessageRepository(db)`:
  - `add(message)` → `{id, role, content, createdAt}`
  - `listForThread(threadId)`, oldest first. Document that callers check the
    thread's owner first.

## API

- `AgentEngine.stream(request): AsyncIterable<string>`. `ApiEngine.stream`
  calls `streamText({model, system, messages, onError: () => {}})`. It
  iterates `fullStream`, yields `part.text` for `text-delta`, and **throws
  `part.error` for `error`**: `streamText` doesn't throw on its own. Share a
  `toMessages()` helper with `generate`.
- `chat/title.ts`: `titleFrom(message)` takes the first line, trimmed. If
  it's over 48 characters, cut at the last space (when it falls after
  character 24) and add "…".
- `routes/ids.ts`: `isUuid(id)` with `z.uuid()`.
- `routes/engine-errors.ts`: export
  `providerErrorMessage(error)` = `The provider returned an error: <message>`.
- `routes/agents.ts`: remove `/run`. Add `POST /:id/threads`: 404 unless it's
  the user's agent, else `201 {thread}`.
- `routes/threads.ts` (all `requireUser`; malformed or foreign ids are 404
  `{error: 'Chat not found.'}`):
  - `GET /` → `{threads}` (20 recent).
  - `GET /:id` → `{thread, messages}`.
  - `DELETE /:id` → 204.
  - `POST /:id/messages`. These checks return JSON errors before any
    streaming: thread, then its agent; body; provider and model; then
    `engineFactory.create` (missing key → 400 via `engineErrorResponse`).
    Then:
    - Load earlier messages and keep the last 20, without tool messages, as
      history.
    - Save the user's message. If it's the first, rename the chat with
      `titleFrom`.
    - Set `Content-Type: application/x-ndjson`, then use `hono/streaming`
      `stream()` to `writeln` a JSON `delta` per piece.
    - On success, save the assistant message (`authorAgentId`), `touch`
      the thread, and send `done` with an ISO `createdAt`.
    - On a throw, send `error` and save nothing.
- Wire both repositories in `container.ts`; mount `/api/threads`.

## Web

- `lib/read-ndjson.ts`: an async generator `readNdjson<T>(response)`. It
  reads with `getReader()` and `TextDecoder({stream: true})`, splits on
  `\n`, keeps the last unfinished piece in a buffer, and yields
  `JSON.parse(line)`.
- `(app)/layout.tsx`: also load `/api/threads`. In `AppSidebar`, add
  `recentChats`, read `chat` with `useSearchParams`, and put crew rows (face
  32 + name) and **Recent chats** (face 24 + title, link
  `/agents/<agentId>?chat=<id>`, `title` attribute "<title> · <agent>",
  active when `chat` matches) in one scroll area. Give the lists
  `aria-label`s.
- `/agents/[id]`: read `?chat`. Load the agent and the thread. `notFound()`
  if either is missing, or if `thread.agentId !== id`. Render
  `<AgentChat key={agent.id} agent threadId title savedMessages />`.
- `AgentChat`:
  - **State:** `threadId`, `messages` (local ids `local-n` until saved,
    plus `isError` and `isStreaming`), `shownThreadId`. During render, if
    the prop `threadId` differs from `shownThreadId`, reset to the prop's
    chat.
  - **Send:**
    1. Validate, then add the user bubble and an empty streaming reply. Set
       mood **thinking**.
    2. If there's no thread yet, `POST /api/agents/:id/threads`, then
       `window.history.replaceState(null, '', '/agents/<id>?chat=<thread>')`.
    3. POST the message. A non-OK response shows its error.
    4. `for await` over `readNdjson`: on `delta`, mood **talking** and
       append the text; on `done`, swap in the saved message and play
       happy 1.5 s then idle; on `error`, call `showFailure`, which keeps
       the words that arrived, adds the reason, and plays **oops**.
    5. If the connection drops, call `showFailure`.
    6. Finally, `router.refresh()`.
  - **Header:** `(threadId && title) || 'New chat'`, a ghost **New chat**
    (reset locally, then `router.push('/agents/<id>')`), and an icon
    **Delete chat** (confirm, DELETE, then New chat and refresh).
  - **Messages:** an empty streaming reply shows typing dots
    (`role=status`, "<name> is thinking"). A streaming reply shows a lime
    pulsing caret. Only local-id messages use `animate-rise`.

## Tests

- **Shared (2):** the send schema trims, and an empty message gets a
  friendly error.
- **DB (5):** a new chat is titled "New chat"; messages come back in order;
  recent chats are joined with the agent, most active first; another user
  sees and deletes nothing; deleting a chat removes its messages.
- **Titles (3).**
- **Chat routes (15).** The fake model uses `doStream` with
  `simulateReadableStream` chunks (stream-start, text-start, text-deltas,
  text-end, finish):
  - 401; start a chat; another user's agent is 404.
  - The answer streams as two deltas, then `done` with
    `Content-Type: application/x-ndjson`.
  - The model received a system prompt with the name and personality.
  - Both messages are saved and the title is cut.
  - The second message sends roles system/user/assistant/user, and the
    title doesn't change.
  - Recent chats include the agent; a blank message is 400.
  - A deleted key gives a JSON 400 before streaming.
  - A failure before streaming gives a single `error` event, and only the
    question is saved.
  - A failure part-way gives `delta` then `error`.
  - Another user gets 404 for read, send and delete, and an empty recent
    list; a malformed id is 404.
  - Delete returns 204, then 404.
- **Agent tests:** drop `/run`.

## Docs

`docs/chapters/chapter-05/` (README, IMPLEMENTATION, ARCHITECTURE with the
NDJSON protocol and API contracts, TESTING, PR_REVIEW, this prompt) with
Mermaid diagrams (components, the send sequence, the chat state machine)
and screenshots. Update the root README status and docs list, and
`docs/DESIGN_SYSTEM.md` (streaming caret, Recent chats, chat header).

## Acceptance criteria

- With a real key, answers stream word by word and survive a reload.
- No user can reach another user's chats.
- 98 tests pass (shared 14, db 26, api 58), along with lint, format,
  type-check and the web build.
- No page scrolls sideways at 390px.
