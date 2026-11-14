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
