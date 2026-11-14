# Request flow: a tool call, end to end

"Where is my order A1?", asked to Mimi, with the Shop app connected.

```mermaid
sequenceDiagram
  autonumber
  participant C as AgentChat
  participant R as POST /api/threads/:id/messages
  participant F as ToolboxFactory
  participant S as Shop (MCP server)
  participant E as ApiEngine.stream
  participant M as Model
  participant L as ToolCallLog
  participant DB as Postgres

  C->>R: {content}
  R->>R: checks (owner, body, model, key) → JSON 4xx
  R->>F: forUser(userId)
  F->>S: initialize + tools/list (Bearer token)
  S-->>F: lookup_order (readOnlyHint) · refund_order
  F-->>R: Toolbox [time, web page, shop_lookup_order, shop_refund_order]
  R->>E: stream({system, prompt, history, tools: toToolSet(readOnlyPolicy)})
  E->>M: step 1 (tools listed)
  M-->>E: tool-call shop_lookup_order {"orderId":"A1"}
  E-->>R: tool-call
  R->>L: start → running
  R-->>C: {"type":"tool","call":{…"status":"running"}}
  Note over C: "Using shop lookup order" · stage thinking
  E->>S: tools/call lookup_order (policy: read → allowed)
  S-->>E: "Order A1: 2 mugs, shipped."
  E-->>R: tool-result
  R->>L: finish → succeeded
  R-->>C: {"type":"tool","call":{…"status":"succeeded"}}
  E->>M: step 2 (with the tool result)
  M-->>E: text "Your order A1 has shipped…"
  E-->>R: text pieces
  R-->>C: {"type":"delta",…} …
  R->>DB: INSERT message · INSERT tool_calls (from the log)
  R-->>C: {"type":"done","message":{…,"toolCalls":[…]}}
  R->>F: toolbox.close()
```

## When the tool writes

"Please refund order A1" follows the same steps until the tool call. Then:

```mermaid
sequenceDiagram
  participant E as ApiEngine
  participant T as Toolbox (wrapped tool)
  participant P as readOnlyPolicy
  participant S as Shop
  participant M as Model

  E->>T: execute shop_refund_order {"orderId":"A1"}
  T->>P: allows('write')?
  P-->>T: no
  T-->>E: BLOCKED_RESULT (S is never called)
  E->>M: step 2 with {"blocked": true, "reason": "…"}
  M-->>E: "I can't refund it myself: refunds need your approval…"
```

The call is saved as `rejected`, and the reply shows "Blocked shop refund
order · Write".
