import {playgroundRequestSchema, type PlaygroundResult} from '@binary/shared';
import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {parseBody, ProviderError} from '../errors';

/** POST a prompt to one provider and model, get the answer back. */
export function playgroundRoutes({engineFactory}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  routes.post('/', async (c) => {
    const {provider, model, prompt} = await parseBody(
      c,
      playgroundRequestSchema,
    );
    const startedAt = Date.now();

    // A missing key throws MissingProviderKeyError (400) from here.
    const engine = await engineFactory.create({
      userId: c.get('user').id,
      provider,
      model,
    });
    const answer = await engine.generate({prompt}).catch((error: unknown) => {
      throw new ProviderError(error);
    });
    const result: PlaygroundResult = {
      provider,
      model,
      ...answer,
      durationMs: Date.now() - startedAt,
    };
    return c.json(result);
  });

  return routes;
}
