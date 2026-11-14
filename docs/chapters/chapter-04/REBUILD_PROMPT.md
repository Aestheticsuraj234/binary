# Rebuild prompt: Chapter 4, Agents

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 3 (see the Chapter 1–3 rebuild prompts).

---

You are a senior full-stack engineer and teacher. Add **agents** to
**Binary** (pnpm + Turborepo: `apps/api` Hono + Better Auth + Drizzle with a
composition root and an `EngineFactory`, `apps/web` Next.js 16 + shadcn/ui,
`packages/db` with an `agents` and `agent_templates` table from Chapter 2,
`packages/shared`). Work on `feat/chapter-04-agents`. No migration is needed.

## Non-negotiable code rules

1. **Google TypeScript Style Guide:** named exports (default only where
   Next.js requires it); no `any`, no non-null assertions, no unsafe casts
   (parse a `<select>` value with its Zod schema); `UPPER_SNAKE_CASE`
   constants; `private readonly` constructor dependencies; comments explain _why_.
2. **Beginner-friendly:** no custom hooks, no data library, one form
   component for create and edit, `.catch(() => null)` for "API unreachable".
3. Design system: dark, acid lime `#D1FE17` for **one** main action per screen.

## Shared (`packages/shared/src/agents.ts`, exported from the index)

- `agentInputSchema`: `name` trimmed 1–60 ("Give your agent a name."),
  `role` trimmed 1–200 ("Describe what this agent does."), `instructions`
  trimmed 0–4000, `provider: providerSchema`, `model` trimmed 1–100
  ("Choose a model."), `templateId: z.uuid().nullish()`.
- `runAgentSchema`: `prompt` trimmed 1–4000 ("Write a message first.").
- Types: `Agent {id, templateId, name, role, instructions, provider: Provider | null, model: string | null, createdAt, updatedAt}`,
  `AgentTemplate {id, slug, name, role, instructions}`,
  `AgentRunResult {text, inputTokens, outputTokens, durationMs}`, `AgentInput`.

## Database (`packages/db`)

- `AgentRepository(db)` with an `AGENT_COLUMNS` select list that leaves out
  `userId` and the later-chapter columns. `create(agent)`,
  `listForUser(userId)` newest first, `findForUser(userId, id)`,
  `update(userId, id, {name, role, instructions, provider, model})` →
  row or undefined, `delete(userId, id)` → boolean. **Every** query filters
  by `userId`. Export it with `NewAgent` and `AgentChanges`.
- `AgentTemplateRepository.findById(id)`.

## API (`apps/api`)

- `agents/system-prompt.ts`: `buildSystemPrompt({name, role, instructions})`
  → `"You are <name>, an AI coworker in Binary.\nYour role: <role>"`, plus
  `"\n\n<instructions>"` only when there are instructions.
- `routes/engine-errors.ts`: `engineErrorResponse(c, error)`:
  `MissingProviderKeyError` → 400 `{error}`; else 502
  `{error: 'The provider returned an error: <message>'}`. Use it in the
  playground route too.
