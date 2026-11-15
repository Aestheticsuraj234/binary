import type {AgentRepository} from '@binary/db';
import {
  findMentions,
  MAX_ROOM_REPLIES,
  type ChatStreamEvent,
  type RoutingMode,
} from '@binary/shared';

import type {AgentEngine} from '../engines/agent-engine';
import type {EngineFactory} from '../engines/engine-factory';
import {AppError} from '../errors';
import {titleFrom} from '../chat/title';
import {writeReply, type ReplyDependencies} from '../chat/reply';

// The lead names at most this many characters to answer a message.
const MAX_ROUTED = 3;

export interface RoomTurnDependencies extends ReplyDependencies {
  agents: AgentRepository;
  engineFactory: EngineFactory;
}

type Member = NonNullable<Awaited<ReturnType<AgentRepository['findForUser']>>>;

export interface RoomTurn {
  userId: string;
  room: {
    name: string;
    routingMode: RoutingMode;
    leadAgentId: string | null;
    members: {id: string}[];
  };
  threadId: string;
  content: string;
  onEvent: (event: ChatStreamEvent) => Promise<unknown>;
}

/** Who should answer, chosen by the lead's model. */
export async function routeByLead(
  engine: AgentEngine,
  members: Member[],
  content: string,
): Promise<Member[]> {
  const {text} = await engine.generate({
    system:
      'You coordinate a team of AI coworkers. Decide who should answer the user. Reply with their names only, best first, separated by commas.',
    prompt: [
      'The team:',
      ...members.map((member) => `- ${member.name}: ${member.role}`),
      '',
      `The user wrote: ${content}`,
      '',
      `Who should answer? At most ${MAX_ROUTED} names.`,
    ].join('\n'),
  });
  // Names in the order the model wrote them.
  return members
    .map((member) => ({
      member,
      at: text.toLowerCase().indexOf(member.name.toLowerCase()),
    }))
    .filter(({at}) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({member}) => member)
    .slice(0, MAX_ROUTED);
}

/**
 * One message in a room (Chapter 13):
 *
 * 1. Save the user's message.
 * 2. Choose who answers: those @mentioned; else, in auto mode, whom the lead
 *    picks; else the lead.
 * 3. Each answers in turn, seeing what the others said. An answer that
 *    @mentions a teammate hands them the next turn.
 *
 * At most MAX_ROOM_REPLIES answers per message. Each answer streams as
 * `turn`, its deltas and tools, then `done`; `end` closes the turn. An
 * agent that fails gets an `error` and the next one still answers.
 */
export async function runRoomTurn(
  deps: RoomTurnDependencies,
  {userId, room, threadId, content, onEvent}: RoomTurn,
) {
  const loaded = await Promise.all(
    room.members.map((member) => deps.agents.findForUser(userId, member.id)),
  );
  const members = loaded.flatMap((agent) => (agent ? [agent] : []));
  if (members.length === 0) {
    throw new AppError('This room has no characters left.', 400);
  }
  const lead =
    members.find((member) => member.id === room.leadAgentId) ?? members[0];
  const context = {
    name: room.name,
    members: members.map(({id, name, role}) => ({id, name, role})),
  };

  // 1. The user's message, saved once for everyone.
  const earlier = await deps.messages.listForThread(threadId);
  await deps.messages.add({threadId, role: 'user', content});
  if (earlier.length === 0) {
    await deps.threads.rename(userId, threadId, titleFrom(content));
  }

  // 2. Who answers first.
  let queue = findMentions(content, members);
  if (queue.length === 0 && room.routingMode === 'auto' && lead) {
    const engine = await deps.engineFactory
      .forAgent(userId, lead)
      .catch(() => undefined);
    queue = engine
      ? await routeByLead(engine, members, content).catch(() => [])
      : [];
  }
  if (queue.length === 0 && lead) {
    queue = [lead];
  }

  // 3. Answers, in turn, with hand-offs.
  const answered: Member[] = [];
  while (queue.length > 0 && answered.length < MAX_ROOM_REPLIES) {
    const [agent, ...rest] = queue;
    queue = rest;
    if (!agent) {
      break;
    }
    answered.push(agent);
    await onEvent({type: 'turn', agentId: agent.id});
    try {
      const engine = await deps.engineFactory.forAgent(userId, agent);
      const before = answered.slice(0, -1).map((member) => member.name);
      const message = await writeReply(deps, {
        userId,
        agent,
        engine,
        threadId,
        saveContent: false,
        room: context,
        content: before.length
          ? `It's your turn, after ${before.join(' and ')}. Answer the user's latest message: your part only.`
          : "It's your turn. Answer the user's latest message.",
        onEvent,
      });
      await onEvent({type: 'done', message});
      for (const next of findMentions(message.content, members)) {
        const waiting = queue.some((member) => member.id === next.id);
        const spoke = answered.some((member) => member.id === next.id);
        if (!waiting && !spoke) {
          queue.push(next);
        }
      }
    } catch (error) {
      if (!(error instanceof AppError)) {
        console.error(error);
      }
      await onEvent({
        type: 'error',
        error:
          error instanceof AppError
            ? `${agent.name}: ${error.message}`
            : `${agent.name} could not answer.`,
      });
    }
  }
  await deps.threads.touch(threadId);
  await onEvent({type: 'end'});
}
