# Integration flow: what the chat screen is doing

## The character's moods follow the stream

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> thinking: send
  thinking --> talking: first delta
  talking --> talking: more deltas
  talking --> happy: done
  happy --> idle: after 1.5 s
  thinking --> oops: error / no key / offline
  talking --> oops: error part-way
  oops --> thinking: send again
```

## Which chat is on screen

```mermaid
flowchart TD
  P["page prop threadId<br/>(from ?chat=)"] --> Q{"differs from<br/>shownThreadId?"}
  Q -- yes --> R["reset during render:<br/>threadId, messages = saved"]
  Q -- no --> K["keep local state<br/>(stream in progress)"]
  N["first message in a new chat"] --> S["create thread · setThreadId<br/>history.replaceState(?chat=id)"]
  S --> T["stream reply"] --> U["router.refresh()"]
  U --> P
  NC["New chat button"] --> L["reset locally"] --> PU["router.push(/agents/id)"] --> P
```

Swapping the address with `replaceState` keeps this page mounted, so the
stream isn't cut off. The refresh afterwards brings the sidebar and the
title up to date. Switching chats from the sidebar changes `?chat=`,
which resets the screen to that chat's saved messages.
