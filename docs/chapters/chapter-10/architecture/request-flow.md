# Request flow: open, then click

```mermaid
sequenceDiagram
  actor U as You
  participant W as Web
  participant A as API
  participant B as BrowserSessions
  participant C as ChatBrowser (Chromium)
  participant G as UrlGuard
  participant N as The web

  U->>W: "Open example.com"
  W->>A: POST /api/threads/:id/messages
  A->>A: model calls browser_open (read: runs)
  A->>B: forThread(user, chat).start()
  B->>B: no browser for this chat → launch Chromium (once), new context
  B->>A: computer_sessions row (kind browser)
  A->>C: open("https://example.com")
  C->>G: example.com public?
  G-->>C: yes
  C->>N: GET
  N-->>C: page
  C->>C: MARK_ELEMENTS (refs), innerText, JPEG screenshot
  C-->>A: {url, title, text, elements, screenshot}
  A->>A: model reads it without the screenshot → "I opened Example Domain."
  W-->>U: screenshot under "Used browser open · Read", "Browser open" chip

  U->>W: "Follow the link"
  W->>A: POST /messages
  A->>A: model calls browser_click {ref: 1} (computer: asks)
  W-->>U: "Wants to use browser click" — open, showing {ref: 1}
  U->>W: Approve
  W->>A: POST /api/approvals/:id/approve
  A->>B: forThread(user, chat).existing() → the same ChatBrowser
  A->>C: click(1)
  C->>G: iana.org public?
  C->>N: GET
  C-->>A: the new page + screenshot
  A-->>W: note "You approved browser click." + the agent's reply
```

If the link had pointed at a private address, the guard would have said no.
The request would be aborted, the page would stay where it was, and the
result would carry `blocked: "… is a private address. The browser did not
open it."`.
