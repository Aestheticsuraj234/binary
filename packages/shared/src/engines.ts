/**
 * How an agent thinks (the database enum uses this list):
 *
 * - api: a model through its provider's API, with Binary's tools (Chapter 3)
 * - claude_code: the Claude Code CLI on your computer, through the Runner
 * - codex: the Codex CLI on your computer, through the Runner
 *
 * The CLI engines bring their own model, tools and sign-in.
 */
export const AGENT_ENGINES = ['api', 'claude_code', 'codex'] as const;

export type AgentEngine = (typeof AGENT_ENGINES)[number];

/** The engines that run as a CLI on the user's computer. */
export type CliEngine = Exclude<AgentEngine, 'api'>;

export const AGENT_ENGINE_INFO: Record<
  AgentEngine,
  {label: string; description: string}
> = {
  api: {
    label: 'A model (API key)',
    description:
      'A model from OpenAI, Anthropic or Google, using Binary’s tools and permissions.',
  },
  claude_code: {
    label: 'Claude Code (your computer)',
    description:
      'The Claude Code CLI, run by the Runner in your first shared folder. It uses its own tools and your Claude sign-in.',
  },
  codex: {
    label: 'Codex (your computer)',
    description:
      'The Codex CLI, run by the Runner in your first shared folder. It uses its own tools and your OpenAI sign-in.',
  },
};
