# Chapter 15: Ready to share

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. It's all
there now: characters with tools and apps, approvals, routines, a sandbox, a
browser and my own computer, memory and knowledge, rooms, and a mobile app
with voice. But someone new to the repo wouldn't know what it does or how to
run it.

Now I want Binary ready to share with my students. Rewrite the root
**README** so it shows every feature with **real screenshots**. Write a
**setup guide** that takes someone from an empty machine to every optional
feature: what to install, every `.env` value, where to get each key and what
it unlocks, and troubleshooting. Add a one-page **architecture overview** of
the whole system. Then prove it all works by following the guide on a fresh
clone. No deployment: Binary runs on your own computer.

Things I care about:

- Screenshots are real, from a showcase account with a made-up name. Never
  my name, email or keys.
- Every label and error message the guide mentions matches the app.
- If something breaks while following the guide, fix the code. Don't
  document around it.

Before writing anything, look around the repo, list every env variable,
script, service and page, show me your plan, and ask me anything that's
unclear.

Done when:

- [ ] The README shows every feature with a screenshot, and links to the setup guide near the top
- [ ] A fresh clone, following only the guide, installs, runs, signs in and loads every page
- [ ] Every link and image in the repo's Markdown works
- [ ] Lint, typecheck and tests pass on the fresh clone
