# System overview: Chapter 3

> Mermaid diagrams (Jojopen was not connected in the session that built this
> chapter; Mermaid is the documented fallback).

## Components

```mermaid
flowchart LR
  subgraph web["apps/web"]
    SET["/settings<br/>ProviderKeyCard ×3"]
    PG["/playground<br/>Playground + ResultCard ×3"]
  end

  subgraph api["apps/api"]
    ROOT["container.ts<br/>createDependencies()"]
    RK["routes/provider-keys.ts"]
    RP["routes/playground.ts"]
    KV["KeyVault<br/>AES-256-GCM"]
    EF["EngineFactory"]
    AE["ApiEngine<br/>(AgentEngine)"]
    LM["createLanguageModel()"]
  end

  subgraph db["packages/db"]
    PKR["ProviderKeyRepository"]
  end

  PROV["OpenAI · Anthropic · Gemini<br/>(Vercel AI SDK)"]
  PGDB[("provider_keys<br/>ciphertext + iv + last4")]

  SET -- "PUT / DELETE / GET" --> RK
  PG -- "POST ×3 in parallel" --> RP
  ROOT -. "creates + injects" .-> KV & PKR & EF
  RK --> KV
  RK --> PKR
  RP --> EF
  EF --> PKR
  EF --> KV
  EF --> LM
  EF --> AE
  AE --> PROV
  PKR --> PGDB
```

## Strategy and Factory

```mermaid
classDiagram
  class AgentEngine {
    <<interface>>
    +generate(request) Promise~GenerateResult~
  }
  class ApiEngine {
    -model: LanguageModel
    +generate(request) Promise~GenerateResult~
  }
  class EngineFactory {
    -providerKeys: ProviderKeyRepository
    -keyVault: KeyVault
    -createModel: LanguageModelFactory
    +create(userId, provider, model) Promise~AgentEngine~
  }
  class KeyVault {
    -key: Buffer
    +encrypt(plaintext) EncryptedSecret
    +decrypt(secret) string
  }
  class ProviderKeyRepository {
    +save(key)
    +listForUser(userId)
    +find(userId, provider)
    +delete(userId, provider) boolean
  }
  class MissingProviderKeyError

  AgentEngine <|.. ApiEngine : implements
  EngineFactory ..> AgentEngine : creates
  EngineFactory --> ProviderKeyRepository
  EngineFactory --> KeyVault
  EngineFactory ..> MissingProviderKeyError : throws
```

`ClaudeCodeEngine` and `CodexEngine` (Chapter 11) will implement the same
`AgentEngine` interface, so nothing that calls `generate()` changes.
