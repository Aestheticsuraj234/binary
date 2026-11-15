# Rebuild prompt: Chapter 11, Controlling your computer with the Runner

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 10 (sandboxes, browsers, `/api/computers`, approvals).

---

You are a senior full-stack engineer and teacher. Add three things:

1. **The Runner:** a local app that lets characters work on the user's own
   computer, only in shared folders.
2. **Claude Code and Codex as engines,** run by the Runner.
3. **E2B Desktop:** a cloud desktop per chat that the user can watch, with
   screenshots the model sees.

Work on `feat/chapter-11-runner`.

## Code rules

Google TypeScript Style Guide (named exports; no `any`, casts or non-null
assertions; `Reflect.get` and Zod for unknown data). The user's computer
has the final say on safety.

## Data and shared

- **Migration:** `devices.token_hash text unique`.
- **`DeviceRepository`:**
  - `createPending(userId, name, code)`
  - `pair(code, {os, tokenHash, since})`: one `UPDATE … WHERE pairing_code AND token_hash IS NULL AND created_at > since RETURNING`
  - `findByTokenHash`, `listForUser`, `findForUser`
  - `seen(id, {os?, allowedFolders?})`
  - `setPaused`, `delete`
- **`engine`** in the agent repository; the `agent_engine` enum built from
  `AGENT_ENGINES = ['api','claude_code','codex']`.
- **Shared:**
  - `AGENT_ENGINE_INFO`
  - `AGENT_COMPUTERS` adds `desktop` and `runner`, with info
  - `SessionComputer`
  - `ComputerView.watchUrl?`
- **Agent schema:** `engine` (default `api`). `provider` and `model` are
  nullish, and a `superRefine` requires both for `api`.
- **`devices.ts`:** `DeviceView`, `addDeviceSchema`, `updateDeviceSchema`,
  and the protocol:
  - `pairRunnerSchema`: the code normalized to `ABCD-1234`
  - `runnerHelloSchema`
  - `runnerJobSchema`: a discriminated union of `command`, `read`, `list`,
    `write`, and `engine {engine, prompt, permission: plan|read_only|edit}`
  - `runnerEventSchema` (text, tool-call, tool-result) and
    `runnerEventsSchema`
  - `runnerResultSchema`

## API

1. **`runner/runner-hub.ts`:** `dispatch(deviceId, job, {timeoutMs, onEvent})`
   returns a promise.
   - It hands the job to the device's single waiting poll, or queues it.
   - The pickup timeout is 30 s ("Is the Runner running?"). Once a job is
     started, its own timeout applies.
   - Methods: `next(deviceId, waitMs)`, `event(...)`, `finish(...)`. The
     last two check that the job belongs to the device.
