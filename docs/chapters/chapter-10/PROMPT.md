# Chapter 10: Browser automation with Playwright

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. Characters
already have tools with risk levels (`read`, `write`, `computer`), approvals
for risky calls, and an optional computer: a cloud sandbox from E2B, one per
chat.

Now I want a second kind of computer: a **browser**. Run **Playwright**
Chromium headless, one browser per chat, so a character can open pages, read
them, click and fill in forms the way a person would. I want to see a
screenshot of each step in the chat. Sandboxes and browsers should be listed
and stopped in one place.

Things I care about:

- Looking is free, acting asks. Opening and reading pages are `read` tools;
  clicking and typing are `computer` tools.
- The browser runs inside my network, so every request it makes must go to a
  public address. A page must never steer it to `localhost` or my router.
- The model shouldn't guess CSS selectors. Give it a simple list of what's
  on the page to act on.
- Browsers close when idle or when their chat is deleted.

Before writing code, look around the repo, show me your plan, and ask me
anything that's unclear.

Done when:

- [ ] `pnpm setup` downloads Chromium
- [ ] A character opens a public page without asking, and I see its screenshot
- [ ] After I approve, it clicks or types in the same browser
- [ ] It refuses to open private addresses
- [ ] Lint, typecheck and tests pass
