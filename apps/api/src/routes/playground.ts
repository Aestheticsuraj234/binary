import {playgroundRequestSchema, type PlaygroundResult} from '@binary/shared';
import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {MissingProviderKeyError} from '../engines/engine-factory';

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
      if (error instanceof MissingProviderKeyError) {
        return c.json({error: error.message}, 400);
      }
      // A wrong model id, an invalid key or a provider outage all land here.
      // Pass the provider's message on, so the user can fix the cause.
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({error: `The provider returned an error: ${message}`}, 502);
    }
  });

  return routes;
}
