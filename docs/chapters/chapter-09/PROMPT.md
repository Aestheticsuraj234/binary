# Chapter 9: Cloud sandboxes with E2B

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. So far
characters chat, use tools with risk levels (`read`, `write`, `computer`),
run routines, and ask me before anything risky, in the chat or in the Today
inbox.

Now I want characters to run real code. Give a character a **computer**
setting, and make the first kind a **cloud sandbox** from **E2B**: a private
Linux machine where it can run Python or JavaScript, run shell commands and
work with files. If it draws a chart, I want to see it in the chat. Each chat
gets its own sandbox, so a task's files stay together.

Things I care about:

- Running code, running commands and writing files are `computer` tools, so
  they ask me first, and I see the exact code before I approve.
- A sandbox starts only on the first approved run and stops by itself after
  a while idle. I can see what's running and stop it.
- Charts are for me. Don't send the image back to the model.
- It's optional: without an `E2B_API_KEY`, characters have no sandbox and
  the UI says how to turn it on.

Before writing code, look around the repo, show me your plan, and ask me
anything that's unclear.

Done when:

- [ ] I can give a character a cloud sandbox, ask it to plot something, approve, and see the chart in the chat
- [ ] A file written in one message can be read in the next
- [ ] I can stop a sandbox, and deleting a chat stops it too
- [ ] Without `E2B_API_KEY`, nothing breaks
- [ ] Lint, typecheck and tests pass
