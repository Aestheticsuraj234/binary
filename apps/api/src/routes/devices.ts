import {addDeviceSchema, updateDeviceSchema} from '@binary/shared';
import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {NotFoundError, parseBody} from '../errors';
import {
  newPairingCode,
  PAIRING_TTL_MS,
  toDeviceView,
} from '../runner/your-computers';
import {isUuid} from './ids';

/**
 * "Your computers" in the web app: add one (which shows a pairing code),
 * see which are online, pause one (the kill switch) and remove one.
 */
export function deviceRoutes({devices}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  async function findDevice(userId: string, id: string) {
    const device = isUuid(id)
      ? await devices.findForUser(userId, id)
      : undefined;
    if (!device) {
      throw new NotFoundError('Computer');
    }
    return device;
  }

  routes.get('/', async (c) => {
    const saved = await devices.listForUser(c.get('user').id);
    return c.json({devices: saved.map(toDeviceView)});
  });

  // The code is shown once, here; the Runner trades it for a token.
  routes.post('/', async (c) => {
    const {name} = await parseBody(c, addDeviceSchema);
    const pairingCode = newPairingCode();
    const device = await devices.createPending(
      c.get('user').id,
      name,
      pairingCode,
    );
    const expiresAt = new Date(device.createdAt.getTime() + PAIRING_TTL_MS);
    return c.json(
      {
        device: toDeviceView(device),
        pairingCode,
        expiresAt: expiresAt.toISOString(),
      },
      201,
    );
  });

  routes.patch('/:id', async (c) => {
    const userId = c.get('user').id;
    const {id} = await findDevice(userId, c.req.param('id'));
    const {paused} = await parseBody(c, updateDeviceSchema);
    const device = await devices.setPaused(userId, id, paused);
    if (!device) {
      throw new NotFoundError('Computer');
    }
    return c.json({device: toDeviceView(device)});
  });

  // Removing a computer revokes its token: the Runner is signed out.
  routes.delete('/:id', async (c) => {
    const userId = c.get('user').id;
    const {id} = await findDevice(userId, c.req.param('id'));
    await devices.delete(userId, id);
    return c.body(null, 204);
  });

  return routes;
}
