# Sandbox states

## A chat's sandbox

```mermaid
stateDiagram-v2
  [*] --> none: chat starts
  none --> running: first approved run_code / run_command / write_file
  running --> running: next use (connect, keep alive 10 more minutes)
  running --> stopped: Stop (chip or Apps), or the chat is deleted
  running --> timedOut: 10 idle minutes, or E2B's 1 h / 24 h limit
  timedOut --> closed: noticed on the next use or listing
  stopped --> closed
  closed --> running: next approved run starts a fresh one (newSandbox)
  none --> none: read_file / list_files ("no sandbox yet")
```

`computer_sessions.status` only has `running` and `closed`. A sandbox that
timed out on E2B's side stays `running` in the database until the next
use, or until someone lists sandboxes. Then the provider says it's gone and
the row is closed. `minutesUsed` keeps the value from its last use, rather
than counting idle time it may not have run.

## Which tools an agent gets

```mermaid
flowchart TD
  A["writeReply / decideApproval"] --> Q1{"E2B_API_KEY set?"}
  Q1 -- no --> N["built-in tools + apps"]
  Q1 -- yes --> Q2{"agent.defaultComputer == 'sandbox'?"}
  Q2 -- no --> N
  Q2 -- yes --> S["built-in + sandbox tools (this chat) + apps"]
  S --> P{"approval mode"}
  P -- "plan_only" --> B["all blocked"]
  P -- "ask_first" --> K["all five ask"]
  P -- "auto_approve_reads, accept_edits" --> R["read_file, list_files run;<br/>run_code, run_command, write_file ask"]
```
