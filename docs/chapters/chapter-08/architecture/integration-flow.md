# Policy and states

## What the policy decides

```mermaid
flowchart TD
  C["The model calls a tool"] --> R{"Tool risk"}
  R --> MODE{"Agent's approval mode"}
  MODE -- "plan_only" --> B["block<br/>BLOCKED_RESULT"]
  MODE -- "ask_first" --> ASK["ask<br/>AWAITING_APPROVAL_RESULT"]
  MODE -- "auto_approve_reads" --> AR{"read?"}
  AR -- yes --> RUN["run"]
  AR -- no --> ASK
  MODE -- "accept_edits" --> AE{"computer?"}
  AE -- yes --> ASK
  AE -- no --> RUN
```

## An approval request

```mermaid
stateDiagram-v2
  [*] --> pending: writeReply saves a waiting call
  pending --> approved: POST /approve (first click wins)
  pending --> rejected: POST /reject
  approved --> executed: the tool ran (succeeded or failed)
  pending --> expired: not built yet
  executed --> [*]
  rejected --> [*]
```

## Its tool call

```mermaid
stateDiagram-v2
  [*] --> awaiting_approval: policy said "ask"
  [*] --> rejected: policy said "block"
  [*] --> succeeded: policy said "run", tool worked
  [*] --> failed: policy said "run", tool failed
  awaiting_approval --> succeeded: approved, tool worked
  awaiting_approval --> failed: approved, tool failed or app gone
  awaiting_approval --> rejected: you said no
```

The UI tells "blocked" and "you said no" apart by the saved output
(`{blocked: true}` vs `{rejected: true}`), because both use the `rejected`
status.
