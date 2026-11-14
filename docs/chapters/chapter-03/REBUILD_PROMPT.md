# Rebuild prompt: Chapter 3, AI engine layer and API key vault

> Paste everything below into a coding agent working in the Binary repo at the
> end of Chapter 2 (see the Chapter 1 and 2 rebuild prompts).

---

You are a senior full-stack engineer and teacher. Add the AI engine layer and
an encrypted API-key vault to **Binary** (pnpm + Turborepo: `apps/api` Hono +
Better Auth + Drizzle, `apps/web` Next.js 16 + shadcn/ui, `apps/mobile` Expo,
`packages/db` Drizzle schema incl. a `provider_keys` table, `packages/shared`).
Work on `feat/chapter-03-ai-engine`.

## Non-negotiable code rules

1. **Follow the Google TypeScript Style Guide**
   (https://google.github.io/styleguide/tsguide.html): named exports (default
   only where Next.js requires it); interfaces for contracts; no `any`, no
   non-null assertions, no unsafe casts; `UPPER_SNAKE_CASE` constants; classes
   take dependencies as `private readonly` constructor parameters; comments
   explain _why_.
2. **Beginner-friendly:** no class per provider, no custom hooks, no data
   library, at most one ternary per decision, `.catch(() => null)` instead of
   nested try/catch for "server unreachable".
3. Design system: dark, acid lime `#D1FE17` for **one** main action per
   screen, focus rings and active states only.

## Versions

ai 7, @ai-sdk/openai 4, @ai-sdk/anthropic 4, @ai-sdk/google 4, Zod 4,
Vitest 5 (`ai/test` provides `MockLanguageModelV4`).

## Shared (`packages/shared/src/providers.ts`, exported from the index)

- `PROVIDERS = ['openai', 'anthropic', 'google'] as const`; `Provider` type.
- `PROVIDER_INFO: Record<Provider, {label, keyUrl, models}>`:
  OpenAI (`https://platform.openai.com/api-keys`; `gpt-5.6-sol`, `gpt-5.5`, `chat-latest`),
  Anthropic (`https://console.anthropic.com/settings/keys`; `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-haiku-5-5`),
  Google Gemini (`https://aistudio.google.com/apikey`; `gemini-flash-latest`, `gemini-pro-latest`).
  Model ids are suggestions; prefer `-latest` aliases. Check current ids before recording.
- `providerSchema = z.enum(PROVIDERS)`; `saveProviderKeySchema = {apiKey: trimmed 20–500}`
  ("That does not look like a full API key."); `playgroundRequestSchema =
{provider, model 1–100, prompt trimmed 1–4000}` ("Write a prompt first.").
- Types `PlaygroundResult {provider, model, text, inputTokens, outputTokens, durationMs}`
  and `ProviderKeySummary {provider, last4, createdAt}`.
- In `packages/db`, build `providerEnum` with `pgEnum('provider', PROVIDERS)`
  (add `@binary/shared` as a dependency). `drizzle-kit generate` must report no changes.

## Database (`packages/db`)

`ProviderKeyRepository(db)`: `save(key)` upserts on `(userId, provider)`
(updating ciphertext, iv, last4, createdAt); `listForUser(userId)` selects only
`provider, last4, createdAt` ordered by provider; `find(userId, provider)`;
`delete(userId, provider)` returns whether a row was deleted. Export it.

## API (`apps/api`)

- `env.ts`: `ENCRYPTION_KEY` must base64-decode to exactly 32 bytes
  (message tells the user to run `openssl rand -base64 32`). Add it to
  `.env.example` as `change-me` with a warning that losing it makes saved keys
  unreadable. Add a fixed test-only value to `vitest.config.ts`.
- `keys/key-vault.ts`: `KeyVault(base64Key)` (throws unless 32 bytes);
  `encrypt(plaintext) → {ciphertext: base64(encrypted + 16-byte auth tag), iv: base64(12 random bytes)}`
  using `aes-256-gcm`; `decrypt(secret)` splits off the tag and throws on tampering.
- `engines/agent-engine.ts`: `GenerateRequest {prompt, system?}`,
  `GenerateResult {text, inputTokens, outputTokens}`, `interface AgentEngine {generate(...)}`.
- `engines/api-engine.ts`: `ApiEngine(model: LanguageModel)` calls
  `generateText({model, system, prompt})`, usage `?? 0`.
- `engines/language-models.ts`: `type LanguageModelFactory = (provider, model, apiKey) => LanguageModel`;
  a lookup object `{openai: createOpenAI, anthropic: createAnthropic, google: createGoogleGenerativeAI}`
  each called with `{apiKey}`; `createLanguageModel` = `PROVIDER_CLIENTS[provider](apiKey)(model)`.
- `engines/engine-factory.ts`: `MissingProviderKeyError(provider)` with message
  `Add your <label> API key in Settings first.`; `EngineFactory(providerKeys, keyVault, createModel)`
  with `create({userId, provider, model})`: find key → throw if missing → decrypt →
  `new ApiEngine(createModel(provider, model, apiKey))`.
