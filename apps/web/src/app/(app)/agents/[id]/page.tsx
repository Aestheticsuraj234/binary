import type {Agent} from '@binary/shared';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {AgentChat} from '@/components/agents/agent-chat';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Chat · Binary'};

interface AgentPageProps {
  params: Promise<{id: string}>;
}

export default async function AgentPage({params}: AgentPageProps) {
  const {id} = await params;
  const agentData = await getFromApi<{agent: Agent}>(`/api/agents/${id}`);
  // The API answers 404 for an unknown id and for someone else's agent alike.
  if (!agentData) {
    notFound();
  }

  // The chat fills the screen below the phone top bar, and scrolls inside.
  return (
    <main className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      <AgentChat key={agentData.agent.id} agent={agentData.agent} />
    </main>
  );
}
