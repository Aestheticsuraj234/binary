# Chapter 11: Implementation

## Plan

1. **Data:** a migration for `devices.token_hash`; `DeviceRepository`;
   `agents.engine` in the repository; `agent_engine` built from the shared
   list.
2. **Shared:**
   - `AGENT_ENGINES`
   - `desktop` and `runner` in `AGENT_COMPUTERS`
   - `DeviceView`
   - the Runner protocol schemas (pairing, hello, jobs, events, results)
   - `engine` on agents, with provider and model required only for `api`
3. **API, Runner side:**
   - `RunnerHub`
   - `YourComputers` (pairing codes, tokens, picking a computer)
   - `/api/devices` and `/api/runner`
   - `runnerTools`
   - `RunnerEngine` and `EngineFactory.forAgent`
4. **API, desktop side:**
   - make the per-chat computer generic (`ChatComputer`,
     `ProviderSessions`)
   - `DesktopSessions`, `E2BDesktopProvider` and a fake
   - `desktopTools` with `showsImage`
   - images in follow-up turns
5. **The Runner app (`apps/runner`):**
   - the CLI (pair, start, status, forget)
   - the config file (0600)
   - `SharedFolders`
   - jobs and CLI engines
   - the poll loop with backoff
6. **Web:**
   - the Your computers page and its sidebar link
   - the Thinks-with select with the CLI engines
   - the two new computers
   - the desktop chip with Watch
   - the Apps sections
   - command and PNG rendering in tool rows
7. **Tests:** unit and API tests, a walkthrough with a real Runner process,
   a real-E2B desktop test, and a real-model desktop run.

## Acceptance criteria

- [x] Pair a computer with a one-time code; the page shows it online with
      its shared folders; Pause and Remove work, and Remove signs the
      Runner out.
- [x] The Runner never accepts connections and never leaves its shared
      folders (absolute paths, `../` and symlinks are refused).
- [x] Reading and listing on your computer run on their own; commands and
      writes ask first.
- [x] Claude Code and Codex can be an agent's engine. Their text and tool
      use stream into the chat, and the approval mode limits how far they
      go.
- [x] A cloud desktop per chat that you can watch live. The model sees the
      screen (also after an approved action), and clicks, typing and keys
      ask first.
- [x] One migration; lint, format, type-check, tests and the build pass;
      no sideways scroll at 390px.

## File-by-file

### `packages/db`, `packages/shared`

| File                                                             | Purpose                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `db/drizzle/0003_runner-device-token.sql`, `schema/computers.ts` | `devices.token_hash`                                               |
| `db/src/repositories/device-repository.ts`                       | Devices: pending, pair once, by token hash, seen, paused, delete   |
| `db/src/repositories/agent-repository.ts`, `schema/enums.ts`     | `engine` column; `agent_engine` from `AGENT_ENGINES`               |
| `shared/src/engines.ts`                                          | `AGENT_ENGINES`, `AGENT_ENGINE_INFO`, `CliEngine`                  |
| `shared/src/devices.ts`                                          | `DeviceView`, the device forms, the Runner protocol schemas        |
| `shared/src/computers.ts`                                        | `desktop` and `runner`, `SessionComputer`, `ComputerView.watchUrl` |
| `shared/src/agents.ts`                                           | `engine`; provider and model required only for `api`               |

### `apps/api`

| File                                                                                       | Purpose                                                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `src/runner/runner-hub.ts`                                                                 | In-memory job queue, long polls, pickup and run timeouts                                   |
| `src/runner/your-computers.ts`                                                             | Codes, tokens and hashes, `toDeviceView`, `YourComputers.pick` and `run`                   |
| `src/routes/devices.ts`, `src/routes/runner.ts`                                            | The web's device routes; the Runner's token routes                                         |
| `src/tools/runner-tools.ts`                                                                | `computer_list_files`, `computer_read_file`, `computer_run_command`, `computer_write_file` |
| `src/engines/runner-engine.ts`, `engine-factory.ts`                                        | `RunnerEngine`, `cliPrompt`, `forAgent` with permission mapping                            |
| `src/computers/provider-sessions.ts`                                                       | `ChatComputer<T>`, `ComputerProvider<T>`, `ProviderSessions<T>`                            |
| `src/desktops/*`                                                                           | `CloudDesktop`, `DesktopSessions`, the E2B provider, the fake                              |
| `src/tools/desktop-tools.ts`, `model-view.ts`                                              | The desktop tools; `withImage`                                                             |
| `src/engines/agent-engine.ts`, `api-engine.ts`, `src/chat/reply.ts`, `approvals/decide.ts` | `PromptImage`; images in a follow-up turn; the tool-call `risk` from engines               |

### `apps/runner` (new)

| File                                          | Purpose                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `src/cli.ts`                                  | `pair`, `start --folder`, `status`, `forget`                               |
| `src/config.ts`                               | `~/.binary/runner.json` (0600)                                             |
| `src/client.ts`                               | `pair`, `RunnerClient` (hello, next, events, result), `RunnerAuthError`    |
| `src/folders.ts`                              | `SharedFolders` (realpath, inside checks, `INIT_CWD` for relative folders) |
| `src/jobs.ts`                                 | Commands (2 min, clipped output), read, list, write, engine                |
| `src/engines.ts`                              | The Claude Code and Codex commands; `claudeEvents`, `codexEvents`          |
| `src/runner.ts`                               | The loop: hello, poll, run, batch events, back off                         |
| `test/fake-claude.mjs`, `test/fake-codex.mjs` | Stand-in CLIs for tests                                                    |

### `apps/web`

| File                                                                          | Purpose                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/app/(app)/computers/page.tsx`, `components/computers/your-computers.tsx` | Your computers                                               |
| `src/lib/devices.ts`                                                          | Device calls; `hasPairedComputer`                            |
| `components/agents/agent-form.tsx`, `model-badge.tsx`                         | The engine in Thinks with; the new computers; one setup hint |
| `components/computers/computer-chip.tsx`, `computer-section.tsx`              | Desktop on + Watch; Cloud desktop and Your computer sections |
| `components/chat/sandbox-output.tsx`, `tool-images.tsx`                       | `$ command` for any tool; PNG or JPEG screenshots            |
| agent pages, sidebar, risk badge                                              | Availability from devices; the Your computers link; copy     |

## Decisions

| Decision                                                              | Why                                                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| The Runner long-polls; it never listens                               | Nothing on your computer is exposed; it works behind NAT and firewalls with no setup.    |
| Folders enforced by the Runner, with realpath                         | The server can be wrong or compromised; your computer has the final say.                 |
| Commands always ask, even inside the folders                          | A shell command runs as you, and the folder is only where it starts.                     |
| The token is hashed on the server; the code works once and expires    | A database leak exposes no working tokens; a code read over a shoulder is useless later. |
| CLI engines through the Runner, not on the server                     | They need your sign-in, your files and your machine, which is the point.                 |
| The approval mode becomes the CLI's permission mode                   | Binary can't stop a CLI mid-run, so it limits the CLI up front.                          |
| Generic `ChatComputer` / `ProviderSessions`                           | The sandbox and the desktop had identical lifecycles.                                    |
| Desktop screenshots to the model as images                            | A desktop agent can't click without seeing; found to matter in the real run.             |
| One device picked automatically (paired, online, unpaused, seen last) | Covers the common case of one computer without new settings.                             |
