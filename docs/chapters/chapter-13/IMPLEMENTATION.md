# Chapter 13: Implementation

## Plan

1. **Shared:**
   - `ROUTING_MODES` (with info)
   - `roomInputSchema` (2–6 members, once each, a lead among them)
   - `Room`
   - `findMentions`
   - `MAX_ROOM_REPLIES`
   - `turn` and `end` stream events, `ChatMessage.authorAgentId`,
     `Thread.roomId`, `Approval.roomId`
2. **DB:**
   - `RoomRepository`
   - room threads
   - message authors
   - the approval join through the message's author
   - `routing_mode` from the shared list
3. **API:**
   - room context in `writeReply` (`historyFor`, `saveContent`) and in the
     system prompt
   - `runRoomTurn` and `routeByLead`
   - room routes; room threads in the message route
   - room context for approvals
4. **Web:**
   - Rooms list, new and edit (`RoomForm`), the room chat (`RoomChat`),
     `DeleteRoomButton`
   - a sidebar link; Today links to room chats
5. **Tests:** shared, repositories and API; a walkthrough; a real
   multi-model room.

## Acceptance criteria

- [x] Create, edit and delete rooms of 2–6 of your characters, with a mode
      and a lead.
- [x] @Mentioned characters answer in order; with no mention the lead
      answers; in auto mode the lead picks, and an @mention still wins.
- [x] Characters see each other's answers, labelled, and hand over with
      @mentions; at most 4 answers per message.
- [x] Each answer streams under its character; one failure doesn't stop
      the rest.
- [x] Approvals in rooms reach the inbox, link back and continue in the
      room.
- [x] No migration; lint, format, type-check, tests and the build pass;
      no sideways scroll at 390px.

## File-by-file

| File                                                                         | Purpose                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| `packages/shared/src/rooms.ts`                                               | Modes, schema, `Room`, `findMentions`, limits          |
| `packages/shared/src/chat.ts`, `approvals.ts`                                | `turn` and `end` events, `authorAgentId`, `roomId`     |
| `packages/db/src/repositories/room-repository.ts`                            | Rooms with members, owner checks in transactions       |
| `packages/db/src/repositories/thread-repository.ts`, `message-repository.ts` | `createForRoom`, `listForRoom`; `authorAgentId`        |
| `packages/db/src/repositories/approval-repository.ts`                        | Joins the agent through the message's author; `roomId` |
| `apps/api/src/rooms/room-turn.ts`                                            | `runRoomTurn`, `routeByLead`                           |
| `apps/api/src/chat/reply.ts`                                                 | `RoomContext`, `historyFor`, `saveContent`             |
| `apps/api/src/agents/system-prompt.ts`                                       | The room section                                       |
| `apps/api/src/routes/rooms.ts`, `threads.ts`                                 | Room routes; `sendToRoom`                              |
| `apps/api/src/approvals/decide.ts`, `container.ts`                           | Room context for decisions; `rooms`                    |
| `apps/web/src/app/(app)/rooms/**`                                            | List, new, chat, edit                                  |
| `apps/web/src/components/rooms/*`                                            | `RoomForm`, `RoomChat`, `DeleteRoomButton`             |
| `apps/web/src/lib/rooms.ts`                                                  | Client calls                                           |
| sidebar, Today inbox, `agent-chat.tsx`                                       | Rooms link; room links; the new event types            |

## Decisions

| Decision                                                                | Why                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Answers in turn, not in parallel                                        | Later characters build on earlier ones; a room reads like a meeting, not a pile of answers. |
| Others' words become "[Name]: …" user turns                             | Models keep their own voice and still know who said what; it works for every provider.      |
| The user's message saved once; agents get an unsaved "your turn" prompt | The chat shows one question; each agent knows it's their turn.                              |
| The lead's own model routes, in plain text                              | No extra key or service; names are matched against members, so a chatty answer still works. |
| An @mention beats automatic routing                                     | You always have the last word on who answers.                                               |
| A cap of 4 answers                                                      | Hand-offs can chain; the cap keeps cost and noise bounded.                                  |
| The approval join through the message's author                          | Correct for rooms and one-to-one chats alike, with no data change.                          |
