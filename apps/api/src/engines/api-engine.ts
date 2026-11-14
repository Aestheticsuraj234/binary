import {generateText, type LanguageModel} from 'ai';

import type {
  AgentEngine,
  GenerateRequest,
  GenerateResult,
} from './agent-engine';

/** An engine that thinks with a hosted LLM through the Vercel AI SDK. */
export class ApiEngine implements AgentEngine {
  constructor(private readonly model: LanguageModel) {}

  async generate({
    prompt,
    system,
    history = [],
  }: GenerateRequest): Promise<GenerateResult> {
    const result = await generateText({
      model: this.model,
      system,
      messages: [...history, {role: 'user', content: prompt}],
    });
    return {
      text: result.text,
      // Some providers leave usage out; count that as zero.
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    };
  }
}
