import type {RoutineJob} from '../routines/run-routine';

/** A routine's schedule, as the job runner needs it. */
export interface Schedule {
  /** The trigger's id; Trigger.dev keeps it as the schedule's external id. */
  triggerId: string;
  cron: string;
  timezone: string;
}

/**
 * Where routines actually run (the Strategy pattern again). The API only
 * says "run this" or "keep this schedule"; it never knows whether the work
 * happens on Trigger.dev or in its own process.
 */
export interface JobRunner {
  /** False when schedules are saved but nothing will fire them. */
  readonly schedulesEnabled: boolean;
  enqueue(job: RoutineJob): Promise<void>;
  saveSchedule(schedule: Schedule): Promise<void>;
  removeSchedule(triggerId: string): Promise<void>;
}

/**
 * Runs routines inside the API process, right after they are queued. Used
 * when Trigger.dev is not set up (and in tests): "Run now" and webhooks
 * work, but runs are lost if the API stops mid-run, and schedules never
 * fire. That durability is exactly what Trigger.dev adds.
 */
export class InProcessRunner implements JobRunner {
  readonly schedulesEnabled = false;
  private readonly pending = new Set<Promise<void>>();

  constructor(private readonly run: (job: RoutineJob) => Promise<void>) {}

  async enqueue(job: RoutineJob) {
    // Not awaited: the request answers "queued" at once, like a real queue.
    const running = this.run(job).finally(() => this.pending.delete(running));
    this.pending.add(running);
  }

  async saveSchedule() {}

  async removeSchedule() {}

  /** Resolves once every run started so far has finished (for tests). */
  async idle() {
    await Promise.allSettled([...this.pending]);
  }
}
