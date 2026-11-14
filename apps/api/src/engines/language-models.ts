import {createAnthropic} from '@ai-sdk/anthropic';
import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {createOpenAI} from '@ai-sdk/openai';
import type {Provider} from '@binary/shared';
import type {LanguageModel} from 'ai';

/** Builds a ready-to-call model for one provider, model id and API key. */
export type LanguageModelFactory = (
  provider: Provider,
  model: string,
  apiKey: string,
) => LanguageModel;

// One entry per provider. Adding a provider means adding one line here
// (and its id to PROVIDERS in packages/shared).
const PROVIDER_CLIENTS = {
  openai: (apiKey: string) => createOpenAI({apiKey}),
  anthropic: (apiKey: string) => createAnthropic({apiKey}),
  google: (apiKey: string) => createGoogleGenerativeAI({apiKey}),
};

export const createLanguageModel: LanguageModelFactory = (
  provider,
  model,
  apiKey,
) => PROVIDER_CLIENTS[provider](apiKey)(model);
