# Setup guide

Everything you need to run Binary on your own computer, from an empty
machine to every optional feature. Each step says what it does, how to
check it worked, and what to do if it didn't.

- [What you need](#what-you-need)
- [Quick start (10 minutes)](#quick-start)
- [Step by step](#step-by-step)
- [Your `.env` file, line by line](#your-env-file-line-by-line)
- [AI provider keys](#ai-provider-keys)
- [Optional features](#optional-features)
- [Which feature needs what](#which-feature-needs-what)
- [Troubleshooting](#troubleshooting)
- [Start over](#start-over)

## What you need

| Tool                                                              | Version | Why                                      | Check                          |
| ----------------------------------------------------------------- | ------- | ---------------------------------------- | ------------------------------ |
| [Node.js](https://nodejs.org)                                     | 22+     | Runs the API, the web app and the tools  | `node -v`                      |
| [pnpm](https://pnpm.io)                                           | 10      | Installs packages for the whole monorepo | `pnpm -v`                      |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | any     | Runs Postgres (with pgvector) for you    | `docker -v`                    |
| [Git](https://git-scm.com)                                        | any     | Gets the code                            | `git --version`                |
| An AI key: OpenAI, Anthropic or Google                            |         | Characters think with your own key       | see [below](#ai-provider-keys) |

pnpm comes with Node: run `corepack enable` once, and the right pnpm
version is used automatically.

Optional, for some features: an [E2B](https://e2b.dev) key (sandboxes and
cloud desktops), a [Trigger.dev](https://trigger.dev) project (scheduled
routines), [Expo Go](https://expo.dev/go) on your phone (the mobile app),
and Claude Code or Codex (thinking on your own computer).

## Quick start

```bash
git clone https://github.com/Aestheticsuraj234/binary.git
cd binary
corepack enable
pnpm install
cp .env.example .env
# Replace both "change-me" values in .env with the output of:
openssl rand -base64 32
pnpm setup      # Postgres in Docker, tables, starter data, Chromium
pnpm dev        # API on :4000, web app on :3000
```

Open http://localhost:3000 and sign in with the demo account,
`demo@binary.dev` / `binary-demo-password`. Then go to **API keys**, paste
one key, and hire a character on **Discover**.

## Step by step

### 1. Get the code and install

```bash
git clone https://github.com/Aestheticsuraj234/binary.git
cd binary
corepack enable
pnpm install
```

`pnpm install` installs every app and package in one go (a few minutes the
first time). It ends with a summary and no `ERR_` lines.

### 2. Create `.env`

```bash
cp .env.example .env
```

One `.env` in the repo root is read by the API, the web app and the
Trigger.dev worker. Two values must be replaced before anything starts:

```bash
openssl rand -base64 32   # paste as BETTER_AUTH_SECRET
openssl rand -base64 32   # paste as ENCRYPTION_KEY (a different value)
```

On Windows without OpenSSL, use
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

Every line is explained in [Your `.env` file](#your-env-file-line-by-line).

### 3. Set up the database

Start Docker Desktop first, then:

```bash
pnpm setup
```

It runs four things, in order:

1. `docker compose up -d`: Postgres 16 with pgvector, on port 5432, in a
   container called `binary-postgres`. Its data lives in a Docker volume,
   so it survives restarts.
2. `pnpm db:migrate`: creates every table.
3. `pnpm db:seed`: four character templates and the demo account. Safe to
   run again.
4. `pnpm browsers:install`: downloads Chromium for characters' browsers
   (about 150 MB).

You'll see `Seeded 4 agent templates.` and the demo account line.

### 4. Run it

```bash
pnpm dev
```

This starts the API (http://localhost:4000, check http://localhost:4000/health
says `{"status":"ok"}`) and the web app (http://localhost:3000). Sign in
with the demo account or create your own.

### 5. Add a key and hire a character

1. **API keys** → paste an OpenAI, Anthropic or Google key → **Save**. The
   key is encrypted (AES-256-GCM) with your `ENCRYPTION_KEY`; only its last
   four characters are ever shown.
2. **Playground**: ask anything to check the key works.
3. **Discover** → pick a template or start blank → choose a character, a
   model and a permission level → **Hire**.
4. Chat with it. That's the core of Binary working.

## Your `.env` file, line by line

| Variable              | Needed?  | What it is                                                     | Where to get it                                                           |
| --------------------- | -------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`        | Yes      | Where Postgres is                                              | Keep the default for `pnpm setup`'s Docker database                       |
| `BETTER_AUTH_SECRET`  | Yes      | Signs login sessions (32+ characters)                          | `openssl rand -base64 32`                                                 |
| `ENCRYPTION_KEY`      | Yes      | Encrypts the AI keys users save (32 bytes, base64)             | `openssl rand -base64 32`. Keep it: losing it makes saved keys unreadable |
| `BETTER_AUTH_URL`     | Yes      | Where the API runs                                             | Default `http://localhost:4000`                                           |
| `WEB_URL`             | Yes      | Where the web app runs; the only browser origin the API allows | Default `http://localhost:3000`                                           |
| `NEXT_PUBLIC_API_URL` | Yes      | How the web app reaches the API                                | Default `http://localhost:4000`                                           |
| `TRIGGER_SECRET_KEY`  | Optional | Runs routines on Trigger.dev, with schedules                   | [Routines on Trigger.dev](#routines-on-triggerdev)                        |
| `E2B_API_KEY`         | Optional | Cloud sandboxes and cloud desktops                             | [Cloud sandbox and desktop](#cloud-sandbox-and-cloud-desktop-e2b)         |
| `PORT`                | Optional | The API's port                                                 | Default `4000`                                                            |

The mobile app has its own small file, `apps/mobile/.env`
(see [Mobile app and voice](#mobile-app-and-voice)).

**AI keys don't go in `.env`.** Each user saves their own in the app, so a
shared server never holds one global key.

## AI provider keys

| Provider  | Get a key                                                            | Gives you                                                                       |
| --------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| OpenAI    | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | GPT models; **memory and knowledge** (embeddings); **voice input** on the phone |
| Anthropic | [console.anthropic.com](https://console.anthropic.com/settings/keys) | Claude models                                                                   |
| Google    | [aistudio.google.com/apikey](https://aistudio.google.com/apikey)     | Gemini models; memory and knowledge (embeddings)                                |

One key is enough to chat. For the full experience, add **OpenAI**: it's
the only one that does both embeddings and speech-to-text. All providers
charge per use, usually cents for a session of testing.

## Optional features

Each one is off until you set it up, and the app says so where it
matters.

### Tools and MCP apps

Built-in tools (time, web pages, memory, knowledge) work at once. To
connect an app, open **Apps & tools** → **Connect an app** and paste an
[MCP](https://modelcontextprotocol.io) server URL:

- **Without an account:** `https://mcp.deepwiki.com/mcp` (DeepWiki: ask
  questions about any public GitHub repo).
- **Gmail, GitHub, Slack and more:** create a server in
  [Composio](https://composio.dev), paste its URL, and put its token in
  **Authorization header** (it's stored encrypted), not in the URL.

Apps that don't mark their tools as read-only count as "write", so a
character asks before using them, unless its permission level is
**Accept edits**.

### Routines on Trigger.dev

Without Trigger.dev, **Run now** and webhooks work inside the API, but
schedules never fire. To get schedules and durable runs:

1. Create a project at [cloud.trigger.dev](https://cloud.trigger.dev).
2. Put its project ref (Project settings, `proj_…`) in
   `apps/api/trigger.config.ts`.
3. Put its **DEV** secret key (API keys, `tr_dev_…`) in `.env` as
   `TRIGGER_SECRET_KEY`.
4. Log in once: `pnpm --filter @binary/api exec trigger login`.
5. Run the worker next to `pnpm dev`, in a second terminal:
   `pnpm trigger:dev`. Wait for `Local worker ready`.

With `TRIGGER_SECRET_KEY` set, **every** run goes through Trigger.dev, so
keep `pnpm trigger:dev` running; otherwise runs stay "Queued".

### Cloud sandbox and cloud desktop (E2B)

1. Get a key at [e2b.dev/dashboard](https://e2b.dev/dashboard) (the free
   tier is enough to try).
2. Add `E2B_API_KEY=e2b_…` to `.env` and restart `pnpm dev`.
3. Edit a character → **Computer** → **Cloud sandbox** (runs Python and
   shell, makes charts) or **Cloud desktop** (a Linux desktop it clicks and
   types on, which you can watch live).

### Browser

Characters with **Computer → Browser** open public web pages in Chromium,
click and type, with a screenshot of each step. `pnpm setup` already
downloaded Chromium; on an older checkout run `pnpm browsers:install`.
Private and local addresses are blocked on purpose.

### Your own computer (Runner)

Let characters work in folders you choose on your computer, or think with
Claude Code or Codex:

1. **Your computers** → **Add a computer** → give it a name.
2. In a terminal in this repo, run the two commands it shows:

   ```bash
   pnpm runner pair ABCD-1234
   pnpm runner start --folder ~/projects/my-app
   ```

3. Edit a character → **Computer → Your computer**, or **Thinks with →
   Claude Code / Codex (your computer)**.

For Claude Code or Codex, install the CLI and sign in to it on that
computer first ([Claude Code](https://docs.anthropic.com/en/docs/claude-code),
[Codex](https://github.com/openai/codex)). Everything outside the shared
folders is refused, and risky steps still ask you first. `Ctrl+C` stops
the Runner; `pnpm runner forget` unpairs it.

### Memory and knowledge

Needs an **OpenAI** (or Google) key for embeddings. Then characters
remember you across chats (see a character's **Memory** page), and
**Knowledge** lets you add text, files or public web pages they search and
cite.

### Mobile app and voice

1. Install [Expo Go](https://expo.dev/go) on your phone. The phone and the
   computer must be on the same Wi-Fi.
2. Find your computer's IP: `ipconfig getifaddr en0` (macOS) or
   `ipconfig` (Windows, "IPv4 Address").
3. Create the mobile env file:

   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   # set EXPO_PUBLIC_API_URL=http://<your IP>:4000
   ```

4. With `pnpm dev` running: `pnpm mobile`, then scan the QR code with your
   camera (iPhone) or Expo Go (Android).
5. Sign in. The mic in a chat needs an **OpenAI** key.

## Which feature needs what

| Feature                             | Needs                                                   |
| ----------------------------------- | ------------------------------------------------------- |
| Characters, chat, playground, rooms | One AI key                                              |
| Approvals and Today                 | Nothing extra                                           |
| Built-in tools, MCP apps            | Nothing extra (an MCP URL for apps)                     |
| Routines: Run now, webhooks         | Nothing extra                                           |
| Routines: schedules                 | Trigger.dev + `pnpm trigger:dev`                        |
| Cloud sandbox, cloud desktop        | `E2B_API_KEY`                                           |
| Browser                             | Chromium (`pnpm setup` installs it)                     |
| Your computer, Claude Code, Codex   | `pnpm runner …` on that computer (+ the CLI, signed in) |
| Memory and knowledge                | An OpenAI or Google key                                 |
| Mobile app                          | Expo Go, same Wi-Fi, `apps/mobile/.env`                 |
| Voice input                         | An OpenAI key                                           |

## Troubleshooting

| Problem                                                                                 | Fix                                                                                                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET must be at least 32 characters` / `ENCRYPTION_KEY must be 32 bytes` | Replace the `change-me` values in `.env` with `openssl rand -base64 32`.                                                |
| `Cannot connect to the Docker daemon`                                                   | Start Docker Desktop, then `pnpm setup` again.                                                                          |
| Port 5432 already in use                                                                | Another Postgres is running. Stop it, or change the port in `docker-compose.yml` and in `DATABASE_URL`.                 |
| `role "binary" does not exist`                                                          | `DATABASE_URL` points at a different Postgres. Use the Docker one from `pnpm setup` (port 5432).                        |
| Port 3000 or 4000 already in use                                                        | Another dev server is running. Stop it and run `pnpm dev` again.                                                        |
| Web app: `Set NEXT_PUBLIC_API_URL`                                                      | `.env` must be in the repo root, with `NEXT_PUBLIC_API_URL=http://localhost:4000`.                                      |
| Sign-in fails with "Invalid origin"                                                     | Open the app at exactly `WEB_URL` (http://localhost:3000, not 127.0.0.1).                                               |
| The playground or a chat shows a provider error                                         | The key is wrong or out of credit, or the model was renamed. Pick another model.                                        |
| "Add your … API key in Settings first"                                                  | The character's provider has no key. Add it on **API keys**.                                                            |
| Memory or Knowledge says it's off                                                       | Add an OpenAI or Google key.                                                                                            |
| "Cloud sandbox (not set up)"                                                            | Add `E2B_API_KEY` to `.env` and restart `pnpm dev`.                                                                     |
| Browser steps fail with "Executable doesn't exist"                                      | `pnpm browsers:install`.                                                                                                |
| Routine runs stay "Queued"                                                              | `TRIGGER_SECRET_KEY` is set: run `pnpm trigger:dev` and wait for `Local worker ready`.                                  |
| `pnpm trigger:dev`: "You must login first"                                              | `pnpm --filter @binary/api exec trigger login`.                                                                         |
| Your computer shows "Offline"                                                           | Run `pnpm runner start --folder <path>` on that computer.                                                               |
| The phone can't sign in or load                                                         | `apps/mobile/.env` must use your computer's IP, not `localhost`; same Wi-Fi; `pnpm dev` running; restart `pnpm mobile`. |
| The mic says "Voice needs an OpenAI key"                                                | Add an OpenAI key on **API keys** (web).                                                                                |
| Saved keys stopped working after changing `.env`                                        | `ENCRYPTION_KEY` changed. Put the old one back, or remove and re-add the keys.                                          |

## Start over

```bash
docker compose down -v   # deletes the database and everything in it
pnpm setup               # fresh tables, templates and demo account
```
