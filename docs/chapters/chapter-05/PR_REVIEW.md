# Chapter 5: Review

**Branch:** `feat/chapter-05-chat` → `main`
**Reviewer:** Claude, a self-review.

## Google TypeScript Style Guide

- Named exports; default exports only for Next.js pages.
- No `any`, no non-null assertions. `JSON.parse` results are typed through
  `readNdjson<T>` and test helpers, our own API's documented shape.
- `UPPER_SNAKE_CASE` module constants (`HISTORY_LIMIT`, `RECENT_LIMIT`,
  `MAX_LENGTH`, `THREAD_COLUMNS`, `MESSAGE_COLUMNS`, `JSON_HEADERS`).
- Lint and Prettier pass.

## Findings and fixes

| #   | Severity | Finding                                                                                                                                              | Fix                                                                                                                 |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | Low (UI) | While the first reply of a new chat streamed, the header said "Chat": the real title only arrives with the refresh after `done`.                     | The header shows "New chat" until the title is known.                                                               |
| 2   | Low (UI) | Opening a saved chat made every message fade in, which looked like a slow load.                                                                      | Only messages written in this visit (local ids) animate.                                                            |
| 3   | Medium   | `streamText` reports provider errors as stream parts instead of throwing, so a simple `textStream` loop would end "successfully" with a half answer. | `ApiEngine.stream` reads `fullStream` and throws on `error` parts; tested both before the first chunk and part-way. |
| 4   | Medium   | After `history.replaceState`, Next.js might not treat "New chat" as a change of chat, so the old messages could stay on screen.                      | `handleNewChat` also resets state locally before navigating; the browser run checks it.                             |
| 5   | Low      | Part 2 guessed how long the character "talks" from the answer length.                                                                                | Moods now follow the stream: talking on the first `delta`, happy on `done`.                                         |
| 6   | Low      | The uuid check was written inline in the agents route; threads needed it too.                                                                        | `routes/ids.ts` → `isUuid()`, used by both.                                                                         |

## Simplifications

- One stream format (NDJSON) and one reader (`readNdjson`): no SSE parser,
  no extra package.
- No rename UI: titles come from the first message.
- `POST /api/agents/:id/run` and its schemas are removed rather than kept as
  dead code.

## Accepted trade-offs

- **No stop button.** If the user leaves mid-answer, the server finishes and
  saves the answer anyway. A stop button needs an `AbortController` on both
  sides; it fits naturally with tools later.
- **No token usage in chat.** The `messages` table has no usage columns.
- **Only the last 20 messages** reach the model.
- **Recent chats** shows the 20 most recent; there's no "see all" yet.
- Malformed JSON bodies still give a 500, as in every earlier route.

## Open items

- Real-provider smoke test (see TESTING.md).
- During development, the `tsx watch` API process crashed when `app.ts`
  imported a route file a moment before it existed, and it didn't restart.
  This only affects the developer's watcher, not the app. Restart `pnpm dev`
  if the API stops answering after large edits.
