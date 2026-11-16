# Chapter 12 diagram

Everything goes through one embedder, built from your OpenAI or Google key.
Memories ride along with every message; knowledge is searched only when a
character uses its tool.

```mermaid
flowchart LR
  U["You"]

  subgraph Web["Web app"]
    C["Chat"]
    MP["Memory page<br/>per character"]
    KP["Knowledge page<br/>text, file, web page"]
  end

  subgraph API["API"]
    R["Reply<br/>system prompt + history"]
    T["Memory tools<br/>remember, recall, forget,<br/>search knowledge (read)"]
    CH["Chunking<br/>cut into passages"]
    E["Embedder<br/>OpenAI or Google key"]
  end

  M["AI model"]
  DB[("Postgres + pgvector<br/>memories, documents, passages")]

  U --> C --> R
  R -- "memories into the prompt" --> M
  M -- "tool calls" --> T
  U --> MP --> E
  U --> KP --> CH --> E
  T --> E
  R --> E
  E -- "vectors + model name" --> DB
```
