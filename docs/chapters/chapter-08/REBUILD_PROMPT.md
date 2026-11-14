# Rebuild prompt: Chapter 8, Approvals, permissions and Today

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 7 (routines on Trigger.dev, the shared `writeReply`).

---

You are a senior full-stack engineer and teacher. Add **approvals** to
Binary.

- Characters get a permission level.
- Tools that need your OK ask, wait in a **Today** inbox, and run only
  once approved; then the character carries on in its chat.
- `approval_requests` and `agents.approval_mode` already exist.
- **No migration.** Work on `feat/chapter-08-approvals`.

## Code rules

Google TypeScript Style Guide (named exports; no `any`, casts or non-null
assertions; read unknown objects with `Reflect.get`), and keep it
beginner-friendly.

## Shared

`src/approvals.ts`:

- `APPROVAL_MODES = ['plan_only','ask_first','auto_approve_reads','accept_edits']`
  (most careful → most trusting).
- `APPROVAL_MODE_INFO`, with a label and description for each mode
  (Auto-approve reads is "Recommended").
- `DEFAULT_APPROVAL_MODE = 'auto_approve_reads'`.
- `APPROVAL_STATUSES` (pending, approved, rejected, expired, executed).
- `Approval {id, status, summary, createdAt, decidedAt, toolCall: ToolCallView, agent {id,name,avatar}, threadId}`.

Elsewhere:

- Add `approvalMode: z.enum(APPROVAL_MODES)` to `agentInputSchema` and
  `Agent`.
- Add `approvalId?` to `ToolCallView`.

## Database

- Build `approval_status` from `APPROVAL_STATUSES`. **Keep `approval_mode`
  literal**: the order differs, and reordering an enum needs a migration.
- Add `approvalMode` to the agent columns and to `AgentChanges`.
- `ApprovalRepository`:
  - `createMany(userId, [{toolCallId, summary}])`.
  - `listPendingForUser` (oldest first; join tool_calls → messages →
    threads → agents; select the nested `toolCall` and `agent`, plus
    `threadId`).
  - `countPendingForUser`, `findForUser`.
  - `decide(id, 'approved'|'rejected')`: an `UPDATE … WHERE id AND status = 'pending'`
    that returns whether a row changed.
  - `markExecuted`.
- `ToolCallRepository`: `listForThread` left-joins `approvalId`;
  `finish(id, status, output)`.
- `RoutineRunRepository.listForUserSince(userId, since)` with
  `routine {id, name}` and `agent`.

## API

1. **`tools/policy.ts`.**
   - `type ToolDecision = 'run'|'ask'|'block'` and
     `interface ToolPolicy {decide(risk)}`.
   - `approvalPolicy(mode)` from a table:
     - plan_only: all block
     - ask_first: all ask
     - auto_approve_reads: read runs, write and computer ask
     - accept_edits: read and write run, computer asks
   - `BLOCKED_RESULT` (plan-only wording).
   - `AWAITING_APPROVAL_RESULT = {awaitingApproval: true, reason: "This needs the user's approval. It has been asked for and has not run yet. Tell the user what you asked to do and why. Do not call it again."}`.
   - `isBlockedResult`, `isAwaitingApproval`.
2. **`Toolbox`.** `toToolSet(policy)` maps run / ask / block.
   `runApproved(name, input)` executes without the policy, and throws
   "The tool <name> is no longer available." when the tool is gone.
3. **`ToolCallLog`:** an awaiting result gives `awaiting_approval`.
4. **`writeReply`.**
   - `agent.approvalMode` picks the policy; `approvals` is a dependency.
   - Options `savedAs: 'user'|'tool'` and `instruction` (appended to the
     model's prompt only).
   - After saving the answer's tool calls, `approvals.createMany` for those
     awaiting, with `toolSummary(name, input)` =
     `"<name with spaces> <json>"` (at most 200 characters).
   - The returned `toolCalls` carry their `approvalId`.
5. **`approvals/decide.ts`: `decideApproval(deps, {userId, approvalId, decision})`.**
   1. `findForUser`, or 404.
   2. `decide`, or 409 "This request was already decided.".
   3. If approved: open the toolbox, `runApproved`. The call fails on a
      throw or on an MCP `isError`. Save it with `toolCalls.finish`, then
      `markExecuted`.
      - Note: `You approved <tool>.` (plus " It failed." when it failed).
      - Instruction: the raw result (at most 2,000 characters) plus "Tell
        the user what happened, briefly, and carry on with the task."
   4. If rejected: `finish(…, 'rejected', {rejected: true})`.
      - Note: `You rejected <tool>.`
      - Instruction: "Acknowledge it briefly. Do not try the same thing
        again unless the user asks."
   5. Then `writeReply({…, threadId, content: note, savedAs: 'tool', instruction})`
      and return `{reply}`. On failure, return `{error}`; the decision
      stands.
6. **`routes/approvals.ts`.**
   - `GET /api/approvals`.
   - `POST /api/approvals/:id/approve|reject` → `{approval, reply?, error?}`.
   - `GET /api/today` → `{approvals, runs (last 24 h)}`.
   - `GET /api/today/count` → `{pending}`.
7. Agents save `approvalMode` on edit.

## Web

- `lib/approvals.ts`: `decide(id, 'approve'|'reject')`.
- **`ToolCall` (client).**
  - Verbs: Wants to use (awaiting), Blocked (plan only), You said no to
    (user-rejected).
  - A waiting call gets a warning border and a row with "Needs your OK",
    a secondary Approve and a ghost Reject.
  - A blocked call explains plan-only mode.
- **`AgentChat`.**
  - `handleDecide` calls `decide`, then reloads the thread (GET), sets the
    mood (happy, or oops on error), and runs `router.refresh()`.
  - A `tool` message renders as a centered muted line.
- **Agent form:** a "Permissions" select with the selected mode's
  description; new agents default to Auto-approve reads.
- **Sidebar:** "Today" (Inbox icon) first, with a warning-colored count;
  the layout fetches `/api/today/count`.
- **`/today`.**
  - "Waiting for you": a client `TodayInbox` with cards (face, "X wants to
    <tool>", risk, time, Chat link, the input, Approve and Reject). A
    decided card stays, showing its outcome. **No `key` that remounts it.**
    The empty state is a happy Sunny saying "Nothing is waiting for you".
  - "Routine runs": the last 24 hours.

## Tests

Shared (1); DB (5); policies (5); log (1); the approvals flow (15); the
chat-tools write test changed to awaiting approval. The approval-flow tests
cover:

- the exact summary
- the count and Today
- another user's 404
- refund once, and 409 on a second approve
- the raw result reaching the model while the note stays readable
- rejection, and every mode
- an app removed, and a key removed (the decision stands)
- Today's runs

## Docs

`docs/chapters/chapter-08/` with diagrams and screenshots. Update CHAPTERS,
the root README and the design system (approval rows, Today, badge).

## Acceptance criteria

- With a real app, a character asks before writing; approving runs the tool
  once and the character carries on.
- 213 tests, along with lint, format, type-check and the build.
- No sideways scroll at 390px.
