import {
  characterOf,
  describeSchedule,
  type Agent,
  type Routine,
  type RoutineRun,
} from '@binary/shared';
import {ArrowLeft} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';

import {CharacterAvatar} from '@/components/characters/character';
import {RoutineEditor} from '@/components/routines/routine-editor';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Routine · Binary'};

interface RoutinePageProps {
  params: Promise<{id: string}>;
}

export default async function RoutinePage({params}: RoutinePageProps) {
  const {id} = await params;
  const [data, agentData] = await Promise.all([
    getFromApi<{routine: Routine; runs: RoutineRun[]}>(`/api/routines/${id}`),
    getFromApi<{agents: Agent[]}>('/api/agents'),
  ]);
  // The API answers 404 for unknown routines and other users' alike.
  if (!data) {
    notFound();
  }
  const {routine, runs} = data;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href="/routines"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Routines
      </Link>
      <div className="flex items-center gap-4">
        <CharacterAvatar id={characterOf(routine.agent.avatar)} size={56} />
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-3xl font-semibold tracking-tight">
            {routine.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Run by {routine.agent.name}
            {routine.schedule &&
              ` · ${describeSchedule(routine.schedule.cron)} (${routine.schedule.timezone})`}
          </p>
        </div>
      </div>
      <RoutineEditor
        key={routine.id}
        agents={agentData?.agents ?? []}
        routine={routine}
        runs={runs}
      />
    </main>
  );
}
