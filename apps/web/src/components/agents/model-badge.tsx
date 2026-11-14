import {PROVIDER_INFO, type Agent} from '@binary/shared';

import {Badge} from '@/components/ui/badge';

/** Which model the agent thinks with, e.g. "Anthropic · claude-sonnet-5-5". */
export function ModelBadge({agent}: {agent: Agent}) {
  if (!agent.provider || !agent.model) {
    return <Badge variant="outline">No model</Badge>;
  }
  return (
    <Badge
      variant="outline"
      className="max-w-full truncate font-mono text-muted-foreground"
    >
      {PROVIDER_INFO[agent.provider].label} · {agent.model}
    </Badge>
  );
}
