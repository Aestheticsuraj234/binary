# Request flow: saving a key and running the playground

## Saving an API key

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant C as ProviderKeyCard<br/>(client)
  participant R as PUT /api/provider-keys/:provider
  participant V as KeyVault
  participant K as ProviderKeyRepository
  participant DB as Postgres

  U->>C: Paste key, press Save
  C->>C: saveProviderKeySchema.safeParse
  C->>R: PUT {apiKey} (cookie)
  R->>R: requireUser · providerSchema · body schema
  R->>V: encrypt(apiKey)
  V-->>R: {ciphertext (data + auth tag), iv}
  R->>K: save({userId, provider, ciphertext, iv, last4})
  K->>DB: INSERT … ON CONFLICT (user_id, provider) DO UPDATE
  R-->>C: {provider, last4}
  C->>C: router.refresh() → badge "•••• last4"
```

The plain key exists only in this one request's memory. The response,
the list endpoint and the database never contain it.

## Running one prompt on every provider

```mermaid
sequenceDiagram
  autonumber
  participant P as Playground (client)
  participant R as POST /api/playground
  participant F as EngineFactory
  participant K as ProviderKeyRepository
  participant V as KeyVault
  participant E as ApiEngine
  participant AI as Provider API

  P->>R: {provider: openai, model, prompt}
  P->>R: {provider: anthropic, model, prompt}
  Note over P,R: One request per connected provider, in parallel.<br/>Each column fills in as soon as its answer arrives.
  R->>F: create({userId, provider, model})
  F->>K: find(userId, provider)
  alt no key saved
    F-->>R: throw MissingProviderKeyError
    R-->>P: 400 "Add your … API key in Settings first."
  else key found
    F->>V: decrypt({ciphertext, iv})
    F->>E: new ApiEngine(createLanguageModel(provider, model, key))
    R->>E: generate({prompt})
    E->>AI: generateText(...)
    alt provider error (bad key, unknown model)
      AI-->>R: error
      R-->>P: 502 "The provider returned an error: …"
    else success
      AI-->>E: text + usage
      R-->>P: {text, inputTokens, outputTokens, durationMs}
    end
  end
```
