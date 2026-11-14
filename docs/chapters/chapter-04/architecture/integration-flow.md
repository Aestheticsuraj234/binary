# Integration flow: ownership and wiring

## How ownership is enforced

```mermaid
flowchart TD
  REQ["Request with session cookie"] --> RU["requireUser<br/>sets c.get('user')"]
  RU -- "no session" --> E401["401 Not signed in."]
  RU --> ID{"z.uuid() valid?"}
  ID -- "no" --> E404A["404 Agent not found."]
  ID -- "yes" --> Q["AgentRepository.findForUser(userId, id)<br/>WHERE user_id = $1 AND id = $2"]
  Q -- "no row<br/>(missing or someone else's)" --> E404B["404 Agent not found."]
  Q -- "row" --> OK["Read · edit · run · fire"]
```

The same `404` for "doesn't exist" and "not yours" means a user can't tell
whether someone else's id is real. Updates and deletes also filter by
`user_id`, so even a bug in a route can't touch another user's agent.

## Composition root

```mermaid
flowchart TD
  IDX["src/index.ts"] --> CD["createDependencies()"]
  TEST["agents.test.ts"] --> CDF["createDependencies(fakeModel)"]
  CD --> D["{agents, agentTemplates, providerKeys,<br/>keyVault, engineFactory}"]
  CDF --> D
  D --> APP["createApp(dependencies)"]
  APP --> R1["providerKeyRoutes"]
  APP --> R2["playgroundRoutes"]
  APP --> R3["agentRoutes"]
  APP --> R4["agentTemplateRoutes"]
```

Two repositories joined the dependencies; nothing else in the wiring changed.

## Shared rules, one source

```mermaid
flowchart LR
  S["packages/shared<br/>agentInputSchema · runAgentSchema"]
  S --> API["apps/api<br/>validates every request"]
  S --> WEB["apps/web<br/>AgentForm · AgentRunner<br/>validate before sending"]
```

The web form and the API show the same messages ("Give your agent a name.")
because they run the same schema.
