import {z} from 'zod';

import {characterSchema} from './characters';
import {type Provider, providerSchema} from './providers';

// The web form and the API both validate with these schemas, so a user sees
// the same messages wherever a mistake is caught.

export const agentInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give your agent a name.')
    .max(60, 'Keep the name under 60 characters.'),
  role: z
    .string()
    .trim()
    .min(1, 'Describe what this agent does.')
    .max(200, 'Keep the role under 200 characters.'),
  instructions: z
    .string()
    .trim()
    .max(4000, 'Keep the instructions under 4,000 characters.'),
  provider: providerSchema,
  model: z.string().trim().min(1, 'Choose a model.').max(100),
  /** The character that plays this agent (saved in the `avatar` column). */
  avatar: characterSchema,
  /** The template this agent was hired from, if any. */
  templateId: z.uuid().nullish(),
});

export type AgentInput = z.infer<typeof agentInputSchema>;

/** One earlier message in the conversation the browser is holding. */
export const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(8000),
});

export type ChatTurn = z.infer<typeof chatTurnSchema>;

export const runAgentSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, 'Write a message first.')
    .max(4000, 'Keep the message under 4,000 characters.'),
  // Chat is not saved yet (Chapter 5), so the browser sends the recent
  // conversation along. The cap keeps requests and token costs small.
  history: z.array(chatTurnSchema).max(20).default([]),
});

/** What the API returns for an agent. */
export interface Agent {
  id: string;
  templateId: string | null;
  /** A character id; see `characterOf` for older or empty values. */
  avatar: string | null;
  name: string;
  role: string;
  instructions: string;
  // Empty only for engines that bring their own model (Chapter 11).
  provider: Provider | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A ready-made starting point, e.g. "Research Assistant". */
export interface AgentTemplate {
  id: string;
  slug: string;
  name: string;
  role: string;
  instructions: string;
}

/** What the API returns for one agent run. */
export interface AgentRunResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}
