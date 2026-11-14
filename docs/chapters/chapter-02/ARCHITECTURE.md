# Chapter 2: Architecture

Diagrams: [layer + ER diagrams](architecture/system-overview.md),
[request flows](architecture/request-flow.md),
[schema, setup and test workflows](architecture/integration-flow.md).

## The layers

```text
apps/api, scripts, (later) apps/jobs
        │  new XRepository(db)            Repository pattern
        ▼
packages/db/src/repositories/*            the only place queries live
        │  db.select() / insert() …
        ▼
packages/db/src/client.ts  → Drizzle  →  pg.Pool  →  Postgres + pgvector
        ▲
packages/db/src/schema/*  (types for everything above)
```

- **Schema is the single source of truth.** Tables, TypeScript types
  (`$inferSelect`, `$inferInsert`) and SQL migrations all come from
  `src/schema`.
- **Repositories hide queries.** Callers pass a `db` in and get typed objects
  back. Tests can pass in a test database; later chapters can fake a repository
  with a plain object.
- **One client per process.** `createDatabase()` makes one pool; the API
  creates it once in `src/db.ts` and shares it with Better Auth.

## Rules the database enforces (not just the code)

| Rule                                              | How                                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A thread belongs to exactly one agent or one room | `CHECK ((agent_id IS NULL) <> (room_id IS NULL))`                                                        |
| One API key per provider per user                 | `UNIQUE (user_id, provider)`                                                                             |
| One approval per tool call                        | `UNIQUE (tool_call_id)`                                                                                  |
| Statuses and kinds are from a fixed list          | 16 Postgres enums                                                                                        |
| Deleting a user deletes their data                | `ON DELETE CASCADE` on every `user_id`                                                                   |
| Deleting an agent keeps history readable          | `ON DELETE SET NULL` for `messages.author_agent_id`, `tasks.assignee_agent_id`, `usage_records.agent_id` |
| Template slugs and pairing codes are unique       | `UNIQUE` columns                                                                                         |

## Indexes

Every foreign key that lists data for a user or parent is indexed
(`agents.user_id`, `messages(thread_id, created_at)`,
`approval_requests(user_id, status)`, …). `memories.embedding` has an HNSW
index with `vector_cosine_ops`, so "closest memories" stays fast as memory
grows.

## Security notes

- `provider_keys.encrypted_key` and `mcp_servers.encrypted_auth` store only
  ciphertext and an IV. Encryption itself arrives in Chapter 3.
- `accounts.password` is hashed by Better Auth; no code in this repo reads it.
- The seed never creates the demo account in production.
