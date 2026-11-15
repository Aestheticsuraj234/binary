# Request flow: a message, with memory and knowledge

```mermaid
sequenceDiagram
  actor U as You
  participant A as API (writeReply)
  participant AM as AgentMemory
  participant E as Embedder
  participant DB as Postgres
  participant M as Model
  participant KB as KnowledgeBase

  U->>A: "How many vacation days do we get?"
  A->>AM: forPrompt(agent, message)
  AM->>DB: count memories
  alt 10 or fewer
    AM->>DB: all of them
  else more
    AM->>E: embed(message)
    AM->>DB: 5 nearest (distance < 0.75)
  end
  AM-->>A: ["Prefers TypeScript.", "Likes short answers."]
  A->>M: system (+ "What you remember…"), tools incl. search_knowledge
  M->>KB: search_knowledge("vacation days annual leave")
  KB->>E: embed(query)
  KB->>DB: nearest passages (this user, this model), score ≥ 0.2
  KB-->>M: [{title: "Binary team handbook", content, score: 0.43}]
  M-->>U: "25 paid holiday days … (Binary team handbook)"
```

A `remember` call in the same way: embed the fact → find the nearest
memory → if it's closer than 0.1, answer `{alreadyKnown}`; otherwise
save it with the chat's id as its source.
