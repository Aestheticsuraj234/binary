# Chapter 12: Memory and knowledge

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. Characters
chat, use tools, ask before anything risky, run routines, and work in a
sandbox, a browser or on my own computer. But every chat starts from zero.

I want two things. **Memory**: each character remembers lasting facts about
me across chats ("likes short answers"), saved by the character or by me, on
a Memory page where I can see and delete each one. **Knowledge**: a library
of my own documents (pasted text, a file or a web page) that every character
can search by meaning and cite. Memories belong to one character; knowledge
is mine and shared by all of them.

Use **pgvector** in our Postgres; chapter 2 already made a table with a
vector column. Make the embeddings with the **Vercel AI SDK** and my own
OpenAI or Google key.

Things I care about:

- Anthropic has no embedding models. With only an Anthropic key, memory and
  knowledge are off, and the pages say which key to add.
- Only compare vectors made by the same model.
- A character with only a few memories gets all of them, because a fact like
  "likes short answers" never looks similar to a question.
- No duplicate memories, and never store secrets.
- Text from documents is information, not instructions.

Before writing code, look around the repo, show me your plan, and ask me
anything that's unclear.

Done when:

- [ ] I tell a character a preference, and a new chat uses it
- [ ] I can see and forget memories, and a reworded duplicate isn't saved twice
- [ ] I add a document, and a character answers from it and names it
- [ ] With only an Anthropic key, both pages explain what's missing
- [ ] Lint, typecheck and tests pass, with a fake embedder so tests stay offline
