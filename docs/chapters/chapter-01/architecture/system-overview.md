# System overview: Chapter 1

> Diagrams are Mermaid. The Jojopen MCP server was not connected in the
> session that built this chapter, so Mermaid (the documented fallback) is used.
> GitHub, Cursor and VS Code render these blocks directly.

## Components

```mermaid
flowchart LR
  subgraph Clients
    W["Web app<br/>Next.js · :3000<br/>apps/web"]
    M["Mobile app<br/>Expo Router<br/>apps/mobile"]
  end

  subgraph Server
    A["API<br/>Hono · :4000<br/>apps/api"]
    BA["Better Auth<br/>src/auth.ts"]
  end

  DB[("Postgres 16 + pgvector<br/>Docker · :5432")]
  S["packages/shared<br/>Zod schemas + constants"]
  SS["Phone secure storage<br/>Keychain / Keystore"]

  W -- "fetch + cookie<br/>/api/auth/*" --> A
  W -- "server-side<br/>GET /api/auth/get-session" --> A
  M -- "fetch + Cookie header<br/>/api/auth/*" --> A
  A --> BA
  BA -- "pg Pool" --> DB
  M -. "session cookie" .- SS
  S -. "imported by" .- W
  S -. "imported by" .- M
  S -. "imported by" .- A
```

## Database (created by Better Auth)

```mermaid
erDiagram
  user ||--o{ session : "has"
  user ||--o{ account : "has"

  user {
    text id PK
    text name
    text email
    boolean emailVerified
    text image
    timestamptz createdAt
    timestamptz updatedAt
  }
  session {
    text id PK
    text token
    timestamptz expiresAt
    text ipAddress
    text userAgent
    text userId FK
  }
  account {
    text id PK
    text accountId
    text providerId "credential for email + password"
    text password "hashed"
    text userId FK
  }
  verification {
    text id PK
    text identifier
    text value
    timestamptz expiresAt
  }
```

`verification` is unused in Chapter 1. It is created now because Better Auth
needs it for email verification and password reset later.
