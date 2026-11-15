import {addDocumentSchema, addMemorySchema} from '@binary/shared';
import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {AppError, NotFoundError, parseBody} from '../errors';
import {NoEmbedderError} from '../memory/agent-memory';
import {isUuid} from './ids';

/** A missing embedding key is something the user can fix: a 400. */
async function userFixable<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof NoEmbedderError) {
      throw new AppError(error.message, 400);
    }
    throw error;
  }
}

/** An agent's Memory page: what it remembers, add and delete. */
export function memoryRoutes({agents, memory}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  async function findAgent(userId: string, id: string) {
    const agent = isUuid(id) ? await agents.findForUser(userId, id) : undefined;
    if (!agent) {
      throw new NotFoundError('Agent');
    }
    return agent;
  }

  routes.get('/:id/memories', async (c) => {
    const userId = c.get('user').id;
    const agent = await findAgent(userId, c.req.param('id'));
    const [status, memories] = await Promise.all([
      memory.status(userId, agent.id),
      memory.list(agent.id),
    ]);
    return c.json({status, memories});
  });

  routes.post('/:id/memories', async (c) => {
    const userId = c.get('user').id;
    const agent = await findAgent(userId, c.req.param('id'));
    const {content} = await parseBody(c, addMemorySchema);
    const result = await userFixable(() =>
      memory.remember(userId, agent.id, content, 'manual'),
    );
    return c.json(result, 'saved' in result ? 201 : 200);
  });

  routes.delete('/:id/memories/:memoryId', async (c) => {
    const userId = c.get('user').id;
    const agent = await findAgent(userId, c.req.param('id'));
    const memoryId = c.req.param('memoryId');
    if (!isUuid(memoryId) || !(await memory.forget(agent.id, memoryId))) {
      throw new NotFoundError('Memory');
    }
    return c.body(null, 204);
  });

  return routes;
}

/** The Knowledge page: the user's documents, add, search and delete. */
export function knowledgeRoutes({knowledge, memory}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  routes.get('/', async (c) => {
    const userId = c.get('user').id;
    const [available, documents] = await Promise.all([
      memory.available(userId),
      knowledge.list(userId),
    ]);
    return c.json({available, documents});
  });

  routes.post('/', async (c) => {
    const input = await parseBody(c, addDocumentSchema);
    const document = await userFixable(() =>
      knowledge.add(c.get('user').id, input),
    );
    return c.json({document}, 201);
  });

  // What an agent would find; the page uses it to try a question.
  routes.get('/search', async (c) => {
    const query = (c.req.query('q') ?? '').trim().slice(0, 500);
    if (!query) {
      return c.json({matches: []});
    }
    const matches = await userFixable(() =>
      knowledge.search(c.get('user').id, query),
    );
    return c.json({matches});
  });

  routes.delete('/:id', async (c) => {
    const id = c.req.param('id');
    if (!isUuid(id) || !(await knowledge.delete(c.get('user').id, id))) {
      throw new NotFoundError('Document');
    }
    return c.body(null, 204);
  });

  return routes;
}
