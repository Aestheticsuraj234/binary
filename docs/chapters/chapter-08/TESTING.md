# Chapter 8: Testing

```bash
pnpm test
```

The approval tests use the real local MCP shop from Chapter 6. Its refund
log proves when a refund actually happened. The fake model calls
`shop_refund_order` for "refund" and `shop_lookup_order` for "order", and
answers in text once a tool result or a decision note is in its prompt.

## New and changed suites

| Suite          | File                                      | Tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent schema   | `packages/shared/src/agents.test.ts`      | unknown approval mode rejected (1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Approvals repo | `packages/db/.../repositories.test.ts`    | create, then pending with agent and chat, count; approval id on the chat's tool calls; invisible to another user; **only the first decision counts**; tool result and executed (5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Policies       | `apps/api/src/tools/toolbox.test.ts`      | auto-approve reads; ask first (even reads wait); accept edits (computer still waits); plan only (nothing runs); `runApproved` skips the policy and fails clearly when the tool is gone (5, replacing Chapter 6's read-only test)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Tool call log  | `apps/api/src/chat/tool-call-log.test.ts` | awaiting approval (1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Approvals flow | `apps/api/src/routes/approvals.test.ts`   | **Ask:** a write tool creates a request with summary, agent and chat, and nothing is refunded; count and Today list it; another user sees nothing and gets 404 deciding it. **Approve:** refund happens once, approval executed, tool call succeeded, follow-up reply; the model gets the raw result while the note stays readable; chat roles user, assistant, tool, assistant; **approving again → 409, still one refund**. **Reject:** no refund, tool call rejected, note, reply. **Modes:** ask first (a lookup waits), accept edits (refund runs, nothing to approve), plan only (blocked, nothing asked), mode saved on edit. **Changes:** app removed → executed with a failed tool call; key removed → refund done, decision stands, error returned. **Today:** routine run listed with routine and agent (15) |
| Chat tools     | `apps/api/src/routes/chat-tools.test.ts`  | the write tool now `awaiting_approval` with an approval id, nothing refunded (changed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

All agent-creating tests now send `approvalMode`.

## Results

| Check                   | Result                                                    |
| ----------------------- | --------------------------------------------------------- |
| All tests               | 213 / 213 (shared 21, db 42, api 150). Chapter 7 had 187. |
| ESLint, Prettier        | Clean                                                     |
| Type-check (5 packages) | Passed                                                    |
| `drizzle-kit generate`  | No schema changes                                         |
| Web production build    | Passed, including `/today`                                |

## Browser verification

These ran against the production build, the real API and database, the
test shop as a real MCP app, and a fake tool-calling model. 25 checks:

| Step                                                                                                                                              | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Hire Mimi: Permissions defaults to Auto-approve reads, explained                                                                                  | ✓      |
| "Please refund order A1": "Wants to use shop refund order · Write · Needs your OK"; Mimi says what she asked for; nothing refunded; Today badge 1 | ✓      |
| Approve in chat: the shop refunded A1 once; the row says Used; the note "You approved shop refund order."; reply; badge gone                      | ✓      |
| Ask again, then Today: "Mimi wants to shop refund order" with the input; no routine runs                                                          | ✓      |
| Reject in Today: "Rejected. The agent was told."; no more refunds; badge gone; the chat shows "You said no to shop refund order" and Mimi's reply | ✓      |
| Edit to Plan only (explained): "Where is order A1?" → "Blocked shop lookup order", no buttons, the row explains plan-only mode                    | ✓      |
| Today empty state: "Nothing is waiting for you"                                                                                                   | ✓      |
| Phone (390px): Today and the chat don't scroll sideways                                                                                           | ✓      |
| Unexpected console or server errors                                                                                                               | None   |

Found while testing (PR_REVIEW #2): the decision note first showed the raw
tool JSON.

## Not verified here

- A real model deciding when to call a write tool, and a real Composio
  app's write tool. Try it with a connected Gmail draft or send.
- Routine runs that ask for approval: the code path is shared with chat
  (`writeReply`) and covered by API tests, but wasn't clicked through.
