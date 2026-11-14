import {characterOf, describeSchedule, type Routine} from '@binary/shared';
import {Clock, Plus, Repeat, Webhook} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';

import {CharacterAvatar} from '@/components/characters/character';
import {RunStatusBadge, RunTime} from '@/components/routines/run-status';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Routines · Binary'};

export default async function RoutinesPage() {
  const data = await getFromApi<{
    routines: Routine[];
    schedulesEnabled: boolean;
  }>('/api/routines');
  const routines = data?.routines ?? [];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">Routines</h1>
          <p className="max-w-2xl text-muted-foreground">
            Jobs your characters do again and again: on a schedule, when a
            webhook calls, or when you press Run now.
          </p>
        </div>
        <Button asChild className="h-10 rounded-full px-5">
          <Link href="/routines/new">
            <Plus />
            New routine
          </Link>
        </Button>
      </div>

      {data && !data.schedulesEnabled && (
        <p className="rounded-2xl border border-warning/40 p-4 text-sm text-warning">
          Trigger.dev is not connected, so schedules are saved but won&apos;t
          fire, and runs happen inside the API. Run now and webhooks work. Add{' '}
          <code className="font-mono">TRIGGER_SECRET_KEY</code> and run{' '}
          <code className="font-mono">pnpm trigger:dev</code> to make them
          durable.
        </p>
      )}

      {routines.length === 0 && (
        <div className="flex items-center gap-4 rounded-3xl border border-dashed p-5">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
            <Repeat className="size-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">No routines yet</p>
            <p className="text-sm text-muted-foreground">
              Try &quot;Every weekday at 9:00, plan my day&quot; with Sunny.
            </p>
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {routines.map((routine) => (
          <li key={routine.id}>
            <Link
              href={`/routines/${routine.id}`}
              className="flex flex-wrap items-center gap-4 rounded-3xl border bg-card p-4 transition-colors hover:border-primary/60"
            >
              <CharacterAvatar
                id={characterOf(routine.agent.avatar)}
                size={44}
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="truncate">{routine.name}</span>
                  {!routine.enabled && <Badge variant="outline">Off</Badge>}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{routine.agent.name}</span>
                  {routine.schedule && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Clock />
                      {describeSchedule(routine.schedule.cron)}
                    </Badge>
                  )}
                  {routine.webhookId && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Webhook />
                      Webhook
                    </Badge>
                  )}
                </div>
              </div>
              {routine.lastRun && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RunStatusBadge status={routine.lastRun.status} />
                  <RunTime value={routine.lastRun.createdAt} />
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
