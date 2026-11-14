import {providerSchema, saveProviderKeySchema} from '@binary/shared';
import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';

/** GET, PUT and DELETE the signed-in user's LLM API keys. */
export function providerKeyRoutes({providerKeys, keyVault}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  // Only the provider, last 4 characters and date ever leave the server.
  routes.get('/', async (c) => {
    const keys = await providerKeys.listForUser(c.get('user').id);
    return c.json({keys});
  });

  routes.put('/:provider', async (c) => {
    const provider = providerSchema.safeParse(c.req.param('provider'));
    if (!provider.success) {
      return c.json({error: 'Unknown provider.'}, 404);
    }
    const body = saveProviderKeySchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({error: body.error.issues[0]?.message}, 400);
    }

    const {apiKey} = body.data;
    const {ciphertext, iv} = keyVault.encrypt(apiKey);
    const saved = await providerKeys.save({
      userId: c.get('user').id,
      provider: provider.data,
      encryptedKey: ciphertext,
      iv,
      last4: apiKey.slice(-4),
    });
    return c.json({provider: saved.provider, last4: saved.last4});
  });

  routes.delete('/:provider', async (c) => {
    const provider = providerSchema.safeParse(c.req.param('provider'));
    if (!provider.success) {
      return c.json({error: 'Unknown provider.'}, 404);
    }
    const deleted = await providerKeys.delete(c.get('user').id, provider.data);
    if (!deleted) {
      return c.json({error: 'No key saved for this provider.'}, 404);
    }
    return c.body(null, 204);
  });

  return routes;
}
