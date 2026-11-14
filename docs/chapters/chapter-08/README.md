# Chapter 8: Approvals, permissions and the Today inbox

**Goal:** characters can do real things, and you stay in charge. Each
character has a **permission level**. When a tool needs your OK, the
character asks, the request waits in **Today**, and approving runs the tool.
Then the character carries on in the same chat.

![Mimi asking to refund an order](screenshots/chat-approval.png)

## What you get

- **Permission levels** (per character, on the hire and edit form):

  | Level                  | Read tools | Write tools | Computer tools |
  | ---------------------- | ---------- | ----------- | -------------- |
  | Plan only              | never      | never       | never          |
  | Ask first              | ask        | ask         | ask            |
  | **Auto-approve reads** | run        | ask         | ask            |
  | Accept edits           | run        | run         | ask            |

  New characters start on **Auto-approve reads**.

- **Asking never blocks anything.** The tool returns "waiting for approval"
  at once. The character tells you what it asked for, and the request is
  saved in the database, so it survives restarts and works the same in
  chat and in routines.
- **Approve or reject in the chat**, on the tool row ("Wants to use shop
  refund order · Write · Needs your OK"), **or in Today**.
- **After your decision**:
  - Approving runs the tool with exactly the input the character gave, and
    saves the result.
  - Rejecting saves that you said no.
  - Either way, a short note appears in the chat ("You approved shop refund
    order."), and the character replies with what happened.
- **Today** (`/today`, first in the sidebar, with a count of waiting
  requests): everything waiting for you, oldest first, plus your routine
  runs from the last 24 hours.
- **Safety:** a request can only be decided once. Two clicks or two devices
  racing can't run the tool twice.

## Files in this chapter's docs

| File                                   | What's in it                                        |
| -------------------------------------- | --------------------------------------------------- |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Plan, acceptance criteria, file-by-file, decisions  |
| [ARCHITECTURE.md](ARCHITECTURE.md)     | Policy table, the approval lifecycle, API contracts |
| [TESTING.md](TESTING.md)               | Tests and results                                   |
| [PR_REVIEW.md](PR_REVIEW.md)           | Review findings and fixes                           |
| [REBUILD_PROMPT.md](REBUILD_PROMPT.md) | Standalone prompt to rebuild this chapter           |
| [architecture/](architecture)          | Components, approve end to end, policy and states   |
| [screenshots/](screenshots)            | Asking in chat, after approval, the Today inbox     |

## Run it

No new settings and no migration.

```bash
pnpm dev
```

Connect an app with a write tool (Chapter 6), ask a character to use it,
and approve it in the chat or in **Today**.

> **Characters hired before this chapter** keep the database default,
> **Ask first**, so they now ask even before reading. Switch them to
> Auto-approve reads under **Edit → Permissions**.

## What comes next

Chapter 9 adds cloud sandboxes with E2B: the first **computer** tools,
which ask first in every mode except Plan only (which blocks them).
