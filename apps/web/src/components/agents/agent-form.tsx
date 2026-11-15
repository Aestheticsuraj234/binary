'use client';

import {
  AGENT_COMPUTER_INFO,
  AGENT_COMPUTERS,
  agentInputSchema,
  APPROVAL_MODE_INFO,
  APPROVAL_MODES,
  DEFAULT_APPROVAL_MODE,
  CHARACTER_IDS,
  CHARACTERS,
  characterOf,
  PROVIDER_INFO,
  PROVIDERS,
  providerSchema,
  TEMPLATE_CHARACTERS,
  TEMPLATE_COMPUTERS,
  type Agent,
  type AgentComputer,
  type AgentTemplate,
  type ApprovalMode,
  type CharacterId,
  type Provider,
} from '@binary/shared';
import {useRouter} from 'next/navigation';
import {useRef, useState} from 'react';

import {
  Character,
  CharacterAvatar,
  type Mood,
} from '@/components/characters/character';
import {SpeechBubble} from '@/components/characters/speech-bubble';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {Textarea} from '@/components/ui/textarea';
import {API_URL} from '@/lib/env';
import {cn} from '@/lib/utils';

interface AgentFormProps {
  connectedProviders: Provider[];
  /** The agent being edited. Without one, the form hires a new agent. */
  agent?: Agent;
  /** Pre-fills a new agent from a ready-made template. */
  template?: AgentTemplate;
  /** Whether the API can start cloud sandboxes (E2B is set up). */
  sandboxAvailable: boolean;
}

/** The suggested models, plus the agent's own model if it is not listed. */
function modelOptions(provider: Provider, currentModel: string) {
  const suggested = PROVIDER_INFO[provider].models;
  if (!currentModel || suggested.includes(currentModel)) {
    return suggested;
  }
  return [currentModel, ...suggested];
}

/** Who plays the agent at first: its saved character, the template's, or Nova. */
function startingCharacter(agent?: Agent, template?: AgentTemplate) {
  if (agent) {
    return characterOf(agent.avatar);
  }
  return TEMPLATE_CHARACTERS[template?.slug ?? ''] ?? 'nova';
}

/**
 * The character creator, used to hire a new agent and to edit one. A live
 * preview shows the chosen character introducing itself by its new name.
 */
