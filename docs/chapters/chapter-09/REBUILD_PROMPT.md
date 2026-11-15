# Rebuild prompt: Chapter 9, Cloud sandboxes with E2B

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 8 (approvals, the policy table, `writeReply`, `decideApproval`).

---

You are a senior full-stack engineer and teacher. Give Binary's characters a
**cloud sandbox** from E2B: a private Linux machine per chat where they run
code and commands and keep files. Charts appear in the chat.

- `computer_sessions` and `agents.default_computer` already exist.
  **No migration.**
- Work on `feat/chapter-09-sandboxes`.

## Code rules

Google TypeScript Style Guide (named exports; no `any`, casts or non-null
assertions; read unknown objects with `Reflect.get`), and keep it
beginner-friendly.

## Dependencies

- `pnpm --filter @binary/api add @e2b/code-interpreter@2.9.0`.
- Pin `e2b` with `overrides: {e2b: 2.60.0}` in `pnpm-workspace.yaml`,
  because newer releases are very recent.
- Add an optional `E2B_API_KEY` (empty means unset) to `env.ts`,
  `.env.example` and `turbo.json`.

## Shared (`src/sandboxes.ts`)

- `COMPUTER_KINDS = ['runner','sandbox','desktop','browser']`. This is the
  same order as the DB enum, so `computer_kind` can be built from it.
- `AGENT_COMPUTERS = ['sandbox']`, with `AGENT_COMPUTER_INFO` (label and
  description).
- `TEMPLATE_COMPUTERS = {'coding-agent': 'sandbox'}`.
- `CODE_LANGUAGES = ['python','javascript']`.
- `CodeRunOutput {stdout, stderr, results: {text?, png?}[], error?, newSandbox?}`.
- `CommandRunOutput {exitCode, stdout, stderr, newSandbox?}`.
- `SandboxView {id, threadId, threadTitle, agent, startedAt, minutesUsed}`.
- In `agentInputSchema`:
  `defaultComputer: z.enum(AGENT_COMPUTERS).nullable().default(null)`.
  Add it to `Agent` too.

## Database

- `computer_kind` built from `COMPUTER_KINDS`.
- `defaultComputer` in the agent columns and changes.
- `ComputerSessionRepository`:
  - `create({userId, kind, providerId, threadId})`
  - `findRunningForThread(userId, threadId, kind)`
  - `listRunningForUser(userId, kind)`: left-join the thread title and the
    agent, oldest first
  - `findForUser`
  - `touch(id)`: `minutesUsed` = whole minutes since start, at least 1
  - `close(id, {stillRunning})`: counts minutes only if we stopped it
    ourselves

## API

1. **`sandboxes/cloud-sandbox.ts`:**
   - `CloudSandbox {id, runCode(code, language), runCommand(command, cwd?), writeFile, readFile, listFiles, keepAlive}`
   - `SandboxProvider {create(labels), connect(id) → sandbox | undefined, isRunning(id), kill(id)}`
2. **`E2BSandboxProvider(apiKey)`:**
   - `Sandbox.create({apiKey, timeoutMs: 10 min, metadata})`
   - `Sandbox.connect`; `SandboxNotFoundError` → undefined
   - `Sandbox.getInfo(...).state === 'running'`
   - `Sandbox.kill`
   - `runCode` with `language` and a 2-minute `timeoutMs`; map `Execution`
     to `CodeRunOutput`, keeping at most 4 PNGs and clipping text to
     10,000 characters
   - `commands.run`: a `CommandExitError` becomes a normal result with its
     exit code
   - `keepAlive` = `setTimeout(10 min)`
3. **`FakeSandboxProvider`:**
   - in memory
   - `print("…")` → stdout; `plt.` → a 1×1 PNG; `raise` → an error
   - `echo`, `exit N`, and files
   - counts `created`
4. **`sandbox-sessions.ts`:**
   - `ChatSandbox(sessions, provider, userId, threadId)`:
     - `open()`: memoized for the request. Find the saved session and
       connect. If it's gone, close the row and create a new sandbox and
       session, then touch it. Returns `{sandbox, replaced}`.
     - `existing()`: connect only.
   - `SandboxSessions`:
     - `forThread`
     - `listRunning` (checks `isRunning`, closes the dead ones)
     - `stop(userId, id)`
     - `stopForThread`
