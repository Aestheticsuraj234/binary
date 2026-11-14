# Integration flow: risk, policy and errors

## Where a tool's risk comes from

```mermaid
flowchart TD
  T["a tool"] --> B{"built into Binary?"}
  B -- yes --> R1["risk set in code<br/>(get_current_time, fetch_web_page: read)"]
  B -- no --> M{"MCP readOnlyHint === true?"}
  M -- yes --> R2["read"]
  M -- "no / missing" --> R3["write"]
  U["a name the model made up"] --> R3
  C["Chapters 9–11: sandbox, browser, Runner"] --> R4["computer"]
```

## What the policy does with it

```mermaid
stateDiagram-v2
  [*] --> running: model calls a tool
  running --> succeeded: read · ran · result OK
  running --> failed: threw, or MCP isError
  running --> rejected: write / computer · policy said no
  note right of rejected
    Chapter 8 adds awaiting_approval:
    running → awaiting_approval → approved / rejected
  end note
```

## How a route reports a problem

```mermaid
flowchart LR
  R["route handler"] -- "throw new NotFoundError('Chat')" --> O["app.onError"]
  P["parseBody(c, schema)"] -- "ValidationError" --> O
  EF["EngineFactory"] -- "MissingProviderKeyError" --> O
  TF["ToolboxFactory.test"] -- "AppConnectionError" --> O
  O -- "AppError" --> J["{error: message} + its status"]
  O -- "anything else" --> X["console.error · 500 'Something went wrong on the server.'"]
```

Once a chat answer is streaming, the status is already 200. A provider
failure then becomes an NDJSON `error` event instead (Chapter 5).
