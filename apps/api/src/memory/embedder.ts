import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {createOpenAI} from '@ai-sdk/openai';
import type {ProviderKeyRepository} from '@binary/db';
import {embedMany} from 'ai';

import type {KeyVault} from '../keys/key-vault';

// Every vector has this length, to fit the `vector(1536)` columns.
const DIMENSIONS = 1536;
// One request embeds at most this many passages.
const BATCH_SIZE = 96;

/** Turns text into vectors that are close when the meanings are close. */
export interface Embedder {
  /** Saved next to each vector: only vectors of one model compare. */
  readonly model: string;
  embed(values: string[]): Promise<number[][]>;
}

/** The providers with embedding models, best first. Anthropic has none. */
export const EMBEDDING_PROVIDERS = ['openai', 'google'] as const;

export type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number];

/** Builds an embedder for a provider and key (tests pass a fake). */
export type EmbedderMaker = (
  provider: EmbeddingProvider,
  apiKey: string,
) => Embedder;

const MODELS = {
  openai: (apiKey: string) =>
    createOpenAI({apiKey}).embedding('text-embedding-3-small'),
  google: (apiKey: string) =>
    createGoogleGenerativeAI({apiKey}).embedding('gemini-embedding-001'),
};

const MODEL_NAMES: Record<EmbeddingProvider, string> = {
  openai: 'openai/text-embedding-3-small',
  google: 'google/gemini-embedding-001',
};

export const createEmbedder: EmbedderMaker = (provider, apiKey) => {
  const model = MODELS[provider](apiKey);
  return {
    model: MODEL_NAMES[provider],
    async embed(values) {
      const vectors: number[][] = [];
      for (let start = 0; start < values.length; start += BATCH_SIZE) {
        const {embeddings} = await embedMany({
          model,
          values: values.slice(start, start + BATCH_SIZE),
          dimensions: DIMENSIONS,
          maxRetries: 2,
        });
        vectors.push(...embeddings);
      }
      return vectors;
    },
  };
};

/**
 * Finds an embedding model for a user: OpenAI's if they saved an OpenAI
 * key, else Google's, else none (memory and knowledge are then off).
 */
export class EmbedderFactory {
  constructor(
    private readonly providerKeys: ProviderKeyRepository,
    private readonly keyVault: KeyVault,
    private readonly make: EmbedderMaker = createEmbedder,
  ) {}

  async forUser(userId: string): Promise<Embedder | undefined> {
    for (const provider of EMBEDDING_PROVIDERS) {
      const saved = await this.providerKeys.find(userId, provider);
      if (saved) {
        const apiKey = this.keyVault.decrypt({
          ciphertext: saved.encryptedKey,
          iv: saved.iv,
        });
        return this.make(provider, apiKey);
      }
    }
    return undefined;
  }
}
