# Chapter 6: Architecture

Diagrams: [components](architecture/system-overview.md),
[a tool call end to end](architecture/request-flow.md),
[policy and risk](architecture/integration-flow.md).

## The pieces

```text
ToolboxFactory.forUser(userId)                          Factory
  ├─ builtInTools()            get_current_time, fetch_web_page (read)
  └─ connectApp(each saved app) → MCP listTools → AgentTool[] with risk
        (in parallel; a failing app is marked "error" and skipped)
  ▼
Toolbox                                                 Registry
  .list() · .riskOf(name) · .toToolSet(policy) · .close()
  ▼
toToolSet(readOnlyPolicy) → every tool's execute asks the policy first
  ▼
ToolPolicy                                              Strategy
  readOnlyPolicy: read → run · write/computer → BLOCKED_RESULT
  (Chapter 8 swaps in an approval-aware policy; no tool changes)
```

`AgentTool` is `{name, description, risk, source, tool}`: the AI SDK
`tool` plus what Binary needs to know about it.

## Risk levels

| Risk       | Meaning                                      | Chapter 6 policy | Where tools come from                      |
| ---------- | -------------------------------------------- | ---------------- | ------------------------------------------ |
| `read`     | Only looks things up                         | Runs             | Built-ins; MCP tools marked `readOnlyHint` |
| `write`    | Changes something outside Binary             | Blocked          | Every other MCP tool                       |
| `computer` | Controls a sandbox, browser or your computer | Blocked          | Chapters 9–11                              |

A tool name the model invents is treated as `write`. MCP hints are only
trusted because _you_ chose to connect that server; without a hint, a tool
is assumed to write.

A blocked tool returns, instead of running:

```json
{
  "blocked": true,
  "reason": "Binary blocked this action … Tell the user what you would have done instead."
}
```

The model reads that and explains itself. The call is saved with status
`rejected`.

## MCP apps

- **Transport:** Streamable HTTP (`@ai-sdk/mcp` `createMCPClient`, type
  `http`). Local stdio servers aren't supported: a server process spawned
  by the API would be a security risk, and the remote URLs that Composio
  and others give you all use HTTP.
- **Names:** tools are prefixed with the app's name, so they can't collide:
  "Shop" + `lookup_order` → `shop_lookup_order`. They're capped at 64
  characters, the providers' limit.
- **Auth:** an optional `Authorization` value, encrypted with the same
  `KeyVault` as API keys. The URL itself is stored as typed, so the form
  says to keep secrets out of it.
- **Lifetime:** connections are opened per request (each chat message, or
  each Apps page load) and closed in `finally`. This is simple and never
  stale; the cost is one connection per message.
- **Timeouts:** 8 s to connect and 8 s to list tools.

## Streaming tool calls

`AgentEngine.stream()` now yields `EngineEvent`s:

```ts
| {type: 'text', text}
| {type: 'tool-call', id, name, input}
| {type: 'tool-result', id, output}
| {type: 'tool-error', id, error}
```

`ApiEngine` maps `streamText().fullStream` parts to these, with
`stopWhen: stepCountIs(5)`. The chat route feeds them into a `ToolCallLog`,
which streams a `{"type":"tool","call":…}` NDJSON event when a call starts
(`running`) and again when it ends (`succeeded`, `failed` or `rejected`).
The log saves every call with the answer: `tool_calls.message_id` needs the
assistant message to exist first. MCP results flagged `isError: true`
count as `failed`.

## Errors

```text
AppError (message, status)
├── ValidationError        400   bad body, bad JSON, unknown template, no model
├── NotFoundError          404   "<Agent|Chat|App|Key> not found."
├── MissingProviderKeyError 400  "Add your … API key in Settings first."
├── ProviderError          502   "The provider returned an error: …"
└── AppConnectionError     400   "Could not connect to <app>: …"
```

`parseBody(c, schema)` reads and validates JSON and throws
`ValidationError`. `app.onError` returns `{error}` with the error's status,
or logs the error and returns a plain 500.

## API contracts

All routes need a signed-in session (401 otherwise).

| Method + path                    | Body                          | Success                                             | Errors                                     |
| -------------------------------- | ----------------------------- | --------------------------------------------------- | ------------------------------------------ |
| `GET /api/apps`                  | —                             | `200 {builtIn: ToolInfo[], apps: ConnectedApp[]}`   |                                            |
| `POST /api/apps`                 | `{name, url, authorization?}` | `201 {app}` (connected, with tools)                 | `400` invalid, or "Could not connect to …" |
| `DELETE /api/apps/:id`           | —                             | `204`                                               | `404`                                      |
| `POST /api/threads/:id/messages` | `{content}`                   | NDJSON: `delta`, **`tool`**, then `done` or `error` | as Chapter 5                               |
| `GET /api/threads/:id`           | —                             | messages now include `toolCalls`                    | `404`                                      |

`ConnectedApp` is `{id, name, url, status, hasAuthorization, tools, error?}`.
It never includes the token.

## Security notes

| Threat                                                                             | Protection                                                                                                            |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A page tells the model to fetch `http://localhost:4000/…` or cloud metadata (SSRF) | `fetch_web_page` resolves the host and refuses private, loopback, link-local and CGNAT ranges, for every redirect too |
| An app's tool sends, deletes or pays                                               | Not `readOnlyHint`, so it counts as `write` and is blocked until approvals                                            |
| A token leaks from the page or the database                                        | Encrypted with AES-256-GCM; never returned; only `hasAuthorization`                                                   |
| One user reaches another user's apps                                               | Every query filters by `userId`; delete is a 404 otherwise                                                            |
| A slow or dead app hangs a chat                                                    | 8 s timeouts; failing apps are skipped and marked `error`                                                             |
