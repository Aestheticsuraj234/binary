# Chapter 13: Review

**Branch:** `feat/chapter-13-rooms` → `main`
**Reviewer:** Claude, a self-review.

## Google TypeScript Style Guide

- Named exports; no `any`, non-null assertions or casts in app code.
- `findMentions` is generic, `<T extends {id, name}>`, so the API (full
  agents) and the web (members) share it.
- Lint and Prettier pass.

## Findings and fixes

| #   | Severity                        | Finding                                                                                                                                 | Fix                                                                                                                                                                                       |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | High (correctness)              | Approvals joined the agent through `threads.agent_id`, which is empty for room chats, so a room's requests would vanish from the inbox. | Join through `messages.author_agent_id`, which is right for both kinds of chat. Tested with a room approval. An old test that saved an assistant message without an author was corrected. |
| 2   | High (security)                 | A room could be created with another user's agents.                                                                                     | `RoomRepository` checks, inside the transaction, that every member is the user's; the API answers "Pick characters you have hired." Tested.                                               |
| 3   | Medium (cost)                   | Hand-offs can chain (A → B → C → A…).                                                                                                   | Each character answers once per message, and there are at most 4 answers. Tested with 5 mentions.                                                                                         |
| 4   | Medium (found with real models) | GPT answers started with "**Bolt:**", copying the "[Name]:" labels.                                                                     | A prompt line: don't start with your own name. Confirmed on a rerun.                                                                                                                      |
| 5   | Medium (robustness)             | One member without a key would end the whole turn.                                                                                      | Errors are per agent ("Fay: …"), and the next one answers. Tested.                                                                                                                        |
| 6   | Low                             | Messages from former members (deleted agents) have no author.                                                                           | Shown as "A former member".                                                                                                                                                               |
| 7   | Low                             | The one-to-one chat treated any non-delta, non-tool, non-done event as an error.                                                        | It checks `type === 'error'`, so `turn` and `end` are ignored.                                                                                                                            |

## Accepted trade-offs

- **Answers come one after another,** so a turn with three characters
  takes three answers' time.
- **Automatic routing costs one extra model call** per message, made by
  the lead.
- **No per-room memory:** each character keeps its own.
- **Routines can't target a room yet;** they still run one character.
- **Room chats aren't in the sidebar's Recent chats;** they're listed in
  each room.

## Open items

- Rooms as routine targets.
- Room chats in Recent chats.
