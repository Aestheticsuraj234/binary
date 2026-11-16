# Chapter 2: The database layer

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. Chapter 1
set up the monorepo (a Hono API, a Next.js web app and an Expo mobile app)
with email and password sign-in through Better Auth, and Postgres running in
Docker.

Now I want one proper database layer that the whole project shares. Put
**Drizzle ORM** in its own package so the API, and everything we add later,
talks to Postgres through the same typed client. I'd like the schema for the
whole app designed up front, even though we'll use it bit by bit: users and
auth, agents and agent templates, threads and messages, tool calls and
approval requests, computers, memories, routines and integrations. Enable
**pgvector** now, because memories will need embeddings later.

Things I care about:

- Migrations are generated and versioned. No hand-made tables.
- Better Auth stores its users and sessions through Drizzle, in the same schema.
- Data access lives in small repository classes, not in queries scattered around.
- A beginner can read it: one schema file per area, no clever abstractions.

Before writing code, look around the repo, show me your plan and the tables
you'd create, and ask me anything that's unclear.

Done when:

- [ ] One setup command starts Postgres, runs migrations and seeds a few agent templates and a demo account
- [ ] I can sign up, and sign in as the demo user
- [ ] Running the seed twice creates no duplicates
- [ ] Tests run against a real database, including a vector similarity search
- [ ] Lint, typecheck and tests pass
