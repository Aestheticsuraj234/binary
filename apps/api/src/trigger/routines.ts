// Trigger.dev tasks. `pnpm trigger:dev` bundles this folder and runs these
// tasks in a worker on your machine, connected to your Trigger.dev project.
import {schedules, task} from '@trigger.dev/sdk';

import {createDependencies} from '../container';
import {runRoutine, type RoutineJob} from '../routines/run-routine';

// A routine is one model answer plus a few tool calls; ten minutes is plenty
// and stops a stuck run from holding a worker forever.
const MAX_DURATION_SECONDS = 600;

/** Runs one queued routine run. Queued by "Run now" and by webhooks. */
export const runRoutineTask = task({
  id: 'run-routine',
  maxDuration: MAX_DURATION_SECONDS,
  // runRoutine records its own failures on the run, so a retry would only
  // find a finished run and skip it.
  retry: {maxAttempts: 1},
  run: async (job: RoutineJob) => {
    await runRoutine(createDependencies(), job);
  },
});

/**
 * Fired by Trigger.dev on each routine's cron schedule. The schedule's
 * external id is the trigger's id, which leads back to the routine.
 */
export const routineScheduleTask = schedules.task({
  id: 'routine-schedule',
  maxDuration: MAX_DURATION_SECONDS,
  run: async (payload) => {
    const deps = createDependencies();
    const trigger = payload.externalId
      ? await deps.triggers.findWithRoutine(payload.externalId)
      : undefined;
    if (!trigger || trigger.type !== 'cron' || !trigger.enabled) {
      return {skipped: true};
    }
    const run = await deps.routineRuns.create(trigger.routineId);
    await runRoutine(deps, {runId: run.id});
    return {runId: run.id};
  },
});
