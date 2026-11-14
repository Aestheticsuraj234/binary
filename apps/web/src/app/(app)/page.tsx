import type {Agent, ProviderKeySummary} from '@binary/shared';
import {
  ArrowRight,
  Bot,
  FlaskConical,
  KeyRound,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';

import {AgentCard} from '@/components/agents/agent-card';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {getFromApi} from '@/lib/server-api';
import {getSession} from '@/lib/session';

const ADD_KEY = {
  href: '/settings',
  icon: KeyRound,
  title: 'Add your first API key',
  description:
    'Binary uses your own OpenAI, Anthropic or Gemini key. It is encrypted before it is stored.',
};

const HIRE_AGENT = {
  href: '/agents',
  icon: UserPlus,
  title: 'Hire your first agent',
  description:
    'Start from a template like Research Assistant, or write your own role.',
};

const TRY_PLAYGROUND = {
  href: '/playground',
  icon: FlaskConical,
  title: 'Try the playground',
  description:
    'Ask one question and compare OpenAI, Anthropic and Gemini side by side.',
};

/** The one thing a user should do next: key, then agent, then explore. */
function chooseNextStep(hasKeys: boolean, hasAgents: boolean) {
  if (!hasKeys) {
    return ADD_KEY;
  }
  if (!hasAgents) {
    return HIRE_AGENT;
  }
  return TRY_PLAYGROUND;
}

export default async function HomePage() {
  const [session, keyData, agentData] = await Promise.all([
    getSession(),
    getFromApi<{keys: ProviderKeySummary[]}>('/api/provider-keys'),
    getFromApi<{agents: Agent[]}>('/api/agents'),
  ]);
  const firstName = session?.user.name.split(' ')[0];
  const agents = agentData?.agents ?? [];
  const nextStep = chooseNextStep(
    (keyData?.keys.length ?? 0) > 0,
    agents.length > 0,
  );
  const NextStepIcon = nextStep.icon;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-16">
      <div className="space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          You&apos;re signed in
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Welcome, {firstName}.
        </h1>
        <p className="text-muted-foreground">
          Your workspace is ready. Hire AI coworkers and give each one a job.
        </p>
      </div>

      <Link href={nextStep.href} className="block">
        <Card className="transition-colors hover:border-primary/60">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
              <NextStepIcon className="size-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <CardTitle>{nextStep.title}</CardTitle>
              <CardDescription>{nextStep.description}</CardDescription>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </CardHeader>
        </Card>
      </Link>

      {agents.length === 0 && (
        <Card className="border-dashed bg-transparent">
          <CardHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-lg bg-secondary">
              <Bot className="size-5 text-primary" />
            </div>
            <CardTitle>No agents yet</CardTitle>
            <CardDescription>
              Agents you hire will show up here, ready to take on tasks.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {agents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Your agents
            </h2>
            <Link
              href="/agents"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              See all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {agents.slice(0, 4).map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
