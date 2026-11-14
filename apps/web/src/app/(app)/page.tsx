import type {Agent, AgentTemplate, ProviderKeySummary} from '@binary/shared';
import Link from 'next/link';

import {Character} from '@/components/characters/character';
import {
  CastCard,
  CrewCard,
  DesignYourOwnCard,
} from '@/components/characters/character-cards';
import {SpeechBubble} from '@/components/characters/speech-bubble';
import {Button} from '@/components/ui/button';
import {getFromApi} from '@/lib/server-api';
import {getSession} from '@/lib/session';

/** Discover: the characters you work with, and the ones you could hire. */
export default async function DiscoverPage() {
  const [session, keyData, agentData, templateData] = await Promise.all([
    getSession(),
    getFromApi<{keys: ProviderKeySummary[]}>('/api/provider-keys'),
    getFromApi<{agents: Agent[]}>('/api/agents'),
    getFromApi<{templates: AgentTemplate[]}>('/api/agent-templates'),
  ]);
  const firstName = session?.user.name.split(' ')[0];
  const hasKeys = (keyData?.keys.length ?? 0) > 0;
  const agents = agentData?.agents ?? [];
  const templates = templateData?.templates ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-12 px-4 py-8 sm:px-6 lg:py-12">
      <section className="flex items-center justify-between gap-6">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Hi {firstName}</p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Who are we working with today?
          </h1>
          <p className="max-w-lg text-muted-foreground">
            Every character has a job, a personality and a model to think with.
            Hire one and give it something to do.
          </p>
        </div>
        <div className="hidden shrink-0 items-end md:flex" aria-hidden>
          <Character id="sunny" size={110} className="-mr-6 mb-6" />
          <Character id="nova" size={150} />
          <Character id="bolt" size={110} className="-ml-6 mb-2" />
        </div>
      </section>

      {!hasKeys && (
        <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:flex-row sm:items-center">
          <Character id="pebble" mood="oops" size={96} />
          <SpeechBubble className="flex-1 bg-background">
            We can&apos;t think without a brain yet. Add an OpenAI, Anthropic or
            Gemini key and the whole cast can get to work.
          </SpeechBubble>
          <Button asChild className="h-10 rounded-full px-5">
            <Link href="/settings">Add a key</Link>
          </Button>
        </section>
      )}

      {agents.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Your crew</h2>
            <p className="text-sm text-muted-foreground">
              Pick someone to talk to.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <CrewCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Meet the cast
          </h2>
          <p className="text-sm text-muted-foreground">
            Ready-made roles. Change anything before you hire them.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <CastCard key={template.id} template={template} />
          ))}
          <DesignYourOwnCard />
        </div>
      </section>
    </main>
  );
}
