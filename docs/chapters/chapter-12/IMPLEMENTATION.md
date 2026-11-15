# Chapter 12: Implementation

## Plan

1. **Data:**
   - a migration for the knowledge tables and `memories.embedding_model`
   - `MemoryRepository` and `KnowledgeRepository`, using `cosineDistance`
2. **Shared:** `MemoryView`, `MemoryStatus`, the document and memory
   schemas, `KnowledgeDocumentView`, `KnowledgeMatch`.
3. **API:**
   - `EmbedderFactory` (OpenAI or Google) and `splitIntoChunks`
   - `AgentMemory` and `KnowledgeBase`
   - four read tools
   - memories in the system prompt
   - routes
4. **Web:**
   - the Knowledge page (add, list, try a question)
   - the Memory page per agent, with a Memory button in the chat
   - tool rows that say what was saved or found
5. **Tests:** repository, chunking, schema and API tests with a fake
   embedder; a walkthrough; real runs with OpenAI embeddings and Claude.

## Acceptance criteria

- [x] A character remembers facts across chats, saved by itself or by
      you, with no duplicates; you can see and delete every memory.
- [x] Relevant memories reach the prompt without a tool call (all of
      them while there are 10 or fewer).
- [x] Add pasted text, a file or a public web page to your knowledge;
      characters find the right passage by meaning and cite its document.
- [x] Private addresses are refused for web pages; everything is per
      user (and per agent for memories).
- [x] Without an OpenAI or Google key, memory and knowledge are off, and
      the pages say which key to add.
- [x] One migration; lint, format, type-check, tests and the build pass;
      no sideways scroll at 390px.

## File-by-file

| File                                                                                      | Purpose                                                                                   |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `packages/db/drizzle/0004_knowledge.sql`, `schema/memory.ts`                              | `knowledge_documents`, `knowledge_chunks` (HNSW), `memories.embedding_model`              |
| `packages/db/src/repositories/memory-repository.ts`                                       | add, list, search (nearest, same model), count, count other models, delete                |
| `packages/db/src/repositories/knowledge-repository.ts`                                    | create (one transaction), list (with passage counts), search (with titles), delete        |
| `packages/shared/src/memory.ts`                                                           | Views, `addMemorySchema`, `addDocumentSchema` (text, file or url), `MAX_DOCUMENT_LENGTH`  |
| `apps/api/src/memory/embedder.ts`                                                         | `Embedder`, `EmbedderFactory`, `createEmbedder` (AI SDK `embedMany`, 1536, batches of 96) |
| `apps/api/src/memory/chunking.ts`                                                         | `splitIntoChunks`                                                                         |
| `apps/api/src/memory/agent-memory.ts`                                                     | `AgentMemory`, `NoEmbedderError`, `toMemoryView`                                          |
| `apps/api/src/memory/knowledge-base.ts`                                                   | `KnowledgeBase`, `toDocumentView`, the 0.2 score cutoff                                   |
| `apps/api/src/memory/fake-embedder.ts`                                                    | A bag-of-words embedder for tests and checks                                              |
| `apps/api/src/tools/memory-tools.ts`                                                      | `remember`, `recall`, `forget`, `search_knowledge`                                        |
| `apps/api/src/routes/memory.ts`                                                           | `memoryRoutes` (under `/api/agents`), `knowledgeRoutes`                                   |
| `apps/api/src/chat/reply.ts`, `agents/system-prompt.ts`                                   | `memory.forPrompt` into `buildSystemPrompt(agent, remembered)`                            |
| `apps/api/src/tools/toolbox-factory.ts`, `container.ts`                                   | `agentId` in the scope; memory tools; `createEmbedder` and `pageGuard` options            |
| `apps/api/src/tools/web-page.ts`                                                          | `fetchPageText(url, guard, maxLength)`                                                    |
| `apps/web/src/app/(app)/knowledge/page.tsx`, `components/memory/knowledge-library.tsx`    | Knowledge page, `KnowledgeMatches`                                                        |
| `apps/web/src/app/(app)/agents/[id]/memory/page.tsx`, `components/memory/memory-list.tsx` | Memory page                                                                               |
| `apps/web/src/components/memory/unavailable-notice.tsx`, `lib/memory.ts`                  | The key notice; client calls                                                              |
| `apps/web/src/components/chat/memory-output.tsx`, `tool-call.tsx`                         | Memory and knowledge results in tool rows                                                 |
| `apps/web/src/components/agents/agent-chat.tsx`, `app/app-sidebar.tsx`                    | Memory button; Knowledge link                                                             |

## Decisions

| Decision                                               | Why                                                                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| pgvector in the existing Postgres                      | The plan's choice: no new service, joins with users and agents, HNSW for speed.                             |
| OpenAI's small model first, Google second, at 1536     | Both fit the column made in Chapter 2; Anthropic has no embeddings.                                         |
| The model saved on every vector                        | Vectors of different models can't be compared; switching keys must not give nonsense matches.               |
| Memories per agent, knowledge per user                 | A character's memories are its own relationship with you; documents are facts any character may need.       |
| All memories in the prompt while there are 10 or fewer | General preferences never look "similar" to a question; found with a real model.                            |
| Memory tools are reads                                 | They only change Binary's own, visible, deletable data; asking each time would make memory useless.         |
| A 0.2 score cutoff on knowledge                        | Measured: related 0.28–0.43, unrelated 0.15 with real embeddings; keeps irrelevant passages from the model. |
| Duplicates under distance 0.1 are skipped              | "Lives in Pune, works remotely" and "Lives in Pune and works remotely" are one memory.                      |
