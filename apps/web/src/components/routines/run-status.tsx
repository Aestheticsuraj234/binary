import type {RoutineRun, RunStatus} from '@binary/shared';
import {Check, Clock, LoaderCircle, X} from 'lucide-react';

import {Badge} from '@/components/ui/badge';
import {cn} from '@/lib/utils';

const STATUS: Record<
  RunStatus,
  {label: string; icon: typeof Check; className: string}
> = {
  queued: {label: 'Queued', icon: Clock, className: 'text-muted-foreground'},
  running: {
    label: 'Running',
    icon: LoaderCircle,
    className: 'text-primary [&>svg]:animate-spin',
  },
  succeeded: {label: 'Done', icon: Check, className: 'text-primary'},
  failed: {
    label: 'Failed',
    icon: X,
    className: 'border-destructive/50 text-destructive',
  },
};

/** Where a run is: queued, running, done or failed. */
export function RunStatusBadge({status}: {status: RunStatus}) {
  const {label, icon: Icon, className} = STATUS[status];
  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon />
      {label}
    </Badge>
  );
}

/** "14 Nov, 09:00", in the viewer's own time zone. */
export function RunTime({value}: {value: string}) {
  return (
    // The server and the browser may sit in different time zones.
    <time dateTime={value} suppressHydrationWarning>
      {new Date(value).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </time>
  );
}

/** How long a finished run took, e.g. "2.4s". */
export function runDuration(run: RoutineRun): string | null {
  if (!run.startedAt || !run.finishedAt) {
    return null;
  }
  const ms =
    new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
  return `${(ms / 1000).toFixed(1)}s`;
}
