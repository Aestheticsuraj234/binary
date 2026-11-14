# Chapter 8: Implementation

## Plan

1. Shared: `APPROVAL_MODES` (with labels and descriptions),
   `APPROVAL_STATUSES`, `Approval`; `approvalMode` on agents;
   `ToolCallView.approvalId`.
2. DB: `ApprovalRepository` (create, pending list, count, find, a
   conditional `decide`, `markExecuted`); `approvalMode` on agents;
   approval ids on tool calls; `ToolCallRepository.finish`; today's runs.
3. API: the policy becomes run / ask / block per mode; `Toolbox.runApproved`;
   `writeReply` uses the agent's policy and creates approvals; the
   `decideApproval` service; `/api/approvals` and `/api/today`.
4. Web: Permissions on the agent form; Approve and Reject on tool rows;
   decision notes; Today page and sidebar badge.
5. Test every mode, approve and reject, the race, an app gone, a key gone,
   and another user; verify in a browser.

## Acceptance criteria

- [x] Each agent has one of four approval modes, chosen when hiring or
      editing; new agents default to Auto-approve reads.
- [x] Tools run, ask or are blocked exactly as the mode table says.
- [x] An asked tool doesn't run until approved; the agent says what it
      asked for.
- [x] Approve runs the tool once with the agent's input; reject doesn't
      run it; both are noted in the chat and the agent replies.
- [x] A request can't be decided twice (409), and the tool never runs
      twice.
- [x] Today lists waiting requests (oldest first) and the last 24 h of
      routine runs; the sidebar shows how many are waiting.
- [x] Users can't see or decide each other's requests.
- [x] No migration. Lint, format, type-check, tests and the build pass; no
      sideways scroll at 390px.

## File-by-file

### `packages/shared`

| File               | Purpose                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `src/approvals.ts` | `APPROVAL_MODES`, `APPROVAL_MODE_INFO`, `DEFAULT_APPROVAL_MODE`, `APPROVAL_STATUSES`, `Approval` |
| `src/agents.ts`    | `approvalMode` in `agentInputSchema` and `Agent`                                                 |
| `src/tools.ts`     | `ToolCallView.approvalId`                                                                        |

### `packages/db`

| File                                         | Purpose                                                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/repositories/approval-repository.ts`    | `createMany`, `listPendingForUser`, `countPendingForUser`, `findForUser`, `decide` (only if pending), `markExecuted` |
| `src/repositories/agent-repository.ts`       | `approvalMode` column and change                                                                                     |
| `src/repositories/tool-call-repository.ts`   | `approvalId` in `listForThread` (left join); `finish(id, status, output)`                                            |
| `src/repositories/routine-run-repository.ts` | `listForUserSince(userId, since)` with routine and agent                                                             |
| `src/schema/enums.ts`                        | `approval_status` from the shared list                                                                               |

### `apps/api`

| File                        | Purpose                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/tools/policy.ts`       | `ToolDecision`, `ToolPolicy.decide`, `approvalPolicy(mode)`, `AWAITING_APPROVAL_RESULT`, `BLOCKED_RESULT` |
| `src/tools/toolbox.ts`      | run / ask / block in `toToolSet`; `runApproved(name, input)`                                              |
| `src/chat/tool-call-log.ts` | `awaiting_approval` status                                                                                |
| `src/chat/reply.ts`         | The agent's own policy; approvals for waiting calls; `savedAs`, `instruction`; `toolSummary`              |
| `src/approvals/decide.ts`   | `decideApproval`: record, run or reject, note, follow-up reply                                            |
| `src/routes/approvals.ts`   | `/api/approvals` (list, approve, reject), `/api/today` (+ `/count`)                                       |
| `src/routes/agents.ts`      | Saves `approvalMode` on edit                                                                              |

### `apps/web`

| File                                         | Purpose                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/app/(app)/today/page.tsx`               | Today: waiting requests and routine runs                                                   |
| `src/components/approvals/today-inbox.tsx`   | Approval cards; a decided card stays and says what happened                                |
| `src/lib/approvals.ts`                       | `decide(approvalId, 'approve' \| 'reject')`                                                |
| `src/components/chat/tool-call.tsx`          | "Wants to use …", Needs your OK, Approve / Reject; "You said no to"; plan-only explanation |
| `src/components/agents/agent-chat.tsx`       | Decides inline, reloads the chat, renders `tool` notes as a line                           |
| `src/components/agents/agent-form.tsx`       | Permissions select with the mode's description                                             |
| `src/components/app/app-sidebar.tsx`, layout | Today link first, with the waiting count                                                   |

## Decisions

| Decision                                                   | Why                                                                                                                                      |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Ask = return at once, decide later                         | Nothing is held open while you decide (not a stream, not a Trigger.dev run); requests survive restarts; chat and routines work the same. |
| The agent continues as a new turn after the decision       | The decision and result become part of the chat, and the agent explains them, with no message reconstruction.                            |
| A conditional `UPDATE … WHERE status = 'pending'`          | The database guarantees one decision; the tool can't run twice.                                                                          |
| A readable note for the user, the raw result for the model | Users see "You approved shop refund order."; the details are in the tool row.                                                            |
| New agents: Auto-approve reads                             | Safe and useful: reading needs no ceremony, changing things needs your OK.                                                               |
| Older agents keep the DB default, Ask first                | The safest reading of an agent nobody configured; the README says how to switch.                                                         |
| "Today" = the last 24 hours                                | The API doesn't know the user's time zone; a rolling day is honest.                                                                      |
| Approve is `secondary`                                     | One lime action per screen (Send in chat); many cards can each be approved.                                                              |
