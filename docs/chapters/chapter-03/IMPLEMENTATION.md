# Chapter 3: Implementation

## Plan

1. Put the provider list, model suggestions and request schemas in
   `packages/shared`; make the database enum use the same list.
2. Add `ProviderKeyRepository` to `packages/db`.
3. Build `KeyVault` (AES-256-GCM) and validate `ENCRYPTION_KEY` at startup.
4. Build the engine layer: `AgentEngine` interface, `ApiEngine`,
   `createLanguageModel`, `EngineFactory`.
5. Add a composition root and turn the API into `createApp(dependencies)`.
6. Add routes: `/api/provider-keys` and `/api/playground`.
7. Web: shared app header, API keys page, Playground.
8. Test with a fake model; verify in a real browser.

## Acceptance criteria

- [x] A user can add, replace and remove a key for each of the three providers.
- [x] Keys are stored encrypted; no response or table holds a plain key.
- [x] The API refuses to start without a valid 32-byte `ENCRYPTION_KEY`.
- [x] The playground runs one prompt on every provider with a key, in
      parallel, showing text, token usage and time per provider.
- [x] A provider without a key shows "No key yet" with a link to add one.
- [x] Missing key → 400 with a helpful message; provider failure → 502 with
      the provider's reason.
- [x] Unauthenticated requests to the new routes get 401.
- [x] Pages and forms handle an unreachable API with a clear message.
- [x] Lint, type-check, all tests, the web build and the Android bundle pass.

## File-by-file

### `packages/shared`

| File               | Purpose                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/providers.ts` | `PROVIDERS`, `PROVIDER_INFO` (label, key URL, suggested models), `providerSchema`, `saveProviderKeySchema`, `playgroundRequestSchema`, `PlaygroundResult`, `ProviderKeySummary` |

### `packages/db`

| File                                          | Purpose                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/repositories/provider-key-repository.ts` | `save` (upsert per user + provider), `listForUser` (no secrets), `find`, `delete` |
| `src/schema/enums.ts`                         | `providerEnum` now built from `PROVIDERS` (no migration change)                   |

### `apps/api`

| File                             | Purpose                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `src/env.ts`                     | Adds `ENCRYPTION_KEY` (must decode to 32 bytes)                              |
| `src/keys/key-vault.ts`          | `KeyVault.encrypt` / `decrypt` with AES-256-GCM                              |
| `src/engines/agent-engine.ts`    | `AgentEngine` interface + request/result types                               |
| `src/engines/api-engine.ts`      | `ApiEngine`: `generateText` from the AI SDK                                  |
| `src/engines/language-models.ts` | `createLanguageModel(provider, model, apiKey)`: one line per provider        |
| `src/engines/engine-factory.ts`  | `EngineFactory.create()`, `MissingProviderKeyError`                          |
| `src/container.ts`               | `createDependencies(createModel?)`: the composition root                     |
| `src/app-env.ts`                 | `AppEnv` type and `requireUser` middleware                                   |
| `src/app.ts`                     | Now `createApp(dependencies)`; mounts the new routes; CORS allows PUT/DELETE |
| `src/routes/provider-keys.ts`    | `GET /`, `PUT /:provider`, `DELETE /:provider`                               |
| `src/routes/playground.ts`       | `POST /`                                                                     |
| `src/index.ts`                   | `createApp(createDependencies())`                                            |
| `src/test-helpers.ts`            | `cookieFrom`, `signUpTestUser`, `WEB_ORIGIN`                                 |

### `apps/web`

| File                                                   | Purpose                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `src/app/(app)/layout.tsx`                             | Session check + header for every signed-in page                                |
| `src/app/(app)/page.tsx`                               | Home, with a "next step" card (add a key / try the playground)                 |
| `src/app/(app)/settings/page.tsx`                      | API keys page                                                                  |
| `src/app/(app)/playground/page.tsx`                    | Playground page                                                                |
| `src/components/app/app-nav.tsx`                       | Nav with active state                                                          |
| `src/components/settings/provider-key-card.tsx`        | Save / replace / remove one key                                                |
| `src/components/playground/playground.tsx`             | Prompt form; runs providers in parallel                                        |
| `src/components/playground/result-card.tsx`            | One provider's model picker and answer                                         |
| `src/lib/server-api.ts`                                | `getFromApi<T>(path)` for server components (forwards cookie; null on failure) |
| `src/components/ui/{badge,textarea,native-select}.tsx` | New shadcn components                                                          |

### `apps/mobile`

Only the sign-in and sign-up screens changed: they now handle an unreachable
server. Key management on mobile arrives with the full mobile app (Chapter 14).

## Decisions

| Decision                                                           | Why                                                                                 |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Bring-your-own-key, encrypted at rest                              | Viewers run Binary at their own cost; the server never stores a usable plain key.   |
| AES-256-GCM with a random 12-byte IV per key                       | Standard authenticated encryption; built into Node, no package needed.              |
| Auth tag appended to the ciphertext                                | One `encrypted_key` column instead of three; Chapter 2's schema stays unchanged.    |
| `AgentEngine` interface now, one implementation                    | The Strategy is in place before Chapter 11 adds CLI engines.                        |
| `createLanguageModel` as a lookup object, not a class per provider | One line per provider is enough; a class each would be ceremony.                    |
| `generateText`, not streaming                                      | Streaming belongs to chat (Chapter 5); the playground only needs the final answer.  |
| Model ids as editable suggestions                                  | Ids change monthly. Where a provider offers a `-latest` alias, it's used.           |
| No `/api/models` endpoint                                          | The model list lives in `packages/shared`, which web and mobile import directly.    |
| One parallel request per provider                                  | Fast providers show their answer immediately.                                       |
| Composition root with an injectable model factory                  | Real wiring and test wiring are identical, so tests never need real keys.           |
| Only one lime button per screen                                    | Save buttons are `secondary`; the lime stays for "Run on all" and the active state. |
