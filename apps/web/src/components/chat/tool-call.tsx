'use client';

import type {ToolCallStatus, ToolCallView} from '@binary/shared';
import {
  Check,
  ChevronRight,
  LoaderCircle,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react';

import {useState} from 'react';

import {
  isTerminalOutput,
  sandboxInput,
  SandboxCharts,
  TerminalOutput,
} from '@/components/chat/sandbox-output';
import {RiskBadge} from '@/components/tools/risk-badge';
import {Button} from '@/components/ui/button';
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
    verb: 'Wants to use',
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

/** A plan-only agent's call is blocked; any other "rejected" was the user. */
function wasBlocked(call: ToolCallView) {
  return (
    typeof call.output === 'object' &&
    call.output !== null &&
    Reflect.get(call.output, 'blocked') === true
  );
}

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
interface ToolCallProps {
  call: ToolCallView;
  /** Approve or reject a waiting call. Without it, no buttons are shown. */
  onDecide?: (
    approvalId: string,
    decision: 'approve' | 'reject',
  ) => Promise<void>;
}

/**
 * One tool the agent used, inside its reply. Closed it is one line ("Used
 * shop lookup order · Read"); open it shows what went in and what came out.
 * A call waiting for approval shows Approve and Reject right away.
 */
export function ToolCall({call, onDecide}: ToolCallProps) {
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);
  const status = STATUS[call.status];
  const blocked = call.status === 'rejected' && wasBlocked(call);
  const verb =
    call.status === 'rejected' && !blocked ? 'You said no to' : status.verb;
  const Icon = status.icon;
  const waiting = call.status === 'awaiting_approval';
  const finished =
    !waiting && call.status !== 'running' && call.status !== 'pending';
  // Code and commands read better as themselves than as JSON.
  const code = sandboxInput(call);

  async function handleDecide(decision: 'approve' | 'reject') {
    if (!call.approvalId || !onDecide) {
      return;
    }
    setDeciding(decision);
    await onDecide(call.approvalId, decision);
    setDeciding(null);
  }

  return (
    <div
      className={cn(
        'rounded-2xl border bg-background/60 text-xs',
        waiting && 'border-warning/40',
      )}
    >
      {/* A waiting call starts open: see what you approve before you do. */}
      <details className="group/tool" open={waiting}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
          <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">
            <span className="text-muted-foreground">{verb} </span>
            <span className="font-medium">{readable(call.toolName)}</span>
          </span>
          <RiskBadge risk={call.risk} />
          <Icon
            className={cn('size-3.5 shrink-0', status.className)}
            aria-label={call.status}
          />
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/tool:rotate-90" />
        </summary>
        <div className="space-y-2 border-t px-3 py-2">
          {blocked && (
            <p className="text-warning">
              This agent is in plan-only mode, so it uses no tools.
            </p>
          )}
          <p className="text-muted-foreground">Input</p>
          <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-2 font-mono whitespace-pre-wrap">
            {code ?? asJson(call.input)}
          </pre>
          {finished && (
            <>
              <p className="text-muted-foreground">Result</p>
              {isTerminalOutput(call.output) ? (
                <TerminalOutput output={call.output} />
              ) : (
                <pre className="max-h-60 overflow-auto rounded-lg bg-muted p-2 font-mono whitespace-pre-wrap">
                  {asJson(call.output)}
                </pre>
              )}
            </>
          )}
        </div>
      </details>
      <SandboxCharts call={call} />
      {waiting && call.approvalId && onDecide && (
        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
          <span className="mr-auto text-warning">Needs your OK</span>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            disabled={deciding !== null}
            onClick={() => handleDecide('approve')}
          >
            {deciding === 'approve' ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Check />
            )}
            Approve
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            disabled={deciding !== null}
            onClick={() => handleDecide('reject')}
          >
            <X />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
