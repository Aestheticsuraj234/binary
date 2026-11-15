import {sendMessageSchema, type ChatStreamEvent} from '@binary/shared';
import {Hono} from 'hono';
import {stream} from 'hono/streaming';

import {requireUser, type AppEnv} from '../app-env';
import {writeReply} from '../chat/reply';
import type {AppDependencies} from '../container';
import {AppError, NotFoundError, parseBody} from '../errors';
import {isUuid} from './ids';

// How many chats the sidebar lists.
const RECENT_LIMIT = 20;

/** List, read, delete and talk in the signed-in user's chats. */
export function threadRoutes({
  agents,
  threads,
  messages,
  toolCalls,
  approvals,
  engineFactory,
  toolboxes,
  computers,
  memory,
}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  /** One of the user's chats; a malformed id is just "not found". */
  async function findThread(userId: string, id: string) {
    const thread = isUuid(id)
      ? await threads.findForUser(userId, id)
      : undefined;
    if (!thread) {
      throw new NotFoundError('Chat');
    }
    return thread;
  }

  routes.get('/', async (c) => {
    const recent = await threads.listRecentForUser(
      c.get('user').id,
      RECENT_LIMIT,
    );
    return c.json({threads: recent});
  });

  // Each message comes with the tools its answer used.
  routes.get('/:id', async (c) => {
    const thread = await findThread(c.get('user').id, c.req.param('id'));
    const [saved, calls] = await Promise.all([
      messages.listForThread(thread.id),
      toolCalls.listForThread(thread.id),
    ]);
    const withTools = saved.map((message) => {
      const used = calls
        .filter((call) => call.messageId === message.id)
        .map(({messageId: _messageId, ...call}) => call);
      return used.length > 0 ? {...message, toolCalls: used} : message;
    });
    return c.json({thread, messages: withTools});
  });

  routes.delete('/:id', async (c) => {
    const {id} = await findThread(c.get('user').id, c.req.param('id'));
    // Its sandbox or browser would otherwise run on, unseen, until it
    // timed out.
    await Promise.all(
      computers.map((manager) => manager.stopForThread(c.get('user').id, id)),
    );
    await threads.delete(c.get('user').id, id);
    return c.body(null, 204);
  });

  /**
   * Send a message and stream the agent's answer back, including the tools
   * it uses on the way.
   *
   * Problems found before the model starts (bad input, missing key) are
   * normal JSON errors. Once streaming has begun the status is already 200,
   * so a provider failure arrives as an `error` event instead.
   */
  routes.post('/:id/messages', async (c) => {
    const userId = c.get('user').id;
    const thread = await findThread(userId, c.req.param('id'));
    const agent = thread.agentId
      ? await agents.findForUser(userId, thread.agentId)
      : undefined;
    if (!agent) {
      throw new NotFoundError('Chat');
    }
    const {content} = await parseBody(c, sendMessageSchema);
    // A missing key or model is a 400 from here, before streaming starts.
    const engine = await engineFactory.forAgent(userId, agent);

    c.header('Content-Type', 'application/x-ndjson; charset=utf-8');
    c.header('Cache-Control', 'no-cache');
    return stream(c, async (output) => {
      const send = (event: ChatStreamEvent) =>
        output.writeln(JSON.stringify(event));
      try {
        const message = await writeReply(
          {messages, threads, toolCalls, approvals, toolboxes, memory},
          {userId, agent, engine, threadId: thread.id, content, onEvent: send},
        );
        await send({type: 'done', message});
      } catch (error) {
        // Once streaming has begun, every failure becomes an error event.
        if (!(error instanceof AppError)) {
          console.error(error);
        }
        const reason =
          error instanceof AppError
            ? error.message
            : 'Something went wrong on the server.';
        await send({type: 'error', error: reason});
      }
    });
  });

  return routes;
}
