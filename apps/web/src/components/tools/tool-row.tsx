import type {ToolInfo} from '@binary/shared';

import {RiskBadge} from '@/components/tools/risk-badge';

/** One tool in a list: its name, what it does and how risky it is. */
export function ToolRow({tool}: {tool: ToolInfo}) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 space-y-1">
        <p className="truncate font-mono text-sm">{tool.name}</p>
        <p className="text-sm text-muted-foreground">{tool.description}</p>
      </div>
      <RiskBadge risk={tool.risk} className="shrink-0" />
    </li>
  );
}
