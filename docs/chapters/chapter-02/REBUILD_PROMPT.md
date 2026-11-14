# Rebuild prompt: Chapter 2, database and ORM layer

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 1 (see `docs/chapters/chapter-01/REBUILD_PROMPT.md`).

---

You are a senior full-stack engineer and teacher. Add the database layer to
**Binary**, a pnpm + Turborepo monorepo (`apps/api` Hono + Better Auth,
`apps/web` Next.js, `apps/mobile` Expo, `packages/shared`, `packages/config`,
Postgres 16 with pgvector via Docker Compose). Work on a branch named
`feat/chapter-02-database-orm`.

## Non-negotiable code rules

1. **Follow the Google TypeScript Style Guide**
   (https://google.github.io/styleguide/tsguide.html): named exports (default
   only where a tool requires it, e.g. `drizzle.config.ts`, `vitest.config.ts`,
   with `// eslint-disable-next-line no-restricted-syntax`); `const`; no `any`;
   no non-null assertions or unsafe casts; `PascalCase` classes/types,
   `camelCase` values, `UPPER_SNAKE_CASE` constants; comments explain _why_.
2. **Beginner-friendly:** one schema file per domain, small explicit classes,
   no generic base repository, no Drizzle `relations()` yet, no extra abstraction.
3. Keep `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and the existing tests green.

## Stack

drizzle-orm 0.45, drizzle-kit 0.31, pg 8, Better Auth 1.7 (`better-auth/adapters/drizzle`),
Vitest 5, TypeScript 6.0, tsx.

## Create `packages/db` (`@binary/db`)

- `package.json`: `"type": "module"`, `"exports": {".": "./src/index.ts"}`;
  scripts `db:generate` (`drizzle-kit generate`), `db:migrate`
  (`tsx --env-file-if-exists=../../.env src/migrate.ts`), `db:studio`,
  `typecheck`, `test`.
- `drizzle.config.ts`: load `../../.env` with `process.loadEnvFile` if it
  exists; `dialect: 'postgresql'`, `schema: './src/schema/index.ts'`,
  `out: './drizzle'`, `casing: 'snake_case'`, `dbCredentials.url = DATABASE_URL`.
- `src/client.ts`: `createDatabase(url)` → `drizzle({client: new pg.Pool({connectionString}), schema, casing: 'snake_case'})`;
  `export type Database = ReturnType<typeof createDatabase>`.
- `src/migrations.ts`: `migrateDatabase(db)` runs drizzle's `migrate` with
  `migrationsFolder` = `../drizzle` resolved from `import.meta.dirname`.
- `src/migrate.ts`: throw if `DATABASE_URL` is missing, migrate, end the pool.
- `src/index.ts`: export `createDatabase`, `Database`, `migrateDatabase`,
  `schema` (namespace), `UserRepository`, `User`, `AgentTemplateRepository`,
  `AgentTemplate`, `NewAgentTemplate`.

## Schema (TypeScript keys in camelCase; tables plural snake_case)

Our tables use `uuid().primaryKey().defaultRandom()`; Better Auth tables use
`text()` ids. All timestamps `timestamp({withTimezone: true})`; `createdAt`
`.notNull().defaultNow()`; `updatedAt` also `.$onUpdate(() => new Date())`.
Every `userId` is `text().notNull().references(() => users.id, {onDelete: 'cascade'})`.

**enums.ts** (16 `pgEnum`s): `provider` (openai, anthropic, google);
`agent_engine` (api, claude_code, codex); `approval_mode` (ask_first,
accept_edits, auto_approve_reads, plan_only); `computer_kind` (runner,
sandbox, desktop, browser); `device_status` (online, offline); `routing_mode`
(mention, auto); `message_role` (user, assistant, tool); `tool_risk` (read,
write, computer); `tool_call_status` (pending, awaiting_approval, running,
succeeded, failed, rejected); `approval_status` (pending, approved, rejected,
expired, executed); `client` (web, mobile); `computer_session_status`
(running, paused, closed); `task_status` (todo, in_progress, done);
`trigger_type` (cron, webhook, manual); `run_status` (queued, running,
succeeded, failed); `mcp_server_status` (active, error, disabled).

**auth.ts**: `users` (id, name, email unique, emailVerified bool default
false, image, createdAt, updatedAt); `sessions` (id, token unique, expiresAt,
ipAddress, userAgent, userId cascade, timestamps); `accounts` (id, accountId,
providerId, userId cascade, accessToken, refreshToken, idToken,
accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, timestamps);
`verifications` (id, identifier, value, expiresAt, timestamps).

**agents.ts**: `provider_keys` (userId, provider, encryptedKey, iv, last4;
`unique(userId, provider)`); `agent_templates` (slug unique, name, role,
instructions); `agents` (userId, templateId → templates set null, name,
avatar, role, instructions default '', engine default 'api', provider, model,
approvalMode default 'ask_first', defaultComputer; index userId); `skills`
(userId, name, instructions; index userId); `agent_skills` (agentId, skillId,
both cascade; composite PK).

**chat.ts**: `rooms` (userId, name, routingMode default 'mention',
leadAgentId set null); `room_members` (roomId, agentId cascade; composite PK);
`threads` (userId, title default 'New chat', agentId cascade, roomId cascade,
timestamps; `check('threads_agent_or_room', sql\`(agentId IS NULL) <> (roomId IS NULL)\`)`);
`messages`(threadId cascade, role, authorAgentId set null, content,
attachments`jsonb().$type<string[]>()`default []; index threadId+createdAt);`tool_calls`(messageId cascade, toolName, input jsonb, output jsonb, risk,
status default 'pending', finishedAt);`approval_requests` (toolCallId unique
cascade, userId, status default 'pending', summary, decidedAt, decidedFrom;
index userId+status).

