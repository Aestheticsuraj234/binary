import type {AgentComputer} from '@binary/shared';
import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {NotFoundError} from '../errors';
import {isUuid} from './ids';

/**
 * The computers running for the user's chats (sandboxes, browsers): listed
 * on the Apps page and in each chat's header, so nothing keeps running
 * unseen, and stoppable from both.
 */
export function computerRoutes({computers}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  // Which computers this server can provide, for the agent form.
  const available: Record<AgentComputer, boolean> = {
    sandbox: computers.some((manager) => manager.kind === 'sandbox'),
    browser: computers.some((manager) => manager.kind === 'browser'),
  };

  routes.get('/', async (c) => {
    const running = await Promise.all(
      computers.map((manager) => manager.listRunning(c.get('user').id)),
    );
    return c.json({available, computers: running.flat()});
  });

  routes.delete('/:id', async (c) => {
    const id = c.req.param('id');
    let stopped = false;
    if (isUuid(id)) {
      for (const manager of computers) {
        stopped ||= await manager.stop(c.get('user').id, id);
      }
    }
    if (!stopped) {
      throw new NotFoundError('Computer');
    }
    return c.body(null, 204);
  });

  return routes;
}
