import {characterOf, type Approval, type RoutineRun} from '@binary/shared';
import {MessageSquare} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';

import {TodayInbox} from '@/components/approvals/today-inbox';
import {CharacterAvatar} from '@/components/characters/character';
import {RunStatusBadge, RunTime} from '@/components/routines/run-status';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Today · Binary'};

interface TodayRun extends RoutineRun {
  routine: {id: string; name: string};
  agent: {id: string; name: string; avatar: string | null};
}

/** Today: what is waiting for you, and what your routines did. */
export default async function TodayPage() {
  const data = await getFromApi<{approvals: Approval[]; runs: TodayRun[]}>(
    '/api/today',
  );
  const runs = data?.runs ?? [];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-4 py-8 sm:px-6 lg:py-12">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Today</h1>
        <p className="max-w-2xl text-muted-foreground">
          What your characters need from you, and what they did on their own.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Waiting for you
        </h2>
        <TodayInbox initialApprovals={data?.approvals ?? []} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Routine runs</h2>
        {runs.length === 0 ? (
          <p className="rounded-3xl border border-dashed p-5 text-sm text-muted-foreground">
            No routine ran in the last 24 hours.{' '}
            <Link
              href="/routines"
              className="text-foreground hover:text-primary"
            >
              See your routines
            </Link>
            .
          </p>
        ) : (
          <ul
            aria-label="Routine runs"
            className="divide-y rounded-3xl border bg-card px-5"
          >
            {runs.map((run) => (
              <li
                key={run.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
              >
                <CharacterAvatar id={characterOf(run.agent.avatar)} size={32} />
                <Link
                  href={`/routines/${run.routine.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary"
                >
                  {run.routine.name}
                </Link>
                <RunStatusBadge status={run.status} />
                <span className="text-xs text-muted-foreground">
                  <RunTime value={run.createdAt} />
                </span>
                {run.threadId && (
                  <Link
                    href={`/agents/${run.agent.id}?chat=${run.threadId}`}
                    aria-label={`Transcript of ${run.routine.name}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <MessageSquare className="size-4" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
