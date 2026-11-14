import {playgroundRequestSchema, type PlaygroundResult} from '@binary/shared';
import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {engineErrorResponse} from './engine-errors';

/** POST a prompt to one provider and model, get the answer back. */
export function playgroundRoutes({engineFactory}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  routes.post('/', async (c) => {
    const body = playgroundRequestSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({error: body.error.issues[0]?.message}, 400);
    }
    const {provider, model, prompt} = body.data;
    const startedAt = Date.now();

    try {
      const engine = await engineFactory.create({
        userId: c.get('user').id,
        provider,
        model,
      });
      const answer = await engine.generate({prompt});
      const result: PlaygroundResult = {
        provider,
        model,
        ...answer,
        durationMs: Date.now() - startedAt,
      };
      return c.json(result);
    } catch (error) {
      return engineErrorResponse(c, error);
    }
  });

  return routes;
}
