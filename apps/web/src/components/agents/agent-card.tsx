import {PROVIDER_INFO, type Agent} from '@binary/shared';
import Link from 'next/link';

import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {Badge} from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {initialsOf} from '@/lib/initials';

/** The agent's initials in a round tile. */
export function AgentAvatar({
  name,
  size = 'default',
}: {
  name: string;
  size?: 'default' | 'lg';
}) {
  return (
    <Avatar className={size === 'lg' ? 'size-12' : 'size-10'}>
      <AvatarFallback className="bg-secondary text-sm font-medium text-primary">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Which model the agent thinks with, e.g. "Anthropic · claude-sonnet-5-5". */
export function ModelBadge({agent}: {agent: Agent}) {
  if (!agent.provider || !agent.model) {
    return <Badge variant="outline">No model</Badge>;
  }
  return (
    <Badge variant="outline" className="font-mono text-muted-foreground">
      {PROVIDER_INFO[agent.provider].label} · {agent.model}
    </Badge>
  );
}

/** One agent in a list; opens the agent's page. */
export function AgentCard({agent}: {agent: Agent}) {
  return (
    <Link href={`/agents/${agent.id}`} className="block">
      <Card className="h-full transition-colors hover:border-primary/60">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <AgentAvatar name={agent.name} />
            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate">{agent.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {agent.role}
              </CardDescription>
            </div>
          </div>
          <ModelBadge agent={agent} />
        </CardHeader>
      </Card>
    </Link>
  );
}