- `container.ts`: `interface AppDependencies {providerKeys, keyVault, engineFactory}`;
  `createDependencies(createModel = createLanguageModel)`.
- `app-env.ts`: `AppEnv` with variables `session` and `user`; `requireUser`
  middleware (401 `{error: 'Not signed in.'}`; sets `user`).
- `app.ts`: `createApp(dependencies)`; CORS methods GET, POST, PUT, DELETE,
  OPTIONS; Better Auth on `/api/auth/*`; session middleware; `/health`;
  `/api/me` with `requireUser`; mount `/api/provider-keys` and `/api/playground`.
  `index.ts` serves `createApp(createDependencies())`.
- `routes/provider-keys.ts` (all `requireUser`): `GET /` → `{keys}`;
  `PUT /:provider` (404 unknown provider, 400 invalid body) encrypts, saves with
  `last4 = apiKey.slice(-4)`, returns `{provider, last4}`; `DELETE /:provider`
  → 204, or 404 when nothing existed.
- `routes/playground.ts`: validate body; `engineFactory.create` then
  `engine.generate({prompt})`; return `PlaygroundResult` with `durationMs`;
  `MissingProviderKeyError` → 400 `{error}`; any other error → 502
  `{error: 'The provider returned an error: <message>'}`.
- `test-helpers.ts`: `WEB_ORIGIN`, `cookieFrom(response)`, `signUpTestUser(app)`.

## Web (`apps/web`)

- Move the home page into a `(app)` route group. `(app)/layout.tsx`:
  `getSession()` or redirect to `/sign-in`; header with logo, `AppNav`
  (Home `/`, Playground `/playground`, API keys `/settings`, lucide icons,
  active link `bg-secondary`, labels hidden below `sm`), avatar initials
  (hidden below `sm`) and a ghost sign-out button (label hidden below `sm`,
  `aria-label="Sign out"`).
- `lib/server-api.ts`: `getFromApi<T>(path)` forwards the cookie, `cache: 'no-store'`,
  returns `null` when the response is not ok **or the fetch fails**. `getSession`
  uses it.
- Home: a clickable "next step" card chosen once (`ADD_KEY` → `/settings` or
  `TRY_PLAYGROUND` → `/playground` when any key exists), plus the "No agents yet" card.
- `/settings`: title "API keys", a lock line saying keys are AES-256-GCM
  encrypted and only the last 4 characters are shown; one `ProviderKeyCard`
  per provider: title, badge `•••• last4` or outline "Not added", "Get a key"
  link, password input + **secondary** Save, ghost "Remove key" when saved,
  `router.refresh()` after changes, error text on failure.
- `/playground` (`max-w-6xl`): textarea prompt, "Runs on X of 3 providers",
  lime "Run on all" button; three `ResultCard`s (`md:grid-cols-3`): title,
  shadcn `NativeSelect` of suggested models (disabled without a key), and
  states idle / "Thinking…" spinner / error / answer + `"<in> in · <out> out · <s>s"`.
  Without a key: "No key yet. Add one in API keys." Run providers in parallel,
  each updating only its own column.
- Add shadcn `textarea`, `badge`, `native-select`; then **fix any `from "cn"`
  import and remove the stray `cn` package** the CLI may add.

## Robustness (web + mobile)

Wrap `authClient.signIn.email` / `signUp.email` with `.catch(() => null)` and
show "Could not reach the server. Is the API running?" when the result is null.

## Tests

KeyVault (6): round trip, ciphertext hides key, new IV each time, tamper
rejected, wrong master key rejected, wrong length rejected. Routes (11, with
`createDependencies(fakeModel)` returning `MockLanguageModelV4` with
`doGenerate: {content: [{type: 'text', text}], finishReason: {unified: 'stop', raw: 'stop'}, usage: {inputTokens: {total, noCache, cacheRead, cacheWrite}, outputTokens: {total, text, reasoning}}, warnings: []}`):
401 without session; empty list; short key 400; unknown provider 404; save
returns only last4 and the list never contains the key; DB holds ciphertext;
playground passes the decrypted key and returns text + usage; missing key
400 with message; blank prompt 400; provider failure 502 with reason;
delete 204 then 404. Repository (3): save/list without secrets; replace;
delete reports existence.

## Docs

`docs/chapters/chapter-03/` (README with screenshots, IMPLEMENTATION,
ARCHITECTURE incl. API contracts and key-security table, TESTING, PR_REVIEW,
this prompt) and Mermaid diagrams: components, `AgentEngine` class diagram,
save-key and playground sequences, encryption flow, composition root, shared
provider list. Update the root README (ENCRYPTION_KEY step, status) and
`docs/DESIGN_SYSTEM.md` (new components, app shell, one-lime rule).

## Acceptance criteria

- With real keys: the same prompt is answered by OpenAI, Anthropic and Gemini
  side by side.
- No API response and no database column contains a plain API key.
- All tests pass (shared 4, db 14, api 23), plus lint, format, type-check,
  web build and `expo export --platform android`.
- At 390px wide, no page scrolls horizontally.