2. **`runner/your-computers.ts`:**
   - `newPairingCode()`: 8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`,
     with a dash.
   - `newDeviceToken()` (32 random bytes, base64url) and `hashToken`
     (SHA-256).
   - `toDeviceView`: online means seen in the last 60 s.
   - `YourComputers.pick(userId)` returns a paired, unpaused, online
     device, else a clear error (no computer, paused, offline). Also
     `run(userId, job, options)` and `describe(userId)`.
3. **`routes/devices.ts`** (session):
   - GET
   - POST: returns `{device, pairingCode, expiresAt}`
   - PATCH `{paused}`
   - DELETE
4. **`routes/runner.ts`:**
   - POST `/pair` (no token)
   - A Bearer token middleware for the rest.
   - POST `/hello`: saves the folders and OS.
   - GET `/jobs`: marks the device seen. Paused: 204 after 2 s. Otherwise a
     long poll of up to 25 s.
   - POST `/jobs/:id/events`, POST `/jobs/:id/result`.
   - Mount at `/api/runner`. Add PATCH to CORS.
5. **`tools/runner-tools.ts`:**
   - `computer_run_command` (computer, 3 min)
   - `computer_read_file` (read)
   - `computer_list_files` (read)
   - `computer_write_file` (computer)
   - The descriptions name the computer and its folders when it is online.
6. **`engines/runner-engine.ts`:**
   - `cliPrompt` puts `<instructions>` and `<conversation>` before
     "User: …".
   - `RunnerEngine.stream` dispatches an engine job, with a 15-minute limit.
   - It turns events into `EngineEvent`s; a tool call carries
     `risk: 'computer'`. `ToolCallLog.start` accepts that risk.
   - It throws the job's error.
   - `EngineFactory.forAgent(userId, agent)` covers both engines:
     plan_only → plan, ask_first and auto_approve_reads → read_only,
     accept_edits → edit.
   - Use it in the threads route, `decideApproval` and `runRoutine`.
7. **`computers/provider-sessions.ts`:**
   - `RemoteComputer`, `ComputerProvider<T>`
   - `ChatComputer<T>`, made from Chapter 9's `ChatSandbox`, with
     `open()` → `{computer, replaced}`
   - `ProviderSessions<T>`
   - `SandboxSessions` extends it, and `ComputerSessions.details()` is
     overridable.
8. **`desktops/*`:**
   - `CloudDesktop`: `screen()` (PNG base64), `click(x, y, {button, double})`,
     `type`, `press(keys[])`, `scroll(dir, amount, at)` (moving the mouse
     first), `open(target)` (waiting 5 s).
   - `DesktopProvider` adds `watchUrl(id)`, and `DesktopSessions` adds it to
     `details`.
   - `E2BDesktopProvider` (`@e2b/desktop@2.5.0`): 1024×768,
     `stream.start({requireAuth: true})`, and the view-only URL with
     `authKey` kept in memory.
   - `FakeDesktopProvider` for tests.
9. **`tools/desktop-tools.ts`:**
   - `desktop_screenshot`, `desktop_open` and `desktop_scroll` are reads.
   - `desktop_click`, `desktop_type` and `desktop_key` (with `"ctrl+l"`
     style keys) are computer tools.
   - Every one sets `showsImage`, and acting on a desktop that doesn't
     exist returns an error without starting one.
10. **Images to the model:**
    - `AgentTool.showsImage` makes `Toolbox` use `withImage(output)`: text
      plus a `file` part with `image/png`.
    - `Toolbox.imagesIn(name, output)`.
    - `GenerateRequest.images` (a `PromptImage[]`) is added to the new user
      message by `ApiEngine`.
    - `writeReply({images})`.
    - `decideApproval` attaches the screen after an approved action and
      says "The screen afterwards is attached."
11. **Container:**
    - `devices`, `runnerHub`, `yourComputers` (passed to `EngineFactory`
      and `ToolboxFactory`)
    - a `desktopProvider` option (E2B when the key is set)
    - `computers` includes desktops
    - `ToolboxFactory.computers()` lists desktop and runner too, and
      `computerTools` is async (it uses `describe`).

## Runner app (`apps/runner`, ESM, tsx)

- **`cli.ts`:** `pair <CODE> [--api]`, `start --folder <path>…`, `status`,
  `forget`. Add a root script `runner`.
- **`config.ts`:** `~/.binary/runner.json` (`BINARY_RUNNER_CONFIG` for
  tests), mode 0600.
- **`folders.ts`, `SharedFolders`:**
  - `realpath` of each folder, resolved from `INIT_CWD`
  - `existing(path)` and `writable(path)`, which refuse anything outside
- **`jobs.ts`:** `runCommand` (`sh -c` or `cmd /c`, 2-minute kill, output
  clipped to 10 kB), plus read, list (200 entries), write and engine.
- **`engines.ts`:**
  - Spawn `claude -p --output-format stream-json --verbose --permission-mode {plan|default|acceptEdits}`,
    or `codex exec --json --skip-git-repo-check --sandbox {read-only|workspace-write} -`.
    A Codex plan gets a "describe only" preface.
  - The prompt goes on stdin.
  - Parse with `claudeEvents` and `codexEvents`.
  - Failures: Claude's `is_error`, Codex's `turn.failed`/`error`, a
    non-zero exit, or a missing binary ("Is it installed and signed in?").
  - `BINARY_CLAUDE_BIN` and `BINARY_CODEX_BIN` override the CLIs.
- **`client.ts`:** `pair`, `RunnerClient` (hello, next, events, result),
  `RunnerAuthError` on 401.
- **`runner.ts`:** `runLoop`: hello, poll, run, events batched every
  150 ms, a result. Back off from 1 s to 30 s; stop for good on an auth
  error.
- **Tests:** fake CLIs in `test/*.mjs`, with ESLint Node globals for
  `**/*.mjs`.

## Web

- **`/computers`:**
  - add a computer (name) to get the code and copyable `pnpm runner pair`
    and `start` commands
  - polls every 4 s
  - Paired list: status (Waiting for pairing, Online with a pulsing dot,
    Offline, Paused), OS, shared folders, Pause/Resume, Remove/Cancel
  - a sidebar link "Your computers" (Laptop icon)
- **Agent form:**
  - Thinks with: the providers plus Claude Code and Codex (the model is
    hidden for a CLI, which gets a description and, if nothing is paired,
    a hint)
  - Computer: adds Cloud desktop and Your computer ("(none paired)")
  - one setup hint, for the chosen computer
  - The pages compute `runner` availability from `/api/devices`, and the
    new-agent page allows CLI-only users.
- **`ModelBadge`:** "Claude Code · your computer".
- **`ComputerChip`:** desktop ("Desktop on", with an Eye link "Watch
  live"); none for runner.
- **`ComputerSection`:**
  - Cloud desktop: a Watch button per running desktop
  - Your computer: its tools and a link to `/computers`
- **Tool rows:** `$ command` for any `command` input; a PNG or JPEG
  screenshot by its base64 prefix.
- **Risk legend:** the Computer line mentions commands, files, browsers
  and desktops.

## Tests

- shared: +4
- db: 4
- runner: 10
- API Runner: 14 (the test plays the Runner through `/api/runner`)
- desktops: 5
- opt-in real E2B desktop

## Docs

`docs/chapters/chapter-11/` with diagrams and screenshots. Update CHAPTERS,
the README (status, `pnpm runner`, docs link) and the design system.

## Acceptance criteria

- A real Runner pairs from the page's code, shows Online with its folder,
  runs an approved command, and signs out when removed.
- A Claude Code agent streams its tool use into the chat.
- On a real desktop, a model opens a page, asks to click, and after
  approval sees the new screen.
- 294 tests, along with lint, format, type-check and the build.
- No sideways scroll at 390px.
