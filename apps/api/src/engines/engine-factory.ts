import type {ProviderKeyRepository} from '@binary/db';
import type {Provider} from '@binary/shared';

import {MissingProviderKeyError} from '../errors';
import type {KeyVault} from '../keys/key-vault';
import type {AgentEngine} from './agent-engine';
import {ApiEngine} from './api-engine';
import type {LanguageModelFactory} from './language-models';

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
