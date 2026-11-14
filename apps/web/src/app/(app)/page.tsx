import type {ProviderKeySummary} from '@binary/shared';
import {ArrowRight, Bot, FlaskConical, KeyRound, Sparkles} from 'lucide-react';
import Link from 'next/link';

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

const TRY_PLAYGROUND = {
  href: '/playground',
  icon: FlaskConical,
  title: 'Try the playground',
  description:
    'Ask one question and compare OpenAI, Anthropic and Gemini side by side.',
};

export default async function HomePage() {
  const session = await getSession();
  const data = await getFromApi<{keys: ProviderKeySummary[]}>(
    '/api/provider-keys',
  );
  const firstName = session?.user.name.split(' ')[0];
  const hasKeys = (data?.keys.length ?? 0) > 0;
  const nextStep = hasKeys ? TRY_PLAYGROUND : ADD_KEY;
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
          Your workspace is ready. Your AI coworkers will appear here soon.
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

      <Card className="border-dashed bg-transparent">
        <CardHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-lg bg-secondary">
            <Bot className="size-5 text-primary" />
          </div>
          <CardTitle>No agents yet</CardTitle>
          <CardDescription>
            Agents arrive in the next chapter. They will think with the models
            you connect here.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
