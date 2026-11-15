import type {ChatTurn, ToolRisk} from '@binary/shared';
import type {ToolSet} from 'ai';

export interface GenerateRequest {
  prompt: string;
  /** Instructions that shape every answer, e.g. the agent's role. */
  system?: string;
  /** Earlier messages, oldest first, so the model can follow a conversation. */
  history?: ChatTurn[];
  /** Tools the model may call while answering (chat only). */
  tools?: ToolSet;
  /**
   * Pictures sent with the new message, e.g. the screen after a desktop
   * click the user approved, so the model can see what happened.
   */
  images?: PromptImage[];
}

/** An image in base64, with its type ("image/png"). */
export interface PromptImage {
  mediaType: string;
  data: string;
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * What happens while an agent answers, in order: pieces of text, and tools
 * it calls along the way with their results.
 */
export type EngineEvent =
  | {type: 'text'; text: string}
  | {
      type: 'tool-call';
      id: string;
      name: string;
      input: unknown;
      /** Set by engines whose tools Binary does not know (the CLIs). */
      risk?: ToolRisk;
    }
  | {type: 'tool-result'; id: string; output: unknown}
  | {type: 'tool-error'; id: string; error: string};

/**
 * How an agent thinks (the Strategy pattern).
 *
 * Every engine answers the same way, so the rest of the app never cares
 * which one is behind it. ApiEngine thinks with OpenAI, Anthropic or
 * Gemini; RunnerEngine runs Claude Code or Codex on the user's computer.
 */
export interface AgentEngine {
  /** The whole answer at once (the playground). */
  generate(request: GenerateRequest): Promise<GenerateResult>;
  /**
   * The answer as it happens (chat): text pieces and tool calls. Throws if
   * the provider fails part-way.
   */
  stream(request: GenerateRequest): AsyncIterable<EngineEvent>;
}
