import {generateText, streamText, type LanguageModel} from 'ai';

import type {
  AgentEngine,
  GenerateRequest,
  GenerateResult,
} from './agent-engine';

/** The conversation so far, then the new message. */
function toMessages({prompt, history = []}: GenerateRequest) {
  return [...history, {role: 'user' as const, content: prompt}];
}

/** An engine that thinks with a hosted LLM through the Vercel AI SDK. */
export class ApiEngine implements AgentEngine {
  constructor(private readonly model: LanguageModel) {}

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const result = await generateText({
      model: this.model,
      system: request.system,
      messages: toMessages(request),
    });
    return {
      text: result.text,
      // Some providers leave usage out; count that as zero.
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    };
  }

  async *stream(request: GenerateRequest): AsyncGenerator<string> {
    const result = streamText({
      model: this.model,
      system: request.system,
      messages: toMessages(request),
      // Errors arrive as parts of the stream below, where we throw them.
      // This empty handler only stops the SDK logging them a second time.
      onError: () => {},
    });
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        yield part.text;
      } else if (part.type === 'error') {
        throw part.error;
      }
    }
  }
}
