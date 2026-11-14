# Chapter 5: Architecture

Diagrams: [components](architecture/system-overview.md),
[request flows](architecture/request-flow.md),
[chat state](architecture/integration-flow.md).

## Streaming, end to end

```text
AgentChat ──POST {content}──► /api/threads/:id/messages
                                │ checks: owner, agent, body, model, key  → JSON 4xx
                                │ save the user's message (title if first)
                                ▼
                              ApiEngine.stream()  ── streamText ──► provider
                                │ yields text pieces; throws on error parts
                                ▼
            ◄── NDJSON ──  {"type":"delta","text":"Here are "}
                           {"type":"delta","text":"three sources."}
                           {"type":"done","message":{id, role, content, createdAt}}
                      or   {"type":"error","error":"The provider returned an error: …"}
readNdjson() turns the byte stream back into events, line by line.
```

**Why NDJSON?** It's the simplest format that works with `fetch` and POST.
`EventSource` (SSE) can only send GETs. Each line is a complete JSON object,
so the client splits on `\n`, keeps any unfinished line for the next chunk,
and calls `JSON.parse`.

**Why errors can arrive as events:** the HTTP status is sent with the first
byte. Anything that can fail _before_ streaming (bad input, no key, unknown
chat) is a normal JSON error with a 4xx status. Once text is flowing, the
status is already 200, so a provider failure becomes an `error` event.

**`streamText` doesn't throw.** In AI SDK 7, a provider failure appears as
an `{type: 'error'}` part in `fullStream`. `ApiEngine.stream` reads
`fullStream`, yields `text-delta` parts and throws on `error` parts, so the
route only needs one `try/catch`. Its `onError: () => {}` stops the SDK
logging the same error a second time.

## The engine grew one method

```ts
interface AgentEngine {
  generate(request): Promise<GenerateResult>; // playground: the whole answer
  stream(request): AsyncIterable<string>; //     chat: piece by piece
}
```

Both take `{system, prompt, history}`. Chapter 11's CLI engines will
implement the same two methods.

## Ownership

| Rule                                                       | Where                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| A user only sees and changes their own chats               | `ThreadRepository` methods take `userId` and filter by it           |
| Messages are only read after the thread's owner is checked | `MessageRepository` takes a thread id; routes load the thread first |
| Someone else's chat, or a malformed id, is a 404           | `isUuid()` then `findForUser`                                       |
| A chat opened under another agent's address is a 404       | The agent page checks `thread.agentId === id`                       |
| Firing a character deletes its chats                       | `threads.agent_id … ON DELETE CASCADE` (Chapter 2)                  |

## API contracts

All routes need a signed-in session cookie (401 otherwise).

| Method + path                    | Body                       | Success                                                                         | Errors                                           |
| -------------------------------- | -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------ |
| `POST /api/agents/:id/threads`   | —                          | `201 {thread}` titled "New chat"                                                | `404`                                            |
| `GET /api/threads`               | —                          | `200 {threads: [{id, title, updatedAt, agent: {id, name, avatar}}]}`, 20 newest |                                                  |
| `GET /api/threads/:id`           | —                          | `200 {thread, messages}` (messages oldest first)                                | `404`                                            |
| `DELETE /api/threads/:id`        | —                          | `204`                                                                           | `404`                                            |
| `POST /api/threads/:id/messages` | `{content}` (1–4000 chars) | `200` NDJSON stream of `delta` … then `done` or `error`                         | `404`; `400` invalid content, no model or no key |

`POST /api/agents/:id/run` from Chapter 4 is gone; chat replaces it.

## Web structure

```text
app/(app)/layout.tsx       also loads /api/threads → AppSidebar "Recent chats"
app/(app)/agents/[id]      ?chat=<id> opens a saved chat; none = a new chat
lib/read-ndjson.ts         async generator: response → events
components/agents/agent-chat.tsx
```

A new chat has no thread until its first message. Then the client:

1. Creates the thread.
2. Swaps the address to `?chat=<id>` with `history.replaceState`, so the
   page doesn't navigate and the stream keeps going.
3. Streams the reply.
4. Calls `router.refresh()`, so the sidebar and title update.

The chat resets its state during render when the `?chat=` it was given
changes. That's React's documented pattern for "reset state when a prop
changes", and it's what lets the sidebar switch between chats.
