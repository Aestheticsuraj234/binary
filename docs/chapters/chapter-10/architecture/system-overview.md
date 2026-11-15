# System overview: Chapter 10

## Components

```mermaid
flowchart LR
  subgraph web["apps/web"]
    AF["AgentForm<br/>Computer: None · Cloud sandbox · Browser"]
    CH["AgentChat · ToolCall<br/>ToolImages · BrowserOutput"]
    CHIP["ComputerChip<br/>Browser open · Close"]
    AP["/apps<br/>ComputerSection × 2"]
  end

  subgraph api["apps/api"]
    CR["routes/computers.ts<br/>GET · DELETE /:id"]
    TF["ToolboxFactory.forUser(userId, {threadId, computer})"]
    BT["browser-tools.ts<br/>open · read (read) · click · type (computer)"]
    CS["ComputerSessions<br/>(Template Method)"]
    SS["SandboxSessions<br/>(Chapter 9)"]
    BS["BrowserSessions<br/>one Chromium · map of chats · idle timers"]
    CB["ChatBrowser<br/>context · page · refs · guard"]
    G["UrlGuard<br/>publicUrlsOnly"]
  end

  subgraph db["packages/db"]
    CSR["ComputerSessionRepository"]
  end

  WEB[("Public web")]

  AF --> api
  CHIP & AP --> CR
  CR --> CS
  CS --- SS & BS
  CH --> TF --> BT --> BS --> CB
  CB -- "every request" --> G
  CB --> WEB
  CS --> CSR
```

## What is new

| Piece                                                            | Role                                                                       |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `ComputerSessions`                                               | The shared base: list, stop, and stop for a chat, over `computer_sessions` |
| `BrowserSessions`                                                | Chromium, one context per chat, idle timers, a cap of 5                    |
| `ChatBrowser`                                                    | open / read / click / type, refs, the request guard, screenshots           |
| `MARK_ELEMENTS` + `pageElementsSchema`                           | Find and number what can be clicked; check what the page returned          |
| `browserTools()`                                                 | Four tools bound to one chat's browser                                     |
| `withoutImages` (`tools/model-view.ts`)                          | Charts and screenshots become notes for the model                          |
| `/api/computers`                                                 | Sandboxes and browsers, listed and stopped together                        |
| `ComputerChip`, `ComputerSection`, `ToolImages`, `BrowserOutput` | Where you see, read and stop them                                          |
