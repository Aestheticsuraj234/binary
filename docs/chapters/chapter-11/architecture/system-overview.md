# System overview: Chapter 11

```mermaid
flowchart LR
  subgraph you["Your computer"]
    R["apps/runner<br/>pair · start --folder"]
    SF["SharedFolders<br/>realpath checks"]
    CLI["claude / codex CLI"]
  end

  subgraph web["apps/web"]
    YC["/computers<br/>add · code · online · Pause · Remove"]
    AF["AgentForm<br/>Thinks with: … Claude Code · Codex<br/>Computer: … Cloud desktop · Your computer"]
    CH["Chat<br/>terminal output · screenshots · Desktop on + Watch"]
  end

  subgraph api["apps/api"]
    DR["routes/devices.ts"]
    RR["routes/runner.ts<br/>pair · hello · jobs · events · result"]
    HUB["RunnerHub<br/>(in memory)"]
    YCS["YourComputers<br/>pick · run"]
    RT["runner-tools.ts"]
    RE["RunnerEngine"]
    EF["EngineFactory.forAgent"]
    DS["DesktopSessions<br/>(ProviderSessions)"]
    DT["desktop-tools.ts<br/>showsImage"]
  end

  DB[("devices · computer_sessions")]
  E2B[("E2B Desktop<br/>VNC stream")]

  YC --> DR --> DB
  R -- "long poll, Bearer token" --> RR
  RR --> HUB
  R --> SF
  R --> CLI
  RT & RE --> YCS --> HUB
  YCS --> DB
  EF --> RE
  CH --> api
  DT --> DS --> E2B
  CH -. "Watch (view only)" .-> E2B
```

| Piece                                    | Role                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/runner`                            | The app on your computer: pairs, polls, runs jobs in shared folders, runs the CLIs |
| `RunnerHub`                              | Hands jobs to a device's poll; times out jobs nobody picks up                      |
| `YourComputers`                          | Picks the paired, online, unpaused computer; runs a job there                      |
| `RunnerEngine`                           | An `AgentEngine` that is Claude Code or Codex, through the Runner                  |
| `ChatComputer` / `ProviderSessions`      | Chapter 9's per-chat sandbox, made generic; sandboxes and desktops use it          |
| `DesktopSessions` + `E2BDesktopProvider` | Cloud desktops with a view-only live stream                                        |
| `withImage`, `imagesIn`, `PromptImage`   | Screenshots the model sees, during a turn and after an approval                    |
