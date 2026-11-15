import {PROVIDER_INFO, type Agent} from '@binary/shared';

const CLI_LABELS = {claude_code: 'Claude Code', codex: 'Codex'} as const;

import {Badge} from '@/components/ui/badge';

/**
 * What the agent thinks with: "Anthropic · claude-sonnet-5-5", or "Claude
 * Code · your computer".
 */
export function ModelBadge({agent}: {agent: Agent}) {
  if (agent.engine !== 'api') {
    return (
      <Badge variant="outline" className="font-mono text-muted-foreground">
        {CLI_LABELS[agent.engine]} · your computer
      </Badge>
    );
  }
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
