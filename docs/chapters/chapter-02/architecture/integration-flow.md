# Integration flow: schema changes, setup and tests

## Changing the schema (developer workflow)

```mermaid
flowchart TD
  A["Edit packages/db/src/schema/*.ts"] --> B["pnpm db:generate<br/>drizzle-kit compares schema<br/>with the last snapshot"]
  B --> C["New SQL file in packages/db/drizzle/<br/>e.g. 0002_add_column.sql"]
  C --> D["Read the SQL, commit it"]
  D --> E["pnpm db:migrate<br/>applies pending files in order"]
  E --> F[("Postgres<br/>__drizzle_migrations tracks<br/>what has run")]
```

Migrations shipped in this chapter:

| File                       | What it does                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `0000_enable-pgvector.sql` | `CREATE EXTENSION IF NOT EXISTS vector` (hand-written)                                     |
| `0001_initial-schema.sql`  | All 16 enums and 24 tables, foreign keys, indexes, the thread check constraint (generated) |

## `pnpm setup` on a new machine

```mermaid
flowchart LR
  A["docker compose up -d<br/>pgvector/pgvector:pg16"] --> B["pnpm db:migrate<br/>packages/db"]
  B --> C["pnpm db:seed<br/>apps/api/scripts/seed.ts"]
  C --> C1["4 agent templates<br/>(upsert by slug)"]
  C --> C2["demo@binary.dev<br/>(skipped in production)"]
```

## `pnpm test`

```mermaid
flowchart LR
  T["pnpm test<br/>(turbo)"] --> M["@binary/db#db:migrate<br/>runs once first"]
  M --> S["@binary/shared<br/>4 tests"]
  M --> D["@binary/db<br/>11 tests"]
  M --> A["@binary/api<br/>6 tests"]
```

Migrating once before any test package starts avoids two packages creating
the same tables at the same time on a fresh CI database.
