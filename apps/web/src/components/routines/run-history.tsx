'use client';

import type {RoutineRun} from '@binary/shared';
import {MessageSquare, Play} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

import {
  RunStatusBadge,
  RunTime,
  runDuration,
} from '@/components/routines/run-status';
import {Button} from '@/components/ui/button';
import {API_URL} from '@/lib/env';

// How often to check on runs that are still queued or running.
const POLL_MS = 2000;

interface RunHistoryProps {
  routineId: string;
  agentId: string;
  initialRuns: RoutineRun[];
}

/**
 * "Run now" and the list of past runs. While a run is unfinished the list
 * checks back every two seconds; live updates over Postgres LISTEN/NOTIFY
 * would replace this polling.
 */
export function RunHistory({routineId, agentId, initialRuns}: RunHistoryProps) {
  const router = useRouter();
  const [runs, setRuns] = useState(initialRuns);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const hasUnfinished = runs.some(
    (run) => run.status === 'queued' || run.status === 'running',
  );

  useEffect(() => {
    if (!hasUnfinished) {
      return;
    }
    const timer = setInterval(async () => {
      const response = await fetch(`${API_URL}/api/routines/${routineId}`, {
        credentials: 'include',
      }).catch(() => null);
      if (response?.ok) {
        const body: {runs: RoutineRun[]} = await response.json();
        setRuns(body.runs);
        // A finished run has a new transcript; reload the sidebar's chats.
        if (
          body.runs.every(
            (run) => run.status !== 'queued' && run.status !== 'running',
          )
        ) {
          router.refresh();
        }
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [hasUnfinished, routineId, router]);

  async function handleRunNow() {
    setError('');
    setIsStarting(true);
    const response = await fetch(`${API_URL}/api/routines/${routineId}/runs`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null);
    setIsStarting(false);
    if (!response?.ok) {
      setError('Could not start the run. Is the API running?');
      return;
    }
    const body: {run: RoutineRun} = await response.json();
    setRuns((current) => [body.run, ...current]);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Runs</h2>
        <Button
          onClick={handleRunNow}
          disabled={isStarting}
          className="h-10 rounded-full px-5"
        >
          <Play />
          Run now
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {runs.length === 0 && (
        <p className="rounded-3xl border border-dashed p-5 text-sm text-muted-foreground">
          No runs yet. Press Run now, or wait for the schedule.
        </p>
      )}
      <ul
        aria-label="Runs"
        className="divide-y rounded-3xl border bg-card px-5"
      >
        {runs.map((run) => (
          <li
            key={run.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
          >
            <RunStatusBadge status={run.status} />
            <span className="text-sm">
              <RunTime value={run.createdAt} />
            </span>
            {runDuration(run) && (
              <span className="font-mono text-xs text-muted-foreground">
                {runDuration(run)}
              </span>
            )}
            {run.threadId && (
              <Link
                href={`/agents/${agentId}?chat=${run.threadId}`}
                className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <MessageSquare className="size-4" />
                Transcript
              </Link>
            )}
            {run.error && (
              <p role="alert" className="w-full text-sm text-destructive">
                {run.error}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
