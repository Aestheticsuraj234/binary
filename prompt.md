# Make the Binary chapters lighter and more natural

## Why

Binary is taught chapter by chapter on YouTube, and students follow along with
their own coding agent. Right now every chapter in `docs/chapters/` ships six
long documents plus an `architecture/` folder. Its `REBUILD_PROMPT.md` reads
like a full spec: package versions, file paths, function signatures, every
enum value, every column, every test case.

That is the opposite of what I want to teach. My students don't know this
project. When they paste a 200-line blueprint into their agent, they learn
copy-paste, not how to work with an agent. Agentic-first development doesn't
mean giving the agent everything. It means briefing it the way a good lead
briefs a capable engineer: what we're building and why, the few things that
matter, and how we'll know it works. Then the agent explores, plans, asks
questions and fills in the details.

Rewrite all 15 chapters in that spirit.

## What each chapter folder should contain

```
docs/chapters/chapter-XX/
  README.md      what this chapter adds, for the student
  PROMPT.md      the brief the student pastes into their agent
  DIAGRAM.md     one simple Mermaid diagram
  screenshots/   only the 1–3 images README.md actually shows (optional)
```

Delete everything else in the chapter folders: `IMPLEMENTATION.md`,
`ARCHITECTURE.md`, `TESTING.md`, `PR_REVIEW.md`, `REBUILD_PROMPT.md`,
`architecture/`, and any screenshots the new README doesn't use. Git history
and the `feat/chapter-XX-*` branches keep the old versions.

**One exception:** `docs/chapters/chapter-15/ARCHITECTURE.md` is the
whole-system overview that the root `README.md` links to. Move it to
`docs/ARCHITECTURE.md` (don't delete it) and fix every link to it.

## PROMPT.md: how to write it

The voice is me, the teacher, talking to my agent: first person, plain words,
like a message to a teammate. Shape:

1. **Where we are** (2–3 sentences): what Binary is, and what exists after
   the previous chapter. The prompt must make sense to someone who has never
   seen the repo.
2. **What I want and why** (a short paragraph or two): the feature in
   user terms first, then the approach. Name the main tools (Drizzle,
   pgvector, E2B, Playwright, Trigger.dev, MCP, Vercel AI SDK, …).
3. **Things I care about** (3–5 bullets): the decisions that really matter,
   such as security rules, what must ask for approval, and keeping it
   beginner-friendly.
4. **One line asking the agent** to look around the code first, share a plan
   and ask questions before building.
5. **Done when** (a checklist of 3–6 items): mostly things a person can check
   by using the app, plus "lint, typecheck and tests pass".

Rules:

- Keep it to about 20–40 lines.
- **Include** the few names later chapters depend on, such as key concepts,
  main tables or entities, and the risk levels `read` / `write` / `computer`.
- **Leave out** versions, file paths, function or class names, column lists,
  enum value lists, test-case lists, and step-by-step file instructions. If
  something would truly block a student (a known version problem, a required
  env var), say it in one plain sentence.
- Describe what was **actually built**, not the original plan. Use the
  existing chapter docs, the code, and the footnotes in `docs/CHAPTERS.md` as
  the source of truth. For example, chapter 4 became "characters", chapter 5
  has no LISTEN/NOTIFY, and chapter 15 is "ready to share" with no deployment.
- Running the 15 prompts in order should leave a student with roughly the
  Binary we have, without each prompt dictating how.

### Example of the style I want (chapter 2)

```markdown
# Chapter 2: The database layer

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. Chapter 1
set up the monorepo (a Hono API, a Next.js web app and an Expo mobile app)
with email/password sign-in through Better Auth, and Postgres running in
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
```

## README.md: how to write it

Aim for about 40–80 lines, written for a student:

- **What this chapter adds**, in one or two plain sentences, and why it matters
- **What you'll learn**: 3–5 concepts (e.g. the Repository pattern, streaming,
  human-in-the-loop approvals)
- **Try it**: the few commands to run, and what you should see, with 1–3
  screenshots if the chapter has a UI
- **Good to know**: only real gotchas (e.g. "accounts from chapter 1 aren't
  carried over", "without `E2B_API_KEY` there's no sandbox")
- **Next**: one line on the next chapter
- Links to [PROMPT.md](PROMPT.md) and [DIAGRAM.md](DIAGRAM.md)

## DIAGRAM.md

One Mermaid diagram showing what this chapter adds and how it connects to
what already exists, with about 15 nodes at most. Put one sentence above it
saying what to look at. Choose the type that fits: a flowchart for most
chapters, an ER diagram for the database chapter, a sequence diagram for
approvals.

## Update the rest of the repo

- `docs/CHAPTERS.md`: rewrite the "Every chapter ships with" section to
  describe the new README / PROMPT / DIAGRAM set, fix links (including the
  moved architecture overview), and keep the footnotes but trim them to what
  a student needs.
- Root `README.md`: the chapter table links must still work. Point the
  architecture link to `docs/ARCHITECTURE.md`.
- Afterwards, no link in the repo may point to a deleted file. Check with
  grep.

## How to work

1. Create a branch `docs/light-chapters` from `main`.
2. Before writing a chapter, read its current docs, the footnotes in
   `docs/CHAPTERS.md`, and the code it touched, so the new version is accurate.
3. **Do chapters 1 and 2 first and show them to me.** Wait for my feedback on
   tone and length before doing chapters 3–15 in the same style.
4. Keep one voice across all 15 chapters.
5. When everything is done, run `pnpm format:check`, grep for broken links,
   and give me a short summary: files deleted, files written, and the line
   count of each new PROMPT.md.
6. Don't commit, push or open a PR until I say so.
