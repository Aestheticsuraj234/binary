# Request flow: running code in a chat

```mermaid
sequenceDiagram
  actor U as You
  participant W as Web
  participant A as API
  participant T as Toolbox
  participant C as ChatSandbox
  participant D as Postgres
  participant E as E2B

  U->>W: "Plot monthly sales"
  W->>A: POST /api/threads/:id/messages
  A->>T: forUser(userId, {threadId, computer: 'sandbox'})
  Note over T: + run_code, run_command, write_file,<br/>read_file, list_files (bound to this chat)
  A->>A: model calls run_code (computer risk)
  T-->>A: AWAITING_APPROVAL_RESULT (no sandbox yet)
  A->>D: tool call (awaiting_approval) + approval request
  W-->>U: "Wants to use run code" — opened, showing the code

  U->>W: Approve
  W->>A: POST /api/approvals/:id/approve
  A->>T: forUser(userId, {threadId, computer}) → runApproved("run_code")
  T->>C: open()
  C->>D: findRunningForThread → none
  C->>E: Sandbox.create({timeoutMs: 10 min, metadata})
  C->>D: computer_sessions (running, providerId)
  T->>E: runCode(code, {language: python})
  E-->>T: logs + results (PNG chart)
  A->>D: tool call → succeeded (full output, PNG included)
  A->>A: follow-up turn; model reads forModel(output): "A chart. The user can see it."
  A-->>W: {approval, reply}
  W-->>U: chart under the row, reply, "Sandbox on" in the header

  U->>W: "Which files are there?"
  W->>A: POST /messages
  A->>T: list_files (read risk: runs at once)
  T->>C: existing() → findRunningForThread → connect(providerId)
  C->>E: Sandbox.connect(id) + setTimeout(10 min)
  E-->>T: entries
```

The next message in the same chat connects to the same sandbox, so files
and Python variables are still there. When the sandbox has timed out,
`connect` returns undefined: the old row is closed, a new sandbox is
created, and the run's output says `newSandbox: true`.
