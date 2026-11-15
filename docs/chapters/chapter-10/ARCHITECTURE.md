# Chapter 10: Architecture

Diagrams: [components](architecture/system-overview.md),
[a click end to end](architecture/request-flow.md),
[the guard and browser states](architecture/integration-flow.md).

## Computers, generalized

Chapter 9 had one computer and sandbox-only endpoints. Chapter 10 adds a
second, so the shared parts moved up:

```text
ComputerSessions (abstract)        listRunning · stop · stopForThread
   │ isRunning(providerId), kill(providerId)  ← each kind fills these in
   ├── SandboxSessions             E2B (Chapter 9)
   └── BrowserSessions             Playwright Chromium (this chapter)
```

This is the Template Method pattern. Both kinds keep their rows in
`computer_sessions` (`kind` = `sandbox` or `browser`). The routes and the
chat-delete path loop over `deps.computers` and don't care which kind they
have.

| Before (Chapter 9)                                              | Now                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /api/sandboxes` → `{available, sandboxes}`                 | `GET /api/computers` → `{available: {sandbox, browser}, computers}`             |
| `DELETE /api/sandboxes/:id`                                     | `DELETE /api/computers/:id`                                                     |
| `GET /api/apps` → `sandbox: {available, tools}`                 | `computers: [{kind, available, tools}]`                                         |
| `SandboxView`                                                   | `ComputerView` (adds `kind`)                                                    |
| `new ToolboxFactory(servers, vault, connect, sandboxes)`        | `new ToolboxFactory(servers, vault, {connect, sandboxes, browsers})`            |
| `createDependencies(model, connect, makeJobs, sandboxProvider)` | `createDependencies(model, {connect, makeJobs, sandboxProvider, browserGuard})` |

## The browser

- **`BrowserSessions`** (in the API process):
  - Holds one Chromium, launched on first use.
  - Each chat gets its own `BrowserContext`, so chats never share cookies
    or tabs.
  - `open: Map<providerId, {chat, sessionId, timer}>`; the `computer_sessions`
    row holds that random `providerId`.
  - `starting` memoizes a chat's opening, so two tools called at once share
    one browser.
  - Limits: 10 idle minutes (an unref'd timer), and at most 5 open.
  - `closeAll()` runs on SIGINT and SIGTERM, and in tests.
  - After a restart the map is empty. `isRunning` then says no, and the row
    is closed the next time anyone lists or uses it.
- **`ChatBrowser`** is one chat:
  - `open(url)`, `read()`, `click(ref)` and `type(ref, text, submit)` each
    return a `BrowserPageOutput {url, title, text, elements, screenshot?, blocked?}`.
  - Settings: a 1280×800 viewport, downloads off, alerts and confirms
    dismissed, and links that open a new tab followed.

### Refs

`MARK_ELEMENTS` is a script run in the page:

- It finds visible, enabled links, buttons, fields, selects and ARIA
  buttons, links, checkboxes and tabs.
- It tags each one `data-binary-ref="N"` and returns
  `{ref, kind, text, href?}` (at most 80).
- The result is checked with Zod, because it comes from a web page.

`click(ref)` and `type(ref)` find `[data-binary-ref="N"]`. If nothing has
that ref now, they throw "Nothing on the page has ref N now. Read the page
again (browser_read) for fresh refs." at once.

Text is the body's `innerText`, cut to 6,000 characters. Screenshots are
JPEGs at quality 55, about 50–150 KB.

### The guard

`context.route('**/*')` sees every request from every page in the context.

- `data:` and `blob:` URLs pass.
- Any other URL goes through the injected `UrlGuard`. In production that is
  `publicUrlsOnly` from Chapter 6: http(s) only, and every address the host
  resolves to must be public.
- Verdicts are cached per origin.
- A refused request is aborted. If it was the page's own navigation, the
  reason becomes:
  - an error for `browser_open`
  - `blocked` on the result for `click` and `type`, with the page not
    changing

## Tools and permissions

`ToolboxFactory.forUser(userId, {threadId, computer})` adds
`browserTools(browsers.forThread(userId, threadId))` when the agent's
computer is `browser` and Chromium is installed.

| Tool            | Risk     | Opens a browser?                      |
| --------------- | -------- | ------------------------------------- |
| `browser_open`  | read     | yes                                   |
| `browser_read`  | read     | no ("This chat has no browser open.") |
| `browser_click` | computer | no                                    |
| `browser_type`  | computer | no                                    |

All four use `forModel: withoutImages`, which moved to `tools/model-view.ts`
and now also swaps `screenshot` for a note. An approved click runs through
Chapter 8's `decideApproval` with the same chat scope, so it lands in the
same browser.

## API contracts

All routes need a session (401 otherwise).

| Method + path               | Success                                                          | Errors                                       |
| --------------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| `GET /api/computers`        | `200 {available: {sandbox, browser}, computers: ComputerView[]}` |                                              |
| `DELETE /api/computers/:id` | `204`, stopped or closed                                         | `404` unknown, not yours, or already stopped |
| `GET /api/apps`             | `computers: [{kind, available, tools}]`                          |                                              |
| `POST/PUT /api/agents`      | `defaultComputer: 'sandbox' \| 'browser' \| null`                | `400` anything else, including `runner`      |

## Setup and data

- **Dependency:** `playwright@1.64.1` in `apps/api`.
- **`pnpm browsers:install`** runs `playwright install chromium`, and is
  now part of `pnpm setup`.
- **CI** installs it with `--with-deps`.
- **Browsers are on when Chromium is installed**
  (`chromiumInstalled()` → `existsSync(chromium.executablePath())`).
- **No migration and no new env setting.**
- **Turbo:** `typecheck` now depends on `^typecheck`, so a change in
  `shared` invalidates the web app's cached type-check.
