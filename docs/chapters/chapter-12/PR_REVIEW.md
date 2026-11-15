# Chapter 12: Review

**Branch:** `feat/chapter-12-memory` → `main`
**Reviewer:** Claude, a self-review.

## Google TypeScript Style Guide

- Named exports; no `any`, non-null assertions or casts in app code. A
  test cast was replaced with `Reflect.get` and a type check.
- `UPPER_SNAKE_CASE` tuning constants, each with the reason for its value
  (`DUPLICATE_DISTANCE`, `ALL_MEMORIES_UP_TO`, `PROMPT_MAX_DISTANCE`,
  `MIN_SCORE`, `CHUNK_SIZE`, `OVERLAP`).
- Lint and Prettier pass.

## Findings and fixes

| #   | Severity                            | Finding                                                                                                              | Fix                                                                                                                                                       |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | High (correctness)                  | Vectors from OpenAI and Google live in different spaces; comparing them gives confident nonsense.                    | `embedding_model` on every row; searches filter on it; the Memory page counts what became unsearchable.                                                   |
| 2   | Medium (found with a real model)    | Memories were chosen by similarity only, so "likes short answers" never reached the prompt, and the answer was long. | All memories go in while there are 10 or fewer (with no embedding call); beyond that, the 5 closest. Tested both; the rerun answered briefly.             |
| 3   | Medium (found with real embeddings) | Search returned passages about something else (scores near 0.1).                                                     | A 0.2 cutoff, chosen from measured scores (related 0.28–0.43, unrelated 0.15).                                                                            |
| 4   | Medium (security)                   | A "web page" document is a URL the server fetches.                                                                   | Chapter 6's `fetchPageText` and private-address guard, with redirects re-checked. The test API injects a guard that allows its local site.                |
| 5   | Medium (safety)                     | Passages are text from documents the model reads.                                                                    | The tool description says passages are information, not instructions, and asks for citations. The model still sees the text: an accepted risk, see below. |
| 6   | Low (quality)                       | Telling a character the same fact twice would pile up copies.                                                        | Nearest memory under distance 0.1 → `{alreadyKnown}`. Tested.                                                                                             |
| 7   | Low (cost)                          | Embedding every message to choose memories costs a call per message.                                                 | No call for an agent without memories, or with 10 or fewer.                                                                                               |
| 8   | Low (test)                          | The test handbook was padded with "Rest well." ×100, which drowned the real words in the bag-of-words embedder.      | Padding with stop words the fake ignores.                                                                                                                 |

## Accepted trade-offs

- **Prompt injection through documents:** a passage can still contain
  instructions. Tools that change things still ask first, which is the
  real guard.
- **No re-indexing:** after switching embedding keys, old memories and
  passages can't be searched until they're added again. The Memory page
  says how many.
- **Plain text only:** PDFs and Word files aren't read yet; text,
  Markdown, CSV and JSON files are.
- **Adding happens inside the request:** a big document makes "Add" wait
  while it's embedded. A job (Chapter 7's runner) could take this over.
- **Embedding calls aren't counted** in usage yet (Chapter 15).

## Open items

- Try Google embeddings.
- PDF support.
