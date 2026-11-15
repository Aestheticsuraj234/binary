# One message, end to end

"Plot a bar chart of our monthly signups", sent to Bolt (GPT-5.5, a cloud
sandbox, "Auto-approve reads"). This is the real chat in
[the README](../../../screenshots/chat-sandbox.png).

```mermaid
sequenceDiagram
  actor U as You
  participant W as Web (AgentChat)
  participant A as API (writeReply)
  participant DB as Postgres
  participant M as GPT-5.5
  participant T as Toolbox + policy
  participant S as E2B sandbox

  U->>W: "Plot a bar chart…"
  W->>A: POST /api/threads/:id/messages (cookie)
  A->>DB: save the message; load history, memories
  A->>M: system prompt + history + tools
  M-->>A: tool call run_code(python)
  A->>T: run_code is a "computer" tool
  T->>DB: tool call awaiting approval + approval request
  A-->>W: tool {awaiting_approval} · done
  W-->>U: "Needs your OK" (also in Today)
  U->>W: Approve
  W->>A: POST /api/approvals/:id/approve
  A->>DB: decide once (approved)
  A->>S: run the code (sandbox started on first use)
  S-->>A: stdout + chart PNG
  A->>DB: result saved; note "You approved run code."
  A->>M: the result, "carry on"
  M-->>A: "Done — signups grew 341.7%"
  A-->>W: the follow-up
  W-->>U: chart + answer
```
