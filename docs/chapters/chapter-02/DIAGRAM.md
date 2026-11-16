# Chapter 2 diagram

The main tables, grouped around the user. Every later chapter fills in one
part of this map. Auth's session and account tables, and a few join tables,
are left out to keep it readable.

```mermaid
erDiagram
  USER ||--o{ AGENT : hires
  AGENT_TEMPLATE |o--o{ AGENT : "starts from"
  USER ||--o{ THREAD : owns
  AGENT ||--o{ THREAD : "chats in"
  ROOM ||--o{ THREAD : "or chats in"
  THREAD ||--o{ MESSAGE : contains
  MESSAGE ||--o{ TOOL_CALL : makes
  TOOL_CALL ||--o| APPROVAL_REQUEST : "may need"
  AGENT ||--o{ MEMORY : remembers
  AGENT ||--o{ ROUTINE : runs
  ROUTINE ||--o{ ROUTINE_RUN : "has runs"
  USER ||--o{ DEVICE : pairs
  USER ||--o{ MCP_SERVER : connects
  USER ||--o{ PROVIDER_KEY : stores
```
