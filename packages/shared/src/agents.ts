import {z} from 'zod';

import {APPROVAL_MODES, type ApprovalMode} from './approvals';
import {characterSchema} from './characters';
import {type Provider, providerSchema} from './providers';
import {AGENT_COMPUTERS, type AgentComputer} from './computers';
import {AGENT_ENGINES, type AgentEngine} from './engines';

// The web form and the API both validate with these schemas, so a user sees
// the same messages wherever a mistake is caught.

export const agentInputSchema = z
  .object({
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
    /** How it thinks: a model through an API, or a CLI on your computer. */
    engine: z.enum(AGENT_ENGINES).default('api'),
    /** Only for the api engine; CLI engines bring their own model. */
    provider: providerSchema.nullish(),
    model: z.string().trim().max(100).nullish(),
    /** The character that plays this agent (saved in the `avatar` column). */
    avatar: characterSchema,
    /** How much the agent may do without asking (Chapter 8). */
    approvalMode: z.enum(APPROVAL_MODES),
    /** The computer it works on, if any: a cloud sandbox or a browser. */
    defaultComputer: z.enum(AGENT_COMPUTERS).nullable().default(null),
    /** The template this agent was hired from, if any. */
    templateId: z.uuid().nullish(),
  })
  .superRefine((agent, context) => {
    if (agent.engine !== 'api') {
      return;
    }
    if (!agent.provider) {
      context.addIssue({
        code: 'custom',
        path: ['provider'],
        message: 'Choose who it thinks with.',
      });
    }
    if (!agent.model) {
      context.addIssue({
        code: 'custom',
        path: ['model'],
        message: 'Choose a model.',
      });
    }
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
  engine: AgentEngine;
  // Empty for the CLI engines, which bring their own model.
  provider: Provider | null;
  model: string | null;
  approvalMode: ApprovalMode;
  defaultComputer: AgentComputer | null;
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
