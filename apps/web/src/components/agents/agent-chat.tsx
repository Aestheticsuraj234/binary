'use client';

import {
  CHARACTERS,
  characterOf,
  runAgentSchema,
  type Agent,
  type AgentRunResult,
} from '@binary/shared';
import {ArrowUp, Pencil, RotateCcw} from 'lucide-react';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';

import {ModelBadge} from '@/components/agents/model-badge';
import {
  Character,
  CharacterAvatar,
  type Mood,
} from '@/components/characters/character';
import {SpeechBubble} from '@/components/characters/speech-bubble';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {API_URL} from '@/lib/env';
import {cn} from '@/lib/utils';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  /** "64 in · 41 out · 0.7s" under an answer. */
  usage?: string;
  isError?: boolean;
}

// How many earlier messages go to the model. Matches the API's limit.
const HISTORY_LIMIT = 20;

/** Roughly how long the character "talks": longer answers, longer chatter. */
function talkingTime(text: string) {
  return Math.min(4000, Math.max(1200, text.length * 20));
}

function usageLine({inputTokens, outputTokens, durationMs}: AgentRunResult) {
  return `${inputTokens} in · ${outputTokens} out · ${(durationMs / 1000).toFixed(1)}s`;
}

/**
 * A conversation with one character. The character on the stage reacts to
 * what is happening: thinking while it waits, talking as the answer lands,
 * happy afterwards, and "oops" when something goes wrong.
 *
 * Messages live in this page only; saved chats with streaming arrive in
 * Chapter 5.
 */