export function AgentForm({
  connectedProviders,
  agent,
  template,
  sandboxAvailable,
}: AgentFormProps) {
  const router = useRouter();
  const [avatar, setAvatar] = useState<CharacterId>(
    startingCharacter(agent, template),
  );
  const [name, setName] = useState(
    agent?.name ?? (template ? CHARACTERS[avatar].name : ''),
  );
  const [mood, setMood] = useState<Mood>('idle');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [provider, setProvider] = useState<Provider>(
    agent?.provider ?? connectedProviders[0] ?? 'openai',
  );
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(
    agent?.approvalMode ?? DEFAULT_APPROVAL_MODE,
  );
  const [computer, setComputer] = useState<AgentComputer | null>(
    agent
      ? agent.defaultComputer
      : sandboxAvailable
        ? (TEMPLATE_COMPUTERS[template?.slug ?? ''] ?? null)
        : null,
  );
  const [model, setModel] = useState(
    agent?.model ?? PROVIDER_INFO[provider].models[0] ?? '',
  );
  const moodTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initial = agent ?? template;
  const character = CHARACTERS[avatar];

  function handlePickCharacter(next: CharacterId) {
    // Keep a name the user typed; swap a name that was only the default.
    if (name === '' || name === character.name) {
      setName(CHARACTERS[next].name);
    }
    setAvatar(next);
    // A little cheer when picked, then back to normal.
    setMood('happy');
    clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood('idle'), 1200);
  }

  // The select only offers known providers, so parsing always succeeds.
  function handleProviderChange(value: string) {
    const next = providerSchema.parse(value);
    setProvider(next);
    setModel(PROVIDER_INFO[next].models[0] ?? '');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);

    const parsed = agentInputSchema.safeParse({
      name,
      role: form.get('role'),
      instructions: form.get('instructions'),
      provider,
      model,
      avatar,
      approvalMode,
      defaultComputer: computer,
      templateId: template?.id,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      setMood('oops');
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
      setMood('oops');
      return;
    }
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? 'Could not save. Try again.');
      setMood('oops');
      return;
    }
    // Back to the conversation; refresh so the sidebar shows the change.
    router.push(`/agents/${agent?.id ?? body.agent.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      noValidate
    >
      <div className="self-start overflow-hidden rounded-3xl border bg-card lg:sticky lg:top-8">
        <div
          className="grid h-64 place-items-center transition-colors duration-300"
          style={{backgroundColor: `${character.color}24`}}
        >
          <Character
            id={avatar}
            mood={mood}
            size={190}
            label={`${character.name}, ${mood}`}
          />
        </div>
        <div className="space-y-3 p-5">
          <SpeechBubble tail="top" className="bg-background">
            Hi, I&apos;m <strong>{name.trim() || character.name}</strong>!{' '}
            {character.greeting}
          </SpeechBubble>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Personality: </span>
            {character.personality}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Choose a character</legend>
          <div className="grid grid-cols-4 gap-2">
            {CHARACTER_IDS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === avatar}
                onClick={() => handlePickCharacter(id)}
                className={cn(
                  'group flex flex-col items-center gap-1.5 rounded-2xl border border-transparent p-2 text-xs text-muted-foreground transition-colors hover:bg-secondary',
                  id === avatar &&
                    'border-primary bg-secondary text-foreground',
                )}
              >
                <CharacterAvatar id={id} size={56} />
                {CHARACTERS[id].name}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={character.name}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Job</Label>
          <Input
            id="role"
            name="role"
            defaultValue={initial?.role}
            placeholder="What this character does, in one sentence"
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
            className="min-h-28 resize-y"
          />
        </div>

        {/* `*:w-full` stretches the select's wrapper, which shadcn sizes to fit. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 *:w-full">
            <Label htmlFor="provider">Thinks with</Label>
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

        <div className="space-y-2 *:w-full">
          <Label htmlFor="approvalMode">Permissions</Label>
          <NativeSelect
            id="approvalMode"
            className="h-10 w-full"
            value={approvalMode}
            onChange={(event) =>
              setApprovalMode(
                APPROVAL_MODES.find((mode) => mode === event.target.value) ??
                  DEFAULT_APPROVAL_MODE,
              )
            }
          >
            {APPROVAL_MODES.map((mode) => (
              <NativeSelectOption key={mode} value={mode}>
                {APPROVAL_MODE_INFO[mode].label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            {APPROVAL_MODE_INFO[approvalMode].description}
          </p>
        </div>

        <div className="space-y-2 *:w-full">
          <Label htmlFor="computer">Computer</Label>
          <NativeSelect
            id="computer"
            className="h-10 w-full"
            value={computer ?? ''}
            onChange={(event) =>
              setComputer(
                AGENT_COMPUTERS.find((kind) => kind === event.target.value) ??
                  null,
              )
            }
          >
            <NativeSelectOption value="">None</NativeSelectOption>
            {AGENT_COMPUTERS.map((kind) => (
              <NativeSelectOption
                key={kind}
                value={kind}
                disabled={!sandboxAvailable && computer !== kind}
              >
                {AGENT_COMPUTER_INFO[kind].label}
                {!sandboxAvailable && ' (not set up)'}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            {computer
              ? `${AGENT_COMPUTER_INFO[computer].description} Running code always asks you first.`
              : 'Uses its tools and apps only.'}
          </p>
          {!sandboxAvailable && (
            <p className="text-xs text-warning">
              Cloud sandboxes need an E2B key: add E2B_API_KEY to the API&apos;s
              .env and restart it.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="h-11 rounded-full px-6"
          disabled={isPending}
        >
          {agent ? 'Save changes' : `Hire ${name.trim() || character.name}`}
        </Button>
      </div>
    </form>
  );
}
