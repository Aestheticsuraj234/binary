# Chapter 5: Testing

```bash
pnpm test
```

The chat tests use `MockLanguageModelV4` with `doStream`, which returns
`simulateReadableStream` chunks shaped like a real provider's:
`stream-start`, `text-start`, `text-delta`…, `text-end`, `finish`. For
failure tests the stream either throws before the first chunk or contains
an `error` part after some text. No test calls a real provider.

## New and changed suites

| Suite             | File                                                | Tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Send schema       | `packages/shared/src/chat.test.ts`                  | trims; friendly empty message (2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Chat repositories | `packages/db/src/repositories/repositories.test.ts` | new chat is "New chat"; messages in order; recent chats joined with the agent, most active first; another user sees and deletes nothing; deleting removes messages (5)                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Titles            | `apps/api/src/chat/title.test.ts`                   | short kept; first line only; cut at a word with "…" (3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Chat routes       | `apps/api/src/routes/threads.test.ts`               | **Start:** 401; start a chat 201; another user's agent 404 (3). **Talk:** NDJSON deltas then `done`; system prompt and message reach the model; both messages saved and the chat named; the next message sends history (system, user, assistant, user) and keeps the title; recent chats include the agent; blank message 400; missing key is a JSON 400 before streaming (7). **Provider fails:** before the first chunk, one `error` event and only the question saved; part-way, `delta` then `error` (2). **Another user:** read, send and delete 404, empty recent list; malformed id 404 (2). **Delete:** 204 then 404 (1) |
| Agent routes      | `apps/api/src/routes/agents.test.ts`                | `/run` tests removed; "another user" now covers starting a chat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Results

| Check                   | Result                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| All tests               | 98 / 98 passed (shared 14, db 26, api 58). Chapter 4 part 2 had 77. |
| ESLint, Prettier        | Clean                                                               |
| Type-check (5 packages) | Passed                                                              |
| `drizzle-kit generate`  | No schema changes                                                   |
| Web production build    | Passed                                                              |

## Browser verification

These ran against the production build, the real API and database, and a
fake model that streams word by word (700 ms before the first word, then
60 ms per word) and fails part-way when a message contains "fail". There
were 30 checks:

| Step                                                                                                           | Result |
| -------------------------------------------------------------------------------------------------------------- | ------ |
| A new chat says "New chat", with no Delete and New chat disabled; no recent chats                              | ✓      |
| Click a starter: typing dots and a **thinking** stage                                                          | ✓      |
| The address becomes `?chat=<id>` without a reload, while the answer streams                                    | ✓      |
| While streaming: stage **talking**, lime caret, text grows between two samples                                 | ✓      |
| Done: caret gone, stage **happy**, then **idle** after the next reply                                          | ✓      |
| The sidebar lists the chat by its first message, highlighted; the header shows the title                       | ✓      |
| Second message with Enter: the model saw 3 messages                                                            | ✓      |
| Reload: 4 messages and the title are still there                                                               | ✓      |
| "please fail": the words that arrived stay, plus "The provider returned an error: overloaded…"; stage **oops** | ✓      |
| New chat: empty with the greeting; a second chat goes to the top of Recent chats                               | ✓      |
| Opening the first chat again: 5 messages (the failed answer was not saved)                                     | ✓      |
| Delete chat: back to a new chat, one chat left                                                                 | ✓      |
| Chats from two characters, each with its own face                                                              | ✓      |
| A chat opened under the wrong agent's address, and an unknown chat, are 404                                    | ✓      |
| Phone (390px): no sideways scroll; the drawer lists recent chats                                               | ✓      |
| Firing a character removes its chats from the sidebar                                                          | ✓      |
| Unexpected console or server errors                                                                            | None   |

Two issues found and fixed (PR_REVIEW #1–2), then the run was repeated.

## Not verified here

- **Real providers.** No real API keys were available. With a key, chat
  with two characters and check that answers stream and differ in
  personality.
- **Very long chats.** Only the last 20 messages reach the model; this was
  tested in the API, but not with real token limits.
- **Mobile app.** Unchanged.
