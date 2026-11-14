# Chapter 4: Architecture

Diagrams: [components](architecture/system-overview.md),
[request flows](architecture/request-flow.md),
[ownership and wiring](architecture/integration-flow.md).

## Running an agent

```text
POST /api/agents/:id/run {prompt}
  │  AgentRepository.findForUser(userId, id)   → the agent, or 404
  │  buildSystemPrompt(agent)                  → "You are Ada, an AI coworker…"
  ▼
EngineFactory.create({userId, provider, model})        (Chapter 3, unchanged)
  ▼
AgentEngine.generate({system, prompt})                 (Chapter 3, unchanged)
```

Nothing in the engine layer changed. An agent is just a saved provider, model
and system prompt, which is why Chapter 3 built the engine first.

## The system prompt

```text
You are <name>, an AI coworker in Binary.
Your role: <role>

<instructions>          ← left out when empty
```

It is rebuilt on every run from the saved agent, so an edit takes effect on
the next message.

## Ownership

| Rule                                                    | Where it is enforced                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| A user only sees and changes their own agents           | Every `AgentRepository` method takes `userId` and filters by it             |
| Another user's agent looks like it does not exist       | Routes answer 404, never 403, so ids can't be probed                        |
| A malformed id is "not found", not a server error       | Routes check `z.uuid()` before querying (Postgres rejects non-uuid values)  |
| `userId` never leaves the server                        | The repository selects an explicit column list without it. Tested.          |
| An agent can only use a provider the user has a key for | Checked on create and edit (400), and again by `EngineFactory` on every run |
| The template an agent came from never changes           | `PUT` ignores `templateId`                                                  |

## API contracts

All routes need a signed-in session cookie (401 otherwise).

| Method + path              | Body                                                       | Success                                                   | Errors                                                                  |
| -------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `GET /api/agent-templates` | —                                                          | `200 {templates: [{id, slug, name, role, instructions}]}` |                                                                         |
| `GET /api/agents`          | —                                                          | `200 {agents: Agent[]}` (newest first)                    |                                                                         |
| `POST /api/agents`         | `{name, role, instructions, provider, model, templateId?}` | `201 {agent}`                                             | `400` invalid body, no key for the provider, or unknown template        |
| `GET /api/agents/:id`      | —                                                          | `200 {agent}`                                             | `404`                                                                   |
| `PUT /api/agents/:id`      | `{name, role, instructions, provider, model}`              | `200 {agent}`                                             | `404`; `400` invalid body or no key                                     |
| `DELETE /api/agents/:id`   | —                                                          | `204`                                                     | `404`                                                                   |
| `POST /api/agents/:id/run` | `{prompt}` (1–4000 chars)                                  | `200 {text, inputTokens, outputTokens, durationMs}`       | `404`; `400` invalid prompt or no key; `502` provider error with reason |

`Agent` is `{id, templateId, name, role, instructions, provider, model,
createdAt, updatedAt}`. `provider` and `model` are nullable in the database
because Chapter 11's CLI engines bring their own model; today every agent
created through the API has both.

Limits: name 1–60, role 1–200, instructions 0–4000 characters, all trimmed.

## Web structure

```text
app/(app)/
├── page.tsx              Home: next step + your agents
└── agents/
    ├── page.tsx          List, empty state, templates
    ├── new/page.tsx      Hire (?template=<slug> pre-fills); redirects to /settings without keys
    └── [id]/page.tsx     Give a task · Profile (edit) · Fire; notFound() on 404
```

`AgentForm` is one client component for hiring and editing. Server pages read
with `getFromApi()`; client components change data with `fetch` and
`router.push` / `router.refresh()`, as in Chapter 3.
