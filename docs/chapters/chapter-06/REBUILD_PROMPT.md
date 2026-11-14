# Rebuild prompt: Chapter 6, Tool system and MCP apps

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 5 (saved, streaming chat with Markdown).

---

You are a senior full-stack engineer and teacher. Give **Binary**'s agents
tools.

- **Repo:** pnpm + Turborepo. `apps/api` is Hono with a composition root,
  `EngineFactory` → `ApiEngine` on AI SDK 7, and a chat route that streams
  NDJSON. `apps/web` is Next.js 16 with an `AgentChat` component.
- **Database:** `packages/db` already has `mcp_servers` (name, url,
  encrypted_auth, iv, status) and `tool_calls` (message_id, tool_name,
  input, output, risk, status, created_at, finished_at). **No migration.**
- **Branch:** `feat/chapter-06-tools`.

## Code rules

Google TypeScript Style Guide (named exports, no `any`, no non-null
assertions, `UPPER_SNAKE_CASE` constants, comments explain _why_), and keep
it beginner-friendly.

## Packages

- `@ai-sdk/mcp@2` in the API.
- `@modelcontextprotocol/sdk@1` as a dev dependency, for a test MCP server.

AI SDK 7 notes:

- `stepCountIs` is exported (it's an alias of `isStepCount`).
- Tool `execute` options need `{toolCallId, messages, context}`.
- A `tool-call` stream part has `input` as a JSON string.

## Shared (`src/tools.ts`, exported)

- `TOOL_RISKS = ['read','write','computer']` and `TOOL_CALL_STATUSES`
  (`pending, awaiting_approval, running, succeeded, failed, rejected`).
  Build the DB `pgEnum`s from them.
- `ToolInfo {name, description, risk, source}`.
- `ToolCallView {id, toolName, risk, status, input, output}`.
- `connectAppSchema`:
  - `name`: 1–60 characters.
  - `url`: `z.url({protocol: /^https?$/, error: 'Paste the MCP server URL, starting with https://'})`.
  - `authorization`: optional.
- `ConnectedApp {id, name, url, status, hasAuthorization, tools, error?}`.
- In `chat.ts`, `ChatMessage.toolCalls?`, and `ChatStreamEvent` gains
  `{type: 'tool', call: ToolCallView}`.

## Database

- `McpServerRepository`: `create`, `listForUser` (oldest first),
  `setStatus`, `delete(userId, id)` → boolean.
- `ToolCallRepository`: `addMany(calls)` (`[]` for none) and
  `listForThread(threadId)`, which joins through messages and orders by
  `created_at`. Save each call's real start time, because one `INSERT`
  shares `now()`.

## API

1. **`errors.ts`.**
   - `AppError(message, status)`, with subclasses `ValidationError` (400),
     `NotFoundError(what)` (404, "<what> not found."),
     `MissingProviderKeyError` (400, moved here), `ProviderError(cause)`
     (502) and `AppConnectionError(app, cause)` (400, "Could not connect to
     <app>: <reason>").
   - `providerErrorMessage`.
   - `parseBody(c, schema)`, which throws "The request body must be JSON."
     or the first issue's message.
   - `app.onError`: an `AppError` becomes `{error}` with its status;
     anything else is logged and becomes a 500.
   - Refactor every route to throw these. Delete `engine-errors.ts`.
2. **`tools/agent-tool.ts`:** `AgentTool extends ToolInfo {tool: Tool}`,
   plus `toToolInfo`.
3. **`tools/web-page.ts`:**
   - `isPublicAddress`: refuse 0/8, 10/8, 127/8, 100.64/10, 169.254/16,
     172.16/12, 192.168/16, ≥224, `::`, `::1`, fc/fd, fe80, and
     IPv4-mapped forms of those.
   - `publicUrlsOnly`: http(s) only; resolve with `dns.lookup(all)` and
     require every address to be public.
   - `htmlToText`: drop head, script, style, noscript and svg; turn
     br/p/div/li/h*/tr into newlines; decode basic entities.
   - `fetchPageText(url, guard)`: manual redirects (max 3, each re-checked
     by the guard), a 10 s timeout, returns `{url, title, text ≤ 8000,
truncated}`.
4. **`tools/built-in.ts`:** `get_current_time({timeZone?})` and
   `fetch_web_page({url})`, both read. `builtInTools(guard =
publicUrlsOnly)`.
5. **`tools/policy.ts`:**
   - `interface ToolPolicy {allows(risk)}`, with
     `readOnlyPolicy = risk === 'read'`.
   - `BLOCKED_RESULT = {blocked: true, reason: 'Binary blocked this action
because it can change things outside Binary, and asking the user for
approval is not set up yet. Tell the user what you would have done
instead.'}` and `isBlockedResult`.
6. **`tools/mcp.ts`:**
   - `connectApp({name, url, authorization})` uses
     `createMCPClient({transport: {type: 'http', url, headers}})`,
     `listTools()` and `toolsFromDefinitions()`, with 8 s timeouts. Close
     the client on failure.
   - Tools are named `${toolPrefix(name)}_${tool}`, at most 64 characters.
   - Risk is `readOnlyHint === true ? 'read' : 'write'`.
   - Return `{tools, close}`.
7. **`tools/toolbox.ts`: `Toolbox(tools, connections)`.**
   - The first tool with a given name wins.
   - `list()`, and `riskOf(name)` (unknown → `write`).
   - `toToolSet(policy)` wraps each tool in `dynamicTool({description,
inputSchema, execute})`, which returns `BLOCKED_RESULT` when the
     policy refuses.
   - `close()` uses `allSettled`.
8. **`tools/toolbox-factory.ts`:** `ToolboxFactory(servers, keyVault,
connect = connectApp, builtIns = builtInTools())`.
   - `forUser(userId)` opens the non-disabled apps in parallel and decrypts
     their auth. It sets the status to `active` or `error`, skips failures
     (with the reason in `error`), and returns `{toolbox, apps}`.
   - `test(details)` throws `AppConnectionError`.
   - `encryptAuthorization(authorization?)`.
   - `toConnectedApp(server, tools, status)`.
9. **Engine.**
   - `EngineEvent` = text | tool-call | tool-result | tool-error.
   - `GenerateRequest.tools?: ToolSet`.
   - `ApiEngine.stream` passes `tools` and `stopWhen: stepCountIs(5)`, and
     maps `fullStream` parts. A `tool-error` part's `error` is turned into
     a message.
10. **`chat/tool-call-log.ts`:** `ToolCallLog(riskOf)` with `start`,
    `finish` (blocked → `rejected`, MCP `isError` → `failed`, otherwise
    `succeeded`), `fail` (output `{error}`) and `toRows(messageId)`
    (`running` → `failed`, keeping start and finish times).
11. **`routes/threads.ts`.**
    - Before streaming: every check, then open
      `toolboxes.forUser(userId)`.
    - Stream with `tools: toolbox.toToolSet(readOnlyPolicy)`, and send a
      `tool` event whenever the log changes.
    - Close the toolbox in `finally`.
    - Save the answer, then `toolCalls.addMany(log.toRows(id))`.
    - `done` includes `toolCalls`, and `GET /:id` attaches `toolCalls` to
      each message.
12. **`routes/apps.ts`.**
    - `GET /` → `{builtIn, apps}`. Open, then close.
    - `POST /`: parse, `toolboxes.test`, close, then save with the
      encrypted auth → `201 {app}`.
    - `DELETE /:id` → 204, or 404.
13. **Container:** add `toolCalls`, `mcpServers` and `toolboxes`, and let
    `createDependencies(createModel, connect = connectApp)` take an
    optional connector.
14. **`test-mcp-server.ts`.** `startTestMcpServer({lookupDelayMs})` is a
    stateless Streamable-HTTP server behind `Bearer test-mcp-token`, with
    `lookup_order` (`readOnlyHint`) and `refund_order` (`destructiveHint`,
    which pushes onto `refunds`). It returns `{url, refunds, close}`.

## Web

- `--warning: #fcd34d` and `--color-warning` in `globals.css`.
- `RiskBadge` (read is muted; write and computer use warning colors, with
  BookOpen / PenLine / Monitor icons) and `RISK_INFO` explanations.
- `ToolRow`, `ConnectAppForm` (name, URL, an optional password field for
  Authorization, a Composio link, a lime Connect button) and `AppCard`
  (Connected or "Can't connect", host only, a lock icon if there's a
  token, tools, ghost Remove with a confirmation).
- `/apps` page: a 3-card risk legend, Built into Binary, Connected apps
  (with the form, an empty state and the cards). A sidebar link "Apps &
  tools" (Plug).
- `ToolCall` in chat: a `<details>` whose summary reads "Using / Used /
  Blocked / Could not use <tool name with spaces>", with a risk badge, a
  status icon and a chevron. The body shows the input and result as JSON;
  blocked calls also explain approvals.
- `AgentChat`: on a `tool` event, upsert the call by id. Set the mood to
  thinking while a call is running, and talking otherwise. Show the typing
  dots only if there's no content and no tool calls.

## Tests

- **Shared (2).**
- **DB (5).**
- **`web-page` (18):** the address lists, the guard refusals, `htmlToText`,
  a fetch with a redirect, and a redirect to a private address being
  refused.
- **`toolbox` (8):** the policy, duplicate names, unknown tools, built-ins,
  prefixes, hints, connect and call the test shop, and 401 without a token.
- **`tool-call-log` (4).**
- **`apps` routes (10):** including a wrong token saving nothing, the token
  never returned and stored encrypted, an unreachable app as `error`, and
  malformed JSON → 400.
- **`chat-tools` (6):** a fake model that calls a tool on step 1 and
  answers on step 2.
  - A read tool goes `running` → `succeeded`, and its result reaches the
    model.
  - The call is saved.
  - A write tool is `rejected` and the shop's `refunds` stays empty.
  - A built-in tool works while the app is down.
  - With no tools, there are no `toolCalls`.

## Docs

`docs/chapters/chapter-06/` (README, IMPLEMENTATION, ARCHITECTURE,
TESTING, PR_REVIEW, this prompt), with diagrams and screenshots. Update
`docs/CHAPTERS.md`, the root README and `docs/DESIGN_SYSTEM.md`.

## Acceptance criteria

- With a real MCP app, a character uses a read tool mid-answer, and write
  tools are blocked.
- 151 tests pass (shared 16, db 31, api 104), along with lint, format,
  type-check and the build.
- No sideways scroll at 390px.
