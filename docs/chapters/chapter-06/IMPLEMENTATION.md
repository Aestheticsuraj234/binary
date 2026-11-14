# Chapter 6: Implementation

## Plan

1. Spike: connect `@ai-sdk/mcp` to a test MCP server (from
   `@modelcontextprotocol/sdk`), read tool annotations, and call a tool.
2. Shared: risk levels, tool and tool-call views, the connect form schema,
   and a `tool` stream event. Build the DB enums from the shared lists.
3. DB: `McpServerRepository`, `ToolCallRepository`.
4. API: the `AppError` hierarchy with `parseBody` and `app.onError`, and a
   refactor of the existing routes to use them.
5. API: `AgentTool`, built-in tools (with an SSRF guard), `ToolPolicy`, MCP
   connection, `Toolbox` and `ToolboxFactory`. The engine streams tool
   events, the chat logs and saves tool calls, and there are `/api/apps`
   routes.
6. Web: the Apps & tools page, a sidebar link, tool calls in chat, and a
   `--warning` token.
7. Test with a fake model that calls tools across steps and a real local
   MCP server; verify in a browser.

## Acceptance criteria

- [x] Every tool has a risk level: read, write or computer.
- [x] Built-in read tools work without any setup.
- [x] A user can connect an MCP app by URL with an optional token, which is
      encrypted and never returned. A bad URL or token is refused before
      saving.
- [x] App tools appear with a risk from their `readOnlyHint`, or `write`
      when unsure.
- [x] Agents use read tools mid-answer; the result reaches the model, which
      then answers.
- [x] Write tools are blocked: they never run, and the model is told why.
- [x] Tool calls stream live into the reply and are saved with it.
- [x] An unreachable app shows "Can't connect" with the reason, and chats
      keep working without it.
- [x] Users can't see or remove each other's apps.
- [x] Malformed JSON bodies are a 400 (the `AppError` hierarchy).
- [x] No migration. Lint, format, type-check, tests and the web build pass;
      no sideways scroll at 390px.

## File-by-file

### `packages/shared`

| File           | Purpose                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `src/tools.ts` | `TOOL_RISKS`, `TOOL_CALL_STATUSES`, `ToolInfo`, `ToolCallView`, `connectAppSchema`, `ConnectedApp` |
| `src/chat.ts`  | `ChatMessage.toolCalls`; `ChatStreamEvent` gains `{type: 'tool', call}`                            |

### `packages/db`

| File                                        | Purpose                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/schema/enums.ts`                       | `tool_risk` and `tool_call_status` built from the shared lists (no migration) |
| `src/repositories/mcp-server-repository.ts` | `create`, `listForUser`, `setStatus`, `delete` (owner-scoped)                 |
| `src/repositories/tool-call-repository.ts`  | `addMany`, `listForThread` (joined through messages)                          |

### `apps/api`

| File                           | Purpose                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `src/errors.ts`                | `AppError` and subclasses, `providerErrorMessage`, `parseBody`                                                    |
| `src/app.ts`                   | `app.onError`; mounts `/api/apps`                                                                                 |
| `src/tools/agent-tool.ts`      | `AgentTool`, `toToolInfo`                                                                                         |
| `src/tools/web-page.ts`        | `isPublicAddress`, `publicUrlsOnly` (SSRF guard), `htmlToText`, `fetchPageText` (redirects re-checked)            |
| `src/tools/built-in.ts`        | `get_current_time`, `fetch_web_page`                                                                              |
| `src/tools/policy.ts`          | `ToolPolicy`, `readOnlyPolicy`, `BLOCKED_RESULT`, `isBlockedResult`                                               |
| `src/tools/mcp.ts`             | `connectApp` (Streamable HTTP, timeouts), `toolPrefix`, `riskFromHints`                                           |
| `src/tools/toolbox.ts`         | `Toolbox` (registry): `list`, `riskOf`, `toToolSet(policy)`, `close`                                              |
| `src/tools/toolbox-factory.ts` | `ToolboxFactory`: `forUser`, `test`, `encryptAuthorization`; `toConnectedApp`                                     |
| `src/chat/tool-call-log.ts`    | `ToolCallLog`: start, finish and fail, then `toRows`                                                              |
| `src/engines/*`                | `EngineEvent`; `stream()` yields text and tool events; `stopWhen: stepCountIs(5)`                                 |
| `src/routes/threads.ts`        | Opens the toolbox, streams `tool` events, saves calls, returns `toolCalls`                                        |
| `src/routes/apps.ts`           | `GET /`, `POST /`, `DELETE /:id`                                                                                  |
| `src/routes/*.ts`              | Use `parseBody` and the errors; `engine-errors.ts` removed                                                        |
| `src/container.ts`             | `toolCalls`, `mcpServers`, `toolboxes`; an optional `connect` for tests                                           |
| `src/test-mcp-server.ts`       | A test shop over Streamable HTTP: `lookup_order` (read-only), `refund_order` (destructive), a refund log, a delay |

### `apps/web`

| File                                        | Purpose                                                       |
| ------------------------------------------- | ------------------------------------------------------------- |
| `src/app/(app)/apps/page.tsx`               | Risk legend, built-in tools, connect form, connected apps     |
| `src/components/tools/risk-badge.tsx`       | `RiskBadge`, `RISK_INFO`                                      |
| `src/components/tools/tool-row.tsx`         | One tool: name, description, risk                             |
| `src/components/tools/connect-app-form.tsx` | Name, URL, optional Authorization; a Composio hint            |
| `src/components/tools/app-card.tsx`         | Status, host only, lock icon, tools, Remove                   |
| `src/components/chat/tool-call.tsx`         | A collapsible row: verb, tool, risk, status; input and result |
| `src/components/agents/agent-chat.tsx`      | Handles `tool` events; mood thinking while a tool runs        |
| `src/components/app/app-sidebar.tsx`        | "Apps & tools" link                                           |
| `src/app/globals.css`                       | `--warning` token                                             |

## Decisions

| Decision                                                  | Why                                                                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Block write tools until Chapter 8                         | Running them unasked would let a connected Gmail send mail on a model's whim. "No" is the safe default until "ask" exists. |
| `ToolPolicy` as a Strategy                                | Chapter 8 replaces one object; no tool, route or engine changes.                                                           |
| Risk from `readOnlyHint`, otherwise `write`               | Hints are the MCP standard; assuming "write" errs on the side of asking.                                                   |
| Streamable HTTP only                                      | It covers Composio and remote servers. Spawning stdio servers from the API is a security risk.                             |
| Connect per request                                       | Always fresh and simple; no connection pool to teach yet.                                                                  |
| Prefix app tools with the app name                        | Two apps' `search` tools never collide; the model sees where a tool comes from.                                            |
| Every agent gets every tool                               | There's no per-agent tool table in the schema; per-agent permissions belong to approval modes (Chapter 8).                 |
| `fetch_web_page` with an SSRF guard, redirects re-checked | The model picks URLs; a prompt injected into a page must not reach your network.                                           |
| Tool calls saved after the answer                         | `tool_calls.message_id` needs the message; a failed answer saves nothing, as in Chapter 5.                                 |
| `AppError` + `parseBody` + `onError`                      | Chapter 4's missing scope item; routes lose their repeated `safeParse` blocks, and bad JSON becomes a 400.                 |
| A `--warning` token (amber)                               | "Careful" is a meaning, like `destructive`; lime stays for actions.                                                        |
