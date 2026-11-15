import {
  CHARACTERS,
  TEMPLATE_CHARACTERS,
  type AgentTemplate,
  type ProviderKeySummary,
} from '@binary/shared';
import {ArrowLeft} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';

import {AgentForm} from '@/components/agents/agent-form';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Hire a character · Binary'};

interface NewAgentPageProps {
  searchParams: Promise<{template?: string}>;
}

export default async function NewAgentPage({searchParams}: NewAgentPageProps) {
  const {template: slug} = await searchParams;
  const [keyData, templateData, sandboxData] = await Promise.all([
    getFromApi<{keys: ProviderKeySummary[]}>('/api/provider-keys'),
    getFromApi<{templates: AgentTemplate[]}>('/api/agent-templates'),
    getFromApi<{available: boolean}>('/api/sandboxes'),
  ]);
  const connectedProviders = (keyData?.keys ?? []).map((key) => key.provider);
  // A character needs a model to think with, and a model needs a key.
  if (connectedProviders.length === 0) {
    redirect('/settings');
  }
  const template = templateData?.templates.find((item) => item.slug === slug);
  const castName = CHARACTERS[TEMPLATE_CHARACTERS[slug ?? ''] ?? 'nova'].name;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Discover
      </Link>
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">
          {template ? `Hire ${castName}` : 'Hire a character'}
        </h1>
        <p className="text-muted-foreground">
          {template
            ? `${castName} comes ready as your ${template.name}. Change anything you like.`
            : 'Pick who plays the part, then give them a job and a model.'}
        </p>
      </div>
      <AgentForm
        connectedProviders={connectedProviders}
        template={template}
        sandboxAvailable={sandboxData?.available ?? false}
      />
    </main>
  );
}
