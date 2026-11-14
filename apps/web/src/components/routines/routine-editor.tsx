'use client';

import type {Agent, Routine, RoutineRun} from '@binary/shared';
import {ArrowRight, Trash2} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {
  RoutineForm,
  type SavedRoutine,
} from '@/components/routines/routine-form';
import {RunHistory} from '@/components/routines/run-history';
import {WebhookDetails} from '@/components/routines/webhook-details';
import {Button} from '@/components/ui/button';
import {API_URL} from '@/lib/env';

/** Creating a routine: the form, then the webhook secret if there is one. */
export function NewRoutine({agents}: {agents: Agent[]}) {
  const router = useRouter();
  const [saved, setSaved] = useState<SavedRoutine | null>(null);

  function handleSaved(result: SavedRoutine) {
    // Without a secret to show, go straight to the new routine.
    if (!result.webhookSecret) {
      router.push(`/routines/${result.routine.id}`);
      return;
    }
    setSaved(result);
  }

  if (saved?.routine.webhookId) {
    return (
      <div className="space-y-4">
        <WebhookDetails
          routineId={saved.routine.id}
          webhookId={saved.routine.webhookId}
          secret={saved.webhookSecret}
        />
        <Button asChild className="h-10 rounded-full px-5">
          <Link href={`/routines/${saved.routine.id}`}>
            I copied it, open the routine
            <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }
  return <RoutineForm agents={agents} onSaved={handleSaved} />;
}

interface RoutineEditorProps {
  agents: Agent[];
  routine: Routine;
  runs: RoutineRun[];
}

/** One routine: edit it, see its webhook, run it and read its runs. */
export function RoutineEditor({agents, routine, runs}: RoutineEditorProps) {
  const router = useRouter();
  const [secret, setSecret] = useState<string>();
  const [error, setError] = useState('');

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${routine.name}"? Its schedule stops and its run history goes.`,
      )
    ) {
      return;
    }
    const response = await fetch(`${API_URL}/api/routines/${routine.id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => null);
    if (!response?.ok) {
      setError('Could not delete the routine. Try again.');
      return;
    }
    router.push('/routines');
    router.refresh();
  }

  return (
    // `*:min-w-0` lets long lines (the curl example) scroll inside their
    // box instead of stretching the column past a phone's width.
    <div className="grid gap-8 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <RoutineForm
          agents={agents}
          routine={routine}
          onSaved={(saved) => setSecret(saved.webhookSecret)}
        />
        {routine.webhookId && (
          <WebhookDetails
            key={secret}
            routineId={routine.id}
            webhookId={routine.webhookId}
            secret={secret}
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 />
          Delete routine
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <RunHistory
        routineId={routine.id}
        agentId={routine.agent.id}
        initialRuns={runs}
      />
    </div>
  );
}
