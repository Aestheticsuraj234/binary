# Chapter 13: Architecture

Diagrams: [components](architecture/system-overview.md),
[a room message end to end](architecture/request-flow.md),
[who answers](architecture/integration-flow.md).

## A room turn (`runRoomTurn`)

`POST /api/threads/:id/messages` checks the thread. If it belongs to a
room, the message goes to `runRoomTurn`; a one-to-one chat goes to
`writeReply` as before.

1. **Save the user's message once,** and title a new chat from it.
2. **Choose who answers first:**
   - `findMentions(content, members)`: the @mentioned members, in order of
     appearance.
   - Otherwise, in **auto** mode, `routeByLead`. The lead's engine
     `generate`s from a short prompt listing each member and their role,
     and the members it names are taken in the order written (at most 3).
     A CLI-engine lead, or a router that names no one, falls through.
   - Otherwise the **lead**, or the first member if the lead is gone.
3. **Answer in turn,** at most `MAX_ROOM_REPLIES` (4). For each agent:
   - `writeReply({saveContent: false, room, content: "It's your turn…"})`,
     with that agent's own engine (`EngineFactory.forAgent`), tools,
     computer and memory
   - stream `turn {agentId}`, then the deltas and tools, then
     `done {message}`
   - members the answer `@mentions`, who haven't answered and aren't
     queued yet, join the queue
   - a failing agent gets `error: "Fay: …"`, and the next one still
     answers
4. `end`.

## Who said what

`writeReply` takes `room?: {name, members}`.

- **History:** `historyFor(earlier, agentId, room)` keeps the agent's own
  answers as `assistant`, and turns every other agent's into
  `user: "[Name]: …"`. Tool notes are dropped.
- **System prompt:** `buildSystemPrompt(agent, remembered, room)` adds:
  - the room's name and the others, with their roles
  - "Messages from the others start with [Name]. Answer only your part…"
  - "Do not start your answer with your own name" (added after a real run)
  - "To hand part of the task to a teammate, mention them with @Name"
- **`saveContent: false`:** the "your turn" prompt reaches the model but
  isn't saved. Memory uses the user's last message instead of that prompt.

## Approvals in rooms

A room thread has no `agent_id`, so `ApprovalRepository` now joins the
asking agent through **`messages.author_agent_id`**. That's correct for
both kinds of chat, and every answer has had an author since Chapter 5.
The view also carries `roomId`:

- `decideApproval` loads the room, so the follow-up still knows who is
  there.
- Today links to `/rooms/:id?chat=…`.

## Streaming (NDJSON)

```text
{"type":"turn","agentId":"…mimi"}  {"type":"delta",…}…  {"type":"done","message":{…,"authorAgentId":"…mimi"}}
{"type":"turn","agentId":"…bolt"}  …                   {"type":"done",…}
{"type":"end"}
```

`ChatStreamEvent` gained `turn` and `end`. The one-to-one chat ignores
them. `ChatMessage.authorAgentId` and `Thread.roomId` are now part of the
API.

## API contracts

| Method + path                                                       | Success                                        | Errors                                              |
| ------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| `GET /api/rooms`                                                    | `{rooms: Room[]}` with members                 |                                                     |
| `POST /api/rooms {name, memberIds (2–6), routingMode, leadAgentId}` | `201 {room}`                                   | `400` invalid, or "Pick characters you have hired." |
| `GET /api/rooms/:id`                                                | `{room, threads}`                              | `404`                                               |
| `PUT /api/rooms/:id`                                                | `{room}` (members replaced in one transaction) | `400`, `404`                                        |
| `DELETE /api/rooms/:id`                                             | `204` (its chats go; the characters stay)      | `404`                                               |
| `POST /api/rooms/:id/threads`                                       | `201 {thread}`                                 | `404`                                               |
| `POST /api/threads/:id/messages`                                    | a room thread streams the events above         | `404`                                               |

## Data

No migration.

- **`RoomRepository`:**
  - `create` and `update`: a transaction that checks every member is the
    user's agent
  - `listForUser` and `findForUser`, with members by name
  - `delete`
- **`ThreadRepository`:** adds `createForRoom` and `listForRoom`.
- **`MessageRepository`:** returns `authorAgentId`.
- **`routing_mode`** is built from the shared `ROUTING_MODES`, in the same
  order.
