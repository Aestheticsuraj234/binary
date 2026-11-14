import type {Agent} from '@binary/shared';
import {ArrowLeft} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';

import {NewRoutine} from '@/components/routines/routine-editor';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'New routine · Binary'};

export default async function NewRoutinePage() {
  const data = await getFromApi<{agents: Agent[]}>('/api/agents');
  const agents = data?.agents ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href="/routines"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Routines
      </Link>
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">New routine</h1>
        <p className="text-muted-foreground">
          Pick a character, say what to do, and choose what starts it.
        </p>
      </div>
      {agents.length === 0 ? (
        <p className="rounded-3xl border border-dashed p-5 text-sm text-muted-foreground">
          Routines are run by your characters.{' '}
          <Link
            href="/agents/new"
            className="text-foreground hover:text-primary"
          >
            Hire one first
          </Link>
          .
        </p>
      ) : (
        <NewRoutine agents={agents} />
      )}
    </main>
  );
}
