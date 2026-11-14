# Chapter 6: Testing

```bash
pnpm test
```

The MCP tests use a **real MCP server**. `src/test-mcp-server.ts` serves a
small shop over Streamable HTTP with `@modelcontextprotocol/sdk`, on a
random local port, behind a bearer token. It has:

- `lookup_order` (`readOnlyHint`)
- `refund_order` (`destructiveHint`), which records every refund, so a
  test can prove a blocked refund never happened

The chat tests use a fake model that behaves like a real tool user. On
step 1 it sends a `tool-call` part (finish reason `tool-calls`). On step 2,
with the tool result in its prompt, it answers in text. A word in the
message picks the tool.

## New suites

| Suite                | File                                      | Tests                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connect form schema  | `packages/shared/src/tools.test.ts`       | an https URL with a token; a non-http URL is refused with a friendly message (2)                                                                                                                                                                                                                                                                                                                        |
| App + call repos     | `packages/db/.../repositories.test.ts`    | save an app with encrypted auth; record "error"; another user sees and deletes nothing; save tool calls in order; nothing saved for an answer without tools (5)                                                                                                                                                                                                                                         |
| Web page tool        | `apps/api/src/tools/web-page.test.ts`     | 3 public addresses allowed; 11 private, loopback, link-local, CGNAT and IPv6-mapped addresses refused; localhost, metadata IP and `file:` refused; HTML to text; title and text after a redirect; **a redirect to a private address is refused** (18)                                                                                                                                                   |
| Toolbox, policy, MCP | `apps/api/src/tools/toolbox.test.ts`      | read runs while write and computer return `BLOCKED_RESULT` (and don't run); a duplicate name keeps the first; an unknown tool is `write`; built-ins are read and tell the time; prefixes; risk from hints; connect, list and call the test shop; no token → 401 (8)                                                                                                                                     |
| Tool call log        | `apps/api/src/chat/tool-call-log.test.ts` | running → succeeded; blocked → rejected, error → failed, MCP `isError` → failed; rows in order, unfinished → failed; unknown id ignored (4)                                                                                                                                                                                                                                                             |
| Apps routes          | `apps/api/src/routes/apps.test.ts`        | 401; two built-in read tools and no apps; a wrong token is a 400 "Could not connect to Shop…" and saves nothing; form validation; connect lists `shop_lookup_order` (read) and `shop_refund_order` (write); the token is never returned and is stored encrypted; an unreachable app shows "error" with the reason; another user can't see or remove it; remove 204 → 404; **malformed JSON → 400** (10) |
| Tools in chat        | `apps/api/src/routes/chat-tools.test.ts`  | a read app tool streams `running` → `succeeded`, then the answer; its result reaches the model on step 2; the call is saved with the answer; **a write tool is `rejected`, the shop refunds nothing, and the model reads why**; a built-in tool works while the app is down; no tools → no `toolCalls` (6)                                                                                              |

Every Chapter 5 test still passes after the routes moved to `parseBody` and
`AppError`.

## Results

| Check                   | Result                                                   |
| ----------------------- | -------------------------------------------------------- |
| All tests               | 151 / 151 (shared 16, db 31, api 104). Chapter 5 had 98. |
| ESLint, Prettier        | Clean                                                    |
| Type-check (5 packages) | Passed                                                   |
| `drizzle-kit generate`  | No schema changes (shared enums produce the same SQL)    |
| Web production build    | Passed, including `/apps`                                |

## Browser verification

These ran against the production build and the real API and database, with
the test shop as a real MCP app (a 1.5 s delay on lookups) and a fake
tool-calling model. 24 checks:

| Step                                                                                                                   | Result                                            |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Apps & tools: sidebar link active; three risk levels explained; two built-in read tools; "No apps yet"                 | ✓                                                 |
| A bad URL is caught in the form; a wrong token gives "Could not connect to Shop…" and nothing is saved                 | ✓                                                 |
| Connect: card says "Connected"; both tools with Read / Write; the form clears; the token appears nowhere in the page   | ✓                                                 |
| Ask Mimi about order A1: "Using shop lookup order" with the stage **thinking**, then "Used … Read"                     | ✓                                                 |
| Open the row: input `{"orderId": "A1"}` and the shop's result; Markdown answer after it                                | ✓                                                 |
| Ask for a refund: "Blocked shop refund order · Write"; open: "needs your approval"; **the shop's refund log is empty** | ✓                                                 |
| Reload after the answer ends: both tool calls saved with their status                                                  | ✓                                                 |
| Stop the shop: Apps shows "Can't connect" and the reason; a new chat still uses `get_current_time`                     | ✓                                                 |
| Phone (390px): `/apps` and the chat don't scroll sideways                                                              | ✓                                                 |
| Remove the app: back to "No apps yet"                                                                                  | ✓                                                 |
| Console errors                                                                                                         | Only the deliberate 400 from the wrong-token step |

## Found while testing

- **"Using…" was never visible.** The local shop answered in
  milliseconds. The state is real and covered by API tests; the test shop
  now has an optional `lookupDelayMs` so a browser can see it.
- **A reload mid-answer showed the answer missing.** A direct test confirmed
  the server keeps going after the client leaves: right after the abort
  only the question is saved, and 3 s later the answer is too. Nothing is
  lost. The page just doesn't update until the next load, because live
  updates (Postgres LISTEN/NOTIFY) aren't built yet. See
  [CHAPTERS.md](../../CHAPTERS.md) footnote 2.

## Not verified here

- **A real Composio server and real models.** Before recording, connect one
  real app (for example Gmail through Composio) and ask a character to use
  a read tool.
- **`fetch_web_page` against the internet.** Tests use a local server with
  a test-only guard; the real guard is unit-tested.
