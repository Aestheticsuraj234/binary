# Chapter 3: The AI engine and key vault

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. So far we
have a monorepo (a Hono API, a Next.js web app and an Expo mobile app) with
email and password sign-in, and a Drizzle database layer with the schema for
the whole app.

Now I want Binary to talk to real AI models. Each user brings their own
OpenAI, Anthropic or Google key. Store those keys **encrypted** (AES-256-GCM,
with one master key from the environment), and add an **API keys** page to
manage them. Behind that, build a small **engine** layer on the **Vercel AI
SDK**: one engine interface, so later chapters can plug in other engines, and
a factory that hands back a ready engine for a user and a model. To try it,
add a **Playground** that sends one prompt to every connected provider, side
by side.

Things I care about:

- A plain key never leaves the server. The page only shows its last 4 characters.
- The API refuses to start without a valid master key.
- Tests use a fake model, never real keys.
- Signed-in pages share one app shell that later chapters build on.

Before writing code, look around the repo, show me your plan, and ask me
anything that's unclear.

Done when:

- [ ] I can add, replace and remove a key for each provider, and only its last 4 characters show
- [ ] The Playground answers one prompt with every provider I have a key for, side by side
- [ ] A provider without a key says so and links to the API keys page
- [ ] The database holds only encrypted keys
- [ ] Lint, typecheck and tests pass
