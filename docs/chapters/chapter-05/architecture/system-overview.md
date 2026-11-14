# System overview: Chapter 5

## Components

```mermaid
flowchart LR
  subgraph web["apps/web"]
    SB["AppSidebar<br/>Your crew · Recent chats"]
    AC["AgentChat<br/>stage · header · bubbles · composer"]
    RN["readNdjson()"]
  end

  subgraph api["apps/api"]
    RA["routes/agents.ts<br/>POST /:id/threads"]
    RT["routes/threads.ts<br/>GET · DELETE · POST /:id/messages"]
    TT["titleFrom()"]
    SP["buildSystemPrompt()"]
    EF["EngineFactory"]
    AE["ApiEngine<br/>generate() · stream()"]
  end

  subgraph db["packages/db"]
    TR["ThreadRepository"]
    MR["MessageRepository"]
    AR["AgentRepository"]
  end

  PROV["OpenAI · Anthropic · Gemini<br/>streamText"]
  PG[("threads · messages")]

  SB -- "GET /api/threads (layout)" --> RT
  AC -- "POST (first message)" --> RA
  AC -- "POST {content}" --> RT
  RT -- "NDJSON" --> RN --> AC
  RA --> TR
  RT --> TR & MR & AR
  RT --> TT & SP & EF
  EF --> AE --> PROV
  TR & MR --> PG
```

## Data used this chapter

```mermaid
erDiagram
  users ||--o{ threads : owns
  agents ||--o{ threads : "1:1 chat"
  threads ||--o{ messages : contains
  agents |o--o{ messages : "wrote (assistant)"

  threads {
    uuid id
    text user_id
    uuid agent_id
    text title "New chat → first message"
    timestamptz updated_at "moves to top of Recent chats"
  }
  messages {
    uuid id
    uuid thread_id
    message_role role "user | assistant"
    uuid author_agent_id
    text content
    timestamptz created_at
  }
```

`threads.room_id`, `messages.attachments`, `tool_calls` and
`approval_requests` exist from Chapter 2 and stay unused until group chats
and tools.
