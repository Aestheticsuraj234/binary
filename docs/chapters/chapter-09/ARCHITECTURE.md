# Chapter 9: Architecture

Diagrams: [components](architecture/system-overview.md),
[a run end to end](architecture/request-flow.md),
[sandbox states](architecture/integration-flow.md).

## Three layers

```text
sandbox-tools.ts      run_code · run_command · write_file · read_file · list_files
      │ ask ChatSandbox for "the chat's sandbox"
sandbox-sessions.ts   ChatSandbox (one chat, one request) · SandboxSessions (list, stop)
      │ remember it in computer_sessions, get it from a SandboxProvider
cloud-sandbox.ts      SandboxProvider (Strategy): E2BSandboxProvider | FakeSandboxProvider
```

- **`SandboxProvider`** (Strategy, like Chapter 7's `JobRunner`) hides E2B:
  - `create`, `connect` (undefined if the sandbox is gone), `isRunning`
    (checks without waking it), `kill`.
  - Each sandbox is a `CloudSandbox`: `runCode`, `runCommand`,
    `writeFile`, `readFile`, `listFiles`, `keepAlive`.
  - Tests and the browser check use `FakeSandboxProvider`, which keeps
    everything in memory.
- **`ChatSandbox`** is one chat's sandbox for one request.
  - `open()` connects to the saved sandbox, or creates and saves a new
    one, and memoizes the promise, so two tools called at once share one
    sandbox.
  - `existing()` never creates one; reading and listing use it.
- **`SandboxSessions`** works across all the user's chats: list running
  sandboxes (closing ones that timed out), stop one, and stop a chat's
  sandbox before the chat is deleted.

## How tools reach the right sandbox

`ToolboxFactory.forUser(userId, scope?)` now takes the chat:
`{threadId, computer}`. Sandbox tools are added only when E2B is set up
**and** the agent's `defaultComputer` is `sandbox`, and they are bound to
that chat's `ChatSandbox`.

`writeReply` passes the scope, and so does `decideApproval`, so an approved
run uses the same chat's sandbox.

## Model view vs user view

`AgentTool.forModel(output)` is optional. When a tool has it:

- `Toolbox.toToolSet` sets the AI SDK's `toModelOutput` to
  `{type: 'text', value: JSON.stringify(forModel(output))}`.
- `decideApproval` uses `toolbox.forModel(...)` for the hidden instruction.

`run_code` uses it to turn each PNG into `{chart: 'A chart. The user can
see it.'}`. The full output, PNG included, is still saved on the tool call
and shown in the chat.

## Limits

| Limit                     | Value                  | Why                                           |
| ------------------------- | ---------------------- | --------------------------------------------- |
| Idle time-out             | 10 minutes             | E2B stops it; nothing forgotten keeps billing |
| One code run or command   | 2 minutes              | A stuck loop can't hold the chat              |
| stdout, stderr, file read | 10,000 characters each | Keeps the chat and the model's context small  |
| Charts kept per run       | 4                      | Same                                          |

E2B's own ceiling is 1 hour per sandbox on the free (Hobby) plan and 24
hours on Pro. After that, the next run starts a fresh sandbox, and its
result carries `newSandbox: true`.

## API contracts

All routes need a session (401 otherwise).

| Method + path               | Success                                                            | Errors                                               |
| --------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| `GET /api/sandboxes`        | `200 {available, sandboxes: SandboxView[]}`: running, oldest first |                                                      |
| `DELETE /api/sandboxes/:id` | `204`, stopped (its files are gone)                                | `404` unknown, not yours, already stopped, or no E2B |
| `GET /api/apps`             | now also `sandbox: {available, tools: ToolInfo[]}`                 |                                                      |
| `DELETE /api/threads/:id`   | also stops the chat's sandbox                                      |                                                      |
| `POST/PUT /api/agents`      | take `defaultComputer: 'sandbox' \| null` (default null)           | `400` unknown computer                               |

`SandboxView` is `{id, threadId, threadTitle, agent: {id, name, avatar} |
null, startedAt, minutesUsed}`.

The tool outputs are typed in `@binary/shared`:

- `CodeRunOutput {stdout, stderr, results: {text?, png?}[], error?: {name, value, traceback}, newSandbox?}`
- `CommandRunOutput {exitCode, stdout, stderr, newSandbox?}`

A non-zero exit code is a result, not a failure.

## Data

No migration. `computer_sessions` has existed since Chapter 2. A row
records:

- `kind = 'sandbox'`
- `providerId`, the E2B sandbox id
- `threadId`
- `status`: `running` → `closed`
- `minutesUsed`: minutes since it started, updated on every use
- `closedAt`

`agents.default_computer` holds the agent's computer. The `computer_kind`
enum is now built from the shared `COMPUTER_KINDS`, which has the same
order, so the database doesn't change.
