import {agentInputSchema, type Provider} from '@binary/shared';
import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {MissingProviderKeyError} from '../engines/engine-factory';
import {isUuid} from './ids';

const NOT_FOUND = {error: 'Agent not found.'};

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
  async function missingKeyMessage(userId: string, provider: Provider) {
    const key = await providerKeys.find(userId, provider);
    return key ? undefined : new MissingProviderKeyError(provider).message;
  }

  /** Finds one of the user's agents; a malformed id is just "not found". */
  function findAgent(userId: string, id: string) {
    return isUuid(id) ? agents.findForUser(userId, id) : undefined;
  }

  routes.get('/', async (c) => {
    const list = await agents.listForUser(c.get('user').id);
    return c.json({agents: list});
  });

  routes.post('/', async (c) => {
    const body = agentInputSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({error: body.error.issues[0]?.message}, 400);
    }
    const userId = c.get('user').id;
    const {templateId, ...fields} = body.data;

    const keyError = await missingKeyMessage(userId, fields.provider);
    if (keyError) {
      return c.json({error: keyError}, 400);
    }
    if (templateId && !(await agentTemplates.findById(templateId))) {
      return c.json({error: 'That template does not exist.'}, 400);
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
    if (!agent) {
      return c.json(NOT_FOUND, 404);
    }
    return c.json({agent});
  });

  // The template an agent was hired from never changes, so it is ignored here.
  routes.put('/:id', async (c) => {
    const userId = c.get('user').id;
    if (!(await findAgent(userId, c.req.param('id')))) {
      return c.json(NOT_FOUND, 404);
    }
    const body = agentInputSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({error: body.error.issues[0]?.message}, 400);
    }
    const {name, role, instructions, provider, model, avatar} = body.data;

    const keyError = await missingKeyMessage(userId, provider);
    if (keyError) {
      return c.json({error: keyError}, 400);
    }

    const agent = await agents.update(userId, c.req.param('id'), {
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
    if (!(await findAgent(userId, c.req.param('id')))) {
      return c.json(NOT_FOUND, 404);
    }
    await agents.delete(userId, c.req.param('id'));
    return c.body(null, 204);
  });

  // Start a new, empty chat with the agent. Messages go to /api/threads.
  routes.post('/:id/threads', async (c) => {
    const userId = c.get('user').id;
    const agent = await findAgent(userId, c.req.param('id'));
    if (!agent) {
      return c.json(NOT_FOUND, 404);
    }
    const thread = await threads.createForAgent(userId, agent.id);
    return c.json({thread}, 201);
  });

  return routes;
}
