# Chapter 13: Multi-agent teams and rooms

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. Each
character I hire has its own model, tools, computer and memory. But I can
only talk to one at a time.

Now I want **rooms**: a group chat with a small team of my characters and a
**lead**. A room picks who answers in one of two ways. In **@mention** mode,
the characters I mention answer, or the lead when I mention no one. In
**automatic** mode, the lead's model decides who should answer. Characters
answer **in turn**, each seeing what the others said, and one can hand part
of the task to a teammate by @mentioning them.

Things I care about:

- One message gets at most 4 answers, so hand-offs can never loop.
- Each character keeps its own memory, tools and approval mode in a room,
  and its approvals still land in Today.
- Each character knows who else is in the room and only answers its part.
- One character failing doesn't stop the rest.
- Chapter 2 already has tables for rooms, so I don't expect a migration.

Before writing code, look around the repo, show me your plan, and ask me
anything that's unclear.

Done when:

- [ ] I can create, edit and delete a room
- [ ] @mentioned characters answer in order, and with no mention the lead does
- [ ] In automatic mode the lead picks who answers, and my @mention still wins
- [ ] A hand-off works, and a message never gets more than 4 answers
- [ ] Lint, typecheck and tests pass