- `container.ts`: add `agents` and `agentTemplates` to `AppDependencies`.
- `routes/agents.ts` (all `requireUser`; a malformed id is checked with
  `z.uuid()` and treated as 404; another user's agent is 404 `{error: 'Agent not found.'}`):
  - `GET /` → `{agents}`.
  - `POST /` → validate; 400 with `MissingProviderKeyError`'s message if the
    user has no key for the provider; 400 "That template does not exist." for
    an unknown `templateId`; else 201 `{agent}`.
  - `GET /:id` → `{agent}`.
  - `PUT /:id` → 404 first, then validate, check the key, update (ignore
    `templateId`) → `{agent}`.
  - `DELETE /:id` → 204.
  - `POST /:id/run` → 404, validate `{prompt}`, 400 "Choose a model for this
    agent first." if provider or model is null, then `engineFactory.create`
    and `engine.generate({system: buildSystemPrompt(agent), prompt})` →
    `AgentRunResult`; errors via `engineErrorResponse`.
- `routes/agent-templates.ts`: `GET /` → `{templates}`.
- Mount both in `app.ts`. `test-helpers.ts`: add `readJson<T>(response)`.

## Web (`apps/web`)

- `lib/initials.ts`: `initialsOf(name)`; use it in the header too.
- `AppNav`: add Agents (`/agents`, lucide `Bot`) after Home; a link is active
  when the path equals it or (except `/`) starts with it.
- `components/agents/agent-card.tsx`: `AgentAvatar` (initials, lime text on
  `bg-secondary`, `size-10` or `lg` = `size-12`), `ModelBadge` (outline, mono,
  "Anthropic · claude-sonnet-5-5", or "No model"), `AgentCard` (link to
  `/agents/:id`, hover `border-primary/60`).
- `components/agents/agent-form.tsx` (client): Name, Role, Instructions
  (textarea), Provider (every provider; those without a key disabled with
  " (no key)") and Model (`PROVIDER_INFO[provider].models`, plus the agent's
  own model if not listed) in a `sm:grid-cols-2` row whose field wrappers
  have `*:w-full`. Changing the provider resets the model to its first
  suggestion. Validate with `agentInputSchema`; POST (then
  `router.push('/agents/<id>')`) or PUT (then "Saved." + `router.refresh()`).
  The button is lime "Hire agent" when hiring and `secondary` "Save changes"
  when editing.
- `components/agents/agent-runner.tsx` (client): textarea "Give <name> a
  task…", lime Send, a bordered answer box with idle text, a spinner
  "<name> is thinking…", error, or the answer + `"<in> in · <out> out · <s>s"`.
- `components/agents/delete-agent-button.tsx` (client): ghost "Fire <name>",
  `window.confirm`, DELETE, then `/agents`.
- `/agents`: title + "New agent" (lime, only with a key); "Add an API key
  first" link card without keys; dashed "No agents yet" or an `AgentCard`
  grid (`sm:2`, `lg:3`); "Start from a template" cards to
  `/agents/new?template=<slug>` (only with a key).
- `/agents/new`: redirect to `/settings` without keys; title "Hire a
  <template>" or "New agent"; `AgentForm` with the template.
- `/agents/[id]`: `notFound()` when the API returns nothing; avatar, name,
  role, `ModelBadge`; `lg:grid-cols-5` with "Give <name> a task" (3) and
  "Profile" (2: `AgentForm` + `DeleteAgentButton`).
- Home: next step chosen by a small function: no key → add key; no agents →
  "Hire your first agent" (`/agents`); else the playground. Then "No agents
  yet" or "Your agents" (first 4) with "See all".

## Tests

Shared (4): trimmed valid agent; empty instructions OK; blank name message;
unknown provider. System prompt (2). Routes (16) with a fake model that
records each `MockLanguageModelV4`: templates 401 + list; agents 401; missing
key 400 message; blank name 400; unknown template 400; create from template
201 without `userId`; list + read; malformed id 404; another user sees an
empty list and gets 404 for read, edit, run and delete; update keeps
`templateId`; switching to a provider without a key 400; run returns text +
usage, used the decrypted key, and `doGenerateCalls[0].prompt` starts with a
system message containing the name and instructions; blank message 400;
delete 204 then 404. Repository (7): create hides `userId`; newest first;
other user sees nothing; update; other user can't update/delete; delete
reports existence; template `findById`.

## Docs

`docs/chapters/chapter-04/` (README with screenshot, IMPLEMENTATION,
ARCHITECTURE with ownership rules and API contracts, TESTING, PR_REVIEW, this
prompt), Mermaid diagrams (components, hire + run sequences, ownership,
composition root), screenshots. Update the root README status and docs list,
and `docs/DESIGN_SYSTEM.md`.

## Acceptance criteria

- With a real key: hire a Research Assistant and get an in-character answer.
- No user can reach another user's agent.
- All tests pass (shared 8, db 21, api 41), plus lint, format, type-check
  and the web build. `drizzle-kit generate` reports no changes.
- At 390px wide, no page scrolls sideways.
