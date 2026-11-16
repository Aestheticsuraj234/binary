# Chapter 4: Agents as characters

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. So far we
have sign-in, a database with the whole schema, encrypted API keys, and an
engine layer that can answer with OpenAI, Anthropic or Google.

Now I want the coworkers themselves: **agents** I can hire. Each one has a
name, a job, instructions and a model, and is played by a **character** from
a small cast of original cartoon characters, each with a face and a few moods
(thinking, talking, happy). I can start from one of the seeded **templates**
or design my own in a character creator with a live preview. The home page
becomes **Discover**, with my crew and the cast, and I talk to an agent
beside a stage where its character reacts. Chats don't need to be saved yet.

Things I care about:

- Every agent belongs to its user. Another user's agent is a plain 404.
- The characters are original, drawn in code and animated with plain CSS,
  and they respect reduced motion.
- The tables from chapter 2 are enough, so no migration.
- I can only pick a provider I have a key for.

Before writing code, look around the repo, show me your plan and the screens
you'd build, and ask me anything that's unclear.

Done when:

- [ ] Discover shows my crew and the cast, and asks for a key when I have none
- [ ] I can hire an agent from a template, rename it and switch character, and the preview follows
- [ ] It answers in character, and its face goes from thinking to talking to happy
- [ ] Editing changes the next answer, and firing an agent removes it from my crew
- [ ] Another user can't see my agents, and every page works on a phone
- [ ] Lint, typecheck and tests pass
