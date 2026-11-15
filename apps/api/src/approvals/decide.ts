import type {AgentRepository, RoomRepository} from '@binary/db';
import type {ChatMessage} from '@binary/shared';

import {writeReply, type ReplyDependencies} from '../chat/reply';
import type {PromptImage} from '../engines/agent-engine';
import type {EngineFactory} from '../engines/engine-factory';
import {AppError, NotFoundError} from '../errors';

export interface DecideDependencies extends ReplyDependencies {
  agents: AgentRepository;
  engineFactory: EngineFactory;
  rooms: RoomRepository;
}

export interface Decision {
  userId: string;
  approvalId: string;
  decision: 'approved' | 'rejected';
}

export interface DecisionResult {
  /** The agent's follow-up in the chat, when it could write one. */
  reply?: ChatMessage;
  /** Why there is no follow-up, if there isn't one. */
  error?: string;
}

// A tool result is shown to the agent, so very long ones are cut.
const MAX_RESULT_LENGTH = 2000;

/** MCP tools report their own failures with `isError: true`. */
function reportsError(output: unknown): boolean {
  return (
    typeof output === 'object' &&
    output !== null &&
    Reflect.get(output, 'isError') === true
  );
}

function asText(output: unknown): string {
  const text = JSON.stringify(output) ?? '';
  return text.length > MAX_RESULT_LENGTH
    ? `${text.slice(0, MAX_RESULT_LENGTH)}…`
    : text;
}

/**
 * Carries out the user's decision on a tool call the agent asked for:
 *
 * 1. Record it, if nobody decided first (otherwise 409, nothing runs).
 * 2. Approved: run the tool with the input the agent gave, and save the
 *    result. Rejected: save that it was rejected.
 * 3. Let the agent continue the chat with the outcome.
 *
 * Steps 1 and 2 always finish; if step 3 fails (no key, provider down), the
 * reason comes back as `error` next to a decision that still stands.
 */
export async function decideApproval(
  deps: DecideDependencies,
  {userId, approvalId, decision}: Decision,
): Promise<DecisionResult> {
  const approval = await deps.approvals.findForUser(userId, approvalId);
  if (!approval) {
    throw new NotFoundError('Request');
  }
  if (!(await deps.approvals.decide(approval.id, decision))) {
    throw new AppError('This request was already decided.', 409);
  }

  const {toolCall} = approval;
  const tool = toolCall.toolName.replaceAll('_', ' ');
  const agent = await deps.agents.findForUser(userId, approval.agent.id);
  // `note` is saved in the chat for the user; `instruction` is for the model
  // only, and carries the raw tool result it needs to carry on.
  let note: string;
  let instruction: string;
  let images: PromptImage[] = [];
  if (decision === 'approved') {
    // The same tools the agent had in that chat, sandbox included.
    const {toolbox} = await deps.toolboxes.forUser(userId, {
      threadId: approval.threadId,
      agentId: approval.agent.id,
      computer: agent?.defaultComputer ?? null,
    });
    let output: unknown;
    let failed: boolean;
    // What the model reads: a chart becomes a note, for example.
    let modelView: unknown;
    try {
      output = await toolbox.runApproved(toolCall.toolName, toolCall.input);
      failed = reportsError(output);
      modelView = toolbox.forModel(toolCall.toolName, output);
      // A desktop agent must see the screen after its click to carry on.
      images = toolbox.imagesIn(toolCall.toolName, output);
    } catch (error) {
      output = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      failed = true;
      modelView = output;
    } finally {
      await toolbox.close();
    }
    await deps.toolCalls.finish(
      toolCall.id,
      failed ? 'failed' : 'succeeded',
      output,
    );
    await deps.approvals.markExecuted(approval.id);
    note = `You approved ${tool}.${failed ? ' It failed.' : ''}`;
    instruction = [
      `The tool's result: ${asText(modelView)}`,
      images.length > 0 ? 'The screen afterwards is attached.' : '',
      'Tell the user what happened, briefly, and carry on with the task.',
    ]
      .filter(Boolean)
      .join('\n');
  } else {
    await deps.toolCalls.finish(toolCall.id, 'rejected', {rejected: true});
    note = `You rejected ${tool}.`;
    instruction =
      'Acknowledge it briefly. Do not try the same thing again unless the user asks.';
  }

  // The agent picks up where it left off, in the same chat.
  try {
    if (!agent) {
      throw new NotFoundError('Agent');
    }
    const engine = await deps.engineFactory.forAgent(userId, agent);
    // In a room, the agent still knows who else is there.
    const room = approval.roomId
      ? await deps.rooms.findForUser(userId, approval.roomId)
      : undefined;
    const reply = await writeReply(deps, {
      userId,
      agent,
      engine,
      threadId: approval.threadId,
      content: note,
      savedAs: 'tool',
      instruction,
      images,
      room: room && {
        name: room.name,
        members: room.members.map(({id, name, role}) => ({id, name, role})),
      },
    });
    return {reply};
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error(error);
    }
    return {
      error:
        error instanceof AppError
          ? error.message
          : 'The agent could not reply.',
    };
  }
}
