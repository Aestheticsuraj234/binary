# Chapter 8: Approvals and the Today inbox

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. So far
characters chat, use tools from built-ins and MCP apps, and run routines on
Trigger.dev. Every tool has a risk level (`read`, `write` or `computer`), but
`write` and `computer` tools are simply blocked.

Now I want "blocked" to become "ask me". Each character gets an **approval
mode**: **Plan only** (no tools), **Ask first** (every tool asks),
**Auto-approve reads** (reads run, the rest asks) and **Accept edits** (only
`computer` tools ask). When a tool needs my OK, save an **approval request**
and let the character tell me what it wants to do, without keeping anything
waiting in memory. I approve or reject in the chat or in a new **Today**
inbox, and the character carries on in the same chat. Because nothing is
held open, this works the same for chats and routines.

Things I care about:

- A request is decided once. Two clicks or two devices must never run the
  tool twice.
- Approving runs exactly what the character asked for, nothing else.
- After a rejection, the character doesn't try again unless I ask.
- New characters start on Auto-approve reads.

Before writing code, look around the repo, show me your plan, and ask me
anything that's unclear.

Done when:

- [ ] I can choose an approval mode when hiring or editing a character
- [ ] A write tool asks for my OK in the chat, and the same request waits in Today
- [ ] Approving runs the tool once, and the character says what happened
- [ ] Rejecting runs nothing, and the character acknowledges it
- [ ] Plan only uses no tools, and Accept edits runs write tools without asking
- [ ] Lint, typecheck and tests pass
