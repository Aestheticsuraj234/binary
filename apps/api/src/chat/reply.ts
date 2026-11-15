import type {
  ApprovalRepository,
  MessageRepository,
  ThreadRepository,
  ToolCallRepository,
} from '@binary/db';
import type {
  ApprovalMode,
  ChatMessage,
  ComputerKind,
  ChatStreamEvent,
  ChatTurn,
} from '@binary/shared';

import {buildSystemPrompt} from '../agents/system-prompt';
import type {AgentEngine, PromptImage} from '../engines/agent-engine';
import {ProviderError} from '../errors';
import {approvalPolicy} from '../tools/policy';
import type {ToolboxFactory} from '../tools/toolbox-factory';
import {titleFrom} from './title';
import {ToolCallLog} from './tool-call-log';

// How many earlier messages the model reads. Older ones are still saved and
// shown; they just stop costing tokens on every reply.
const HISTORY_LIMIT = 20;

/** "shop refund order {"orderId":"A1"}": what the inbox shows. */
export function toolSummary(toolName: string, input: unknown): string {
  const details = JSON.stringify(input ?? {});
  const summary = `${toolName.replaceAll('_', ' ')} ${details}`;
  return summary.length > 200 ? `${summary.slice(0, 199)}…` : summary;
}

export interface ReplyDependencies {
  messages: MessageRepository;
  threads: ThreadRepository;
  toolCalls: ToolCallRepository;
  approvals: ApprovalRepository;
  toolboxes: ToolboxFactory;
}

export interface ReplyRequest {
  userId: string;
  agent: {
    id: string;
    name: string;
    role: string;
    instructions: string;
    avatar: string | null;
    approvalMode: ApprovalMode;
    defaultComputer: ComputerKind | null;
  };
  engine: AgentEngine;
  threadId: string;
  content: string;
  /**
   * Who the saved message is from. "tool" is a note about an approval
   * ("You approved …"), shown in the chat as a line rather than a bubble.
   */
  savedAs?: 'user' | 'tool';
  /** Extra words for the model only, after `content`. */
  instruction?: string;
  /** Pictures for the model only, with `content`. */
  images?: PromptImage[];
  /** The title a new thread gets. Defaults to its first message. */
  title?: string;
  /** Hears every piece of text and tool update as it happens. */
  onEvent?: (event: ChatStreamEvent) => Promise<unknown>;
}

/**
 * One turn of a conversation: save the message, let the agent answer with
 * its tools, save the answer and the tools it used. Chat streams the events
 * to the browser; routines run the same steps with nobody watching.
 *
 * Throws ProviderError if the model fails; the question stays saved.
 */
export async function writeReply(
  {messages, threads, toolCalls, approvals, toolboxes}: ReplyDependencies,
  {
    userId,
    agent,
    engine,
    threadId,
    content,
    title,
    onEvent,
    savedAs = 'user',
    instruction,
    images,
  }: ReplyRequest,
): Promise<ChatMessage> {
  const emit = async (event: ChatStreamEvent) => {
    await onEvent?.(event);
  };

  const earlier = await messages.listForThread(threadId);
  // Tool messages are not chat; the model only reads user and agent turns.
  const history: ChatTurn[] = earlier
    .slice(-HISTORY_LIMIT)
    .flatMap((message) =>
      message.role === 'tool'
        ? []
        : [{role: message.role, content: message.content}],
    );

  // Save the question first, so it is kept even if the answer fails.
  await messages.add({threadId, role: savedAs, content});
  if (earlier.length === 0) {
    await threads.rename(userId, threadId, title ?? titleFrom(content));
  }

  const {toolbox} = await toolboxes.forUser(userId, {
    threadId,
    computer: agent.defaultComputer,
  });
  const log = new ToolCallLog((name) => toolbox.riskOf(name));
  const emitTool = async (
    call: ReturnType<ToolCallLog['start']> | undefined,
  ) => {
    if (call) {
      await emit({type: 'tool', call});
    }
  };
  let answer = '';
  // Text written after a tool call starts a new paragraph; otherwise "…the
  // values.I've prepared…" runs two thoughts together.
  let afterTool = false;

  try {
    const events = engine.stream({
      system: buildSystemPrompt(agent),
      prompt: instruction ? `${content}\n\n${instruction}` : content,
      images,
      history,
      tools: toolbox.toToolSet(approvalPolicy(agent.approvalMode)),
    });
    for await (const event of events) {
      if (event.type === 'text') {
        const text =
          afterTool && answer !== '' && !answer.endsWith('\n')
            ? `\n\n${event.text}`
            : event.text;
        afterTool = false;
        answer += text;
        await emit({type: 'delta', text});
      } else if (event.type === 'tool-call') {
        afterTool = true;
        await emitTool(
          log.start(event.id, event.name, event.input, event.risk),
        );
      } else if (event.type === 'tool-result') {
        await emitTool(log.finish(event.id, event.output));
      } else {
        await emitTool(log.fail(event.id, event.error));
      }
    }
  } catch (error) {
    throw new ProviderError(error);
  } finally {
    await toolbox.close();
  }

  const saved = await messages.add({
    threadId,
    role: 'assistant',
    authorAgentId: agent.id,
    content: answer,
  });
  const savedCalls = await toolCalls.addMany(log.toRows(saved.id));
  // Every call that is waiting gets a request in the user's inbox.
  const requests = await approvals.createMany(
    userId,
    savedCalls
      .filter((call) => call.status === 'awaiting_approval')
      .map((call) => ({
        toolCallId: call.id,
        summary: toolSummary(call.toolName, call.input),
      })),
  );
  await threads.touch(threadId);

  const message: ChatMessage = {
    ...saved,
    createdAt: saved.createdAt.toISOString(),
  };
  if (savedCalls.length > 0) {
    message.toolCalls = savedCalls.map(({messageId: _messageId, ...call}) => {
      const request = requests.find((item) => item.toolCallId === call.id);
      return request ? {...call, approvalId: request.id} : call;
    });
  }
  return message;
}
