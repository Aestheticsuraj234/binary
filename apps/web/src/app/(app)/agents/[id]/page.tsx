import type {Agent, ProviderKeySummary} from '@binary/shared';
import {ArrowLeft} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';

import {AgentAvatar, ModelBadge} from '@/components/agents/agent-card';
import {AgentForm} from '@/components/agents/agent-form';
import {AgentRunner} from '@/components/agents/agent-runner';
import {DeleteAgentButton} from '@/components/agents/delete-agent-button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Agent · Binary'};

interface AgentPageProps {
  params: Promise<{id: string}>;
}

export default async function AgentPage({params}: AgentPageProps) {
  const {id} = await params;
  const [agentData, keyData] = await Promise.all([
    getFromApi<{agent: Agent}>(`/api/agents/${id}`),
    getFromApi<{keys: ProviderKeySummary[]}>('/api/provider-keys'),
  ]);
  // The API answers 404 for an unknown id and for someone else's agent alike.
  if (!agentData) {
    notFound();
  }
  const {agent} = agentData;
  const connectedProviders = (keyData?.keys ?? []).map((key) => key.provider);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-6 py-16">
      <Link
        href="/agents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Agents
      </Link>

      <div className="flex items-center gap-4">
        <AgentAvatar name={agent.name} size="lg" />
        <div className="min-w-0 space-y-2">
          <h1 className="truncate text-4xl font-semibold tracking-tight">
            {agent.name}
          </h1>
          <p className="text-muted-foreground">{agent.role}</p>
          <ModelBadge agent={agent} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Give {agent.name} a task</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentRunner agentId={agent.id} agentName={agent.name} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <AgentForm connectedProviders={connectedProviders} agent={agent} />
            <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
