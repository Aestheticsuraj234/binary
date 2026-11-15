import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {NotFoundError} from '../errors';
import {isUuid} from './ids';

/**
 * The user's running cloud sandboxes: listed on the Apps page and in each
 * chat's header, so nothing keeps running unseen, and stoppable from both.
 */
export function sandboxRoutes({sandboxes}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  routes.get('/', async (c) => {
    if (!sandboxes) {
      return c.json({available: false, sandboxes: []});
    }
    const running = await sandboxes.listRunning(c.get('user').id);
    return c.json({available: true, sandboxes: running});
  });

  routes.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const stopped =
      sandboxes !== undefined &&
      isUuid(id) &&
      (await sandboxes.stop(c.get('user').id, id));
    if (!stopped) {
      throw new NotFoundError('Sandbox');
    }
    return c.body(null, 204);
  });

  return routes;
}
