# Chapter 8: Architecture

Diagrams: [components](architecture/system-overview.md),
[approve end to end](architecture/request-flow.md),
[policy and states](architecture/integration-flow.md).

## The policy grew a third answer

Chapter 6 asked one question: may this tool run? Now there are three
answers, and the agent's approval mode picks them:

```ts
type ToolDecision = 'run' | 'ask' | 'block';
interface ToolPolicy {
  decide(risk: ToolRisk): ToolDecision;
}
approvalPolicy(agent.approvalMode); // a lookup table, one row per mode
```

| Mode                 | read  | write | computer |
| -------------------- | ----- | ----- | -------- |
| `plan_only`          | block | block | block    |
| `ask_first`          | ask   | ask   | ask      |
| `auto_approve_reads` | run   | ask   | ask      |
| `accept_edits`       | run   | run   | ask      |

`Toolbox.toToolSet(policy)` wraps every tool:

- **run** calls it.
- **ask** returns `AWAITING_APPROVAL_RESULT` ("has been asked for and has
  not run yet … do not call it again").
- **block** returns `BLOCKED_RESULT` (plan only).

No tool knows about approvals. This is the change Chapter 6's Strategy
was built for.

## The approval lifecycle

```text
chat / routine           ToolCallLog: awaiting_approval
   │ writeReply saves the answer, then one approval_request per waiting call
   ▼
approval_requests.pending ── POST /approve ──► approved ─► tool runs ─► executed
          │                                            (tool_calls: succeeded | failed)
          └──────────── POST /reject ──► rejected       (tool_calls: rejected)
   ▼ either way
messages: a "tool" note ("You approved shop refund order.")
   ▼
writeReply again: the agent replies with what happened
```

- **Nothing waits.** No process is held open while you decide: not the
  chat stream, not a Trigger.dev run. The request is a row, so it survives
  restarts and is the same for chat and routines.
- **Exactly once.** `decide()` is
  `UPDATE … SET status = $2 WHERE id = $1 AND status = 'pending' RETURNING id`.
  The second click gets no row back, and the API answers 409 without
  running anything.
- **The decision stands even if the reply fails.** The tool result and the
  approval status are saved first. If the follow-up can't be written (no
  key, provider down), the response has `error` beside the decided
  approval.
- **Note vs instruction.** The saved `tool` message is short and readable.
  The model also gets the raw tool result in an instruction the user never
  sees (`writeReply({savedAs: 'tool', instruction})`).
- **The app is gone.** `Toolbox.runApproved(name, input)` throws "The tool
  … is no longer available.". The call is recorded as failed and the agent
  is told.

## API contracts

All routes need a session (401 otherwise).

| Method + path                     | Success                                                                                    | Errors                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `GET /api/approvals`              | `200 {approvals: Approval[]}`: pending, oldest first                                       |                                                   |
| `POST /api/approvals/:id/approve` | `200 {approval (executed), reply?, error?}`                                                | `404` unknown or not yours; `409` already decided |
| `POST /api/approvals/:id/reject`  | `200 {approval (rejected), reply?, error?}`                                                | `404`; `409`                                      |
| `GET /api/today`                  | `200 {approvals, runs}`: runs from the last 24 h, each with `{routine: {id, name}, agent}` |                                                   |
| `GET /api/today/count`            | `200 {pending: number}`, for the sidebar badge                                             |                                                   |
| `POST/PUT /api/agents`            | now take `approvalMode`                                                                    | `400` unknown mode                                |

`Approval` is `{id, status, summary, createdAt, decidedAt, toolCall:
ToolCallView, agent: {id, name, avatar}, threadId}`. `ToolCallView` gained
`approvalId` while a call waits.

## Data

No migration. `approval_requests` (one per tool call: `pending → approved |
rejected → executed`, `decided_at`, `decided_from = 'web'`) and
`agents.approval_mode` have existed since Chapter 2. The `approval_status`
enum is now built from the shared `APPROVAL_STATUSES`. `approval_mode`
stays literal, because the shared list is in a different order (careful →
trusting) and reordering a Postgres enum needs a migration.
