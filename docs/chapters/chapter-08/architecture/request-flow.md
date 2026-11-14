# Request flow: asking, then approving

```mermaid
sequenceDiagram
  actor U as You
  participant W as Web
  participant A as API (writeReply)
  participant T as Toolbox
  participant D as Postgres
  participant M as Model
  participant S as MCP app

  U->>W: "Please refund order A1"
  W->>A: POST /api/threads/:id/messages
  A->>M: streamText(tools = toToolSet(approvalPolicy(mode)))
  M->>T: shop_refund_order {orderId: "A1"}
  T-->>M: AWAITING_APPROVAL_RESULT (policy said "ask")
  M-->>A: "I've asked to refund A1…"
  A->>D: save answer + tool call (awaiting_approval)
  A->>D: approval_requests (pending, summary)
  A-->>W: stream ends, toolCalls carry approvalId
  W-->>U: "Wants to use shop refund order · Needs your OK"

  U->>W: Approve
  W->>A: POST /api/approvals/:id/approve
  A->>D: UPDATE … WHERE status = 'pending' RETURNING
  alt no row (already decided)
    A-->>W: 409
  else decided
    A->>T: runApproved("shop_refund_order", {orderId: "A1"})
    T->>S: tools/call
    S-->>T: result
    A->>D: tool call → succeeded · approval → executed
    A->>D: tool note "You approved shop refund order."
    A->>M: follow-up turn (+ hidden instruction with the raw result)
    M-->>A: "Done, A1 is refunded."
    A->>D: save reply
    A-->>W: {approval, reply}
    W->>A: GET /api/threads/:id (reload messages)
    W-->>U: note + reply, badge count drops
  end
```

Rejecting follows the same path without `runApproved`: the tool call is
saved as `rejected`, the note says "You rejected …", and the agent is told
not to try again unless asked.
