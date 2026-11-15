import {
  pairRunnerSchema,
  runnerEventsSchema,
  runnerHelloSchema,
  runnerResultSchema,
} from '@binary/shared';
import {Hono} from 'hono';
import {createMiddleware} from 'hono/factory';

import type {AppDependencies} from '../container';
import {AppError, NotFoundError, parseBody} from '../errors';
import {
  hashToken,
  newDeviceToken,
  PAIRING_TTL_MS,
} from '../runner/your-computers';

// How long one "anything for me?" request waits before answering "no".
const POLL_WAIT_MS = 25_000;

type Device = NonNullable<
  Awaited<ReturnType<AppDependencies['devices']['findByTokenHash']>>
>;

interface RunnerEnv {
  Variables: {device: Device};
}

/**
 * What the Runner on the user's computer talks to. It signs in with the
 * token it got when pairing (`Authorization: Bearer …`), never a cookie,
 * and only ever asks: for its next job, or to hand in a result.
 */
export function runnerRoutes({devices, runnerHub}: AppDependencies) {
  const routes = new Hono<RunnerEnv>();

  // Pairing is the one call without a token: the code is the proof.
  routes.post('/pair', async (c) => {
    const {code, os} = await parseBody(c, pairRunnerSchema);
    const {token, tokenHash} = newDeviceToken();
    const device = await devices.pair(code, {
      os,
      tokenHash,
      since: new Date(Date.now() - PAIRING_TTL_MS),
    });
    if (!device) {
      throw new AppError(
        'That code is wrong, used or expired. Add the computer again for a new one.',
        400,
      );
    }
    return c.json({token, device: {id: device.id, name: device.name}});
  });

  const requireDevice = createMiddleware<RunnerEnv>(async (c, next) => {
    const token = /^Bearer (.+)$/.exec(
      c.req.header('Authorization') ?? '',
    )?.[1];
    const device = token
      ? await devices.findByTokenHash(hashToken(token))
      : undefined;
    if (!device) {
      return c.json(
        {error: 'This Runner is not paired (or was removed). Pair it again.'},
        401,
      );
    }
    c.set('device', device);
    await next();
  });
  routes.use('/hello', requireDevice);
  routes.use('/jobs', requireDevice);
  routes.use('/jobs/*', requireDevice);

  // On start: which folders the Runner shares, so the app can show them.
  routes.post('/hello', async (c) => {
    const {os, folders} = await parseBody(c, runnerHelloSchema);
    const device = c.get('device');
    await devices.seen(device.id, {os, allowedFolders: folders});
    return c.json({device: {id: device.id, name: device.name}});
  });

  // A long poll: answers with a job, or 204 after a while. Each call is
  // also the Runner's heartbeat.
  routes.get('/jobs', async (c) => {
    const device = c.get('device');
    await devices.seen(device.id);
    if (device.killSwitch) {
      // Paused: nothing is sent. Waiting a bit keeps the Runner from spinning.
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return c.body(null, 204);
    }
    const wait = Math.min(
      Number(c.req.query('wait') ?? POLL_WAIT_MS),
      POLL_WAIT_MS,
    );
    const next = await runnerHub.next(
      device.id,
      Number.isFinite(wait) ? wait : POLL_WAIT_MS,
    );
    return next ? c.json(next) : c.body(null, 204);
  });

  routes.post('/jobs/:id/events', async (c) => {
    const {events} = await parseBody(c, runnerEventsSchema);
    if (!runnerHub.event(c.get('device').id, c.req.param('id'), events)) {
      throw new NotFoundError('Job');
    }
    return c.body(null, 204);
  });

  routes.post('/jobs/:id/result', async (c) => {
    const result = await parseBody(c, runnerResultSchema);
    if (!runnerHub.finish(c.get('device').id, c.req.param('id'), result)) {
      throw new NotFoundError('Job');
    }
    return c.body(null, 204);
  });

  return routes;
}
