# Chapter 2: The database layer

Every table Binary will ever need is created here, and every part of the app
talks to Postgres through the same typed client. Later chapters add features
without redesigning the database.

## What you'll learn

- How an **ORM** (Drizzle) turns TypeScript schema files into typed queries
- How **migrations** version the database so everyone's schema matches
- What **pgvector** is, and why we turn it on now (memories use it in
  chapter 12)
- The **Repository pattern**: small classes that own the queries for one table
- How **seed data** gives you a demo account and agent templates to start with

## Try it

```bash
pnpm setup      # starts Postgres, runs the migrations, seeds the data
pnpm dev        # sign in as demo@binary.dev / binary-demo-password
pnpm db:studio  # browse the tables in Drizzle Studio
```

Open Drizzle Studio and look around. You'll see tables for agents, chats,
approvals, memories and more. Most are empty, waiting for the next chapters.

## Good to know

- **Accounts from chapter 1 aren't carried over.** The auth tables moved from
  singular names (`user`) to plural ones (`users`). Sign up again, or use the
  demo account. To start completely fresh:
  `docker compose down -v && pnpm setup`.
- The seed never creates the demo account when `NODE_ENV=production`.

## Build it yourself

Paste [PROMPT.md](PROMPT.md) into your coding agent in your chapter 1 repo.
See [DIAGRAM.md](DIAGRAM.md) for a map of the main tables.

## Next

[Chapter 3](../chapter-03/README.md) adds the AI engine and stores your
model provider API keys encrypted.
