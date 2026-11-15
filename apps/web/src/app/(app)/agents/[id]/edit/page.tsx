import type {Agent, ProviderKeySummary} from '@binary/shared';
import {ArrowLeft} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';

import {AgentForm} from '@/components/agents/agent-form';
import {DeleteAgentButton} from '@/components/agents/delete-agent-button';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Edit character · Binary'};

interface EditAgentPageProps {
  params: Promise<{id: string}>;
}

export default async function EditAgentPage({params}: EditAgentPageProps) {
  const {id} = await params;
  const [agentData, keyData, sandboxData] = await Promise.all([
    getFromApi<{agent: Agent}>(`/api/agents/${id}`),
    getFromApi<{keys: ProviderKeySummary[]}>('/api/provider-keys'),
    getFromApi<{available: boolean}>('/api/sandboxes'),
  ]);
  // The API answers 404 for an unknown id and for someone else's agent alike.
  if (!agentData) {
    notFound();
  }
  const {agent} = agentData;
  const connectedProviders = (keyData?.keys ?? []).map((key) => key.provider);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href={`/agents/${agent.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to {agent.name}
      </Link>
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">
          Edit {agent.name}
        </h1>
        <p className="text-muted-foreground">
          Change who plays the part, the job or the model. The next message uses
          the new profile.
        </p>
      </div>
      <AgentForm
        connectedProviders={connectedProviders}
        agent={agent}
        sandboxAvailable={sandboxData?.available ?? false}
      />
      <div className="border-t pt-6">
        <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
      </div>
    </main>
  );
}
