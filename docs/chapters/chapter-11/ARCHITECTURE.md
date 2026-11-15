# Chapter 11: Architecture

Diagrams: [components](architecture/system-overview.md),
[pairing and a job end to end](architecture/request-flow.md),
[states](architecture/integration-flow.md).

## The Runner protocol

```text
apps/runner (your computer)                      apps/api
  pair <CODE>  ── POST /api/runner/pair {code, os} ──► token (256-bit), stored as SHA-256
  start        ── POST /api/runner/hello {folders} ──► devices.allowed_folders, last_seen
     loop      ── GET  /api/runner/jobs (≤25 s) ─────► RunnerHub.next(device) → {id, job} | 204
               ── POST /api/runner/jobs/:id/events ──► RunnerHub.event → engine stream
               ── POST /api/runner/jobs/:id/result ──► RunnerHub.finish → the waiting tool
```

- **Auth:** `Authorization: Bearer <token>`.
  - The token lives only in `~/.binary/runner.json`, readable by you only
    (mode 0600). The server stores just its hash.
  - Removing the computer deletes the row, so the next poll is a 401, and
    the Runner prints "not paired" and exits.
- **Pairing codes:**
  - 8 characters from a 32-letter alphabet (no 0/O/1/I).
  - Single use, valid for 15 minutes.
  - Typed with or without the dash, in any case.
- **Jobs** (`runnerJobSchema`, shared by both ends):
  - `command {command, folder?}`
  - `read {path}`
  - `list {path?}`
  - `write {path, content}`
  - `engine {engine, prompt, permission}`
- **`RunnerHub`** (in memory):
  - Queues jobs per device and hands each to the device's single waiting
    poll.
  - Rejects a job no one picks up within 30 s ("Is the Runner running?").
  - Then waits the job's own limit: 3 min for commands, 30 s for files,
    15 min for engines.
- **Heartbeat:** every poll stamps `last_seen_at`. A device is "online" if
  it was seen in the last 60 s.
- **Kill switch:** a paused device's polls get 204 after 2 s, and
  `YourComputers.pick` refuses to send it anything.

## Folder safety (on your computer)

`SharedFolders` resolves every path with `realpath`, so symlinks are
followed first, then checks that it's inside a shared folder:

- relative paths start in the first folder
- a write needs its parent folder to resolve inside
- a command's working folder must be inside

What this doesn't do: limit what a command does once it's running. It
runs as you, with your environment. That is why commands always ask first.

## Engines

`EngineFactory.forAgent(userId, agent)` replaces the per-route "provider
and model?" checks:

- **`api`:** `ApiEngine`, which needs a provider, a model and a key.
- **`claude_code` or `codex`:** `RunnerEngine`, which:
  - turns system, history and message into one prompt (`cliPrompt`)
  - sends an `engine` job
  - turns the job's streamed events into `EngineEvent`s; a tool call
    carries `risk: 'computer'`, because Binary doesn't know the CLI's tools
  - throws the job's error, which becomes the chat's error event

On your computer, `runEngine`:

- spawns `claude -p --output-format stream-json --verbose --permission-mode …`
  or `codex exec --json --sandbox … -`
- passes the prompt on stdin
- parses each JSON line (`claudeEvents`, `codexEvents`)
- reports a failed run (Claude's `is_error`, Codex's `turn.failed`)
- explains a missing CLI

`writeReply` now starts text after a tool call on a new paragraph
(Chapter 10), which CLI engines rely on too.

## Remote computers, generalized again

Chapter 9's `ChatSandbox` became `ChatComputer<T>`. Its plumbing became
`ComputerProvider<T>` and `ProviderSessions<T>`:

- create, connect, keep alive, isRunning, kill
- one row per chat in `computer_sessions`

`SandboxSessions` and `DesktopSessions` are now a few lines each.
`ComputerSessions.details()` lets a desktop add its `watchUrl` to the list.

## Desktops

- `E2BDesktopProvider` (`@e2b/desktop@2.5.0`) creates a 1024×768 desktop.
- It starts a VNC stream that needs a key. It keeps the view-only link
  `getUrl({viewOnly: true, authKey})` in memory only, because the link
  contains the key.
- The `CloudDesktop` methods are `screen()` (PNG), `click`, `type`,
  `press`, `scroll(at x,y)` and `open`. Each action waits for the screen
  to settle.
- **The model sees images:**
  - `AgentTool.showsImage` makes the toolbox return
    `{type: 'content', value: [text, {type: 'file', mediaType: 'image/png', …}]}`.
  - After an approved desktop action, `decideApproval` passes
    `toolbox.imagesIn(...)` to `writeReply({images})`.
  - `ApiEngine` adds those images to the new user message, so the model
    sees the result of the click you approved.

## API contracts

| Method + path                                            | Auth            | Success                                                                                    | Errors                       |
| -------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------ | ---------------------------- |
| `GET /api/devices`                                       | session         | `{devices: DeviceView[]}`                                                                  |                              |
| `POST /api/devices {name}`                               | session         | `201 {device, pairingCode, expiresAt}`                                                     | `400`                        |
| `PATCH /api/devices/:id {paused}`                        | session         | `{device}`                                                                                 | `404`                        |
| `DELETE /api/devices/:id`                                | session         | `204` (the token is revoked)                                                               | `404`                        |
| `POST /api/runner/pair {code, os}`                       | none (the code) | `{token, device: {id, name}}`                                                              | `400` wrong, used or expired |
| `POST /api/runner/hello {version, os, folders}`          | token           | `{device}`                                                                                 | `401`                        |
| `GET /api/runner/jobs`                                   | token           | `200 {id, job}` or `204`                                                                   | `401`                        |
| `POST /api/runner/jobs/:id/events {events}`              | token           | `204`                                                                                      | `404` not this device's job  |
| `POST /api/runner/jobs/:id/result {ok, output \| error}` | token           | `204`                                                                                      | `404`                        |
| `GET /api/computers`                                     | session         | `available` adds `desktop`; desktop rows have `watchUrl`                                   |                              |
| `POST/PUT /api/agents`                                   | session         | `engine`; provider and model only for `api`; `defaultComputer` adds `desktop` and `runner` | `400`                        |

`DeviceView` is `{id, name, os, pairing, online, paused, allowedFolders,
lastSeenAt, createdAt}`. It never includes the token or its hash.

## Data

- **Migration `0003_runner-device-token`:** `devices.token_hash` (unique).
- **Built from shared lists, in the same order (no migration):** the
  `agent_engine` and `computer_kind` enums.
- **New repository:** `DeviceRepository`, with `createPending`, `pair`
  (code, unpaired and fresh, all in one `UPDATE … RETURNING`),
  `findByTokenHash`, `listForUser`, `findForUser`, `seen`, `setPaused` and
  `delete`.
