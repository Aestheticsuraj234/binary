import type {RunnerEvent} from '@binary/shared';

import {RunnerAuthError, type RunnerClient} from './client';
import type {SharedFolders} from './folders';
import {runJob} from './jobs';

// Engine events are sent in small batches, not one request per word.
const EVENT_BATCH_MS = 150;
// After a network error, wait before asking again (it doubles, up to 30 s).
const RETRY_MS = 1000;

export interface RunnerLog {
  info(message: string): void;
  error(message: string): void;
}

/** Runs one job and hands in its result (and an engine's events). */
async function handle(
  client: RunnerClient,
  folders: SharedFolders,
  {id, job}: {id: string; job: Parameters<typeof runJob>[0]},
  log: RunnerLog,
) {
  let batch: RunnerEvent[] = [];
  let flushing = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    timer = undefined;
    const events = batch;
    batch = [];
    if (events.length > 0) {
      flushing = flushing.then(() => client.events(id, events)).catch(() => {});
    }
  };
  log.info(`${job.type}${job.type === 'command' ? `: ${job.command}` : ''}`);
  try {
    const output = await runJob(job, folders, (event) => {
      batch.push(event);
      timer ??= setTimeout(flush, EVENT_BATCH_MS);
    });
    clearTimeout(timer);
    flush();
    await flushing;
    await client.result(id, {ok: true, output});
  } catch (error) {
    clearTimeout(timer);
    flush();
    await flushing;
    const message = error instanceof Error ? error.message : String(error);
    log.error(`  failed: ${message}`);
    await client.result(id, {ok: false, error: message.slice(0, 4000)});
  }
}

/**
 * The Runner's loop: say hello, then ask for work again and again. Jobs
 * run one at a time. Stops when `signal` aborts, or for good when the API
 * no longer accepts this Runner's token.
 */
export async function runLoop(
  client: RunnerClient,
  folders: SharedFolders,
  details: {version: string; os: string},
  log: RunnerLog,
  signal: AbortSignal,
) {
  let retry = RETRY_MS;
  let greeted = false;
  while (!signal.aborted) {
    try {
      if (!greeted) {
        await client.hello({...details, folders: folders.paths});
        greeted = true;
        log.info(`Connected. Sharing ${folders.paths.join(', ')}`);
      }
      const next = await client.next();
      retry = RETRY_MS;
      if (next) {
        await handle(client, folders, next, log);
      }
    } catch (error) {
      if (error instanceof RunnerAuthError) {
        throw error;
      }
      greeted = false;
      log.error(
        `Can't reach the API (${error instanceof Error ? error.message : String(error)}). Trying again…`,
      );
      await new Promise((resolve) => setTimeout(resolve, retry));
      retry = Math.min(retry * 2, 30_000);
    }
  }
}