5. **`tools/sandbox-tools.ts`:**
   - `run_code`, `run_command` and `write_file` have risk `computer` and
     use `open()`; add `newSandbox: true` when replaced.
   - `read_file` and `list_files` have risk `read` and use `existing()`.
     Without a sandbox they return `{error: 'This chat has no sandbox running yet. …'}`.
   - `run_code` has `forModel: withoutImages`, which turns each PNG result
     into `{chart: 'A chart. The user can see it.'}`.
6. **`AgentTool.forModel?`.**
   - `Toolbox.toToolSet` sets `toModelOutput` to
     `{type: 'text', value: JSON.stringify(forModel(output))}` when a tool
     has it.
   - Add `Toolbox.forModel(name, output)`.
7. **`ToolboxFactory`.**
   - The constructor takes `(servers, keyVault, connect, sandboxes?, builtIns)`.
   - `forUser(userId, scope?: {threadId, computer})` adds the sandbox tools
     when `sandboxes` exists and `computer === 'sandbox'`.
   - Add `sandboxesAvailable` and `sandboxToolInfo()`.
8. **Callers of `forUser`:**
   - `writeReply` passes `{threadId, computer: agent.defaultComputer}`.
   - `decideApproval` loads the agent first, passes the approval's thread,
     and uses `toolbox.forModel` for its hidden instruction.
9. **`createDependencies(createModel, connect, makeJobs, sandboxProvider = E2B if the key is set)`**
   exposes `sandboxes?: SandboxSessions`.
10. **Routes:**
    - `GET /api/sandboxes` → `{available, sandboxes}`.
    - `DELETE /api/sandboxes/:id` → 204 or 404.
    - `GET /api/apps` adds `sandbox: {available, tools}`.
    - `DELETE /api/threads/:id` stops the chat's sandbox first.
    - The agent `PUT` saves `defaultComputer`.

## Web

- **Agent form:**
  - a **Computer** select (None or Cloud sandbox), with its description
    plus "Running code always asks you first"
  - disabled "(not set up)" and a warning to add `E2B_API_KEY` when it is
    unavailable
  - new agents from the coding template start with a sandbox when one is
    available
  - the pages pass `sandboxAvailable` from `/api/sandboxes`
- **`ToolCall`:**
  - waiting rows are `<details open>`
  - `run_code` and `run_command` inputs show as code (`$ command`)
  - terminal-style output: stdout, stderr in amber, values in lime, errors
    in red, "Made a chart.", the exit code, and a `newSandbox` warning
  - `SandboxCharts` shows the PNGs below the row, always visible
- **`SandboxChip`:** in the chat header for sandbox agents. It shows
  "Sandbox on" with a pulsing lime dot and a Stop button, and re-checks
  after each reply and decision.
- **Apps page `SandboxSection`:**
  - a Set up / Not set up badge, plus a warning box when not set up
  - the five tools
  - "Running now" rows: face, name · chat title, minutes, Chat and Stop
  - empty state when none is running
- Update the risk legend text, which still talks about later chapters.

## Tests

- Shared: 1.
- DB: 4.
- Toolbox: the model view.
- API (15, with the fake provider and a fake tool-calling model that
  records the tools it was offered):
  - offered only to sandbox agents
  - asks first, and no sandbox before approval
  - runs once approved, and is listed
  - files kept between messages (reads run at once)
  - an exit code is a result
  - charts go to the user, a note to the model
  - a timed-out sandbox is replaced
  - another user gets 404
  - Stop, and stopping when the chat is deleted
  - reading starts no sandbox
  - listing closes dead sandboxes
  - the computer is saved on edit
  - without E2B
- An opt-in real-E2B test (`describe.skipIf(!E2B_API_KEY)`) that always
  kills its sandbox.

## Docs

`docs/chapters/chapter-09/` with diagrams and screenshots. Update CHAPTERS,
the root README and the design system (sandbox chip, terminal output,
charts, Computer select).

## Acceptance criteria

- With `E2B_API_KEY` set, a sandbox character asks to run code, and after
  you approve, the chart appears in the chat.
- The next message reuses the same sandbox.
- Stop works from the chat and from Apps.
- 234 tests, along with lint, format, type-check and the build.
- No sideways scroll at 390px.
