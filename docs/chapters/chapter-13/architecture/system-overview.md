# System overview: Chapter 13

```mermaid
flowchart LR
  subgraph web["apps/web"]
    RL["/rooms<br/>cards · New room"]
    RF["RoomForm<br/>members · who answers · lead"]
    RC["RoomChat<br/>turns per character · @chips · chats"]
  end

  subgraph api["apps/api"]
    RR["routes/rooms.ts"]
    TR["routes/threads.ts<br/>POST /:id/messages"]
    RT["runRoomTurn<br/>mentions · routeByLead · hand-offs · cap 4"]
    WR["writeReply<br/>room context · historyFor · saveContent"]
    SP["buildSystemPrompt(agent, memories, room)"]
    EF["EngineFactory.forAgent (each member)"]
    DA["decideApproval<br/>room context"]
  end

  subgraph db["Postgres"]
    R[("rooms · room_members")]
    T[("threads.room_id")]
    M[("messages.author_agent_id")]
  end

  RL & RF --> RR --> R
  RC --> TR --> RT --> WR --> SP
  RT --> EF
  WR --> M
  RR --> T
  DA --> WR
```

| Piece                   | Role                                                      |
| ----------------------- | --------------------------------------------------------- |
| `findMentions` (shared) | @Names in a text, in order, longest name first, once each |
| `routeByLead`           | The lead's model names who should answer (auto mode)      |
| `runRoomTurn`           | Save once; answer in turn; follow hand-offs; stream turns |
| `historyFor`            | Others' words as "[Name]: …" for each agent               |
| `RoomRepository`        | Rooms and members, owner-checked in transactions          |
