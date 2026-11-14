import {z} from 'zod';

/** The LLM providers Binary can talk to. The database enum uses this list. */
export const PROVIDERS = ['openai', 'anthropic', 'google'] as const;

export type Provider = (typeof PROVIDERS)[number];

export interface ProviderInfo {
  label: string;
  /** Where a user creates an API key for this provider. */
  keyUrl: string;
  /** Suggested models, best default first. Any valid model id also works. */
  models: string[];
}

// Model ids change often. Where a provider offers an alias that always points
// to its latest model (like `gemini-flash-latest`), we prefer the alias.
export const PROVIDER_INFO: Record<Provider, ProviderInfo> = {
  openai: {
    label: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: ['gpt-5.6-sol', 'gpt-5.5', 'chat-latest'],
  },
  anthropic: {
    label: 'Anthropic',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5'],
  },
  google: {
    label: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/apikey',
    models: ['gemini-flash-latest', 'gemini-pro-latest'],
  },
};

export const providerSchema = z.enum(PROVIDERS);

export const saveProviderKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20, 'That does not look like a full API key.')
    .max(500, 'That key is too long.'),
});

export const playgroundRequestSchema = z.object({
  provider: providerSchema,
  model: z.string().trim().min(1, 'Choose a model.').max(100),
  prompt: z
    .string()
    .trim()
    .min(1, 'Write a prompt first.')
    .max(4000, 'Keep the prompt under 4,000 characters.'),
});

export type PlaygroundRequest = z.infer<typeof playgroundRequestSchema>;

/** What the API returns for one playground run. */
export interface PlaygroundResult {
  provider: Provider;
  model: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

/** What the API returns for a saved key: never the key itself. */
export interface ProviderKeySummary {
  provider: Provider;
  last4: string;
  createdAt: string;
}
