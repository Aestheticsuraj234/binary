# Chapter 15: Ready to share

Anyone can now clone Binary, run it in minutes and see what it does before
they start. This chapter adds no feature. It adds the things a newcomer
needs: a README with every feature and real screenshots, a setup guide
that was tested on a fresh clone, and the whole system on one page.

![Binary's home page, from the README](../../screenshots/home.png)

## What you'll learn

- How to write a **README for a first visit**: what it is, what it looks
  like, how to start
- How to write a **setup guide** that covers every `.env` line, every key
  and the errors people really hit
- Why you **follow your own guide on a fresh clone**: it's the only honest
  test, and it finds real bugs
- How to take **honest screenshots** with a showcase account and real
  models, without leaking names or keys
- How to **check every link** in a repo's docs

## Try it

Read it the way a new student would:

1. The [README](../../../README.md): every feature, with screenshots.
2. The [setup guide](../../SETUP.md): from an empty machine to every
   optional feature, plus troubleshooting.
3. The [architecture overview](../../ARCHITECTURE.md): the apps, the API's
   layers and the main flows on one page.

Then clone the repo into a new folder and follow the guide, step by step.

## Good to know

- **There's no deployment.** Binary is built to run on your own computer.
  Deployment, usage tracking and browser end-to-end tests are left for
  later.
- Following the guide on a fresh clone found three real problems, all
  fixed in code: `pnpm trigger:dev` couldn't build since chapter 10, tests
  ignored `DATABASE_URL` in `.env`, and `pnpm install` showed a needless
  warning.
- The screenshots come from a showcase account, Ada Lovelace, with real
  answers from Claude and GPT models.

## Build it yourself

Paste [PROMPT.md](PROMPT.md) into your coding agent in your chapter 14 repo.
See [DIAGRAM.md](DIAGRAM.md) for how the new docs fit together.

## Next

This is the last chapter. You've built the whole of Binary: go back to the
[README](../../../README.md) to see everything it does.
