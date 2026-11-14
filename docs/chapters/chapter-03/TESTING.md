# Chapter 3: Testing

```bash
pnpm test
```

No test calls a real provider. The routes are built with
`createDependencies(fakeModel)`, where `fakeModel` returns the AI SDK's
`MockLanguageModelV4` and records which decrypted key it received.

## New suites

| Suite                   | File                                                | Tests                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Key vault               | `apps/api/src/keys/key-vault.test.ts`               | round trip; ciphertext hides the key; new IV each time; tampered data rejected; wrong master key rejected; wrong master-key length rejected (6)                                                                                                                                                                                        |
| Key + playground routes | `apps/api/src/routes/routes.test.ts`                | 401 without session; empty list; short key 400; unknown provider 404; save returns only last4 and the list never contains the key; database holds ciphertext; playground passes the decrypted key and returns text + usage; missing key 400 with message; empty prompt 400; provider failure 502 with reason; delete 204 then 404 (11) |
| Provider key repository | `packages/db/src/repositories/repositories.test.ts` | save + list without secrets; save again replaces; delete reports existence (3 new)                                                                                                                                                                                                                                                     |

## Results

| Check                                     | Result                                                           |
| ----------------------------------------- | ---------------------------------------------------------------- |
| All tests                                 | 41 / 41 passed (shared 4, db 14, api 23)                         |
| ESLint, Prettier                          | Clean                                                            |
| Type-check (5 packages)                   | Passed                                                           |
| Web production build                      | Passed (`/`, `/playground`, `/settings`, `/sign-in`, `/sign-up`) |
| Android bundle (`expo export`)            | Passed (mobile forms changed)                                    |
| Chapter 1 browser flows (desktop + phone) | All passed                                                       |

## Browser verification

Run against the real API and database with a temporary server that only
swapped the models for fakes (different delays per provider):

| Step                                                                               | Result                       |
| ---------------------------------------------------------------------------------- | ---------------------------- |
| New user's home shows "Add your first API key"                                     | ✓                            |
| Too-short key → "That does not look like a full API key."                          | ✓                            |
| Save OpenAI + Anthropic keys → badges "•••• abcd", "•••• wxyz"; Gemini "Not added" | ✓                            |
| Playground says "Runs on 2 of 3 providers"                                         | ✓                            |
| Change Anthropic model, run → both answers appear, usage "18 in · 24 out · 0.9s"   | ✓                            |
| Gemini column: "No key yet. Add one in API keys."                                  | ✓                            |
| Remove the Anthropic key → back to "Not added"                                     | ✓                            |
| Phone width (390px): no horizontal scroll                                          | ✓ (was 420px before the fix) |
| API stopped: sign-in shows "Could not reach the server. Is the API running?"       | ✓ (crashed before the fix)   |
| Browser console errors                                                             | 0                            |

## Not verified here

- **Real provider calls.** No real API keys were available in the build
  environment. Before recording, add a real key and run the playground once
  per provider. If a suggested model id has been renamed, the column shows
  the provider's error; pick another model from the list.
