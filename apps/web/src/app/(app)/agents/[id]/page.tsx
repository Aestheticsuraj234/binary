import type {Agent, ChatMessage, Thread} from '@binary/shared';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {AgentChat} from '@/components/agents/agent-chat';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Chat · Binary'};

interface AgentPageProps {
  params: Promise<{id: string}>;
  /** `?chat=<thread id>` opens a saved chat; without it, a new one. */
  searchParams: Promise<{chat?: string}>;
}

export default async function AgentPage({
  params,
  searchParams,
}: AgentPageProps) {
  const [{id}, {chat}] = await Promise.all([params, searchParams]);
  const [agentData, chatData] = await Promise.all([
    getFromApi<{agent: Agent}>(`/api/agents/${id}`),
    chat
      ? getFromApi<{thread: Thread; messages: ChatMessage[]}>(
          `/api/threads/${chat}`,
        )
      : null,
  ]);
  // The API answers 404 for unknown ids and other users' data alike. A chat
  // must also belong to this agent.
  const chatBelongs = !chat || chatData?.thread.agentId === id;
  if (!agentData || !chatBelongs) {
    notFound();
  }

  // The chat fills the screen below the phone top bar, and scrolls inside.
  // `key` gives each agent a fresh chat component.
  return (
    <main className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      <AgentChat
        key={agentData.agent.id}
        agent={agentData.agent}
        threadId={chatData?.thread.id}
        title={chatData?.thread.title}
        savedMessages={chatData?.messages ?? []}
      />
    </main>
  );
}
