# Chapter 15: Testing

This chapter changes few lines of code, so its tests are about the
experience of someone new: does the guide work, do the links work, are
the screenshots real.

## Following the guide on a fresh clone

A new clone of the repo, set up by the guide's commands, with nothing from
the working copy:

| Step                                                                                                 | Result                                                                |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `git clone`, `corepack enable`, `pnpm install`                                                       | Done in about 8 s from a warm store                                   |
| The `@depot/cli` warning                                                                             | Shown at first; gone after `ignoredBuiltDependencies` (clean install) |
| `cp .env.example .env`, two `openssl rand -base64 32`                                                | The API starts                                                        |
| `pnpm db:migrate`, `pnpm db:seed`, `pnpm browsers:install`                                           | "Database migrated.", "Seeded 4 agent templates.", the demo user      |
| `pnpm dev`                                                                                           | `/health` is `{"status":"ok"}`; the web app answers on 3000           |
| Sign in as `demo@binary.dev`                                                                         | ✓                                                                     |
| Every page: home, Discover, rooms, routines, knowledge, apps, computers, playground, API keys, Today | 200, no server errors                                                 |
| The playground without a key                                                                         | "No key yet."                                                         |
| Hiring without a key                                                                                 | "Add your Anthropic API key in Settings first." (the guide's order)   |
| `pnpm test`, with no `DATABASE_URL` in the shell                                                     | First: the db tests went to the default port. After the fix: 354 pass |
| `pnpm typecheck`, `pnpm lint`                                                                        | Pass                                                                  |

`docker compose up -d` was the one step not run there, because this
machine already has a container with that name; the clone used a fresh
database instead. Everything after it ran as written.

## Links

A small script checks every relative link, image and `#anchor` in the
repo's Markdown (143 files, 261 links). It found:

- the README's two links to this chapter (before it existed)
- Chapter 1's link to a README section that had moved

All fixed; 0 broken.

## The screenshots, with real models

On the showcase account, with your keys copied as encrypted rows (never
decrypted or shown) and removed afterwards:

| Feature           | What really happened                                                                   |
| ----------------- | -------------------------------------------------------------------------------------- |
| Browser           | Nova (Claude Sonnet 5.5) opened the pgvector repo and summarized it, with a screenshot |
| Sandbox           | Bolt (GPT-5.5) asked first, then plotted the chart on E2B and gave the growth          |
| MCP               | Mimi asked DeepWiki about `vercel/ai`                                                  |
| Knowledge, memory | Moss answered from the handbook, short and in bullets as remembered                    |
| Room              | The lead routed to Ember, Nova and Bolt, who split the launch work                     |
| Routine           | "Morning plan" ran on Trigger.dev (after the `trigger:dev` fix)                        |
| Approval          | Bolt's benchmark left waiting, for Today                                               |
| Playground        | GPT-5.6 and Claude Sonnet 5.5 side by side                                             |

**Found:** with an MCP tool that isn't marked read-only and "Auto-approve
reads", Claude asked for the same DeepWiki call again after each approval.
For the screenshot, Mimi uses "Accept edits". See the review's open items.

## Results

| Check                | Result                                          |
| -------------------- | ----------------------------------------------- |
| All tests            | 354 pass (shared 40, db 60, api 244, runner 10) |
| ESLint, Prettier     | Clean                                           |
| Type-check           | Passed                                          |
| Web production build | Passed                                          |
| `pnpm trigger:dev`   | Builds ("Local worker ready"); a run succeeded  |
