# System overview: Chapter 9

## Components

```mermaid
flowchart LR
  subgraph web["apps/web"]
    AF["AgentForm<br/>Computer select"]
    CH["AgentChat<br/>ToolCall · SandboxCharts · TerminalOutput"]
    CHIP["SandboxChip<br/>Sandbox on · Stop"]
    AP["/apps<br/>SandboxSection: tools · running · Stop"]
  end

  subgraph api["apps/api"]
    SR["routes/sandboxes.ts<br/>GET · DELETE /:id"]
    WR["writeReply()<br/>scope = {threadId, computer}"]
    DA["decideApproval()"]
    TF["ToolboxFactory.forUser(userId, scope)"]
    ST["sandbox-tools.ts<br/>run_code · run_command · write_file<br/>read_file · list_files"]
    CS["ChatSandbox<br/>open() · existing()"]
    SS["SandboxSessions<br/>listRunning · stop · stopForThread"]
    SP["SandboxProvider<br/>(Strategy)"]
    E2BP["E2BSandboxProvider"]
    FAKE["FakeSandboxProvider<br/>(tests)"]
  end

  subgraph db["packages/db"]
    CSR["ComputerSessionRepository"]
  end

  E2B[("E2B cloud<br/>code-interpreter template")]

  AF --> api
  CHIP & AP --> SR
  CH --> WR & DA
  SR --> SS
  WR & DA --> TF
  TF --> ST --> CS
  CS & SS --> CSR
  CS & SS --> SP
  SP --- E2BP & FAKE
  E2BP --> E2B
```

## What is new

| Piece                                                 | Role                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `SandboxProvider` / `CloudSandbox`                    | The Strategy that hides E2B; a fake for tests                 |
| `ChatSandbox`                                         | One chat's sandbox: started on first use, found again later   |
| `SandboxSessions`                                     | Every running sandbox: list (closing timed-out ones) and stop |
| `sandboxTools()`                                      | Five tools bound to one chat's sandbox                        |
| `ComputerSessionRepository`                           | `computer_sessions` rows: create, find, touch, close          |
| `AgentTool.forModel`                                  | What the model reads instead of the full result               |
| `SandboxChip`, `SandboxSection`, `sandbox-output.tsx` | Where you see and stop sandboxes, and read their output       |
