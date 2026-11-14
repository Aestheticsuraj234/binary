'use client';

import {characterOf, type Approval} from '@binary/shared';
import {Check, LoaderCircle, MessageSquare, X} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {Character, CharacterAvatar} from '@/components/characters/character';
import {RunTime} from '@/components/routines/run-status';
import {RiskBadge} from '@/components/tools/risk-badge';
import {Button} from '@/components/ui/button';
import {decide, type DecisionResponse} from '@/lib/approvals';

interface Outcome extends DecisionResponse {
  decision: 'approve' | 'reject';
}

/** What happened after a decision, in one line. */
function outcomeText({decision, approval, error}: Outcome) {
  if (decision === 'reject') {
    return 'Rejected. The agent was told.';
  }
  if (approval?.toolCall.status === 'failed') {
    return 'Approved, but the tool failed. Open the chat for details.';
  }
  return error
    ? `Approved and done, but the agent couldn't reply: ${error}`
    : 'Approved and done.';
}

/**
 * Everything agents are waiting on, oldest first. A decided card stays to
 * show what happened, and the sidebar's count updates at once.
 */
export function TodayInbox({initialApprovals}: {initialApprovals: Approval[]}) {
  const router = useRouter();
  // Kept here, so cards stay put after the page's data refreshes.
  const [approvals] = useState(initialApprovals);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [deciding, setDeciding] = useState<string | null>(null);

  async function handleDecide(
    approval: Approval,
    decision: 'approve' | 'reject',
  ) {
    setDeciding(approval.id);
    const result = await decide(approval.id, decision);
    setDeciding(null);
    setOutcomes((current) => ({
      ...current,
      [approval.id]: {...result, decision},
    }));
    router.refresh();
  }

  if (approvals.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-3xl border border-dashed p-5">
        <Character id="sunny" mood="happy" size={72} />
        <div className="space-y-1">
          <p className="font-semibold">Nothing is waiting for you</p>
          <p className="text-sm text-muted-foreground">
            When a character needs your OK to change something, it shows up
            here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul aria-label="Waiting for you" className="space-y-3">
      {approvals.map((approval) => {
        const outcome = outcomes[approval.id];
        const isBusy = deciding === approval.id;
        return (
          <li
            key={approval.id}
            className="space-y-3 rounded-3xl border border-warning/40 bg-card p-4"
          >
            <div className="flex items-start gap-3">
              <CharacterAvatar
                id={characterOf(approval.agent.avatar)}
                size={40}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm">
                  <span className="font-semibold">{approval.agent.name}</span>{' '}
                  <span className="text-muted-foreground">wants to</span>{' '}
                  <span className="font-medium">
                    {approval.toolCall.toolName.replaceAll('_', ' ')}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <RiskBadge risk={approval.toolCall.risk} />
                  <RunTime value={approval.createdAt} />
                </div>
              </div>
              <Link
                href={`/agents/${approval.agent.id}?chat=${approval.threadId}`}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <MessageSquare className="size-4" />
                <span className="hidden sm:inline">Chat</span>
              </Link>
            </div>
            <pre className="max-h-32 overflow-auto rounded-xl bg-muted p-3 font-mono text-xs">
              {JSON.stringify(approval.toolCall.input, null, 2)}
            </pre>
            {outcome ? (
              <p role="status" className="text-sm text-muted-foreground">
                {outcomeText(outcome)}
              </p>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  disabled={isBusy}
                  onClick={() => handleDecide(approval, 'approve')}
                >
                  {isBusy ? (
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
                  disabled={isBusy}
                  onClick={() => handleDecide(approval, 'reject')}
                >
                  <X />
                  Reject
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
