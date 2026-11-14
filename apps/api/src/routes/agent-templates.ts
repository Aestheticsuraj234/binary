import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';

/** GET the ready-made agents a user can hire from. */
export function agentTemplateRoutes({agentTemplates}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  routes.get('/', async (c) => {
    const templates = await agentTemplates.findAll();
    return c.json({templates});
  });

  return routes;
}
