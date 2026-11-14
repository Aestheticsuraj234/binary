import {generateText, stepCountIs, streamText, type LanguageModel} from 'ai';

import type {
  AgentEngine,
  EngineEvent,
  GenerateRequest,
  GenerateResult,
} from './agent-engine';

// One step is one model call. Calling a tool and then answering takes two;
// the cap stops a confused model from calling tools forever.
const MAX_STEPS = 5;

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

  async *stream(request: GenerateRequest): AsyncGenerator<EngineEvent> {
    const result = streamText({
      model: this.model,
      system: request.system,
      messages: toMessages(request),
      tools: request.tools,
      stopWhen: stepCountIs(MAX_STEPS),
      // Errors arrive as parts of the stream below, where we throw them.
      // This empty handler only stops the SDK logging them a second time.
      onError: () => {},
    });
    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          yield {type: 'text', text: part.text};
          break;
        case 'tool-call':
          yield {
            type: 'tool-call',
            id: part.toolCallId,
            name: part.toolName,
            input: part.input,
          };
          break;
        case 'tool-result':
          yield {type: 'tool-result', id: part.toolCallId, output: part.output};
          break;
        case 'tool-error':
          yield {
            type: 'tool-error',
            id: part.toolCallId,
            error:
              part.error instanceof Error
                ? part.error.message
                : String(part.error),
          };
          break;
        case 'error':
          throw part.error;
      }
    }
  }
}
