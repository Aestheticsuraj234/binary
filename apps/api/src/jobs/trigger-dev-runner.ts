import {configure, schedules, tasks} from '@trigger.dev/sdk';

import type {RoutineJob} from '../routines/run-routine';
import type {routineScheduleTask, runRoutineTask} from '../trigger/routines';
import type {JobRunner, Schedule} from './job-runner';

/**
 * Runs routines on Trigger.dev: durable (a run survives the API
 * restarting), retried by Trigger.dev's rules, visible in its dashboard,
 * and with real cron schedules.
 */
export class TriggerDevRunner implements JobRunner {
  readonly schedulesEnabled = true;

  constructor(secretKey: string) {
    configure({secretKey});
  }

  async enqueue(job: RoutineJob) {
    await tasks.trigger<typeof runRoutineTask>('run-routine', job);
  }

  /**
   * Creates the schedule, or updates it: Trigger.dev keeps one schedule per
   * deduplication key, and ours is the trigger's id.
   */
  async saveSchedule({triggerId, cron, timezone}: Schedule) {
    const task: (typeof routineScheduleTask)['id'] = 'routine-schedule';
    await schedules.create({
      task,
      cron,
      timezone,
      externalId: triggerId,
      deduplicationKey: `trigger-${triggerId}`,
    });
  }

  async removeSchedule(triggerId: string) {
    for await (const schedule of schedules.list()) {
      if (schedule.externalId === triggerId) {
        await schedules.del(schedule.id);
      }
    }
  }
}
