import type {Agent, MemoryStatus, MemoryView} from '@binary/shared';
import {ArrowLeft} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';

import {MemoryList} from '@/components/memory/memory-list';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Memory · Binary'};

interface MemoryPageProps {
  params: Promise<{id: string}>;
}

/** What one character remembers about you. */
export default async function MemoryPage({params}: MemoryPageProps) {
  const {id} = await params;
  const [agentData, memoryData] = await Promise.all([
    getFromApi<{agent: Agent}>(`/api/agents/${id}`),
    getFromApi<{status: MemoryStatus; memories: MemoryView[]}>(
      `/api/agents/${id}/memories`,
    ),
  ]);
  if (!agentData || !memoryData) {
    notFound();
  }
  const {agent} = agentData;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href={`/agents/${agent.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to {agent.name}
      </Link>
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">
          {agent.name}&apos;s memory
        </h1>
        <p className="text-muted-foreground">
          What {agent.name} remembers about you across chats. The memories
          closest to each new message come along with it. Delete anything that
          is wrong or private.
        </p>
      </div>
      <MemoryList
        agentId={agent.id}
        agentName={agent.name}
        status={memoryData.status}
        initialMemories={memoryData.memories}
      />
    </main>
  );
}
