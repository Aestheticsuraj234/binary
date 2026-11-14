'use client';

import {
  PROVIDER_INFO,
  PROVIDERS,
  playgroundRequestSchema,
  type Provider,
} from '@binary/shared';
import {Play} from 'lucide-react';
import {useState} from 'react';

import {ResultCard, type RunState} from '@/components/playground/result-card';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {API_URL} from '@/lib/env';

const IDLE: RunState = {status: 'idle'};

// Start each provider on its first (recommended) model.
const DEFAULT_MODELS = {
  openai: PROVIDER_INFO.openai.models[0] ?? '',
  anthropic: PROVIDER_INFO.anthropic.models[0] ?? '',
  google: PROVIDER_INFO.google.models[0] ?? '',
};

interface PlaygroundProps {
  connectedProviders: Provider[];
}

/** Sends one prompt to every connected provider and shows the answers side by side. */
export function Playground({connectedProviders}: PlaygroundProps) {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [models, setModels] =
    useState<Record<Provider, string>>(DEFAULT_MODELS);
  const [runs, setRuns] = useState<Record<Provider, RunState>>({
    openai: IDLE,
    anthropic: IDLE,
    google: IDLE,
  });
  const isRunning = Object.values(runs).some((run) => run.status === 'loading');

  function updateRun(provider: Provider, run: RunState) {
    setRuns((current) => ({...current, [provider]: run}));
  }

  // Each provider runs on its own, so a fast answer shows up without waiting
  // for a slow one.
  async function runProvider(provider: Provider) {
    updateRun(provider, {status: 'loading'});
    // `.catch(() => null)` turns "the API is down" into a normal failure.
    const response = await fetch(`${API_URL}/api/playground`, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({provider, model: models[provider], prompt}),
    }).catch(() => null);

    if (!response) {
      updateRun(provider, {status: 'error', error: 'Could not reach the API.'});
      return;
    }
    const body = await response.json();
    if (!response.ok) {
      updateRun(provider, {status: 'error', error: body.error});
      return;
    }
    updateRun(provider, {status: 'done', result: body});
  }

  function handleRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = playgroundRequestSchema.shape.prompt.safeParse(prompt);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the prompt.');
      return;
    }
    setError('');
    connectedProviders.forEach(runProvider);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleRun} className="space-y-3">
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          aria-label="Prompt"
          placeholder="Ask anything, e.g. Explain the Strategy pattern in two sentences."
          className="min-h-28 resize-y"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Runs on {connectedProviders.length} of {PROVIDERS.length} providers
          </p>
          <Button
            type="submit"
            className="h-10"
            disabled={isRunning || connectedProviders.length === 0}
          >
            <Play />
            Run on all
          </Button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        {PROVIDERS.map((provider) => (
          <ResultCard
            key={provider}
            provider={provider}
            isConnected={connectedProviders.includes(provider)}
            model={models[provider]}
            onModelChange={(model) =>
              setModels((current) => ({...current, [provider]: model}))
            }
            run={runs[provider]}
          />
        ))}
      </div>
    </div>
  );
}
