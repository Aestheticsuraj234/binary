import {Hono} from 'hono';

import type {AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {AppError, NotFoundError} from '../errors';
import {secretMatches} from '../routines/webhook-secret';
import {isUuid} from './ids';

// A webhook body reaches the model, so it is capped like a chat message.
const MAX_BODY_LENGTH = 10_000;

/**
 * Webhooks: other services start a routine by POSTing here. There is no
 * session (the caller is a server, not a signed-in browser), so the
 * routine's secret in the `X-Binary-Secret` header proves who may call.
 */
export function hookRoutes({triggers, routineRuns, jobs}: AppDependencies) {
  const routes = new Hono<AppEnv>();

  routes.post('/routines/:triggerId', async (c) => {
    const id = c.req.param('triggerId');
    const trigger = isUuid(id) ? await triggers.findWithRoutine(id) : undefined;
    if (!trigger || trigger.type !== 'webhook' || !trigger.webhookSecret) {
      throw new NotFoundError('Webhook');
    }
    if (
      !secretMatches(
        c.req.header('x-binary-secret') ?? '',
        trigger.webhookSecret,
      )
    ) {
      throw new AppError('Wrong webhook secret.', 401);
    }
    if (!trigger.enabled) {
      throw new AppError('This routine is switched off.', 409);
    }

    const body = (await c.req.text()).slice(0, MAX_BODY_LENGTH).trim();
    const run = await routineRuns.create(trigger.routineId);
    await jobs.enqueue({runId: run.id, input: body || undefined});
    return c.json({runId: run.id}, 202);
  });

  return routes;
}
