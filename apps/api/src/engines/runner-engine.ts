import type {ChatTurn, CliEngine, RunnerEvent} from '@binary/shared';

import type {YourComputers} from '../runner/your-computers';
import type {
  AgentEngine,
  EngineEvent,
  GenerateRequest,
  GenerateResult,
} from './agent-engine';

// A CLI agent can work for a while: reading code, running tests.
const ENGINE_TIMEOUT_MS = 15 * 60_000;

/**
 * One prompt with everything the CLI needs: the agent's instructions, the
 * chat so far and the new message. (Each run of the CLI starts fresh.)
 */
export function cliPrompt({system, history = [], prompt}: GenerateRequest) {
  const transcript = history
    .map(
      (turn: ChatTurn) =>
        `${turn.role === 'user' ? 'User' : 'You'}: ${turn.content}`,
    )
    .join('\n\n');
  return [
    system ? `<instructions>\n${system}\n</instructions>` : '',
    transcript ? `<conversation>\n${transcript}\n</conversation>` : '',
    `User: ${prompt}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function toEngineEvent(event: RunnerEvent): EngineEvent {
  switch (event.type) {
    case 'text':
      return event;
    case 'tool-call':
      // The CLI ran it on the user's computer, under its own permissions.
      return {...event, risk: 'computer'};
    case 'tool-result':
      return event;
  }
}

/**
 * Thinks with Claude Code or Codex, run by the Runner on the user's
 * computer (the Strategy pattern again: the chat can't tell). What the CLI
 * writes and the tools it uses stream into the chat as they happen.
 *
 * The CLI uses its own tools, so Binary's are not passed to it; the agent's
 * approval mode chooses how far the CLI may go (`permission`).
 */
export class RunnerEngine implements AgentEngine {
  constructor(
    private readonly computers: YourComputers,
    private readonly userId: string,
    private readonly engine: CliEngine,
    private readonly permission: 'plan' | 'read_only' | 'edit',
  ) {}

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    let text = '';
    for await (const event of this.stream(request)) {
      if (event.type === 'text') {
        text += event.text;
      }
    }
    // The CLI does not report tokens; usage tracking (Chapter 15) will.
    return {text, inputTokens: 0, outputTokens: 0};
  }

  async *stream(request: GenerateRequest): AsyncGenerator<EngineEvent> {
    const queue: EngineEvent[] = [];
    let wake: (() => void) | undefined;
    let done = false;
    let failure: Error | undefined;

    this.computers
      .run(
        this.userId,
        {
          type: 'engine',
          engine: this.engine,
          prompt: cliPrompt(request),
          permission: this.permission,
        },
        {
          timeoutMs: ENGINE_TIMEOUT_MS,
          onEvent: (event) => {
            queue.push(toEngineEvent(event));
            wake?.();
          },
        },
      )
      .catch((error: unknown) => {
        failure = error instanceof Error ? error : new Error(String(error));
      })
      .finally(() => {
        done = true;
        wake?.();
      });

    while (true) {
      const event = queue.shift();
      if (event) {
        yield event;
        continue;
      }
      if (done) {
        break;
      }
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
      wake = undefined;
    }
    if (failure) {
      throw failure;
    }
  }
}
