# Chapter 15: Implementation

## Plan

1. **Inventory:** every `.env` variable, script, external service and
   page.
2. **Showcase account:** Ada Lovelace, six characters, one story, real
   models; DeepWiki over MCP; a handbook in Knowledge; two memories; a
   room; a routine run on Trigger.dev; one approval left waiting.
3. **Screenshots:** every page on the production web build, every
   feature's chat, and the mobile app; resized for the repo.
4. **`docs/SETUP.md`:** from an empty machine to every optional feature,
   with checks and troubleshooting.
5. **`README.md`:** rewritten around the features and screenshots.
6. **Verify:** follow the guide on a fresh clone; check every link.
7. **Docs:** this chapter, with the whole-system architecture.

Deployment was left out on purpose: Binary is meant to run on your own
computer.

## Acceptance criteria

- [x] The README shows every feature with a real screenshot, and links to
      the setup guide in its first screen.
- [x] The setup guide explains every `.env` line, where to get every key,
      every optional feature, and common errors.
- [x] A fresh clone, following the guide: install, migrate, seed, run,
      sign in, every page loads, and all 354 tests, lint and type-check
      pass.
- [x] Every relative link and anchor in the repo's Markdown resolves.
- [x] Anything that broke on the way is fixed, not documented around.

## File-by-file

| File                                                        | Change                                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `README.md`                                                 | Rewritten: features with screenshots, quick start, diagram, chapters        |
| `docs/SETUP.md`                                             | New: the setup guide                                                        |
| `docs/screenshots/*`                                        | New: 27 screenshots                                                         |
| `apps/api/trigger.config.ts`                                | Playwright, playwright-core and chromium-bidi are external                  |
| `apps/api/vitest.config.ts`, `packages/db/vitest.config.ts` | `DATABASE_URL` from the environment, else the root `.env`, else the default |
| `pnpm-workspace.yaml`                                       | `ignoredBuiltDependencies: ['@depot/cli']`                                  |
| `docs/chapters/chapter-01/README.md`                        | "Run it" links to the setup guide                                           |
| `docs/CHAPTERS.md`, `docs/DESIGN_SYSTEM.md`                 | Chapter 15; how screenshots are taken                                       |
| `docs/chapters/chapter-15/*`                                | This chapter                                                                |

## Decisions

| Decision                                   | Why                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| A showcase account instead of a real one   | No personal name or email in public screenshots, and a varied crew that tells one story.          |
| Real models, not a fake one                | Students should see what the app really does; fake answers would oversell it.                     |
| The production build for screenshots       | No development overlays in the pictures.                                                          |
| Screenshots resized to 1440 wide           | Sharp on GitHub at about 5 MB in total, instead of 20+ MB at retina size.                         |
| The guide verified on a fresh clone        | The only honest test of a setup guide is following it.                                            |
| Tests read only `DATABASE_URL` from `.env` | The same database as `pnpm db:migrate`, without letting a real E2B or AI key reach a test.        |
| Mark Playwright external for Trigger.dev   | The worker runs from `node_modules` locally; bundling Playwright can't work.                      |
| No `TRIGGER_PROJECT_REF` variable          | The Trigger.dev CLI reads its config before loading `.env`, so a variable there wouldn't be seen. |
| DeepWiki as the example MCP app            | It needs no account, so every student can try MCP in a minute.                                    |
