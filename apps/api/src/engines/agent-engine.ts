export interface GenerateRequest {
  prompt: string;
  /** Instructions that shape every answer, e.g. the agent's role. */
  system?: string;
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
  generate(request: GenerateRequest): Promise<GenerateResult>;
}
