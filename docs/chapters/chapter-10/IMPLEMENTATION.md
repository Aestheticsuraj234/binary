# Chapter 10: Implementation

## Plan

1. **Shared:**
   - `browser` joins `AGENT_COMPUTERS`
   - `BrowserPageOutput`
   - `ComputerView` replaces `SandboxView`
   - the Research Assistant template starts with a browser
   - sandbox output types move to their own file
2. **API refactor:**
   - a `ComputerSessions` base for list and stop, with `SandboxSessions`
     extending it
   - `/api/computers` replaces `/api/sandboxes`
   - option objects for `ToolboxFactory` and `createDependencies`
3. **Browser:**
   - `ChatBrowser` (context, refs, guard, screenshots)
   - `BrowserSessions` (Chromium, idle timers, cap, `closeAll`)
   - four tools
   - `withoutImages` shared
   - shutdown hooks
4. **Web:**
   - Browser in the Computer select, with per-kind setup hints
   - screenshots under tool rows and a page view in the details
   - `ComputerChip` and `ComputerSection` for both kinds
5. **Setup:** `playwright@1.64.1`, `pnpm browsers:install` (part of
   `pnpm setup`) and a CI step.
6. **Tests:** real-Chromium unit tests, API tests through chat and
   approvals, and a browser walkthrough on the real web.

## Acceptance criteria

- [x] A character's computer can be a browser; the Research Assistant
      starts with one when Chromium is installed.
- [x] Opening and reading pages run without asking; clicking and typing
      ask first.
- [x] The agent clicks and types by ref; stale refs fail fast and clearly.
- [x] The user sees a screenshot of every step; the model reads text and
      elements, never the image.
- [x] The browser reaches public addresses only, for every request; a page
      linking to a private address can't make it go there.
- [x] One browser per chat, kept between messages; it closes on Close
      (chip or Apps), on chat delete, after 10 idle minutes, or on
      shutdown; at most 5 at once.
- [x] Sandboxes keep working, now through `/api/computers`.
- [x] No migration and no new setting. Lint, format, type-check, tests and
      the build pass; no sideways scroll at 390px.

## File-by-file

### `packages/shared`

| File                                    | Purpose                                                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/computers.ts` (was `sandboxes.ts`) | `COMPUTER_KINDS`, `AGENT_COMPUTERS` (+ `browser`), `AGENT_COMPUTER_INFO`, `TEMPLATE_COMPUTERS` (+ `research-assistant`), `ComputerView` |
| `src/sandboxes.ts`                      | Sandbox tool output types only                                                                                                          |
| `src/browsers.ts`                       | `BrowserElement`, `BrowserPageOutput`                                                                                                   |

### `apps/api`

| File                                 | Purpose                                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `src/computers/computer-sessions.ts` | Abstract base: `listRunning`, `stop` (checks the kind), `stopForThread`                             |
| `src/sandboxes/sandbox-sessions.ts`  | `SandboxSessions extends ComputerSessions`                                                          |
| `src/browsers/page-elements.ts`      | `MARK_ELEMENTS` (runs in the page), `pageElementsSchema`                                            |
| `src/browsers/chat-browser.ts`       | One chat's context and page: open, read, click, type, the request guard, screenshots                |
| `src/browsers/browser-sessions.ts`   | `chromiumInstalled`, `BrowserSessions` (launch, map, idle, cap, `closeAll`), `ChatBrowserAccess`    |
| `src/tools/browser-tools.ts`         | `browser_open`, `browser_read`, `browser_click`, `browser_type`                                     |
| `src/tools/model-view.ts`            | `withoutImages` for charts and screenshots                                                          |
| `src/tools/toolbox-factory.ts`       | `ToolboxOptions`; `computers()` for the Apps page; computer tools per scope                         |
| `src/routes/computers.ts`            | `GET /api/computers`, `DELETE /api/computers/:id` (replaces `sandboxes.ts`)                         |
| `src/routes/threads.ts`, `apps.ts`   | Stop every computer on chat delete; `computers` on Apps                                             |
| `src/container.ts`, `src/index.ts`   | `DependencyOptions` (`browserGuard`), `computers`, `browsers`; close browsers on SIGINT and SIGTERM |
| `src/test-web-site.ts`               | A tiny local shop site for browser tests                                                            |

### `apps/web`

| File                                            | Purpose                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/components/agents/agent-form.tsx`          | `availableComputers`; disabled "(not set up)" options; one setup hint per missing computer |
| `src/components/chat/tool-images.tsx`           | Charts and screenshots under the row (replaces `SandboxCharts`)                            |
| `src/components/chat/browser-output.tsx`        | Title, address, blocked reason, text and element count                                     |
| `src/components/chat/output-fields.ts`          | `field`, `text` for unknown tool output                                                    |
| `src/components/computers/computer-chip.tsx`    | "Sandbox on" or "Browser open", with stop                                                  |
| `src/components/computers/computer-section.tsx` | One section per computer on Apps                                                           |
| `src/lib/computers.ts`                          | `listComputers`, `stopComputer`                                                            |
| `src/components/tools/risk-badge.tsx`           | The Computer risk now mentions the browser                                                 |

### Fixes found with real models

| File                                               | Purpose                                                       |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `apps/api/src/chat/reply.ts`                       | Text after a tool call starts a new paragraph                 |
| `packages/shared/src/markdown.ts`                  | `normalizeMath`: `\[…\]` and `\(…\)` to `$$…$$`, outside code |
| `apps/web/src/components/chat/markdown.tsx`        | The `@streamdown/math` plugin (KaTeX) and its CSS             |
| `apps/web/src/components/characters/character.tsx` | Sunny's rays rounded (hydration)                              |

### Root

- `package.json`: `browsers:install`, now part of `setup`.
- `.github/workflows/ci.yml`: installs Chromium with system dependencies.
- `turbo.json`: `typecheck` depends on `^typecheck`.

## Decisions

| Decision                                                | Why                                                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Playwright Chromium inside the API, not a cloud browser | No account or key; fast; the plan names Playwright. Isolation comes from a context per chat, and network safety from the guard. |
| A context per chat in one Chromium                      | Separate cookies and tabs per chat, at a fraction of a browser process each.                                                    |
| Open and read are `read`; click and type are `computer` | Looking at a public page is what `fetch_web_page` already does. Clicking can buy, send or delete.                               |
| Refs written into the DOM (`data-binary-ref`)           | Deterministic, visible in tests, and the agent never invents selectors.                                                         |
| Guard every request, not only `browser_open`'s URL      | Redirects, links, form posts and images can all point somewhere else.                                                           |
| Screenshots for the user, text for the model            | Text models can't use the image; the user can't read the text dump.                                                             |
| A base class for computers                              | Two kinds now, more in Chapter 11; listing and stopping were identical.                                                         |
| Option objects for the factory and the composition root | Positional `undefined, undefined, provider` calls had stopped reading well.                                                     |
| Browsers on when Chromium is installed (no env flag)    | There is nothing to configure; the install is the switch.                                                                       |
