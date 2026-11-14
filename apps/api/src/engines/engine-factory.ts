import type {ProviderKeyRepository} from '@binary/db';
import {PROVIDER_INFO, type Provider} from '@binary/shared';

import type {KeyVault} from '../keys/key-vault';
import type {AgentEngine} from './agent-engine';
import {ApiEngine} from './api-engine';
import type {LanguageModelFactory} from './language-models';

/** Thrown when a user asks for a provider they have not added a key for. */
export class MissingProviderKeyError extends Error {
  constructor(provider: Provider) {
    super(
      `Add your ${PROVIDER_INFO[provider].label} API key in Settings first.`,
    );
  }
}

interface EngineRequest {
  userId: string;
  provider: Provider;
  model: string;
}

/**
 * Builds the right engine for a request (the Factory pattern).
 * It looks up the user's saved key, decrypts it, and hands back an engine
 * that is ready to answer. Callers never touch keys or SDKs themselves.
 */
export class EngineFactory {
  constructor(
    private readonly providerKeys: ProviderKeyRepository,
    private readonly keyVault: KeyVault,
    private readonly createModel: LanguageModelFactory,
  ) {}

  async create({userId, provider, model}: EngineRequest): Promise<AgentEngine> {
    const savedKey = await this.providerKeys.find(userId, provider);
    if (!savedKey) {
      throw new MissingProviderKeyError(provider);
    }

    const apiKey = this.keyVault.decrypt({
      ciphertext: savedKey.encryptedKey,
      iv: savedKey.iv,
    });
    return new ApiEngine(this.createModel(provider, model, apiKey));
  }
}
