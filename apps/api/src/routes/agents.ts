import {agentInputSchema, type Provider} from '@binary/shared';
import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {
  MissingProviderKeyError,
  NotFoundError,
  parseBody,
  ValidationError,
} from '../errors';
import {isUuid} from './ids';

/** List, hire, edit and fire the signed-in user's agents, and start chats. */
export function agentRoutes({
  agents,
  agentTemplates,
  providerKeys,
  threads,
}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  /** An agent can only think with a provider the user has a key for. */
  async function requireProviderKey(userId: string, provider: Provider) {
    if (!(await providerKeys.find(userId, provider))) {
      throw new MissingProviderKeyError(provider);
    }
  }

  /** One of the user's agents; a malformed id is just "not found". */
  async function findAgent(userId: string, id: string) {
    const agent = isUuid(id) ? await agents.findForUser(userId, id) : undefined;
    if (!agent) {
      throw new NotFoundError('Agent');
    }
    return agent;
  }

  routes.get('/', async (c) => {
    const list = await agents.listForUser(c.get('user').id);
    return c.json({agents: list});
  });

  routes.post('/', async (c) => {
    const userId = c.get('user').id;
    const {templateId, ...fields} = await parseBody(c, agentInputSchema);
    await requireProviderKey(userId, fields.provider);
    if (templateId && !(await agentTemplates.findById(templateId))) {
      throw new ValidationError('That template does not exist.');
    }

    const agent = await agents.create({
      ...fields,
      userId,
      templateId: templateId ?? null,
    });
    return c.json({agent}, 201);
  });

  routes.get('/:id', async (c) => {
    const agent = await findAgent(c.get('user').id, c.req.param('id'));
    return c.json({agent});
  });

  // The template an agent was hired from never changes, so it is ignored here.
  routes.put('/:id', async (c) => {
    const userId = c.get('user').id;
    const {id} = await findAgent(userId, c.req.param('id'));
    const {name, role, instructions, provider, model, avatar} = await parseBody(
      c,
      agentInputSchema,
    );
    await requireProviderKey(userId, provider);

    const agent = await agents.update(userId, id, {
      name,
      role,
      instructions,
      provider,
      model,
      avatar,
    });
    return c.json({agent});
  });

  routes.delete('/:id', async (c) => {
    const userId = c.get('user').id;
    const {id} = await findAgent(userId, c.req.param('id'));
    await agents.delete(userId, id);
    return c.body(null, 204);
  });

  // Start a new, empty chat with the agent. Messages go to /api/threads.
  routes.post('/:id/threads', async (c) => {
    const userId = c.get('user').id;
    const agent = await findAgent(userId, c.req.param('id'));
    const thread = await threads.createForAgent(userId, agent.id);
    return c.json({thread}, 201);
  });

  return routes;
}
