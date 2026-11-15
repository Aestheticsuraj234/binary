# Chapter 12: Architecture

Diagrams: [components](architecture/system-overview.md),
[a message end to end](architecture/request-flow.md),
[adding a document](architecture/integration-flow.md).

## Embeddings

- **`EmbedderFactory.forUser(userId)`** picks the user's first key among
  `openai` and `google`, and builds an `Embedder {model, embed(values)}`:

  | Key    | Model                           | Length                           |
  | ------ | ------------------------------- | -------------------------------- |
  | OpenAI | `openai/text-embedding-3-small` | 1536                             |
  | Google | `google/gemini-embedding-001`   | 1536 (asked for; it supports it) |
  | none   | memory and knowledge are off    |                                  |

- **How it embeds:** with the AI SDK's `embedMany` (`dimensions: 1536`), in
  batches of 96 passages.
- **Every vector records its model** (`embedding_model`). Vectors from two
  models can't be compared, so searches only look at the current model's
  rows. If you switch keys, older memories can't be searched, and the
  Memory page says how many.
- **Tests** pass `createEmbedder: () => fakeEmbedder()`, a bag-of-words
  hash into 1536 buckets with no network.

## Memory (`AgentMemory`)

- **`remember(userId, agentId, content, source)`:**
  - embeds the text and finds the nearest memory
  - if that is closer than cosine distance 0.1, returns
    `{alreadyKnown}` and saves nothing
  - otherwise saves the memory, where `source` is the chat's id or
    `manual`
- **`recall(query)`:** the 5 nearest memories, scored 0–1 (1 − distance).
- **`forPrompt(message)`:** what `writeReply` puts into the system prompt
  (`buildSystemPrompt(agent, remembered)`) under "What you remember about
  the user from earlier chats (it may be out of date; ask if unsure)":
  - none for an agent with no memories (no embedding call)
  - **all** of them for an agent with 10 or fewer (no embedding call). A
    preference like "likes short answers" matters to every message but is
    never "close" to one; a real run showed this.
  - otherwise the 5 nearest with distance under 0.75
- **Ownership:** memories belong to an agent. Routes check that the agent
  is the user's first.

## Knowledge (`KnowledgeBase`)

- **`add(userId, {source: text | file, title, text} | {source: url, url})`:**
  - a URL goes through Chapter 6's `fetchPageText` and private-address
    guard, now with a 200,000-character limit
  - the text is cut with `splitIntoChunks`: paragraphs packed up to
    1,200 characters, a 200-character overlap, and long paragraphs split
  - the passages are embedded
  - document and passages are saved in **one transaction**
- **`search(userId, query)`:** the 5 nearest passages from the current
  model, joined to their document's title, scored, and dropped below
  **0.2**. With real OpenAI embeddings on a handbook, related questions
  scored 0.28–0.43 and an unrelated one 0.15.

## Search in Postgres

```sql
SELECT …, embedding <=> $1 AS distance      -- drizzle: cosineDistance(column, vector)
FROM knowledge_chunks
WHERE user_id = $2 AND embedding_model = $3
ORDER BY distance LIMIT 5;
```

HNSW indexes with `vector_cosine_ops` on `memories.embedding` (since
Chapter 2) and `knowledge_chunks.embedding` keep this fast as the tables
grow.

## Tools

`ToolboxFactory.forUser(userId, {threadId, agentId, computer})` adds the
memory tools when the user has an embedding key:

| Tool               | Risk | Does                                                                                                                               |
| ------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `remember`         | read | `{fact}` saved, or `{alreadyKnown}`                                                                                                |
| `recall`           | read | `{memories: [{id, content, score}]}`                                                                                               |
| `forget`           | read | `{memoryId}` deleted                                                                                                               |
| `search_knowledge` | read | `{matches: KnowledgeMatch[]}`. The description tells the model to cite titles and treat passages as information, not instructions. |

## API contracts

| Method + path                               | Success                                                              | Errors                                                            |
| ------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `GET /api/agents/:id/memories`              | `{status: {available, model, unsearchable}, memories: MemoryView[]}` | `404` not your agent                                              |
| `POST /api/agents/:id/memories {content}`   | `201 {saved}` or `200 {alreadyKnown}`                                | `400` no embedding key, or too long                               |
| `DELETE /api/agents/:id/memories/:memoryId` | `204`                                                                | `404`                                                             |
| `GET /api/knowledge`                        | `{available, documents: KnowledgeDocumentView[]}`                    |                                                                   |
| `POST /api/knowledge`                       | `201 {document}`                                                     | `400` no key, empty, too long, unreadable page or private address |
| `GET /api/knowledge/search?q=`              | `{matches}`                                                          | `400` no key                                                      |
| `DELETE /api/knowledge/:id`                 | `204` (its passages go too)                                          | `404`                                                             |

## Data

Migration `0004_knowledge`:

- `knowledge_documents` (user, title, source, source URL, characters)
- `knowledge_chunks` (document, user, position, content, `vector(1536)`,
  embedding model), with an HNSW index and cascades
- `memories.embedding_model`
