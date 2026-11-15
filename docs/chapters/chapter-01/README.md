# Chapter 1: Project init and authentication setup

**Goal:** a working monorepo where a user can create an account, sign in and
sign out on the web and on a phone, with one shared design system.

## What you get

- A Turborepo + pnpm monorepo with three apps and two shared packages
- Postgres 16 (with pgvector, for later chapters) in Docker
- Email + password authentication with [Better Auth](https://www.better-auth.com),
  served by a Hono API
- Web: sign-up, sign-in and a protected home page (Next.js, shadcn/ui, Tailwind)
- Mobile: the same three screens in Expo, with the session in secure storage
- One validation source (`packages/shared`) for web, mobile and API
- ESLint rules that enforce the Google TypeScript Style Guide
- Tests for validation and the full auth flow against a real database
- A CI workflow, ready for when the repo goes to GitHub

## Files in this chapter's docs

| File                                   | What's in it                                        |
| -------------------------------------- | --------------------------------------------------- |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Plan, acceptance criteria, file-by-file walkthrough |
| [ARCHITECTURE.md](ARCHITECTURE.md)     | How the pieces fit and why                          |
| [TESTING.md](TESTING.md)               | What is tested and how to run it                    |
| [PR_REVIEW.md](PR_REVIEW.md)           | Review findings and what was simplified             |
| [REBUILD_PROMPT.md](REBUILD_PROMPT.md) | A standalone prompt to rebuild this chapter         |
| [architecture/](architecture)          | System, request and integration diagrams            |

## Run it

See the [setup guide](../../SETUP.md). In short:

```bash
pnpm install
cp .env.example .env   # then set BETTER_AUTH_SECRET
pnpm setup
pnpm dev               # http://localhost:3000
```

## What comes next

Chapter 2 moves the database to the Drizzle ORM and adds the schema for every
entity in the project, including the auth tables created here.
