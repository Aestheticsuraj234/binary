# Integration flow: encryption and wiring

## How a key is encrypted (AES-256-GCM)

```mermaid
flowchart LR
  K["ENCRYPTION_KEY<br/>32 random bytes (.env)"] --> C
  P["Plain API key<br/>sk-…abcd"] --> C["createCipheriv('aes-256-gcm')"]
  IV["randomBytes(12)<br/>new for every key"] --> C
  C --> CT["encrypted bytes"]
  C --> TAG["16-byte auth tag"]
  CT --> J["base64(encrypted + tag)<br/>→ encrypted_key"]
  TAG --> J
  IV --> IVB["base64(iv)<br/>→ iv"]
  P --> L["last 4 chars<br/>→ last4"]
```

Decrypting splits the tag off again. If a single byte of the stored data
changes, or the wrong `ENCRYPTION_KEY` is used, decryption throws.

## Composition root

```mermaid
flowchart TD
  IDX["src/index.ts"] --> CD["createDependencies()"]
  TEST["routes.test.ts"] --> CDF["createDependencies(fakeModel)"]
  CD --> D["{providerKeys, keyVault, engineFactory}"]
  CDF --> D
  D --> APP["createApp(dependencies)"]
  APP --> R1["providerKeyRoutes(deps)"]
  APP --> R2["playgroundRoutes(deps)"]
```

Real and test apps are built the same way; only the model factory differs.
That is why the tests never call a real provider and never need a real key.

## Shared provider list

```mermaid
flowchart LR
  S["packages/shared<br/>PROVIDERS = ['openai','anthropic','google']"]
  S --> DB["packages/db<br/>pgEnum('provider', PROVIDERS)"]
  S --> API["apps/api<br/>providerSchema (Zod)"]
  S --> WEB["apps/web<br/>cards, columns, model lists"]
```
