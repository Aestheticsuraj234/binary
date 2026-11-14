import type {Agent, AgentTemplate, ProviderKeySummary} from '@binary/shared';
import {Bot, KeyRound, Plus} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';

import {AgentCard} from '@/components/agents/agent-card';
import {Button} from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Agents · Binary'};

export default async function AgentsPage() {
  const [agentData, templateData, keyData] = await Promise.all([
    getFromApi<{agents: Agent[]}>('/api/agents'),
    getFromApi<{templates: AgentTemplate[]}>('/api/agent-templates'),
    getFromApi<{keys: ProviderKeySummary[]}>('/api/provider-keys'),
  ]);
  const agents = agentData?.agents ?? [];
  const templates = templateData?.templates ?? [];
  const hasKeys = (keyData?.keys.length ?? 0) > 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Your AI coworkers. Each one has a role, instructions and a model.
          </p>
        </div>
        {hasKeys && (
          <Button asChild className="h-10">
            <Link href="/agents/new">
              <Plus />
              New agent
            </Link>
          </Button>
        )}
      </div>

      {!hasKeys && (
        <Link href="/settings" className="block">
          <Card className="transition-colors hover:border-primary/60">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
                <KeyRound className="size-5 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle>Add an API key first</CardTitle>
                <CardDescription>
                  Agents think with your own OpenAI, Anthropic or Gemini key.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      )}

      {agents.length === 0 && (
        <Card className="border-dashed bg-transparent">
          <CardHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-lg bg-secondary">
              <Bot className="size-5 text-primary" />
            </div>
            <CardTitle>No agents yet</CardTitle>
            <CardDescription>
              Hire one from a template below, or start from scratch.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {agents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {hasKeys && templates.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              Start from a template
            </h2>
            <p className="text-sm text-muted-foreground">
              Pre-filled roles you can change before hiring.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {templates.map((template) => (
              <Link
                key={template.id}
                href={`/agents/new?template=${template.slug}`}
                className="block"
              >
                <Card className="h-full transition-colors hover:border-primary/60">
                  <CardHeader>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.role}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
