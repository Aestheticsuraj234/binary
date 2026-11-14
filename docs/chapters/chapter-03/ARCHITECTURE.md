# Chapter 3: Architecture

Diagrams: [components and class diagram](architecture/system-overview.md),
[request flows](architecture/request-flow.md),
[encryption and wiring](architecture/integration-flow.md).

## The engine layer

```text
route ─► EngineFactory.create({userId, provider, model})      Factory
            │  ProviderKeyRepository.find  → encrypted row
            │  KeyVault.decrypt            → plain key (in memory only)
            │  createLanguageModel(...)    → AI SDK model
            ▼
          ApiEngine implements AgentEngine                    Strategy
            │  generate({prompt, system})
            ▼
          Vercel AI SDK generateText → OpenAI | Anthropic | Gemini
```

Routes only know `AgentEngine.generate()`. They never import an SDK, read a
key, or know which provider is behind the engine.

## API contracts

All routes need a signed-in session cookie (401 otherwise).

| Method + path                         | Body                        | Success                                                              | Errors                                             |
| ------------------------------------- | --------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| `GET /api/provider-keys`              | —                           | `200 {keys: [{provider, last4, createdAt}]}`                         |                                                    |
| `PUT /api/provider-keys/:provider`    | `{apiKey}` (20–500 chars)   | `200 {provider, last4}`                                              | `404` unknown provider, `400` invalid key          |
| `DELETE /api/provider-keys/:provider` | —                           | `204`                                                                | `404` unknown provider or no key                   |
| `POST /api/playground`                | `{provider, model, prompt}` | `200 {provider, model, text, inputTokens, outputTokens, durationMs}` | `400` invalid body or no key, `502` provider error |

## Key security

| Threat                                     | Protection                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Database dump leaks keys                   | Only AES-256-GCM ciphertext + IV stored; the master key lives in `.env`, not the DB. |
| Someone edits a stored ciphertext          | GCM auth tag check fails; decrypt throws.                                            |
| Key echoed back to the browser             | No route returns `encrypted_key`, `iv` or the plain key; only `last4`. Tested.       |
| Same key saved twice looks identical       | Random IV per encryption, so ciphertexts differ. Tested.                             |
| Running with a weak/placeholder master key | `ENCRYPTION_KEY=change-me` fails validation at startup.                              |
| Another user's key used                    | Every query filters by the signed-in `userId`.                                       |

## Web structure

```text
app/
├── (auth)/          sign-in, sign-up (redirect if signed in)
└── (app)/layout.tsx session check + header + AppNav
    ├── page.tsx           Home
    ├── playground/        Playground
    └── settings/          API keys
```

Server components read data with `getFromApi()` (cookie forwarded).
Client components change data with `fetch(..., {credentials: 'include'})`
and call `router.refresh()` so the server data reloads.
