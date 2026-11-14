import type {ToolCallStatus, ToolCallView} from '@binary/shared';
import {
  Check,
  ChevronRight,
  LoaderCircle,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react';

import {RiskBadge} from '@/components/tools/risk-badge';
import {cn} from '@/lib/utils';

const STATUS: Record<
  ToolCallStatus,
  {verb: string; icon: typeof Check; className: string}
> = {
  pending: {
    verb: 'Waiting to use',
    icon: LoaderCircle,
    className: 'animate-spin text-muted-foreground',
  },
  awaiting_approval: {
    verb: 'Waiting to use',
    icon: ShieldAlert,
    className: 'text-warning',
  },
  running: {
    verb: 'Using',
    icon: LoaderCircle,
    className: 'animate-spin text-primary',
  },
  succeeded: {verb: 'Used', icon: Check, className: 'text-primary'},
  failed: {verb: 'Could not use', icon: X, className: 'text-destructive'},
  rejected: {verb: 'Blocked', icon: ShieldAlert, className: 'text-warning'},
};

/** "shop_lookup_order" → "shop lookup order". */
function readable(toolName: string) {
  return toolName.replaceAll('_', ' ');
}

function asJson(value: unknown) {
  return JSON.stringify(value, null, 2) ?? '';
}

/**
 * One tool the agent used, inside its reply. Closed it is one line ("Used
 * shop lookup order · Read"); open it shows what went in and what came out.
 */
export function ToolCall({call}: {call: ToolCallView}) {
  const {verb, icon: Icon, className} = STATUS[call.status];
  const finished = call.status !== 'running' && call.status !== 'pending';

  return (
    <details className="group/tool rounded-2xl border bg-background/60 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">
          <span className="text-muted-foreground">{verb} </span>
          <span className="font-medium">{readable(call.toolName)}</span>
        </span>
        <RiskBadge risk={call.risk} />
        <Icon
          className={cn('size-3.5 shrink-0', className)}
          aria-label={call.status}
        />
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/tool:rotate-90" />
      </summary>
      <div className="space-y-2 border-t px-3 py-2">
        {call.status === 'rejected' && (
          <p className="text-warning">
            This tool can change things outside Binary, so it needs your
            approval. Approvals arrive in a later chapter.
          </p>
        )}
        <p className="text-muted-foreground">Input</p>
        <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-2 font-mono">
          {asJson(call.input)}
        </pre>
        {finished && (
          <>
            <p className="text-muted-foreground">Result</p>
            <pre className="max-h-60 overflow-auto rounded-lg bg-muted p-2 font-mono whitespace-pre-wrap">
              {asJson(call.output)}
            </pre>
          </>
        )}
      </div>
    </details>
  );
}
