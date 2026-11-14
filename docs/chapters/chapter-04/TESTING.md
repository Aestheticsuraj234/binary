# Chapter 4: Testing

```bash
pnpm test
```

As in Chapter 3, no test calls a real provider. The agent routes are built
with `createDependencies(fakeModel)`. The fake records every model it makes,
so a test can read the exact system prompt and message the agent sent.

## New suites

| Suite                   | File                                                | Tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent schemas           | `packages/shared/src/agents.test.ts`                | valid agent is trimmed; empty instructions allowed; blank name has a friendly message; unknown provider rejected (4)                                                                                                                                                                                                                                                                                                                                                                         |
| System prompt           | `apps/api/src/agents/system-prompt.test.ts`         | name, role and instructions in order; no instructions block when empty (2)                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Agent + template routes | `apps/api/src/routes/agents.test.ts`                | templates: 401, list (2). Hiring: 401; missing key 400 with message; blank name 400; unknown template 400; create from template 201 without `userId`; list + read; malformed id 404 (7). Another user: invisible in list and by id; edit, run and delete all 404 (2). Editing and running: update keeps the template; switching to a provider without a key 400; run sends the system prompt, message and decrypted key and returns text + usage; blank message 400; delete 204 then 404 (5) |
| Agent repository        | `packages/db/src/repositories/repositories.test.ts` | create without `userId`; newest first; other user sees nothing; update; other user can't update or delete; delete reports existence (6), plus template `findById` (1)                                                                                                                                                                                                                                                                                                                        |

## Results

| Check                   | Result                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| All tests               | 70 / 70 passed (shared 8, db 21, api 41). Chapter 3 had 41.                              |
| ESLint, Prettier        | Clean                                                                                    |
| Type-check (5 packages) | Passed                                                                                   |
| `drizzle-kit generate`  | "No schema changes, nothing to migrate"                                                  |
| Web production build    | Passed (`/`, `/agents`, `/agents/new`, `/agents/[id]`, `/playground`, `/settings`, auth) |

## Browser verification

Run against the production web build, the real API and a real database. A
temporary server swapped only the models for fakes (700 ms delay; the
answer echoes the first line of the system prompt and the model id). A
scripted Chromium walkthrough as a new user went through 38 checks:

| Step                                                                                                                                                                 | Result                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| No key: home says "Add your first API key"; Agents says "Add an API key first", no "New agent"                                                                       | ✓                                    |
| No key: `/agents/new` redirects to `/settings`                                                                                                                       | ✓                                    |
| After saving an Anthropic key, home says "Hire your first agent"                                                                                                     | ✓                                    |
| Agents shows 4 template cards; nav "Agents" is active                                                                                                                | ✓                                    |
| Research Assistant template: title "Hire a Research Assistant", role and instructions pre-filled                                                                     | ✓                                    |
| Provider is Anthropic; OpenAI is disabled ("no key"); model defaults to `claude-sonnet-5-5`                                                                          | ✓                                    |
| Blank name → "Give your agent a name."                                                                                                                               | ✓                                    |
| Hire "Ada" on `claude-opus-5-5` → agent page, badge "Anthropic · claude-opus-5-5"                                                                                    | ✓                                    |
| Empty message → "Write a message first."                                                                                                                             | ✓                                    |
| Send a task → "Ada is thinking…", then an answer that starts "You are Ada, an AI coworker in Binary." from `anthropic/claude-opus-5-5`, with "64 in · 41 out · 0.7s" | ✓                                    |
| Rename to "Ada Researcher" → "Saved." and the heading updates                                                                                                        | ✓                                    |
| Clear the role → "Describe what this agent does."; a reload shows nothing was saved                                                                                  | ✓                                    |
| Agents list and home ("Your agents") show the card; next step is the playground                                                                                      | ✓                                    |
| Unknown id and malformed id → 404 page                                                                                                                               | ✓                                    |
| 390px phone: `/`, `/agents`, `/agents/new`, `/agents/:id` don't scroll sideways                                                                                      | ✓                                    |
| Fire → confirm → back on Agents, "No agents yet"                                                                                                                     | ✓                                    |
| Browser console errors                                                                                                                                               | Only the two expected 404 page loads |

The walkthrough found one layout issue: the Provider and Model selects were
narrower than the other fields, worst on a phone. It was fixed and the run
repeated. See PR_REVIEW.md #1.

## Not verified here

- **Real provider calls.** No real API keys were available. Before
  recording, hire an agent on each provider you have a key for and send it
  one task.
- **Mobile app.** Not changed in this chapter, so it wasn't rebuilt.
