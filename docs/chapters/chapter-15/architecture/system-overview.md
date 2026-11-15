# System overview: the whole of Binary

```mermaid
flowchart TB
  subgraph you["You"]
    WEB["Web app (Next.js)<br/>crew · chats · rooms · Today · routines<br/>knowledge · apps · computers · playground · keys"]
    MOB["Mobile app (Expo)<br/>crew · chats · rooms · Today · voice"]
    RUN["Runner (your computer)<br/>shared folders · Claude Code · Codex"]
  end

  subgraph api["API (Hono)"]
    AUTH["Better Auth"]
    ROUTES["routes/*"]
    REPLY["writeReply · runRoomTurn<br/>decideApproval · runRoutine"]
    ENG["EngineFactory<br/>ApiEngine · RunnerEngine"]
    TB["ToolboxFactory<br/>built-in · MCP · memory · computers"]
    COMP["Sandbox · Browser · Desktop sessions"]
    MEM["AgentMemory · KnowledgeBase"]
    VOICE["Voice"]
    VAULT["KeyVault (AES-256-GCM)"]
  end

  DB[("Postgres + pgvector")]
  LLM(["OpenAI · Anthropic · Google"])
  E2B(["E2B sandbox · E2B desktop"])
  CHR(["Chromium (Playwright)"])
  MCP(["MCP servers<br/>DeepWiki · Composio"])
  TRG(["Trigger.dev"])

  WEB & MOB -->|cookie| AUTH
  WEB & MOB --> ROUTES --> REPLY
  RUN -->|long-poll| ROUTES
  REPLY --> ENG --> LLM
  REPLY --> TB
  TB --> COMP
  COMP --> E2B
  COMP --> CHR
  TB --> MCP
  TB --> MEM --> DB
  VOICE --> LLM
  REPLY --> DB
  VAULT --> DB
  ROUTES --> TRG
  TRG -->|run-routine| REPLY
```

| Box             | Chapter |
| --------------- | ------- |
| Auth, apps      | 1       |
| Database        | 2       |
| Engines, vault  | 3       |
| Characters      | 4       |
| Chat            | 5       |
| Tools, MCP      | 6       |
| Routines        | 7       |
| Approvals       | 8       |
| Sandbox         | 9       |
| Browser         | 10      |
| Runner, desktop | 11      |
| Memory          | 12      |
| Rooms           | 13      |
| Mobile, voice   | 14      |
