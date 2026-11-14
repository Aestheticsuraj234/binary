# Chapter 4: Implementation

## Plan

1. Put the agent form schema, run schema and response types in
   `packages/shared`.
2. Add `AgentRepository` (every method scoped to the owner) and
   `AgentTemplateRepository.findById` to `packages/db`.
3. API: `buildSystemPrompt`, a shared `engineErrorResponse`, then
   `/api/agents` (CRUD + run) and `/api/agent-templates`.
4. Web: Agents nav link, list page, hire page, agent page, and a home page
   that shows agents.
5. Test with a fake model that records the system prompt; verify in a real
   browser.

## Acceptance criteria

- [x] A user can hire an agent from a template or from scratch, choosing a
      provider they have a key for and a model.
- [x] A user can edit an agent's name, role, instructions, provider and model.
- [x] A user can give an agent a task and get an answer written with the
      agent's system prompt, plus token usage and time.
- [x] A user can fire (delete) an agent after confirming.
- [x] No user can see, edit, run or delete another user's agent (404).
- [x] Creating or editing an agent for a provider without a key fails with
      "Add your … API key in Settings first."
- [x] Without any key, the Agents page asks for one and `/agents/new`
      redirects to API keys.
- [x] No migration: the Chapter 2 schema already has every column.
- [x] Lint, format, type-check, all tests and the web build pass; no page
      scrolls sideways at 390px.

## File-by-file

### `packages/shared`

| File                 | Purpose                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/agents.ts`      | `agentInputSchema`, `runAgentSchema`, types `Agent`, `AgentInput`, `AgentTemplate`, `AgentRunResult` |
| `src/agents.test.ts` | Schema tests (4)                                                                                     |

### `packages/db`

| File                                            | Purpose                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| `src/repositories/agent-repository.ts`          | `create`, `listForUser` (newest first), `findForUser`, `update`, `delete` |
| `src/repositories/agent-template-repository.ts` | Adds `findById`                                                           |

### `apps/api`

| File                            | Purpose                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| `src/agents/system-prompt.ts`   | `buildSystemPrompt({name, role, instructions})`                           |
| `src/routes/engine-errors.ts`   | `engineErrorResponse(c, error)`: missing key → 400, anything else → 502   |
| `src/routes/agents.ts`          | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /:id/run` |
| `src/routes/agent-templates.ts` | `GET /`                                                                   |
| `src/routes/playground.ts`      | Now uses `engineErrorResponse` (same behaviour)                           |
| `src/container.ts`              | Adds `agents` and `agentTemplates` to `AppDependencies`                   |
| `src/app.ts`                    | Mounts `/api/agents` and `/api/agent-templates`                           |
| `src/test-helpers.ts`           | Adds `readJson<T>(response)`                                              |

### `apps/web`

| File                                            | Purpose                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/app/(app)/agents/page.tsx`                 | List, empty state, "Add an API key first", template cards, "New agent"         |
| `src/app/(app)/agents/new/page.tsx`             | Hire page; `?template=<slug>` pre-fills; redirects to `/settings` without keys |
| `src/app/(app)/agents/[id]/page.tsx`            | Give a task, Profile, Fire; `notFound()` when the API says 404                 |
| `src/app/(app)/page.tsx`                        | Home: next step (key → agent → playground) and "Your agents"                   |
| `src/components/agents/agent-card.tsx`          | `AgentCard`, `AgentAvatar` (initials), `ModelBadge`                            |
| `src/components/agents/agent-form.tsx`          | One form for hiring and editing                                                |
| `src/components/agents/agent-runner.tsx`        | Send one message, show the answer and usage                                    |
| `src/components/agents/delete-agent-button.tsx` | Confirm, delete, back to the list                                              |
| `src/components/app/app-nav.tsx`                | Agents link; active for `/agents/*` too                                        |
| `src/lib/initials.ts`                           | `initialsOf(name)`, now shared by the header and agent avatars                 |

### `apps/mobile`

No changes. Agents on mobile arrive with the full mobile app (Chapter 14).

## Decisions

| Decision                                                             | Why                                                                                                       |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| No new engine code                                                   | An agent is a saved provider, model and system prompt; Chapter 3's `EngineFactory` already does the rest. |
| System prompt rebuilt on every run                                   | Edits apply to the next message; nothing to keep in sync.                                                 |
| 404 for other users' agents, never 403                               | A 403 would confirm the id exists.                                                                        |
| Check the key on create and edit, not only on run                    | The user learns about a missing key on the form, where they can fix it.                                   |
| Explicit column list in `AgentRepository`                            | `userId` and later-chapter columns (engine, approvals, computers) stay out of responses.                  |
| `engine`, `approvalMode`, `defaultComputer`, `avatar` not exposed    | Their features arrive in later chapters; showing dead settings now would confuse.                         |
| Skills (`skills`, `agent_skills`) not built                          | Kept for the chapter that needs them, so this one stays about agents.                                     |
| One message, no history, no streaming                                | Conversations belong to chat (Chapter 5).                                                                 |
| Templates copied into the form, not linked live                      | Editing a hired agent never changes the template, and the reverse.                                        |
| `window.confirm` before firing                                       | Deleting is permanent; a native dialog is enough and needs no new component.                              |
| One `AgentForm` for hire and edit                                    | Same fields and rules; only the method, URL and button label differ.                                      |
| Lime button: "Hire agent" on the hire page, "Send" on the agent page | One main action per screen; "Save changes" is `secondary` there.                                          |
