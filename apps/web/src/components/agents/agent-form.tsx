'use client';

import {
  agentInputSchema,
  PROVIDER_INFO,
  PROVIDERS,
  providerSchema,
  type Agent,
  type AgentTemplate,
  type Provider,
} from '@binary/shared';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {Textarea} from '@/components/ui/textarea';
import {API_URL} from '@/lib/env';

interface AgentFormProps {
  connectedProviders: Provider[];
  /** The agent being edited. Without one, the form hires a new agent. */
  agent?: Agent;
  /** Pre-fills a new agent from a ready-made template. */
  template?: AgentTemplate;
}

/** The suggested models, plus the agent's own model if it is not listed. */
function modelOptions(provider: Provider, currentModel: string) {
  const suggested = PROVIDER_INFO[provider].models;
  if (!currentModel || suggested.includes(currentModel)) {
    return suggested;
  }
  return [currentModel, ...suggested];
}

/** Name, role, instructions and model of an agent. */
export function AgentForm({
  connectedProviders,
  agent,
  template,
}: AgentFormProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [provider, setProvider] = useState<Provider>(
    agent?.provider ?? connectedProviders[0] ?? 'openai',
  );
  const [model, setModel] = useState(
    agent?.model ?? PROVIDER_INFO[provider].models[0] ?? '',
  );
  const initial = agent ?? template;

  // The select only offers known providers, so parsing always succeeds.
  function handleProviderChange(value: string) {
    const next = providerSchema.parse(value);
    setProvider(next);
    setModel(PROVIDER_INFO[next].models[0] ?? '');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);

    const parsed = agentInputSchema.safeParse({
      name: form.get('name'),
      role: form.get('role'),
      instructions: form.get('instructions'),
      provider,
      model,
      templateId: template?.id,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }

    setIsPending(true);
    const response = await fetch(
      agent ? `${API_URL}/api/agents/${agent.id}` : `${API_URL}/api/agents`,
      {
        method: agent ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(parsed.data),
      },
    ).catch(() => null);
    setIsPending(false);

    if (!response) {
      setError('Could not reach the API.');
      return;
    }
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? 'Could not save the agent. Try again.');
      return;
    }
    if (agent) {
      setNotice('Saved.');
      router.refresh();
      return;
    }
    router.push(`/agents/${body.agent.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name}
          placeholder="e.g. Ada"
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input
          id="role"
          name="role"
          defaultValue={initial?.role}
          placeholder="What this agent does, in one sentence"
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          name="instructions"
          defaultValue={initial?.instructions}
          placeholder="How it should work: tone, rules, what to ask before acting"
          className="min-h-32 resize-y"
        />
      </div>

      {/* `*:w-full` stretches the select's wrapper, which shadcn sizes to fit. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 *:w-full">
          <Label htmlFor="provider">Provider</Label>
          <NativeSelect
            id="provider"
            className="h-10 w-full"
            value={provider}
            onChange={(event) => handleProviderChange(event.target.value)}
          >
            {PROVIDERS.map((id) => (
              <NativeSelectOption
                key={id}
                value={id}
                disabled={!connectedProviders.includes(id)}
              >
                {PROVIDER_INFO[id].label}
                {!connectedProviders.includes(id) && ' (no key)'}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 *:w-full">
          <Label htmlFor="model">Model</Label>
          <NativeSelect
            id="model"
            className="h-10 w-full"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          >
            {modelOptions(provider, model).map((id) => (
              <NativeSelectOption key={id} value={id}>
                {id}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}

      {/* On the agent's page, "Send" is the main action, so Save is quieter. */}
      <Button
        type="submit"
        variant={agent ? 'secondary' : 'default'}
        className="h-10"
        disabled={isPending}
      >
        {agent ? 'Save changes' : 'Hire agent'}
      </Button>
    </form>
  );
}
