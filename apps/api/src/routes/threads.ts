import {
  sendMessageSchema,
  type ChatMessage,
  type ChatStreamEvent,
  type ChatTurn,
  type ToolCallView,
} from '@binary/shared';
import {Hono} from 'hono';
import {stream} from 'hono/streaming';

import {buildSystemPrompt} from '../agents/system-prompt';
import {requireUser, type AppEnv} from '../app-env';
import {titleFrom} from '../chat/title';
import {ToolCallLog} from '../chat/tool-call-log';
import type {AppDependencies} from '../container';
import {
  NotFoundError,
  parseBody,
  providerErrorMessage,
  ValidationError,
} from '../errors';
import {readOnlyPolicy} from '../tools/policy';
import {isUuid} from './ids';

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
  toolCalls,
  engineFactory,
  toolboxes,
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
    // The columns are optional because Chapter 11's CLI engines need neither.
    if (!agent.provider || !agent.model) {
      throw new ValidationError('Choose a model for this agent first.');
    }
    // A missing key throws MissingProviderKeyError (400) from here.
    const engine = await engineFactory.create({
      userId,
      provider: agent.provider,
      model: agent.model,
    });

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

    // Opened now, after every check that could fail, and closed in `finally`.
    const {toolbox} = await toolboxes.forUser(userId);
    const log = new ToolCallLog((name) => toolbox.riskOf(name));

    c.header('Content-Type', 'application/x-ndjson; charset=utf-8');
    c.header('Cache-Control', 'no-cache');
    return stream(c, async (output) => {
      const send = (event: ChatStreamEvent) =>
        output.writeln(JSON.stringify(event));
      const sendTool = async (call: ToolCallView | undefined) => {
        if (call) {
          await send({type: 'tool', call});
        }
      };
      let answer = '';

      try {
        const events = engine.stream({
          system: buildSystemPrompt(agent),
          prompt: content,
          history,
          tools: toolbox.toToolSet(readOnlyPolicy),
        });
        for await (const event of events) {
          if (event.type === 'text') {
            answer += event.text;
            await send({type: 'delta', text: event.text});
          } else if (event.type === 'tool-call') {
            await sendTool(log.start(event.id, event.name, event.input));
          } else if (event.type === 'tool-result') {
            await sendTool(log.finish(event.id, event.output));
          } else {
            await sendTool(log.fail(event.id, event.error));
          }
        }
      } catch (error) {
        await send({type: 'error', error: providerErrorMessage(error)});
        return;
      } finally {
        await toolbox.close();
      }

      const saved = await messages.add({
        threadId: thread.id,
        role: 'assistant',
        authorAgentId: agent.id,
        content: answer,
      });
      const savedCalls = await toolCalls.addMany(log.toRows(saved.id));
      await threads.touch(thread.id);
      const message: ChatMessage = {
        ...saved,
        createdAt: saved.createdAt.toISOString(),
      };
      if (savedCalls.length > 0) {
        message.toolCalls = savedCalls.map(
          ({messageId: _messageId, ...call}) => call,
        );
      }
      await send({type: 'done', message});
    });
  });

  return routes;
}
