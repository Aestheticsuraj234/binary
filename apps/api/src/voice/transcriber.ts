import {createOpenAI} from '@ai-sdk/openai';
import type {ProviderKeyRepository} from '@binary/db';
import {experimental_transcribe as transcribe} from 'ai';

import type {KeyVault} from '../keys/key-vault';

/** Turns a voice recording into text. */
export interface Transcriber {
  /** `names` are words to spell right: the user's characters. */
  transcribe(audio: Uint8Array, names: string[]): Promise<string>;
}

/** Builds a transcriber for an OpenAI key (tests pass a fake). */
export type TranscriberMaker = (apiKey: string) => Transcriber;

/** OpenAI's speech-to-text model: fast, cheap, and good with accents. */
export const TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';

export const createTranscriber: TranscriberMaker = (apiKey) => {
  const model = createOpenAI({apiKey}).transcription(TRANSCRIPTION_MODEL);
  return {
    async transcribe(audio, names) {
      const {text} = await transcribe({
        model,
        audio,
        maxRetries: 2,
        // Without a hint, "Bolt" is easily heard as "bold"; @mentions in a
        // room need the names spelled exactly.
        providerOptions: {
          openai:
            names.length > 0 ? {prompt: `Names: ${names.join(', ')}.`} : {},
        },
      });
      return text.trim();
    },
  };
};

/**
 * Voice input, with the user's own OpenAI key like everything else. Only
 * OpenAI is used: Anthropic has no speech-to-text model.
 */
export class Voice {
  constructor(
    private readonly providerKeys: ProviderKeyRepository,
    private readonly keyVault: KeyVault,
    private readonly make: TranscriberMaker = createTranscriber,
  ) {}

  /** Undefined when the user has no OpenAI key. */
  async forUser(userId: string): Promise<Transcriber | undefined> {
    const saved = await this.providerKeys.find(userId, 'openai');
    if (!saved) {
      return undefined;
    }
    const apiKey = this.keyVault.decrypt({
      ciphertext: saved.encryptedKey,
      iv: saved.iv,
    });
    return this.make(apiKey);
  }
}