export function AgentChat({agent}: {agent: Agent}) {
  const id = characterOf(agent.avatar);
  const character = CHARACTERS[id];
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [mood, setMood] = useState<Mood>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const nextId = useRef(0);
  const moodTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const endOfChat = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    endOfChat.current?.scrollIntoView({behavior: 'smooth', block: 'end'});
  }, [messages.length, isRunning]);

  function addMessage(message: Omit<Message, 'id'>) {
    nextId.current += 1;
    const messageId = nextId.current;
    setMessages((current) => [...current, {...message, id: messageId}]);
  }

  /** Plays a short sequence of moods, e.g. talking, then happy, then idle. */
  function playMoods(steps: [Mood, number][]) {
    moodTimers.current.forEach(clearTimeout);
    moodTimers.current = [];
    let delay = 0;
    for (const [next, duration] of steps) {
      // The first mood shows in the same render as the change that caused it.
      if (delay === 0) {
        setMood(next);
      } else {
        moodTimers.current.push(setTimeout(() => setMood(next), delay));
      }
      delay += duration;
    }
  }

  async function send(text: string) {
    const history = messages
      .filter((message) => !message.isError)
      .slice(-HISTORY_LIMIT)
      .map(({role, content}) => ({role, content}));
    const parsed = runAgentSchema.safeParse({prompt: text, history});
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the message.');
      return;
    }

    setError('');
    setDraft('');
    addMessage({role: 'user', content: parsed.data.prompt});
    playMoods([['thinking', 0]]);
    setIsRunning(true);
    const response = await fetch(`${API_URL}/api/agents/${agent.id}/run`, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(parsed.data),
    }).catch(() => null);
    setIsRunning(false);

    const body = response ? await response.json() : null;
    if (!response?.ok) {
      addMessage({
        role: 'assistant',
        content: body?.error ?? 'Could not reach the API.',
        isError: true,
      });
      playMoods([['oops', 0]]);
      return;
    }
    addMessage({role: 'assistant', content: body.text, usage: usageLine(body)});
    playMoods([
      ['talking', talkingTime(body.text)],
      ['happy', 1500],
      ['idle', 0],
    ]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isRunning) {
      send(draft);
    }
  }

  // Enter sends, Shift+Enter adds a line, like most chat apps.
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function handleNewChat() {
    setMessages([]);
    setError('');
    playMoods([
      ['happy', 900],
      ['idle', 0],
    ]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside
        className="flex shrink-0 items-center gap-4 border-b p-4 lg:w-80 lg:flex-col lg:items-stretch lg:gap-6 lg:border-r lg:border-b-0 lg:p-6 xl:w-96"
        style={{backgroundColor: `${character.color}14`}}
      >
        <div className="lg:hidden">
          <CharacterAvatar id={id} mood={mood} size={56} />
        </div>
        <div className="hidden place-items-center pt-6 lg:grid">
          <Character
            id={id}
            mood={mood}
            size={220}
            label={`${agent.name} is ${mood}`}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2 lg:flex-none lg:text-center">
          <h1 className="truncate text-xl font-semibold tracking-tight lg:text-2xl">
            {agent.name}
          </h1>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {agent.role}
          </p>
          <div className="hidden lg:block">
            <ModelBadge agent={agent} />
          </div>
        </div>

        <p className="hidden rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground lg:block">
          <span className="font-medium text-foreground">Personality: </span>
          {character.personality}
        </p>

        <div className="flex gap-2 lg:justify-center">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link
              href={`/agents/${agent.id}/edit`}
              aria-label={`Edit ${agent.name}`}
            >
              <Pencil />
              <span className="hidden sm:inline">Edit</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={handleNewChat}
            disabled={messages.length === 0 || isRunning}
            aria-label="New chat"
          >
            <RotateCcw />
            <span className="hidden sm:inline">New chat</span>
          </Button>
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
            {messages.length === 0 && (
              <div className="animate-rise space-y-5 pt-4">
                <div className="flex items-start gap-3">
                  <CharacterAvatar id={id} size={36} />
                  <SpeechBubble className="max-w-md">
                    {character.greeting}
                  </SpeechBubble>
                </div>
                <div className="flex flex-wrap gap-2 pl-12">
                  {character.starters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => send(starter)}
                      disabled={isRunning}
                      className="rounded-full border px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) =>
              message.role === 'user' ? (
                <div key={message.id} className="animate-rise flex justify-end">
                  <p className="max-w-[85%] rounded-3xl rounded-tr-md bg-secondary px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              ) : (
                <div
                  key={message.id}
                  className="animate-rise flex items-start gap-3"
                >
                  <CharacterAvatar
                    id={id}
                    mood={message.isError ? 'oops' : 'idle'}
                    size={36}
                  />
                  <div className="min-w-0 max-w-[85%] space-y-1.5">
                    <p
                      role={message.isError ? 'alert' : undefined}
                      className={cn(
                        'rounded-3xl rounded-tl-md border bg-card px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                        message.isError &&
                          'border-destructive/50 text-destructive',
                      )}
                    >
                      {message.content}
                    </p>
                    {message.usage && (
                      <p className="pl-2 font-mono text-xs text-muted-foreground">
                        {message.usage}
                      </p>
                    )}
                  </div>
                </div>
              ),
            )}

            {isRunning && (
              <div className="animate-rise flex items-center gap-3">
                <CharacterAvatar id={id} mood="thinking" size={36} />
                <div
                  className="flex gap-1.5 rounded-3xl rounded-tl-md border bg-card px-4 py-4"
                  aria-label={`${agent.name} is thinking`}
                  role="status"
                >
                  <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
                  <span className="size-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                  <span className="size-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={endOfChat} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t p-3 sm:p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border bg-card p-2 transition-colors focus-within:border-primary/60">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              aria-label={`Message ${agent.name}`}
              placeholder={`Message ${agent.name}…`}
              className="max-h-40 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            <Button
              type="submit"
              size="icon-lg"
              className="shrink-0 rounded-full"
              disabled={isRunning || draft.trim() === ''}
              aria-label="Send"
            >
              <ArrowUp />
            </Button>
          </div>
          {error && (
            <p
              role="alert"
              className="mx-auto mt-2 max-w-3xl px-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
