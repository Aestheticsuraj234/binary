# Request flow: sign-up through Drizzle, and a repository call

## Sign-up now goes through the Drizzle adapter

```mermaid
sequenceDiagram
  autonumber
  participant C as Web or mobile client
  participant API as Hono API
  participant BA as Better Auth
  participant AD as drizzleAdapter<br/>(usePlural: true)
  participant D as Drizzle (db)
  participant PG as Postgres

  C->>API: POST /api/auth/sign-up/email
  API->>BA: auth.handler(request)
  BA->>AD: create user, account, session
  AD->>D: insert(schema.users) …
  D->>PG: INSERT INTO "users" (…, "email_verified", "created_at")
  Note over D,PG: casing: 'snake_case' turns emailVerified<br/>into email_verified
  PG-->>D: row
  D-->>BA: user
  BA-->>C: 200 + session cookie
```

Nothing changed for the web and mobile apps: same endpoints, same cookie.
Only the storage underneath moved from Better Auth's own SQL to Drizzle.

## A repository call (used by the seed today, by the API in later chapters)

```mermaid
sequenceDiagram
  participant S as seed.ts
  participant R as AgentTemplateRepository
  participant D as Drizzle
  participant PG as Postgres

  S->>R: new AgentTemplateRepository(db)
  S->>R: upsert({slug: 'coding-agent', …})
  R->>D: insert(agentTemplates).values(…)<br/>.onConflictDoUpdate({target: slug})
  D->>PG: INSERT … ON CONFLICT ("slug") DO UPDATE …
  PG-->>R: saved row
  R-->>S: AgentTemplate
```

The repository is the only place that knows the query. Callers get typed
objects (`AgentTemplate`) and never write SQL.
