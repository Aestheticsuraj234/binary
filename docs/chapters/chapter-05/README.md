# Chapter 5: Saved, streaming chat

Chats become real conversations. Every chat with a character is saved,
answers stream in word by word while the character talks, and your recent
chats sit in the sidebar like in any chat app. Answers also render as
Markdown, with highlighted code.

![A saved chat with Markdown, highlighted code and Recent chats](screenshots/markdown.png)

## What you'll learn

- How **streaming** works: the Vercel AI SDK hands over the answer piece by
  piece, and the API passes each piece straight to the browser
- Why we stream **newline-delimited JSON** over `fetch` instead of
  server-sent events
- How **threads and messages** keep a conversation, and why the model only
  reads the last 20 messages
- Why every check happens **before the first byte** is sent, so errors get
  real HTTP statuses
- How to render **Markdown while it streams**, without showing half-written
  `**` or code fences

## Try it

No new settings and no migration.

```bash
pnpm dev
```

Open a character from **Your crew** in the sidebar and ask something. Watch
the answer type itself out while the character talks. Reload the page: the
chat is still there, and it's listed under **Recent chats**.

![An answer streaming in](screenshots/streaming.png)

## Good to know

- Only the tab that sent the message streams. Other open tabs and devices
  show the new messages after a reload.
- Streamdown styles itself with Tailwind classes, so Tailwind must scan its
  files in `apps/web/node_modules`. Point it at the wrong folder and answers
  render without styles, with no error.
- The first code block in a new language shows uncolored for a moment while
  its highlighting loads.
- Chat doesn't show token usage. The Playground still does.

## Build it yourself

Paste [PROMPT.md](PROMPT.md) into your coding agent in your chapter 4 repo.
See [DIAGRAM.md](DIAGRAM.md) for what happens when you send a message.

## Next

[Chapter 6](../chapter-06/README.md) gives agents tools, with risk levels,
and connects your apps through MCP.
