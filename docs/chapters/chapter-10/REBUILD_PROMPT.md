# Rebuild prompt: Chapter 10, Browser automation with Playwright

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 9 (E2B sandboxes, `computer_sessions`, `AgentTool.forModel`).

---

You are a senior full-stack engineer and teacher. Give Binary's characters
a **headless browser** (Playwright Chromium), one per chat:

- They open and read public pages on their own.
- They click and type after the user approves.
- The user sees a screenshot of every step.

Along the way, generalize Chapter 9's sandbox-only plumbing into
**computers**. No migration. Work on `feat/chapter-10-browser`.

## Code rules

Google TypeScript Style Guide (named exports; no `any`, casts or non-null
assertions; read unknown objects with `Reflect.get`; validate page data
with Zod), and keep it beginner-friendly.

## Setup

- `pnpm --filter @binary/api add playwright@1.64.1`.
- Root script `browsers:install` = `pnpm --filter @binary/api exec playwright install chromium`,
  appended to `setup`.
- CI: `playwright install --with-deps chromium` after `pnpm install`.
- `turbo.json`: `typecheck.dependsOn = ["^typecheck"]`.

## Shared

- Move `sandboxes.ts` to `computers.ts`:
  - `COMPUTER_KINDS`
  - `AGENT_COMPUTERS = ['sandbox','browser']`
  - `AGENT_COMPUTER_INFO.browser` ("A headless browser on this server, one
    per chat. Opens and reads public pages on its own; asks before it
    clicks or types.")
  - `TEMPLATE_COMPUTERS` adds `research-assistant: browser`
  - `ComputerView` = Chapter 9's `SandboxView` plus `kind`
- Keep the sandbox output types in `sandboxes.ts`.
- New `browsers.ts`:
  - `BrowserElement {ref, kind, text, href?}`
  - `BrowserPageOutput {url, title, text, elements, screenshot?, blocked?}`

## API

1. **`computers/computer-sessions.ts`:** abstract `ComputerSessions(sessions, kind)`.
   - Subclasses supply `isRunning(providerId)` and `kill(providerId)`.
   - `listRunning(userId)` closes dead rows and maps the rest to
     `ComputerView`.
   - `stop(userId, id)` refuses other kinds and non-running sessions.
   - `stopForThread`.
   - `SandboxSessions` extends it.
2. **`browsers/page-elements.ts`:**
   - `MARK_ELEMENTS`, a script string run in the page. It clears old
     `data-binary-ref` marks; finds visible, enabled
     `a[href], button, input:not([type=hidden]), textarea, select` and
     ARIA button, link, checkbox and tab elements; numbers them from 1;
     sets `data-binary-ref`; and returns `{ref, kind, text (≤80), href?}`
     (at most 80). It never returns password values.
   - `pageElementsSchema` (Zod).
3. **`browsers/chat-browser.ts`:**
   - `ChatBrowser.create(browser, guard)` makes a new context (1280×800,
     `acceptDownloads: false`).
   - On the context: `on('page')` switches to new tabs, `on('dialog')`
     dismisses dialogs, and `route('**/*')` filters requests.
   - The filter:
     - `data:` and `blob:` pass.
     - Anything else goes through `guard`, with the verdict cached per
       origin.
     - A refused request is aborted with `blockedbyclient`. If it was the
       main frame's navigation, record "<reason> The browser did not open
       it."
   - `open(url)`: goto (domcontentloaded, 20 s). On failure throw the
     blocked reason, or "Could not open …", with `cause`.
   - `read()`: a snapshot without a screenshot.
   - `click(ref)` and `type(ref, text, submit)`:
     - find `[data-binary-ref=N]`; if it's missing, throw "Nothing on the
       page has ref N now. Read the page again (browser_read) for fresh
       refs."
     - act (5 s timeout), settle (400 ms plus domcontentloaded), and take a
       snapshot with a screenshot
   - The snapshot: Zod-checked elements, body `innerText` (6,000
     characters), the title and URL, `blocked`, and a JPEG screenshot
     (quality 55) as base64.
4. **`browsers/browser-sessions.ts`:**
   - `chromiumInstalled()`.
   - `BrowserSessions extends ComputerSessions('browser')`, constructed with
     `(sessions, guard, launch = chromium.launch)`:
     - a lazy shared Chromium
     - `open: Map<providerId, {chat, sessionId, timer}>`
     - `starting`, memoized per chat
     - `MAX_OPEN = 5`
     - a 10-minute idle timer (unref'd) that closes the row and the
       context
     - `existing()`: a row without a map entry means the API restarted, so
       close the row
     - `closeAll()`
   - `forThread(userId, threadId)` returns `{start, existing}`.
5. **`tools/model-view.ts`:** `withoutImages` swaps `screenshot` and
   `results[].png` for notes. `sandbox-tools` uses it too.
6. **`tools/browser-tools.ts`:**
   - `browser_open {url (http/https)}`: read, starts the browser.
   - `browser_read {}`: read, existing browser only.
   - `browser_click {ref}`: computer.
   - `browser_type {ref, text, submit=false}`: computer.
   - Without a browser, read, click and type return
     `{error: 'This chat has no browser open. Use browser_open first.'}`.
   - All four use `forModel: withoutImages`.
   - The descriptions explain refs.
7. **`ToolboxFactory(servers, vault, {connect, sandboxes, browsers, builtIns})`:**
   - `computers()` returns `[{kind, available, tools}]`.
   - `forUser` adds sandbox or browser tools according to the scope's
     computer.
8. **Composition root:**
   - `createDependencies(model, {connect, makeJobs, sandboxProvider (null: none), browserGuard (null: none; default publicUrlsOnly if Chromium is installed)})`.
   - Exposes `computers: ComputerSessions[]` and `browsers`.
   - `index.ts` closes browsers on SIGINT and SIGTERM.
9. **Routes:**
   - `routes/computers.ts`: `GET /api/computers` →
     `{available: {sandbox, browser}, computers}`, and
     `DELETE /api/computers/:id`. Remove `/api/sandboxes`.
   - Deleting a thread stops every computer for it.
   - Apps returns `computers`.

## Web

- `lib/computers.ts`: `listComputers`, `stopComputer`.
- `ComputerChip({threadId, kind, checkKey})`: "Sandbox on" / "Browser open",
  with stop labels "Stop sandbox" / "Close browser". The chat shows it for
  any `defaultComputer`.
- `ComputerSection({kind, available, tools, running})`, with copy per kind:
  - Sandbox setup: E2B key in `.env`.
  - Browser setup: `pnpm browsers:install`.
  - Each computer gets its own empty state.
- The Apps page renders one section per entry in `computers`.
- Agent form:
  - `availableComputers` (from `/api/computers`)
  - options disabled with "(not set up)"
  - one setup hint per missing computer
  - template suggestions only when that computer is available
- `ToolImages`: charts and the screenshot under the row (alt "Screenshot
  of <title>").
- `BrowserOutput`: blocked reason, title and URL, text, "N things to click
  or type into".
- `output-fields.ts`.
- Risk legend: Computer mentions the browser.

## Tests

- `test-web-site.ts`: the local shop (refs 1 to 4), `/alert`, `/leak`,
  `/secret`.
- ChatBrowser (8, real Chromium).
- API through chat (10).
- Update the sandbox tests for `/api/computers`, and the callers of
  `createDependencies`.
- Close browsers in `afterAll`.

## Fixes from trying real models

- `writeReply`: text after a tool call is prefixed with a blank line (in
  the stream and in the saved answer).
- `shared/markdown.ts` `normalizeMath`: `\[…\]` becomes a `$$` block and
  `\(…\)` becomes `$$…$$`, skipping fenced and inline code.
- The web `Markdown` adds `createMathPlugin()` from `@streamdown/math@1.0.3`
  and `katex@0.16.47`'s CSS.
- Round the trigonometric SVG coordinates in `character.tsx`, to avoid a
  hydration mismatch.

## Docs

`docs/chapters/chapter-10/` with diagrams and screenshots. Update CHAPTERS,
the root README (status, docs link, the `browsers:install` note) and the
design system.

## Acceptance criteria

- With Chromium installed, a browser character opens a page without asking
  and shows its screenshot.
- After approval, it clicks and types in the same browser.
- It refuses private addresses.
- 257 tests, along with lint, format, type-check and the build.
- No sideways scroll at 390px.
