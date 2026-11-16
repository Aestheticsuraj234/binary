# Chapter 5: Saved, streaming chat

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. So far I can
sign in, save encrypted API keys, and hire agents played by cartoon
characters, then talk to them. But nothing is saved, and each answer arrives
all at once.

Now I want real chats. Every conversation becomes a **thread** of
**messages**, saved as I go and titled after my first message. Answers
**stream** in word by word with the **Vercel AI SDK**, and render as Markdown
with highlighted code, even mid-stream. The sidebar gets **Recent chats** so
I can pick up any conversation, plus New chat and Delete chat. The
character's mood follows along: thinking, then talking, then happy.

Things I care about:

- My message is always saved. If the provider fails part-way, keep what
  arrived on screen with the reason, but don't save it as a real answer.
- Errors you can catch early (wrong chat, missing key) come back before the
  stream starts.
- The model only reads the recent part of a long chat, so costs stay bounded.
- Another user's chat is a 404, and links in answers ask before leaving Binary.
- Only the tab that sent the message needs to stream. Live updates across
  tabs can wait.

Before writing code, look around the repo, show me your plan and how the
stream will work, and ask me anything that's unclear.

Done when:

- [ ] An answer streams in word by word while the character talks, and it's still there after a reload
- [ ] Recent chats lists my chats newest first, and clicking one picks up where I left off
- [ ] New chat and Delete chat work, and a chat is titled after its first message
- [ ] Headings, lists, tables and code render, even mid-stream
- [ ] Lint, typecheck and tests pass, with a fake streaming model in the tests
