# Chapter 6: Tools and MCP apps

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. So far I can
hire characters, store my provider keys encrypted, and have saved, streaming
chats with them. But they can only talk.

Now I want them to do things. Give them **tools**: a couple of built-in ones
(like the current time, or reading a public web page) plus any app I connect
through an **MCP** server, which covers **Composio** too. The model calls a
tool, reads the result and then answers, and I see each call live inside the
reply. Add an **Apps & tools** page to connect apps and see their tools.

Every tool gets a **risk level**: `read`, `write` (changes something outside
Binary) or `computer` (for sandboxes and computers, later). Tools bring new
ways to fail, so add a small set of typed errors that turn into clean JSON
responses.

Things I care about:

- Only `read` tools run for now. `write` and `computer` tools are blocked
  until we can ask me first, and the model is told why.
- When in doubt, a tool is `write`. An app's tool is `read` only if its
  server says so.
- An app's token is encrypted like the API keys and never sent back.
- The web page tool only reaches public addresses, never my local network.

Before writing code, look around the repo, show me your plan, and ask me
anything that's unclear.

Done when:

- [ ] "What time is it in Tokyo?" uses a built-in tool, and I can open the call to see its input and result
- [ ] I can connect an MCP app and see its tools with their risk
- [ ] A read tool runs mid-answer; a write tool shows as blocked and never runs
- [ ] An app that can't be reached shows an error, and chats keep working
- [ ] Lint, typecheck and tests pass
