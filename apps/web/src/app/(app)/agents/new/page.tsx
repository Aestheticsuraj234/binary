import type {AgentTemplate, ProviderKeySummary} from '@binary/shared';
import {ArrowLeft} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';

import {AgentForm} from '@/components/agents/agent-form';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'New agent · Binary'};

interface NewAgentPageProps {
  searchParams: Promise<{template?: string}>;
}

export default async function NewAgentPage({searchParams}: NewAgentPageProps) {
  const {template: slug} = await searchParams;
  const [keyData, templateData] = await Promise.all([
    getFromApi<{keys: ProviderKeySummary[]}>('/api/provider-keys'),
    getFromApi<{templates: AgentTemplate[]}>('/api/agent-templates'),
  ]);
  const connectedProviders = (keyData?.keys ?? []).map((key) => key.provider);
  // An agent needs a model to think with, and a model needs a key.
  if (connectedProviders.length === 0) {
    redirect('/settings');
  }
  const template = templateData?.templates.find((item) => item.slug === slug);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-6 py-16">
      <Link
        href="/agents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Agents
      </Link>
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">
          {template ? `Hire a ${template.name}` : 'New agent'}
        </h1>
        <p className="text-muted-foreground">
          Give it a name, describe its job and pick the model it thinks with.
        </p>
      </div>
      <AgentForm connectedProviders={connectedProviders} template={template} />
    </main>
  );
}
