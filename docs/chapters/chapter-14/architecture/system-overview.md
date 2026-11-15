# System overview: Chapter 14

```mermaid
flowchart LR
  subgraph mobile["apps/mobile (Expo)"]
    G["_layout<br/>Stack.Protected · TodayCountProvider"]
    T["(tabs)<br/>Crew · Rooms · Today · You"]
    C["agents/[id] · rooms/[id]<br/>ChatView · MessageBubble · ToolCallRow"]
    UC["useChat<br/>NDJSON · turns · approvals"]
    V["useVoiceInput<br/>expo-audio · File"]
    API["apiFetch<br/>expo/fetch · cookie · X-Binary-Client"]
    F["character-faces.ts<br/>SvgXml"]
  end

  subgraph web["apps/web"]
    S["scripts/export-character-faces.tsx"]
    CH["&lt;Character&gt;"]
  end

  subgraph api["apps/api"]
    TR["POST /api/transcribe"]
    VO["Voice → Transcriber<br/>gpt-4o-mini-transcribe"]
    AP["approvals routes<br/>clientOf(header)"]
    TH["threads · rooms · agents · today"]
  end

  OAI(["OpenAI"])
  DB[("Postgres<br/>approval_requests.decided_from")]

  G --> T & C
  C --> UC --> API
  C --> V --> API
  T --> API
  API --> TR --> VO --> OAI
  API --> AP --> DB
  API --> TH
  CH --> S --> F
  F --> T & C
```

| Piece                    | Role                                                      |
| ------------------------ | --------------------------------------------------------- |
| `apiFetch`               | The one door to the API: cookie, client header, streaming |
| `useChat`                | One-to-one and room chats from the same events            |
| `useVoiceInput`          | Record, upload, put the words in the box                  |
| `Voice` / `Transcriber`  | The user's OpenAI key; names as a hint; a fake in tests   |
| `clientOf`               | `mobile` from the header, else `web`                      |
| `export-character-faces` | One drawing for both apps                                 |
