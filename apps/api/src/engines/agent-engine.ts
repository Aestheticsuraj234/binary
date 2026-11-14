import type {ChatTurn} from '@binary/shared';

export interface GenerateRequest {
  prompt: string;
  /** Instructions that shape every answer, e.g. the agent's role. */
  system?: string;
  /** Earlier messages, oldest first, so the model can follow a conversation. */
  history?: ChatTurn[];
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * How an agent thinks (the Strategy pattern).
 *
 * Every engine answers the same way, so the rest of the app never cares
 * which one is behind it. Today there is ApiEngine (OpenAI, Anthropic,
 * Gemini). Chapter 11 adds engines that run Claude Code and Codex.
 */
export interface AgentEngine {
  /** The whole answer at once (the playground). */
  generate(request: GenerateRequest): Promise<GenerateResult>;
  /**
   * The answer piece by piece, as the model writes it (chat). Throws if the
   * provider fails part-way.
   */
  stream(request: GenerateRequest): AsyncIterable<string>;
}
