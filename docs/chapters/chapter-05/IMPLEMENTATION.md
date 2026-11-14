# Chapter 5: Implementation

## Plan

1. Shared: `sendMessageSchema`, chat types and the stream event type.
2. DB: `ThreadRepository` (owner-scoped) and `MessageRepository`.
3. API: `AgentEngine.stream` on `ApiEngine`, `titleFrom`, the threads routes
   with an NDJSON stream, and "start a chat" on agents. Remove `/run`.
4. Web: `readNdjson`, Recent chats in the sidebar, `?chat=` on the agent
   page, and a chat component that saves and streams.
5. Test with a fake model that streams in pieces and can fail on purpose;
   verify in a real browser.

## Acceptance criteria

- [x] Messages are saved; reloading or reopening a chat shows them.
- [x] Answers stream word by word, with a caret while writing.
- [x] The model reads earlier messages in the same chat (up to 20).
- [x] A new chat is named after its first message.
- [x] Recent chats appear in the sidebar and drawer, newest first, with the
      character's face, and the open one is highlighted.
- [x] New chat and Delete chat work. Firing a character removes its chats.
- [x] Provider errors, before or during the answer, show the reason and the
      character's "oops". Words already received stay visible.
- [x] No user can read, write to or delete another user's chat (404).
- [x] No migration. Lint, format, type-check, tests and web build pass; no
      sideways scroll at 390px.

## File-by-file

### `packages/shared`

| File            | Purpose                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------- |
| `src/chat.ts`   | `sendMessageSchema`, `ChatTurn`, `ChatMessage`, `Thread`, `ThreadSummary`, `ChatStreamEvent` |
| `src/agents.ts` | Removes `runAgentSchema`, `chatTurnSchema` and `AgentRunResult` (the one-off run is gone)    |

### `packages/db`

| File                                     | Purpose                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/repositories/thread-repository.ts`  | `createForAgent`, `findForUser`, `listRecentForUser` (joined with the agent), `rename`, `touch`, `delete` |
| `src/repositories/message-repository.ts` | `add`, `listForThread` (oldest first)                                                                     |

### `apps/api`

| File                          | Purpose                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `src/engines/agent-engine.ts` | Adds `stream(request): AsyncIterable<string>`                            |
| `src/engines/api-engine.ts`   | `stream()` on `streamText().fullStream`; shared `toMessages()`           |
| `src/chat/title.ts`           | `titleFrom(message)`: first line, cut at a word after 48 characters      |
| `src/routes/threads.ts`       | `GET /`, `GET /:id`, `DELETE /:id`, `POST /:id/messages` (NDJSON stream) |
| `src/routes/agents.ts`        | Adds `POST /:id/threads`; removes `POST /:id/run`                        |
| `src/routes/ids.ts`           | `isUuid(id)`, shared by agents and threads                               |
| `src/routes/engine-errors.ts` | Exports `providerErrorMessage(error)` for stream `error` events          |
| `src/container.ts`, `app.ts`  | Wire `threads`, `messages`; mount `/api/threads`                         |

### `apps/web`

| File                                   | Purpose                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `src/lib/read-ndjson.ts`               | `readNdjson<T>(response)`: yields one parsed object per line                      |
| `src/app/(app)/layout.tsx`             | Also loads recent chats                                                           |
| `src/components/app/app-sidebar.tsx`   | Compact crew rows plus **Recent chats**; one scroll area                          |
| `src/app/(app)/agents/[id]/page.tsx`   | Reads `?chat=`; 404 if the chat is unknown or belongs to another agent            |
| `src/components/agents/agent-chat.tsx` | Saved + streamed chat, header with title / New chat / Delete, stream-driven moods |

### `apps/mobile`

No changes. Mobile chat arrives with the full mobile app (Chapter 14).

## Decisions

| Decision                                                     | Why                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| NDJSON over `fetch`, not SSE                                 | `EventSource` can't POST; NDJSON is a dozen lines to read and easy to explain.             |
| Check everything before the first byte                       | Real HTTP statuses for input, key and ownership errors; only provider failures are events. |
| Save the question before answering                           | It's never lost; you can retry. A failed answer is not saved as if it were real.           |
| History: last 20 messages                                    | Keeps every reply's token cost bounded; older messages stay saved and visible.             |
| Titles from the first message, no model call                 | Free, instant and predictable.                                                             |
| A chat is created on its first message                       | Opening a character never leaves empty "New chat" rows behind.                             |
| `history.replaceState` + `router.refresh()` after the stream | The URL becomes shareable at once without remounting the page mid-stream.                  |
| Moods follow the stream                                      | Thinking → talking on the first word → happy on `done`. Replaces part 2's length estimate. |
| Only new bubbles animate                                     | A saved chat should appear at once, not fade in message by message.                        |
| No token usage in chat                                       | `messages` has no usage columns; the playground still shows usage.                         |
| One-on-one only                                              | `rooms` (group chats) is its own chapter; the schema already allows both.                  |
