# Chapter 12: Testing

```bash
pnpm test
```

API tests use `fakeEmbedder()`. It puts every word, except common stop
words, into one of 1536 hashed buckets, so texts that share words point
the same way. It's crude, but deterministic and offline.

## Suites

| Suite                | File                                   | Tests                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schemas              | `packages/shared/src/memory.test.ts`   | text, file and url accepted; `file://` refused with its message, as are empty and huge documents; memory length (3)                                                                                                              |
| Repositories         | `packages/db/.../repositories.test.ts` | memories nearest-first with distances, same model only, count of other models, list and delete; documents and passages in one go, counts, nearest passage with its title, only for its owner and model, delete with passages (5) |
| Chunking             | `apps/api/src/memory/chunking.test.ts` | short paragraphs together; a new passage with overlap; a long paragraph split; empty text (4)                                                                                                                                    |
| Memory and knowledge | `apps/api/src/routes/memory.test.ts`   | 15, listed below                                                                                                                                                                                                                 |

The memory and knowledge tests cover:

- **Without a key:** off, with the key named; a manual add is a 400; no
  tools offered.
- **Memories:**
  - a manual add, then the same thing reworded is `alreadyKnown`
  - `remember` from a chat, as a read and marked "chat"
  - every memory in the prompt while there are few; only the related one
    among 12; none for a fresh agent
  - another user gets 404; deleting works; each agent's memories are its
    own
- **Knowledge:**
  - pasted text cut into 2 passages
  - a web page titled from the page
  - search finds the right passage
  - an agent's `search_knowledge` returns the handbook
  - another user sees nothing and can't delete
  - deleting removes the passages

## Results

| Check                  | Result                                                               |
| ---------------------- | -------------------------------------------------------------------- |
| All tests              | 321 pass (shared 33, db 55, api 223, runner 10). Chapter 11 had 294. |
| ESLint, Prettier       | Clean                                                                |
| Type-check (`--force`) | Passed                                                               |
| Migration              | `0004_knowledge` generated; no further changes                       |
| Web production build   | Passed (`/knowledge`, `/agents/[id]/memory`)                         |

## Browser walkthrough (20 checks)

This ran against the production build, the real API and database, a
scripted model and the fake embedder. The scripted model only mentions
TypeScript when that memory is in its instructions, which shows the
memory reached the prompt.

| Step                                                                                                                                      | Result |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Knowledge off with only an Anthropic key, saying which key; on once an OpenAI key is saved                                                | ✓      |
| Paste "Team handbook" (size and passages); upload a `.md` file (title from the file name); add a web page (title from the page, its host) | ✓      |
| Try a question: the handbook passage first, with "% match"                                                                                | ✓      |
| Chat: "remember that I like TypeScript" → "Used remember · Read", the row says what was saved                                             | ✓      |
| Memory page: "From a chat"; add one ("Added by you"); a reworded duplicate says "Nova already remembers"                                  | ✓      |
| A new chat answers from memory with no tool call                                                                                          | ✓      |
| "What does the handbook say…" → "Used search knowledge", the row lists the passages with their document                                   | ✓      |
| Forget a memory; delete a document                                                                                                        | ✓      |
| Phone (390px): Knowledge, Memory and the chat                                                                                             | ✓      |
| No unexpected errors                                                                                                                      | ✓      |

## Real runs (your account: OpenAI embeddings, Claude Sonnet 5.5)

- **Scores:** a real handbook embedded with `text-embedding-3-small`.
  - Related questions scored 0.43 (vacation), 0.28 (computer) and 0.41
    (on-call).
  - "What is the capital of France?" scored 0.15. Hence the 0.2 cutoff.
- **Chat 1:** "I prefer TypeScript, and I like short answers." Claude saved
  both with `remember`, without asking.
- **Chat 2:** "Which language for a new backend service?"
  - The first time, it used the TypeScript memory but gave a long answer:
    "likes short answers" wasn't "close" to the question, so it wasn't in
    the prompt.
  - Fixed: all memories go in while there are 10 or fewer. The rerun was
    short, TypeScript, and said honestly that the handbook doesn't cover
    languages.
- **Chat 3:** "Vacation days and on-call pay?" → two `search_knowledge`
  calls → "25 paid holiday days … €400 a week", citing the Binary team
  handbook.

## Not verified here

- Google embeddings (no Google key was used).
- Very large documents near the 200,000-character limit with real
  embeddings (cost and time).
