import {
  sendMessageSchema,
  type ChatStreamEvent,
  type ChatTurn,
} from '@binary/shared';
import {Hono} from 'hono';
import {stream} from 'hono/streaming';

import {buildSystemPrompt} from '../agents/system-prompt';
import {requireUser, type AppEnv} from '../app-env';
import {titleFrom} from '../chat/title';
import type {AppDependencies} from '../container';
import {engineErrorResponse, providerErrorMessage} from './engine-errors';
import {isUuid} from './ids';

const NOT_FOUND = {error: 'Chat not found.'};

// How many earlier messages the model reads. Older ones are still saved and
// shown; they just stop costing tokens on every reply.
const HISTORY_LIMIT = 20;

// How many chats the sidebar lists.
const RECENT_LIMIT = 20;

/** List, read, delete and talk in the signed-in user's chats. */
export function threadRoutes({
  agents,
  threads,
  messages,
  engineFactory,
}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  /** Finds one of the user's chats; a malformed id is just "not found". */
  function findThread(userId: string, id: string) {
    return isUuid(id) ? threads.findForUser(userId, id) : undefined;
  }

  routes.get('/', async (c) => {
    const recent = await threads.listRecentForUser(
      c.get('user').id,
      RECENT_LIMIT,
    );
    return c.json({threads: recent});
  });

  routes.get('/:id', async (c) => {
    const thread = await findThread(c.get('user').id, c.req.param('id'));
    if (!thread) {
      return c.json(NOT_FOUND, 404);
    }
    const saved = await messages.listForThread(thread.id);
    return c.json({thread, messages: saved});
  });

  routes.delete('/:id', async (c) => {
    const deleted = isUuid(c.req.param('id'))
      ? await threads.delete(c.get('user').id, c.req.param('id'))
      : false;
    if (!deleted) {
      return c.json(NOT_FOUND, 404);
    }
    return c.body(null, 204);
  });

  /**
   * Send a message and stream the agent's answer back.
   *
   * Problems found before the model starts (bad input, missing key) are
   * normal JSON errors. Once streaming has begun the status is already 200,
   * so a provider failure arrives as an `error` event instead.
   */
  routes.post('/:id/messages', async (c) => {
    const userId = c.get('user').id;
    const thread = await findThread(userId, c.req.param('id'));
    const agent = thread?.agentId
      ? await agents.findForUser(userId, thread.agentId)
      : undefined;
    if (!thread || !agent) {
      return c.json(NOT_FOUND, 404);
    }
    const body = sendMessageSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({error: body.error.issues[0]?.message}, 400);
    }
    // The columns are optional because Chapter 11's CLI engines need neither.
    if (!agent.provider || !agent.model) {
      return c.json({error: 'Choose a model for this agent first.'}, 400);
    }

    let engine;
    try {
      engine = await engineFactory.create({
        userId,
        provider: agent.provider,
        model: agent.model,
      });
    } catch (error) {
      return engineErrorResponse(c, error);
    }

    const {content} = body.data;
    const earlier = await messages.listForThread(thread.id);
    // Tool messages arrive in a later chapter; the model only reads chat.
    const history: ChatTurn[] = earlier
      .slice(-HISTORY_LIMIT)
      .flatMap((message) =>
        message.role === 'tool'
          ? []
          : [{role: message.role, content: message.content}],
      );

    // Save the question first, so it is kept even if the answer fails.
    await messages.add({threadId: thread.id, role: 'user', content});
    if (earlier.length === 0) {
      await threads.rename(userId, thread.id, titleFrom(content));
    }

    c.header('Content-Type', 'application/x-ndjson; charset=utf-8');
    c.header('Cache-Control', 'no-cache');
    return stream(c, async (output) => {
      const send = (event: ChatStreamEvent) =>
        output.writeln(JSON.stringify(event));
      let answer = '';

      try {
        const pieces = engine.stream({
          system: buildSystemPrompt(agent),
          prompt: content,
          history,
        });
        for await (const text of pieces) {
          answer += text;
          await send({type: 'delta', text});
        }
      } catch (error) {
        await send({type: 'error', error: providerErrorMessage(error)});
        return;
      }

      const saved = await messages.add({
        threadId: thread.id,
        role: 'assistant',
        authorAgentId: agent.id,
        content: answer,
      });
      await threads.touch(thread.id);
      await send({
        type: 'done',
        message: {...saved, createdAt: saved.createdAt.toISOString()},
      });
    });
  });

  return routes;
}