**computers.ts**: `devices` (userId, name, os, pairingCode unique, status
default 'offline', allowedFolders `text().array()` default [], killSwitch
default false, lastSeenAt); `computer_sessions` (userId, kind, providerId,
deviceId/threadId/routineRunId set null, status default 'running',
minutesUsed default 0, closedAt).

**memory.ts**: `EMBEDDING_DIMENSIONS = 1536`; `memories` (agentId cascade,
content, `vector({dimensions: 1536}).notNull()`, source default 'manual';
index agentId; `index('memories_embedding_idx').using('hnsw', embedding.op('vector_cosine_ops'))`).

**automation.ts**: `routines` (agentId cascade, name, prompt, enabled default
true); `triggers` (routineId cascade, type, cron, webhookSecret);
`routine_runs` (routineId cascade, threadId set null, status default 'queued',
error, startedAt, finishedAt); `tasks` (userId, title, status default 'todo',
assigneeAgentId set null, dueDate `date()`, timestamps; index userId+status).

**integrations.ts**: `mcp_servers` (userId, name, url, encryptedAuth, iv,
status default 'active'); `usage_records` (userId, agentId set null,
routineRunId set null, model, inputTokens, outputTokens, `numeric({precision: 12, scale: 6})`
costUsd default '0', sandboxMinutes default 0; index userId+createdAt).

`schema/index.ts` re-exports all eight files.

## Migrations

1. `pnpm drizzle-kit generate --custom --name=enable-pgvector` and write
   `CREATE EXTENSION IF NOT EXISTS vector;` into it.
2. `pnpm drizzle-kit generate --name=initial-schema` (expect 24 tables, 16 enums).
3. Add `packages/db/drizzle` to `.prettierignore`.

## Repositories (`packages/db/src/repositories`)

- `UserRepository(db)`: `findById(id)`, `findByEmail(email)` (lower-cases the
  input). No create method: Better Auth creates users.
- `AgentTemplateRepository(db)`: `findAll()` ordered by name, `findBySlug`,
  `upsert(template)` via `onConflictDoUpdate({target: slug})`, throwing if no
  row returns.

## API changes

- `src/db.ts`: `export const db = createDatabase(env.DATABASE_URL)`.
- `src/auth.ts`: `database: drizzleAdapter(db, {provider: 'pg', usePlural: true, schema: {users, sessions, accounts, verifications}})`.
- Delete `scripts/migrate.ts`; remove `pg` from the API's dependencies; add
  `@binary/db`; `drizzle-orm` as a devDependency (tests).
- `scripts/seed.ts`: upsert 4 templates (research-assistant, coding-agent,
  inbox-manager, personal-assistant, each with name, role, instructions);
  create `demo@binary.dev` / `binary-demo-password` with
  `auth.api.signUpEmail` only if missing and **never when
  `NODE_ENV === 'production'`**; end the pool. Script `db:seed`.
- Tests: clean up with `db.delete(schema.users)`; do not run migrations in tests.

## Root

- Scripts: `setup` = `docker compose up -d && pnpm db:migrate && pnpm db:seed`;
  `db:migrate`, `db:generate`, `db:studio` (filter `@binary/db`), `db:seed`
  (filter `@binary/api`).
- `turbo.json`: add `"db:migrate": {"cache": false}` and make `test` depend on
  `@binary/db#db:migrate`, so migrations run once before any test package.

## Tests (`packages/db`, real Postgres)

`vitest.config.ts` defaults `DATABASE_URL`. `src/test-utils.ts`:
`createTestUser(db)`. Tests: user by id; by email ignoring case; unknown
email → undefined; template upsert creates, then updates without duplicates;
agent defaults (`api`, `ask_first`); thread with agent accepted; thread
without agent or room rejected; duplicate provider key rejected;
`orderBy(cosineDistance(embedding, unitVector(1)))` returns the matching
memory; deleting a user removes their agents. Delete created rows afterwards.

## Docs

`docs/chapters/chapter-02/` with README (including the note that Chapter 1
singular tables are not migrated and how to drop them), IMPLEMENTATION,
ARCHITECTURE, TESTING, PR_REVIEW, this prompt, and Mermaid diagrams: layer
diagram, three ER diagrams (identity/agents; chat/approvals;
computers/memory/automation/integrations), sign-up through the Drizzle
adapter, a repository call, and the schema/setup/test workflows. Update the
root README (status, `packages/db`, demo login, `db:*` commands).

## Acceptance criteria

- On a brand-new database, `pnpm test` migrates once and every test passes
  (4 shared + 11 db + 6 api).
- `pnpm setup` then `pnpm dev`: sign up works, and the demo account signs in.
- Running the seed twice creates no duplicates; with `NODE_ENV=production`
  the demo user is skipped.
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and the web build pass.
