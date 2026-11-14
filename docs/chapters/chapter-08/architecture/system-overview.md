# System overview: Chapter 8

## Components

```mermaid
flowchart LR
  subgraph web["apps/web"]
    TD["/today<br/>TodayInbox · routine runs"]
    CH["AgentChat<br/>ToolCall: Approve · Reject"]
    SB["AppSidebar<br/>Today badge (count)"]
    AF["AgentForm<br/>Permissions select"]
  end

  subgraph api["apps/api"]
    AR["routes/approvals.ts<br/>/api/approvals · /api/today"]
    AG["routes/agents.ts<br/>approvalMode"]
    DA["decideApproval()"]
    WR["writeReply()<br/>(chat + routines)"]
    TB["Toolbox<br/>toToolSet(policy) · runApproved()"]
    PO["approvalPolicy(mode)<br/>run · ask · block"]
  end

  subgraph db["packages/db"]
    APR["ApprovalRepository<br/>decide() only if pending"]
    TCR["ToolCallRepository<br/>finish()"]
    MR["MessageRepository"]
    RR["RoutineRunRepository<br/>listForUserSince()"]
  end

  TD & CH & SB --> AR
  AF --> AG
  AR --> DA
  AR --> APR & RR
  DA --> APR & TCR
  DA -- "runApproved" --> TB
  DA -- "follow-up turn" --> WR
  WR --> TB
  TB --> PO
  WR -- "awaiting calls" --> APR
  WR --> MR & TCR
```

## What is new

| Piece                            | Role                                                                        |
| -------------------------------- | --------------------------------------------------------------------------- |
| `approvalPolicy(mode)`           | The Chapter 6 Strategy, now with three answers instead of two               |
| `ApprovalRepository`             | Requests as rows; one conditional update decides each one, once             |
| `decideApproval()`               | Records the decision, runs or rejects the tool, and has the agent follow up |
| `/api/approvals`, `/api/today`   | The inbox, decisions and the sidebar count                                  |
| `TodayInbox`, `ToolCall` buttons | The two places you decide                                                   |
