import type {RoutineRunRow, Trigger} from '@binary/db';
import {
  routineInputSchema,
  type Routine,
  type RoutineInput,
  type RoutineRun,
} from '@binary/shared';
import {Hono, type Context} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {AppError, NotFoundError, parseBody, ValidationError} from '../errors';
import {canonicalTimezone} from '../routines/timezone';
import {newWebhookSecret} from '../routines/webhook-secret';
import {isUuid} from './ids';

// How many past runs a routine's page shows.
const RUN_HISTORY_LIMIT = 20;

export function toRunView(run: RoutineRunRow): RoutineRun {
  return {
    id: run.id,
    status: run.status,
    error: run.error,
    threadId: run.threadId,
    createdAt: run.createdAt.toISOString(),
    startedAt: run.startedAt?.toISOString() ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}

/** List, create, edit, delete and start the signed-in user's routines. */
export function routineRoutes({
  agents,
  routines,
  triggers,
  routineRuns,
  jobs,
}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  async function findRoutine(userId: string, id: string) {
    const routine = isUuid(id)
      ? await routines.findForUser(userId, id)
      : undefined;
    if (!routine) {
      throw new NotFoundError('Routine');
    }
    return routine;
  }

  /** Adds each routine's schedule, webhook and last run, never a secret. */
  async function toViews(
    rows: Awaited<ReturnType<typeof routines.listForUser>>,
  ) {
    const ids = rows.map((row) => row.id);
    const [allTriggers, lastRuns] = await Promise.all([
      triggers.listForRoutines(ids),
      routineRuns.latestForRoutines(ids),
    ]);
    return rows.map((row): Routine => {
      const own = allTriggers.filter((trigger) => trigger.routineId === row.id);
      const cron = own.find((trigger) => trigger.type === 'cron');
      const lastRun = lastRuns.find((run) => run.routineId === row.id);
      return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        schedule: cron?.cron
          ? {cron: cron.cron, timezone: cron.timezone ?? 'UTC'}
          : null,
        webhookId:
          own.find((trigger) => trigger.type === 'webhook')?.id ?? null,
        lastRun: lastRun ? toRunView(lastRun) : null,
      };
    });
  }

  /**
   * Brings the routine's triggers in line with the form, here and on the
   * job runner. Returns a new webhook secret when the webhook was just
   * turned on: the only moment it can be shown.
   */
  async function applyTriggers(
    routineId: string,
    input: RoutineInput,
    existing: Trigger[],
  ) {
    const {trigger, removedId} = await triggers.setSchedule(
      routineId,
      input.schedule,
      input.timezone,
    );
    try {
      if (removedId) {
        await jobs.removeSchedule(removedId);
      }
      if (trigger?.cron) {
        await jobs.saveSchedule({
          triggerId: trigger.id,
          cron: trigger.cron,
          timezone: input.timezone,
        });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(
        `Trigger.dev could not save the schedule: ${reason}`,
        502,
      );
    }

    const hadWebhook = existing.some(
      (existingTrigger) => existingTrigger.type === 'webhook',
    );
    if (!input.webhook) {
      await triggers.setWebhook(routineId, null);
      return undefined;
    }
    if (hadWebhook) {
      return undefined;
    }
    const {secret, hash} = newWebhookSecret();
    await triggers.setWebhook(routineId, hash);
    return secret;
  }

  /** The form, with its time zone in the name Trigger.dev knows. */
  async function readInput(c: Context) {
    const input = await parseBody(c, routineInputSchema);
    return {...input, timezone: canonicalTimezone(input.timezone)};
  }

  /** A routine can only be run by one of the user's own agents. */
  async function requireOwnAgent(userId: string, agentId: string) {
    if (!(await agents.findForUser(userId, agentId))) {
      throw new ValidationError('Choose who runs this routine.');
    }
  }

  routes.get('/', async (c) => {
    const rows = await routines.listForUser(c.get('user').id);
    return c.json({
      routines: await toViews(rows),
      schedulesEnabled: jobs.schedulesEnabled,
    });
  });

  routes.post('/', async (c) => {
    const userId = c.get('user').id;
    const input = await readInput(c);
    await requireOwnAgent(userId, input.agentId);

    const {id} = await routines.create({
      agentId: input.agentId,
      name: input.name,
      prompt: input.prompt,
      enabled: input.enabled,
    });
    // If Trigger.dev refuses the schedule, undo the routine too: a half-made
    // routine would look like a failure, and retrying would duplicate it.
    let webhookSecret: string | undefined;
    try {
      webhookSecret = await applyTriggers(id, input, []);
    } catch (error) {
      await routines.delete(id);
      throw error;
    }
    const [routine] = await toViews([await findRoutine(userId, id)]);
    return c.json({routine, webhookSecret}, 201);
  });

  routes.get('/:id', async (c) => {
    const row = await findRoutine(c.get('user').id, c.req.param('id'));
    const [[routine], runs] = await Promise.all([
      toViews([row]),
      routineRuns.listForRoutine(row.id, RUN_HISTORY_LIMIT),
    ]);
    return c.json({
      routine,
      runs: runs.map(toRunView),
      schedulesEnabled: jobs.schedulesEnabled,
    });
  });

  routes.put('/:id', async (c) => {
    const userId = c.get('user').id;
    const {id} = await findRoutine(userId, c.req.param('id'));
    const input = await readInput(c);
    await requireOwnAgent(userId, input.agentId);

    const existing = await triggers.listForRoutines([id]);
    await routines.update(id, {
      agentId: input.agentId,
      name: input.name,
      prompt: input.prompt,
      enabled: input.enabled,
    });
    const webhookSecret = await applyTriggers(id, input, existing);
    const [routine] = await toViews([await findRoutine(userId, id)]);
    return c.json({routine, webhookSecret});
  });

  routes.delete('/:id', async (c) => {
    const {id} = await findRoutine(c.get('user').id, c.req.param('id'));
    const schedule = (await triggers.listForRoutines([id])).find(
      (trigger) => trigger.type === 'cron',
    );
    if (schedule) {
      await jobs.removeSchedule(schedule.id);
    }
    await routines.delete(id);
    return c.body(null, 204);
  });

  // "Run now": queue a run and answer at once; the run reports its progress.
  routes.post('/:id/runs', async (c) => {
    const {id} = await findRoutine(c.get('user').id, c.req.param('id'));
    const run = await routineRuns.create(id);
    await jobs.enqueue({runId: run.id});
    return c.json({run: toRunView(run)}, 202);
  });

  // A new webhook secret; the old one stops working at once.
  routes.post('/:id/webhook-secret', async (c) => {
    const {id} = await findRoutine(c.get('user').id, c.req.param('id'));
    const hasWebhook = (await triggers.listForRoutines([id])).some(
      (trigger) => trigger.type === 'webhook',
    );
    if (!hasWebhook) {
      throw new ValidationError('Turn the webhook on first.');
    }
    const {secret, hash} = newWebhookSecret();
    await triggers.setWebhook(id, hash);
    return c.json({webhookSecret: secret});
  });

  return routes;
}
