# System overview: Chapter 12

```mermaid
flowchart LR
  subgraph web["apps/web"]
    KP["/knowledge<br/>add text · file · page<br/>documents · try a question"]
    MP["/agents/:id/memory<br/>memories · add · forget"]
    CH["Chat<br/>MemoryOutput · KnowledgeMatches"]
  end

  subgraph api["apps/api"]
    MR["routes/memory.ts<br/>memoryRoutes · knowledgeRoutes"]
    AM["AgentMemory<br/>remember · recall · forPrompt · forget"]
    KB["KnowledgeBase<br/>add · search"]
    EF["EmbedderFactory<br/>OpenAI → Google → off"]
    CK["splitIntoChunks"]
    MT["memory-tools.ts<br/>remember · recall · forget · search_knowledge"]
    WR["writeReply<br/>buildSystemPrompt(agent, remembered)"]
    WP["fetchPageText + guard"]
  end

  subgraph pg["Postgres + pgvector"]
    M[("memories<br/>vector(1536), HNSW")]
    KD[("knowledge_documents")]
    KC[("knowledge_chunks<br/>vector(1536), HNSW")]
  end

  EMB[("OpenAI / Google<br/>embeddings")]

  KP & MP --> MR
  MR --> AM & KB
  CH --> WR
  WR --> AM
  WR --> MT --> AM & KB
  AM & KB --> EF --> EMB
  KB --> CK
  KB --> WP
  AM --> M
  KB --> KD & KC
```

| Piece                                     | Role                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `EmbedderFactory`                         | The user's embedding model, from an OpenAI or Google key                    |
| `AgentMemory`                             | One agent's memories: save (no duplicates), search, what goes in the prompt |
| `KnowledgeBase`                           | Documents: read or fetch, cut, embed, save; search with a score cutoff      |
| `MemoryRepository`, `KnowledgeRepository` | Postgres with `cosineDistance`                                              |
| `memoryTools`                             | Four read tools for every agent, when an embedding key exists               |
