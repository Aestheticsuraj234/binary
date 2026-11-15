# Chapter 9: Implementation

## Plan

1. **Shared:**
   - `COMPUTER_KINDS`, `AGENT_COMPUTERS` (with labels) and
     `TEMPLATE_COMPUTERS`
   - `defaultComputer` on agents
   - tool output types and `SandboxView`
2. **DB:**
   - `ComputerSessionRepository`
   - `defaultComputer` in the agent columns
   - `computer_kind` built from the shared list (same order, no migration)
3. **API:**
   - a `SandboxProvider` Strategy (E2B, plus a fake for tests)
   - `ChatSandbox` and `SandboxSessions`
   - five sandbox tools
   - toolboxes scoped to a chat and its agent's computer
   - a model-only view of results
   - `/api/sandboxes`
   - stop a chat's sandbox when the chat is deleted
   - `E2B_API_KEY`
4. **Web:**
   - Computer on the agent form
   - code and terminal output in tool rows, charts as images
   - waiting rows open by themselves
   - the Sandbox on chip
   - the Cloud sandbox section on Apps
5. **Tests:** fake-sandbox API tests, an opt-in real-E2B test, and a
   browser walkthrough.

## Acceptance criteria

- [x] A character's computer is None or Cloud sandbox, chosen when hiring
      or editing; the Coding Agent starts with one when E2B is set up.
- [x] Only those characters get sandbox tools; without `E2B_API_KEY`
      nobody does, and the UI says how to turn it on.
- [x] Running code, commands and writing files ask first; reading and
      listing don't, and never start a sandbox.
- [x] One sandbox per chat, created on the first approved run, found again
      on later messages (files and variables kept).
- [x] A timed-out sandbox is replaced, and the result says so.
- [x] Charts appear in the chat; the model reads a note, not the image.
- [x] Running sandboxes are visible (chat header, Apps) and stoppable;
      deleting a chat stops its sandbox.
- [x] No migration. Lint, format, type-check, tests and the build pass; no
      sideways scroll at 390px.

## File-by-file

### `packages/shared`

| File               | Purpose                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/sandboxes.ts` | `COMPUTER_KINDS`, `AGENT_COMPUTERS`, `AGENT_COMPUTER_INFO`, `TEMPLATE_COMPUTERS`, `CODE_LANGUAGES`, `CodeRunOutput`, `CommandRunOutput`, `SandboxView` |
| `src/agents.ts`    | `defaultComputer` (nullable, default null) in `agentInputSchema` and `Agent`                                                                           |

### `packages/db`

| File                                              | Purpose                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/repositories/computer-session-repository.ts` | `create`, `findRunningForThread`, `listRunningForUser` (with chat and agent), `findForUser`, `touch`, `close` |
| `src/repositories/agent-repository.ts`            | `defaultComputer` column and change                                                                           |
| `src/schema/enums.ts`                             | `computer_kind` from `COMPUTER_KINDS`                                                                         |

### `apps/api`

| File                                            | Purpose                                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/sandboxes/cloud-sandbox.ts`                | `CloudSandbox`, `SandboxProvider` interfaces                                                         |
| `src/sandboxes/e2b-sandbox-provider.ts`         | E2B code interpreter: create, connect, isRunning, kill; output clipping; a non-zero exit is a result |
| `src/sandboxes/fake-sandbox-provider.ts`        | In-memory sandbox with simple rules, for tests                                                       |
| `src/sandboxes/sandbox-sessions.ts`             | `ChatSandbox` (open, existing), `SandboxSessions` (listRunning, stop, stopForThread)                 |
| `src/tools/sandbox-tools.ts`                    | The five tools and `withoutImages`                                                                   |
| `src/tools/agent-tool.ts`, `toolbox.ts`         | `forModel` → `toModelOutput`; `Toolbox.forModel`                                                     |
| `src/tools/toolbox-factory.ts`                  | `forUser(userId, scope)`, `sandboxesAvailable`, `sandboxToolInfo`                                    |
| `src/chat/reply.ts`, `src/approvals/decide.ts`  | Pass the chat scope; the decision's hidden instruction uses the model view                           |
| `src/routes/sandboxes.ts`                       | `GET /api/sandboxes`, `DELETE /api/sandboxes/:id`                                                    |
| `src/routes/threads.ts`, `apps.ts`, `agents.ts` | Stop on chat delete; the sandbox on Apps; save `defaultComputer`                                     |
| `src/env.ts`, `src/container.ts`                | Optional `E2B_API_KEY`; a sandbox provider passed in, like the job runner                            |

### `apps/web`

| File                                           | Purpose                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `src/components/agents/agent-form.tsx`         | Computer select, its description, the setup warning              |
| `src/components/chat/tool-call.tsx`            | Waiting rows open; code instead of JSON; terminal output; charts |
| `src/components/chat/sandbox-output.tsx`       | `SandboxCharts`, `TerminalOutput`, `sandboxInput`                |
| `src/components/sandboxes/sandbox-chip.tsx`    | "Sandbox on" with Stop, in the chat header                       |
| `src/components/sandboxes/sandbox-section.tsx` | Apps page: status, tools, running sandboxes                      |
| `src/lib/sandboxes.ts`                         | `listSandboxes`, `stopSandbox`                                   |
| `src/components/tools/risk-badge.tsx`          | Risk explanations updated (no more "later chapters")             |

### Root

`.env.example` and `turbo.json` gained `E2B_API_KEY`. `pnpm-workspace.yaml`
pins `e2b` to 2.60.0 through `overrides`, because the newest release was a
day old.

## Decisions

| Decision                                                     | Why                                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| One sandbox per chat, not per agent or per user              | A chat is one task; its files and variables belong together and go away together.                |
| Start on first approved use, never on read                   | No cost and no machine for chats that never run code.                                            |
| The `@e2b/code-interpreter` template                         | A Jupyter kernel: variables survive between runs, and matplotlib charts come back as PNGs.       |
| 10-minute idle time-out, kept alive on every use             | A forgotten chat stops billing soon; an active one keeps its state.                              |
| Computer tools always ask (Chapter 8's table)                | Running arbitrary code is the riskiest thing an agent does here. The waiting row shows the code. |
| Charts for the user, a note for the model (`forModel`)       | A base64 PNG costs thousands of tokens and tells a text model nothing.                           |
| A per-agent setting (`defaultComputer`), not a global switch | Matches the schema since Chapter 2; a research agent doesn't need a VM.                          |
| `E2B_API_KEY` in `.env`, not in the key vault                | One operator key for a self-hosted app, like `TRIGGER_SECRET_KEY`.                               |
| Close timed-out sessions lazily                              | No background job needed; the next use or listing finds out.                                     |
