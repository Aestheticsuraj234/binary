# System overview: Chapter 2

> Mermaid diagrams (Jojopen was not connected in the session that built this
> chapter; Mermaid is the documented fallback).

## Where the database layer sits

```mermaid
flowchart LR
  subgraph apps
    API["apps/api<br/>Hono + Better Auth"]
    SEED["apps/api/scripts/seed.ts"]
  end

  subgraph "packages/db"
    CLIENT["client.ts<br/>createDatabase()"]
    SCHEMA["schema/*.ts<br/>24 tables · 16 enums"]
    REPOS["repositories/<br/>UserRepository<br/>AgentTemplateRepository"]
    MIG["migrations.ts + drizzle/*.sql"]
  end

  DB[("Postgres 16<br/>+ pgvector")]

  API -- "drizzleAdapter(db)" --> CLIENT
  SEED --> REPOS
  REPOS --> CLIENT
  CLIENT --> SCHEMA
  CLIENT -- "pg Pool" --> DB
  MIG -- "pnpm db:migrate" --> DB
```

## Data model 1 of 3: identity, agents and skills

```mermaid
erDiagram
  users ||--o{ sessions : "signs in with"
  users ||--o{ accounts : "has"
  users ||--o{ provider_keys : "owns"
  users ||--o{ agents : "owns"
  users ||--o{ skills : "owns"
  agent_templates ||--o{ agents : "starts"
  agents ||--o{ agent_skills : "uses"
  skills ||--o{ agent_skills : "used by"

  users {
    text id PK
    text email UK
    text name
  }
  provider_keys {
    uuid id PK
    text user_id FK
    provider provider "unique per user"
    text encrypted_key
    text last4
  }
  agent_templates {
    uuid id PK
    text slug UK
    text name
    text role
  }
  agents {
    uuid id PK
    text user_id FK
    uuid template_id FK
    text name
    agent_engine engine "api | claude_code | codex"
    approval_mode approval_mode "default ask_first"
    computer_kind default_computer
  }
  skills {
    uuid id PK
    text user_id FK
    text name
    text instructions
  }
  agent_skills {
    uuid agent_id PK, FK
    uuid skill_id PK, FK
  }
```

`verifications` (Better Auth) has no relations and is left out.

## Data model 2 of 3: chat, tools and approvals

```mermaid
erDiagram
  users ||--o{ rooms : "owns"
  rooms ||--o{ room_members : "has"
  agents ||--o{ room_members : "joins"
  agents ||--o{ threads : "1:1 chat"
  rooms ||--o{ threads : "group chat"
  threads ||--o{ messages : "contains"
  messages ||--o{ tool_calls : "requests"
  tool_calls ||--o| approval_requests : "may need"

  rooms {
    uuid id PK
    routing_mode routing_mode "mention | auto"
    uuid lead_agent_id FK
  }
  threads {
    uuid id PK
    uuid agent_id FK "agent XOR room"
    uuid room_id FK "agent XOR room"
    text title
  }
  messages {
    uuid id PK
    uuid thread_id FK
    message_role role "user | assistant | tool"
    uuid author_agent_id FK
    text content
    jsonb attachments
  }
  tool_calls {
    uuid id PK
    uuid message_id FK
    text tool_name
    tool_risk risk "read | write | computer"
    tool_call_status status
  }
  approval_requests {
    uuid id PK
    uuid tool_call_id FK, UK
    approval_status status
    client decided_from "web | mobile"
  }
```

## Data model 3 of 3: computers, memory, automation, integrations

```mermaid
erDiagram
  users ||--o{ devices : "pairs"
  users ||--o{ computer_sessions : "uses"
  devices ||--o{ computer_sessions : "runs"
  threads ||--o{ computer_sessions : "during"
  agents ||--o{ memories : "remembers"
  agents ||--o{ routines : "runs"
  routines ||--o{ triggers : "started by"
  routines ||--o{ routine_runs : "produces"
  routine_runs ||--o| threads : "transcript"
  users ||--o{ tasks : "owns"
  agents ||--o{ tasks : "assigned"
  users ||--o{ mcp_servers : "connects"
  users ||--o{ usage_records : "spends"
  agents ||--o{ usage_records : "incurs"

  devices {
    uuid id PK
    text pairing_code UK
    device_status status
    text_array allowed_folders
    boolean kill_switch
  }
  computer_sessions {
    uuid id PK
    computer_kind kind "runner | sandbox | desktop | browser"
    text provider_id
    computer_session_status status
    int minutes_used
  }
  memories {
    uuid id PK
    uuid agent_id FK
    text content
    vector embedding "1536 dims, HNSW cosine index"
  }
  routines {
    uuid id PK
    text prompt
    boolean enabled
  }
  triggers {
    uuid id PK
    trigger_type type "cron | webhook | manual"
    text cron
  }
  routine_runs {
    uuid id PK
    run_status status
  }
  tasks {
    uuid id PK
    task_status status
    uuid assignee_agent_id FK
    date due_date
  }
  mcp_servers {
    uuid id PK
    text url
    mcp_server_status status
  }
  usage_records {
    uuid id PK
    text model
    int input_tokens
    int output_tokens
    numeric cost_usd
  }
```
