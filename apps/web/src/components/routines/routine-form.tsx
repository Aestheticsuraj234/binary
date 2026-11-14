'use client';

import {
  routineInputSchema,
  SCHEDULE_PRESETS,
  type Agent,
  type Routine,
} from '@binary/shared';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {Textarea} from '@/components/ui/textarea';
import {API_URL} from '@/lib/env';

const CUSTOM = 'custom';

export interface SavedRoutine {
  routine: Routine;
  /** Present only when the webhook was just turned on. */
  webhookSecret?: string;
}

interface RoutineFormProps {
  agents: Agent[];
  /** The routine being edited. Without one, the form creates a routine. */
  routine?: Routine;
  onSaved: (saved: SavedRoutine) => void;
}

/** Which schedule option a cron expression belongs to. */
function scheduleChoice(cron: string | undefined) {
  if (!cron) {
    return '';
  }
  return SCHEDULE_PRESETS.some((preset) => preset.cron === cron)
    ? cron
    : CUSTOM;
}

/** Who runs it, what to do, and what starts it. */
export function RoutineForm({agents, routine, onSaved}: RoutineFormProps) {
  const router = useRouter();
  const [choice, setChoice] = useState(scheduleChoice(routine?.schedule?.cron));
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const schedule =
      choice === CUSTOM ? String(form.get('cron') ?? '') : choice;

    const parsed = routineInputSchema.safeParse({
      agentId: form.get('agentId'),
      name: form.get('name'),
      prompt: form.get('prompt'),
      enabled: form.get('enabled') === 'on',
      schedule: schedule || null,
      // A schedule keeps its time zone; a new one uses the browser's.
      timezone:
        routine?.schedule?.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      webhook: form.get('webhook') === 'on',
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }

    setIsPending(true);
    const response = await fetch(
      routine
        ? `${API_URL}/api/routines/${routine.id}`
        : `${API_URL}/api/routines`,
      {
        method: routine ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(parsed.data),
      },
    ).catch(() => null);
    setIsPending(false);

    if (!response) {
      setError('Could not reach the API.');
      return;
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? 'Could not save the routine.');
      return;
    }
    onSaved(body);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-3xl border bg-card p-5"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 *:w-full">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={routine?.name}
            placeholder="Morning briefing"
            className="h-10"
          />
        </div>
        <div className="space-y-2 *:w-full">
          <Label htmlFor="agentId">Who runs it</Label>
          <NativeSelect
            id="agentId"
            name="agentId"
            defaultValue={routine?.agent.id}
            className="h-10 w-full"
          >
            {agents.map((agent) => (
              <NativeSelectOption key={agent.id} value={agent.id}>
                {agent.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">What to do</Label>
        <Textarea
          id="prompt"
          name="prompt"
          defaultValue={routine?.prompt}
          placeholder="Check the news on pgvector and give me three headlines with links."
          className="min-h-28 resize-y"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 *:w-full">
          <Label htmlFor="schedule">Schedule</Label>
          <NativeSelect
            id="schedule"
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            className="h-10 w-full"
          >
            <NativeSelectOption value="">No schedule</NativeSelectOption>
            {SCHEDULE_PRESETS.map((preset) => (
              <NativeSelectOption key={preset.cron} value={preset.cron}>
                {preset.label}
              </NativeSelectOption>
            ))}
            <NativeSelectOption value={CUSTOM}>
              Custom (cron)
            </NativeSelectOption>
          </NativeSelect>
        </div>
        {choice === CUSTOM && (
          <div className="space-y-2">
            <Label htmlFor="cron">Cron expression</Label>
            <Input
              id="cron"
              name="cron"
              defaultValue={routine?.schedule?.cron}
              placeholder="*/30 9-17 * * 1-5"
              className="h-10 font-mono"
            />
          </div>
        )}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Times use{' '}
        {routine?.schedule ? routine.schedule.timezone : 'your time zone'}.
      </p>

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="webhook"
            defaultChecked={Boolean(routine?.webhookId)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            <span className="font-medium">Webhook</span>
            <span className="block text-muted-foreground">
              Let other services start it, like GitHub or a form.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={routine?.enabled ?? true}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            <span className="font-medium">Switched on</span>
            <span className="block text-muted-foreground">
              When off, the schedule and webhook do nothing. Run now still
              works.
            </span>
          </span>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant={routine ? 'secondary' : 'default'}
        className="h-10 rounded-full px-5"
        disabled={isPending}
      >
        {routine ? 'Save changes' : 'Create routine'}
      </Button>
    </form>
  );
}
