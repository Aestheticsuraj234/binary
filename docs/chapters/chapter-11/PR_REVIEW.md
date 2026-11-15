# Chapter 11: Review

**Branch:** `feat/chapter-11-runner` → `main`
**Reviewer:** Claude, a self-review.

## Google TypeScript Style Guide

- Named exports; default exports only for Next.js pages and Vitest
  configs.
- No `any`, no non-null assertions and no casts in app code:
  - the Runner reads JSON lines with `Reflect.get`
  - jobs are validated with the shared Zod schemas on both ends
  - a cast in the device client was replaced by a typed assignment, like
    `getFromApi`
- Lint covers the Runner's `.mjs` test scripts (Node globals).

## Findings and fixes

| #   | Severity                         | Finding                                                                                                                                                                            | Fix                                                                                                                                                                                                                 |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | High (security)                  | The server could ask the Runner for any path.                                                                                                                                      | `SharedFolders` resolves with `realpath` on your computer, so symlinks are followed first, and refuses anything outside. Tested: an absolute path, `../`, a symlink out, a write outside, a command folder outside. |
| 2   | High (security)                  | A paired computer is a standing credential.                                                                                                                                        | 256-bit token, stored only as SHA-256; the config file is 0600; a code is single use and expires after 15 minutes; Remove revokes it and the Runner exits (tested end to end).                                      |
| 3   | High (safety)                    | A command runs as you, with your environment; the folder is only where it starts.                                                                                                  | `computer_run_command` and `computer_write_file` always ask, and the waiting row shows `$ command`. Pause stops everything at once. The README says so plainly.                                                     |
| 4   | Medium (safety)                  | A CLI engine runs its own tools; Binary can't approve each one.                                                                                                                    | The approval mode becomes the CLI's permission: plan mode or read-only by default; edits only with Accept edits. Tested for each mapping.                                                                           |
| 5   | Medium (found with a real model) | After an approved desktop click, the follow-up turn gave the model a note ("a screenshot exists") instead of the screen. It said it couldn't see, and re-screenshotted every time. | `toolbox.imagesIn` → `writeReply({images})` → `ApiEngine` puts the PNG in the new user message. Tested. The rerun confirmed the result straight after approval.                                                     |
| 6   | Medium (found with a real model) | `desktop_scroll` didn't scroll: X scrolls whatever is under the pointer.                                                                                                           | Move the pointer first (to the middle by default, or the model's x, y).                                                                                                                                             |
| 7   | Low (found with a real model)    | Firefox took longer than the 3 s `desktop_open` waited, so the model saw an empty desktop.                                                                                         | 5 s.                                                                                                                                                                                                                |
| 8   | Low (walkthrough)                | A relative `--folder` resolved against `apps/runner`, because pnpm runs scripts there.                                                                                             | Resolve against `INIT_CWD`, where you typed the command.                                                                                                                                                            |
| 9   | Low (design)                     | The sandbox and desktop lifecycles were the same code.                                                                                                                             | `ChatComputer<T>` / `ProviderSessions<T>`; `SandboxSessions` is now 8 lines.                                                                                                                                        |
| 10  | Low (design)                     | Three routes and the routine runner each checked "provider and model?".                                                                                                            | `EngineFactory.forAgent` owns it, and also builds CLI engines.                                                                                                                                                      |

## Accepted trade-offs

- **One API process.**
  - `RunnerHub` and its jobs live in memory, and a restart loses in-flight
    jobs (the caller gets an error).
  - A routine running on the Trigger.dev worker can't reach your computer.
    Its jobs wait in the worker's hub, the Runner polls the API, and the
    job times out after 30 s ("Is the Runner running?"). Routines with your
    computer need the in-process job runner for now.
- **One computer at a time:** jobs go to the most recently seen paired,
  online, unpaused computer. There's no per-agent choice of computer yet.
- **CLI engines:**
  - Each run starts fresh, with the chat so far in the prompt; there's no
    `--resume`.
  - Tokens aren't counted (Chapter 15).
  - Codex's JSON is parsed from its documented format, but no real Codex
    was run.
- **Desktop links:** the view-only stream link lives in memory (it holds
  the key), so after a restart a desktop works but can't be watched.
- **Costs:** a desktop step sends a 1024×768 PNG to the model, about 1–2k
  tokens.

## Open items

- Try real Claude Code and Codex through the Runner.
- Routines with your computer on Trigger.dev, which need a shared job
  channel (for example, Postgres LISTEN/NOTIFY).
