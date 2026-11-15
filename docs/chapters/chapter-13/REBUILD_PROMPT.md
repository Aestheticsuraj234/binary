# Rebuild prompt: Chapter 13, Multi-agent teams and rooms

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 12. `rooms`, `room_members`, `threads.room_id` and
> `messages.author_agent_id` exist since Chapter 2.

---

You are a senior full-stack engineer and teacher. Add **rooms**: 2–6 of a
user's characters in one chat.

- Messages go to the @mentioned characters, or to those the lead picks
  (auto mode), or to the lead.
- They answer in turn, see each other's answers, and hand over with
  @mentions.

No migration. Work on `feat/chapter-13-rooms`.

## Shared

- `ROUTING_MODES = ['mention','auto']`, with info.
- `MAX_ROOM_MEMBERS = 6`, `MAX_ROOM_REPLIES = 4`.
- `roomInputSchema`: name; `memberIds`, 2–6 unique uuids; `routingMode`;
  `leadAgentId`, which must be a member.
- `Room`, `RoomMember`.
- `findMentions(text, members)`: ordered, unique, longest names first, no
  overlaps, `@Name` not followed by a word character.
- `ChatStreamEvent` adds `turn {agentId}` and `end`.
- `ChatMessage.authorAgentId`, `Thread.roomId`, `Approval.roomId`.

## DB

- `routing_mode` built from `ROUTING_MODES`.
- **`RoomRepository`:**
  - `create` and `update`: transactions that check every member belongs to
    the user, then replace the members
  - `listForUser` and `findForUser`, with members sorted by name
  - `delete`
- **`ThreadRepository`:** `createForRoom`, `listForRoom`; `roomId` in the
  columns.
- **`MessageRepository`:** returns `authorAgentId`.
- **`ApprovalRepository`:** join `agents` on `messages.author_agent_id`,
  and select `threads.room_id`.

## API

1. **`writeReply` options:**
   - `saveContent` (default true); when false, don't save the content, and
     use the user's last message for memory
   - `room: {name, members: {id, name, role}[]}`
   - `historyFor(earlier, agentId, room)`: other agents' answers become
     user turns `"[Name]: …"`
2. **`buildSystemPrompt(agent, remembered, room)`** adds:
   - the room's name and the others, with their roles
   - "Messages from the others start with [Name]. Answer only your part…"
   - "Do not start your answer with your own name…"
   - "To hand part of the task to a teammate, mention them with @Name…"
3. **`rooms/room-turn.ts`:**
   - `routeByLead(engine, members, content)`: one `generate` with the team
     list; names are matched in the order written, at most 3.
   - `runRoomTurn(deps, {userId, room, threadId, content, onEvent})`:
     1. Save the message once, and rename the chat.
     2. Queue: mentions, else auto routing (a failure counts as none), else
        the lead.
     3. Loop while there are fewer than 4 answers: `turn`, then
        `writeReply({saveContent: false, room, content: "It's your turn…"})`,
        then `done`. Queue the answer's new mentions. A failure becomes a
        per-agent `error`.
     4. Touch the chat, then `end`.
4. **The threads route:** `POST /:id/messages` on a room thread uses
   `runRoomTurn`.
5. **`routes/rooms.ts`:** list, create (400 "Pick characters you have
   hired."), get (with threads), update, delete, and
   `POST /:id/threads`.
6. **`decideApproval`:** pass the room context when the approval has a
   `roomId`. Add `rooms` to the container.

## Web

- **`/rooms`:** cards (name, mode badge, faces, names), "New room" with 2
  or more agents, an empty state.
- **`RoomForm`:** a name; character toggles ("N of up to 6"); "Who answers"
  with its description; Lead.
- **`/rooms/[id]` with `RoomChat`:**
  - a side panel: members with "lead", mode, Edit room, chats
  - a header: the title, New chat, Delete chat
  - answers labelled with name and face; `turn` starts a streaming bubble
  - @Name chips; the empty-state hint per mode
- **`/rooms/[id]/edit`:** the form plus `DeleteRoomButton`.
- **Elsewhere:** a sidebar "Rooms" (Users icon); Today links room
  approvals to `/rooms/:id?chat=`; the one-to-one chat only treats
  `type === 'error'` as an error.

## Tests

- shared: 3
- db: 5
- API: 15, with one fake model playing everyone (system "You are X,") and
  a settable router answer
- a walkthrough
- a real room with models from two providers

## Acceptance criteria

- Mentions, auto routing and hand-offs work, with each answer under its
  character, at most 4.
- Room approvals reach the inbox.
- 344 tests, along with lint, format, type-check and the build.
- No sideways scroll at 390px.
