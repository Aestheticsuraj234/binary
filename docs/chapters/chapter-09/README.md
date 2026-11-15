# Chapter 9: Cloud sandboxes with E2B

**Goal:** characters can run real code. A character whose computer is a
**cloud sandbox** gets a private Linux machine from [E2B](https://e2b.dev)
for each chat. In it the character runs Python or JavaScript, runs shell
commands and works with files. Charts it draws appear right in the chat.

![Bolt drew a chart in its sandbox](screenshots/chat-chart.png)

## What you get

- **A computer per character** (hire and edit form: **Computer** → None or
  Cloud sandbox). The Coding Agent template starts with one.
- **Five sandbox tools:**

  | Tool          | What it does                                                                      | Risk     |
  | ------------- | --------------------------------------------------------------------------------- | -------- |
  | `run_code`    | Python or JavaScript; variables are kept between runs; charts come back as images | Computer |
  | `run_command` | A shell command (`pip install …`, `git …`)                                        | Computer |
  | `write_file`  | Create or replace a text file                                                     | Computer |
  | `read_file`   | Read a text file                                                                  | Read     |
  | `list_files`  | List a folder                                                                     | Read     |

- **You approve every run.** Computer tools ask first in every permission
  mode (and Plan only blocks them). A waiting call opens by itself, so you
  see the exact code or command before you click **Approve**.
- **One sandbox per chat, started only when needed.** Nothing starts until
  the first approved run. The next message finds the same sandbox again,
  with its files and variables. Reading and listing never start one.
- **Nothing runs unseen.**
  - A chat with a running sandbox shows **Sandbox on** with a Stop
    button.
  - **Apps & tools** lists every running sandbox, with Chat and Stop.
  - Deleting a chat stops its sandbox.
  - A sandbox stops by itself after 10 idle minutes. The next run starts
    a fresh one and says that the old files are gone.
- **Charts for you, a note for the model.** The PNG is shown in the chat.
  The model only reads "A chart. The user can see it.", which saves
  thousands of tokens per chart.

## Files in this chapter's docs

| File                                   | What's in it                                        |
| -------------------------------------- | --------------------------------------------------- |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Plan, acceptance criteria, file-by-file, decisions  |
| [ARCHITECTURE.md](ARCHITECTURE.md)     | Sandbox lifecycle, tools, API contracts             |
| [TESTING.md](TESTING.md)               | Tests and results                                   |
| [PR_REVIEW.md](PR_REVIEW.md)           | Review findings and fixes                           |
| [REBUILD_PROMPT.md](REBUILD_PROMPT.md) | Standalone prompt to rebuild this chapter           |
| [architecture/](architecture)          | Components, a run end to end, sandbox states        |
| [screenshots/](screenshots)            | Asking to run code, the chart, the Apps page, phone |

## Run it

1. Get an API key at [e2b.dev/dashboard](https://e2b.dev/dashboard)
   (API keys). The free tier is enough to try this.
2. Add it to `.env`:

   ```bash
   E2B_API_KEY=e2b_…
   ```

3. Restart `pnpm dev`. Then hire the **Coding Agent** (or set **Edit →
   Computer → Cloud sandbox**) and ask: _"Plot the squares of 1 to 10."_

Without the key, nothing changes: characters simply have no sandbox, and
the form and the Apps page say how to turn it on. No migration is needed.

## What comes next

Chapter 10 gives characters a headless **browser** with Playwright, the
second kind of computer.
