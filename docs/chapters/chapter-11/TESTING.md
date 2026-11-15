# Chapter 11: Testing

```bash
pnpm test
```

## Suites

| Suite                     | File                                                 | Tests                                                                                                                             |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Agent schema              | `packages/shared/src/agents.test.ts`                 | `runner` accepted; the API engine needs a model ("Choose a model."); CLI engines need none; unknown engines refused (+2)          |
| Runner protocol           | `packages/shared/src/devices.test.ts`                | codes with or without the dash, any case; every job kind; unknown jobs refused (2)                                                |
| Devices                   | `packages/db/.../repositories.test.ts`               | pending with a code; pairs once and only while fresh; token hash lookup; seen with folders; kill switch; another user; delete (4) |
| Runner app                | `apps/runner/src/runner.test.ts`                     | 10, listed below                                                                                                                  |
| Runner through the API    | `apps/api/src/routes/runner.test.ts`                 | 14, listed below                                                                                                                  |
| Cloud desktop             | `apps/api/src/routes/desktops.test.ts`               | 5, listed below                                                                                                                   |
| Real E2B desktop (opt-in) | `apps/api/src/desktops/e2b-desktop-provider.test.ts` | a PNG screen, click, keys, typing, the watch link, reconnect, kill (skipped without `E2B_API_KEY`)                                |

The Runner app tests cover:

- reading, listing and writing inside the shared folders
- refusing absolute paths, `../`, a symlink out, a write outside, and a
  command folder outside
- a missing folder
- `pwd` and a failing exit code
- Claude Code (with a fake CLI) streaming text, tool call, result and text,
  in the folder, with `acceptEdits`
- a failed Claude Code run
- Codex in plan mode (read-only, with the plan instruction)
- a missing CLI
- the two parsers

The Runner tests through the API cover:

- adding a computer with a code, and another user not seeing it
- a wrong code refused
- pairing once, with the code in any case, without the dash
- hello, which makes the computer online with its folders
- a bad token getting 401
- listing without asking, through the Runner
- a command that asks, then runs on approval
- the Runner's own error reaching the agent
- Pause (the tool is refused, and polls get 204)
- a user with no computer told to pair one
- Claude Code as the engine:
  - no model needed
  - the instructions and message in its prompt
  - `read_only` for auto-approve reads
  - text and the Bash call streamed and saved with risk `computer`
- `plan_only` and `accept_edits` mapped to `plan` and `edit`
- a CLI failure shown as the chat's error
- Remove: another user gets 404, and the Runner is signed out

The cloud desktop tests cover:

- looking without asking, with the model receiving the PNG as a file part
- the computers list carrying `watchUrl`
- a click that asks, then clicks at the model's point, with the follow-up
  turn including "The screen afterwards is attached." and the PNG
- Stop
- typing with no desktop, which starts none

## Results

| Check                              | Result                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| All tests                          | 294 pass (shared 30, db 50, api 204, runner 10). Chapter 10 had 257. Two opt-in E2B tests are skipped without a key. |
| ESLint, Prettier                   | Clean                                                                                                                |
| Type-check (6 packages, `--force`) | Passed                                                                                                               |
| Migration                          | `0003` generated; `drizzle-kit generate` then reports no changes                                                     |
| Web production build               | Passed, including `/computers`                                                                                       |

## Browser walkthrough (30 checks)

This ran against the production build, the real API and database, a
scripted model, a fake desktop with a desktop-like screen, and **a real
Runner process**. The script read the pairing code off the page, then ran
`pnpm runner pair` and `pnpm runner start` itself.

| Step                                                                                                                                                                                       | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Your computers: empty; add "Test Mac" → code, the pair and start commands, "Waiting for pairing"                                                                                           | ✓      |
| `pnpm runner pair` succeeds; the page notices it alone; `start` → Online with the shared folder                                                                                            | ✓      |
| Hire Bolt on Your computer; "What files do I have?" → "Used computer list files · Read", the real folder's contents                                                                        | ✓      |
| "Show me my notes" → asks with `$ cat notes.md`; approve → the real file in the terminal output, exit code 0; the Runner logged it                                                         | ✓      |
| Pause → the tool is refused and the character says so; Resume                                                                                                                              | ✓      |
| Hire with Claude Code: model hidden and explained; badge "Claude Code · your computer"; the chat streams "Used Bash · Computer", run in the shared folder with `--permission-mode default` | ✓      |
| Cloud desktop: looks without asking, the screen in the chat; "Desktop on" with Watch live; a click asks, then happens at 512,384                                                           | ✓      |
| Apps: Cloud desktop (6 tools, Watch); Your computer (4 tools, a link)                                                                                                                      | ✓      |
| Phone (390px): Your computers, the chat and Apps don't scroll sideways                                                                                                                     | ✓      |
| Remove: the Runner process prints "not paired" and exits                                                                                                                                   | ✓      |
| No unexpected console or server errors                                                                                                                                                     | ✓      |

## Real runs

- **Real E2B Desktop** (the opt-in test): passed.
- **A real model on a real desktop:** Claude Sonnet 5.5 with your
  Anthropic key, in the dev app.
  - Asked to open example.com, then follow "Learn more".
  - It opened the page, read the real screenshot (the multilingual notice)
    and scrolled.
  - It asked to click, and after approval saw the new screen. It confirmed
    `www.iana.org/help/example-domains`.
  - The first try found three problems, all fixed (PR_REVIEW #5–7).

## Not verified here

- **The real Claude Code and Codex CLIs:** both are covered with fake CLIs
  that print their documented JSON. Codex isn't installed on this machine.
- **A routine using your computer:** see PR_REVIEW, accepted trade-offs.
