# Rebuild prompt: Chapter 15, Ready to share

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 14.

---

You are a senior engineer and technical writer. Make Binary ready to share
with students: a README that shows every feature, real screenshots, and a
setup guide that works on a fresh clone. No deployment. Work on
`feat/chapter-15-share`.

## 1. Inventory

List every `.env` variable (`apps/api/src/env.ts`, `.env.example`,
`apps/mobile/.env.example`), every root script, every external service
(OpenAI, Anthropic, Google, E2B, Trigger.dev, MCP servers, Chromium, the
Runner, Claude Code, Codex, Expo Go) and every page.

## 2. Showcase account and screenshots

- Create a showcase user. Give it provider keys without exposing them
  (for example, copy encrypted rows in the local database), and remove
  them afterwards.
- Six characters with different looks, one story. Real chats: a browser
  page, a sandbox chart (approved), an MCP app (DeepWiki needs no account),
  knowledge with memory, a room, a routine run on Trigger.dev, one approval
  left waiting, a playground run.
- Screenshot every page and feature on the **production** web build
  (1440×900 at 2×), and the mobile app (Expo web, 390×844). Resize to 1440
  wide (`sips -Z 1440`). Save in `docs/screenshots/`.

## 3. `docs/SETUP.md`

What you need (with a check each); a quick start; step by step (clone,
`.env` with `openssl rand -base64 32`, `pnpm setup` and what it does,
`pnpm dev`, first key and character); every `.env` line in a table; AI
keys and what each unlocks; each optional feature; a "which feature needs
what" table; troubleshooting; how to start over. Check every UI label and
error message you quote against the code.

## 4. `README.md`

What Binary is in two sentences, the home screenshot, a link to the guide.
Every feature with screenshots in tables. Quick start, a Mermaid system
diagram, the stack, the project structure, the commands, the 15 chapters,
code style.

## 5. Verify, and fix what breaks

- Follow the guide on a fresh clone: install, `.env`, migrate, seed,
  Chromium, `pnpm dev`, sign in, every page, `pnpm test`, lint,
  type-check.
- Write a link checker for relative links, images and anchors; fix all.
- Expected fixes: Playwright external in `trigger.config.ts`; tests read
  `DATABASE_URL` from `.env` (only that value, with `util.parseEnv`);
  `ignoredBuiltDependencies: ['@depot/cli']`.

## 6. Docs

This chapter's set, with `ARCHITECTURE.md` describing the whole system
(apps, API layers, main flows, patterns, 26 tables, security), and its
three diagrams: the whole system, one message end to end, which key turns
on what. Update `docs/CHAPTERS.md` and `docs/DESIGN_SYSTEM.md`.

## Acceptance criteria

- Every feature is in the README with a real screenshot.
- The guide works on a fresh clone, unchanged.
- 0 broken links; 354 tests, lint, format, type-check and the build pass.
