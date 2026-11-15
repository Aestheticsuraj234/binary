# Chapter 9: Testing

```bash
pnpm test
```

API tests use `FakeSandboxProvider`, an in-memory sandbox that runs nothing:

| Input                          | What the fake does               |
| ------------------------------ | -------------------------------- |
| code containing `print("…")`   | Each one becomes stdout          |
| code containing `plt.`         | Returns a chart (a 1×1 PNG)      |
| code containing `raise`        | Returns an error                 |
| `echo …` and `exit N` commands | Echo and exit codes              |
| files                          | Kept until the sandbox is killed |

The fake model calls the sandbox tool its message asks for ("chart",
"hello", "broken", "save", "read"). It answers in text once a tool result or
a decision note is in its prompt, and it records the tools it was offered.

## New and changed suites

| Suite             | File                                                  | Tests                                                                                                                                     |
| ----------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Agent schema      | `packages/shared/src/agents.test.ts`                  | no computer by default; `sandbox` accepted; unknown computer rejected (1)                                                                 |
| Computer sessions | `packages/db/.../repositories.test.ts`                | create and find the chat's running sandbox; list with chat and agent and minutes; invisible to another user; close (4)                    |
| Toolbox           | `apps/api/src/tools/toolbox.test.ts`                  | a tool's model view becomes `toModelOutput`; tools without one keep the full result (1)                                                   |
| Sandboxes         | `apps/api/src/routes/sandboxes.test.ts`               | 15 tests, listed below                                                                                                                    |
| Real E2B (opt-in) | `apps/api/src/sandboxes/e2b-sandbox-provider.test.ts` | code with kept variables, a chart PNG, an error, a command's exit code, files, connect by id, kill. **Skipped without `E2B_API_KEY`** (1) |

The sandbox route tests cover:

- **Tools:**
  - the five tools listed on Apps with their risks
  - only agents with a sandbox are offered them
  - running code asks, and no sandbox starts before approval
- **A chat:**
  - after approval the code runs in a new sandbox, and the reply follows
  - the sandbox is listed with its chat, agent and minutes
  - a file written in one message is read in the next (a read runs
    without asking), in the same sandbox
  - exit code 3 is a successful result
  - a chart is saved for the user, and the model's prompt has the note but
    not the PNG
  - a timed-out sandbox is replaced, with `newSandbox`
  - another user can't see or stop it (404)
  - Stop works, and a second Stop is 404
- **Housekeeping:**
  - reading in a chat with no sandbox says so and starts none
  - listing closes sandboxes that timed out
  - deleting a chat stops its sandbox
  - editing an agent saves `defaultComputer`
- **Without E2B:**
  - `available: false`
  - no sandbox tools, even for a sandbox agent

## Results

| Check                   | Result                                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| All tests               | 234 pass (shared 22, db 46, api 166). Chapter 8 had 213. The opt-in real-E2B test passes when `E2B_API_KEY` is set and is skipped otherwise. |
| ESLint, Prettier        | Clean                                                                                                                                        |
| Type-check (5 packages) | Passed                                                                                                                                       |
| `drizzle-kit generate`  | No schema changes                                                                                                                            |
| Web production build    | Passed                                                                                                                                       |

## Browser verification

This ran twice against the production build, the real API and database,
and a fake tool-calling model:

1. With an in-memory sandbox (28 checks).
2. With **real E2B sandboxes** (29 checks: the same, plus "no sandbox left
   running" at the end). The Python really ran and matplotlib really drew
   the chart; the screenshots are from this run.

The steps:

| Step                                                                                                                                                                 | Result |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Hire the Coding Agent: Computer is Cloud sandbox, explained ("Running code always asks you first"), no setup warning                                                 | ✓      |
| "Draw a chart of monthly sales": "Wants to use run code · Computer", the row open with the Python code (not JSON); no sandbox started; no chip                       | ✓      |
| Approve: one sandbox; the chart shows under the row as a real image; the note; "Sandbox on" in the header; the terminal shows "Total sales: 600" and "Made a chart." | ✓      |
| Rows: open rows turn the chevron down; closed rows point right                                                                                                       | ✓      |
| Save a file (approve), then "Which files are there?": "Used list files · Read" without asking; still one sandbox                                                     | ✓      |
| Apps: "Cloud sandbox · Set up", the five tools in order, "Bolt · Draw a chart of monthly sales" running; Stop stops it                                               | ✓      |
| Back in the chat: chip gone, chart still there; a new run, then Stop in the chip stops it                                                                            | ✓      |
| Edit: Computer still Cloud sandbox                                                                                                                                   | ✓      |
| Phone (390px): chat with chart and chip, and Apps, don't scroll sideways                                                                                             | ✓      |
| Risk legend no longer says "later chapters"                                                                                                                          | ✓      |
| Real E2B only: after the run, no sandbox is left running (and the E2B account lists 0)                                                                               | ✓      |
| Unexpected console or server errors                                                                                                                                  | None   |

Found while checking (see PR_REVIEW):

- the terminal block almost vanished in dark mode
- a single chart was half width
- the phone header squeezed the chat title

## Real E2B

`E2BSandboxProvider` is checked against real E2B by the opt-in test:

```bash
E2B_API_KEY=e2b_… pnpm --filter @binary/api exec vitest run src/sandboxes
```

It starts one sandbox and always kills it. **It passed.** It covered:

- Python output (`42`)
- a variable kept for the next run (`x + 1` → `22`)
- a matplotlib PNG
- `ZeroDivisionError` reported as an error
- `echo hi && exit 3` → exit code 3 with stdout
- files written, read and listed
- reconnecting by id
- killing the sandbox: afterwards it is not running and `connect` returns
  nothing

## Not verified here

- A real model deciding to write and run code.
- Sandbox tools in a routine run: computer tools ask, so the run leaves a
  request in Today. That path is shared with chat and covered by the
  Chapter 8 tests.
