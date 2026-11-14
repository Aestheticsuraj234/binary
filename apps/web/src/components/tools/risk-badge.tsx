import type {ToolRisk} from '@binary/shared';
import {BookOpen, Monitor, PenLine} from 'lucide-react';

import {Badge} from '@/components/ui/badge';
import {cn} from '@/lib/utils';

export const RISK_INFO: Record<
  ToolRisk,
  {label: string; icon: typeof BookOpen; explanation: string}
> = {
  read: {
    label: 'Read',
    icon: BookOpen,
    explanation: 'Only looks things up. Runs straight away.',
  },
  write: {
    label: 'Write',
    icon: PenLine,
    explanation:
      'Changes something outside Binary, like sending or deleting. Blocked until approvals arrive.',
  },
  computer: {
    label: 'Computer',
    icon: Monitor,
    explanation:
      'Controls a sandbox, a browser or your computer. Comes in later chapters.',
  },
};

/** How risky a tool is: read is calm, write and computer stand out. */
export function RiskBadge({
  risk,
  className,
}: {
  risk: ToolRisk;
  className?: string;
}) {
  const {label, icon: Icon} = RISK_INFO[risk];
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal text-muted-foreground',
        risk !== 'read' && 'border-warning/40 text-warning',
        className,
      )}
    >
      <Icon />
      {label}
    </Badge>
  );
}
