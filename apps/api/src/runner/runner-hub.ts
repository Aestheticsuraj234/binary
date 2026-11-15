import {randomUUID} from 'node:crypto';

import type {RunnerEvent, RunnerJob, RunnerResult} from '@binary/shared';

// If no Runner picks a job up in this time, it is probably not running.
const PICKUP_TIMEOUT_MS = 30_000;

interface Pending {
  id: string;
  deviceId: string;
  job: RunnerJob;
  timeoutMs: number;
  resolve: (output: unknown) => void;
  reject: (error: Error) => void;
  onEvent?: (event: RunnerEvent) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface DispatchOptions {
  /** How long the job may run once picked up. */
  timeoutMs: number;
  /** Hears what a CLI engine does while it works. */
  onEvent?: (event: RunnerEvent) => void;
}

/**
 * Hands jobs to the Runners on users' computers and waits for the answers.
 *
 * A Runner never accepts connections; it asks for work (a long poll), so
 * nothing on the user's computer is opened to the network. Jobs live in
 * memory: a job that was waiting when the API restarted is simply lost, and
 * whoever was waiting for it gets an error.
 */
export class RunnerHub {
  private readonly queued = new Map<string, Pending[]>();
  private readonly running = new Map<string, Pending>();
  private readonly listeners = new Map<
    string,
    (pending: Pending | undefined) => void
  >();

  /** Sends a job to a device and resolves with its output. */
  dispatch(
    deviceId: string,
    job: RunnerJob,
    {timeoutMs, onEvent}: DispatchOptions,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const pending: Pending = {
        id: randomUUID(),
        deviceId,
        job,
        timeoutMs,
        resolve,
        reject,
        onEvent,
        timer: setTimeout(() => {
          this.drop(pending);
          reject(
            new Error(
              "Your computer didn't pick up the job. Is the Runner running?",
            ),
          );
        }, PICKUP_TIMEOUT_MS),
      };
      pending.timer.unref();
      const listener = this.listeners.get(deviceId);
      if (listener) {
        this.listeners.delete(deviceId);
        listener(pending);
      } else {
        this.queued.set(deviceId, [
          ...(this.queued.get(deviceId) ?? []),
          pending,
        ]);
      }
    });
  }

  /**
   * The Runner asks for its next job and waits up to `waitMs` for one.
   * Undefined means "nothing yet, ask again".
   */
  next(
    deviceId: string,
    waitMs: number,
  ): Promise<{id: string; job: RunnerJob} | undefined> {
    const queue = this.queued.get(deviceId) ?? [];
    const ready = queue.shift();
    if (ready) {
      return Promise.resolve(this.start(ready));
    }
    // Only one poll per device: an older one simply gets "nothing".
    this.listeners.get(deviceId)?.(undefined);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.listeners.get(deviceId) === listener) {
          this.listeners.delete(deviceId);
        }
        resolve(undefined);
      }, waitMs);
      timer.unref();
      const listener = (pending: Pending | undefined) => {
        clearTimeout(timer);
        resolve(pending ? this.start(pending) : undefined);
      };
      this.listeners.set(deviceId, listener);
    });
  }

  /** What a CLI engine did, while the job runs. */
  event(deviceId: string, jobId: string, events: RunnerEvent[]): boolean {
    const pending = this.running.get(jobId);
    if (pending?.deviceId !== deviceId) {
      return false;
    }
    for (const event of events) {
      pending.onEvent?.(event);
    }
    return true;
  }

  /** The job ended. False if this device has no such job running. */
  finish(deviceId: string, jobId: string, result: RunnerResult): boolean {
    const pending = this.running.get(jobId);
    if (pending?.deviceId !== deviceId) {
      return false;
    }
    this.running.delete(jobId);
    clearTimeout(pending.timer);
    if (result.ok) {
      pending.resolve(result.output);
    } else {
      pending.reject(new Error(result.error));
    }
    return true;
  }

  private start(pending: Pending) {
    // Once picked up, the clock restarts with the job's own limit.
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => {
      this.running.delete(pending.id);
      pending.reject(new Error('Your computer took too long to answer.'));
    }, pending.timeoutMs);
    pending.timer.unref();
    this.running.set(pending.id, pending);
    return {id: pending.id, job: pending.job};
  }

  private drop(pending: Pending) {
    const queue = this.queued.get(pending.deviceId) ?? [];
    this.queued.set(
      pending.deviceId,
      queue.filter((item) => item !== pending),
    );
  }
}
