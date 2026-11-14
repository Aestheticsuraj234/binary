'use client';

import {
  CHARACTERS,
  characterOf,
  sendMessageSchema,
  type Agent,
  type ChatMessage,
  type ChatStreamEvent,
  type Thread,
  type ToolCallView,
} from '@binary/shared';
import {ArrowUp, Pencil, Plus, Trash2} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';

import {ModelBadge} from '@/components/agents/model-badge';
import {Markdown} from '@/components/chat/markdown';
import {ToolCall} from '@/components/chat/tool-call';
import {
  Character,
  CharacterAvatar,
  type Mood,
} from '@/components/characters/character';
import {SpeechBubble} from '@/components/characters/speech-bubble';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {API_URL} from '@/lib/env';
import {readNdjson} from '@/lib/read-ndjson';
import {cn} from '@/lib/utils';

/** A message on screen: saved ones, plus the reply being written right now. */
interface Message {
  id: string;
  role: ChatMessage['role'];
  content: string;
  /** Why the answer failed. Shown under any words that did arrive. */
  error?: string;
  /** True while the answer is still streaming in. */
  isStreaming?: boolean;
  /** Tools the agent used for this answer, in order. */
  toolCalls?: ToolCallView[];
}

/** Adds a tool call to a reply, or updates it when it was already there. */
function withToolCall(message: Message, call: ToolCallView): Message {
  const calls = message.toolCalls ?? [];
  const known = calls.some((existing) => existing.id === call.id);
  return {
    ...message,
    toolCalls: known
      ? calls.map((existing) => (existing.id === call.id ? call : existing))
      : [...calls, call],
  };
}

interface AgentChatProps {
  agent: Agent;
  /** The open chat. Empty for a new chat, which is saved on its first message. */
  threadId?: string;
  title?: string;
  savedMessages: ChatMessage[];
}

const JSON_HEADERS = {'Content-Type': 'application/json'};

/**
 * Messages written in this visit have local ids until saved. Only they rise
 * into view; a saved chat appears at once when opened.
 */
function isNew(message: Message) {
  return message.id.startsWith('local-');
}

/** Creates the chat on the server; returns its id, or null if that failed. */
async function startThread(agentId: string): Promise<string | null> {
  const response = await fetch(`${API_URL}/api/agents/${agentId}/threads`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  const body: {thread: Thread} = await response.json();
  return body.thread.id;
}

/**
 * A saved conversation with one character. Answers stream in word by word,
 * and the character on the stage reacts: thinking until the first word,
 * talking while words arrive, happy when done, and "oops" on errors.
 */
export function AgentChat({
  agent,
  threadId: openThreadId,
  title,
  savedMessages,
}: AgentChatProps) {
  const router = useRouter();
  const id = characterOf(agent.avatar);
  const character = CHARACTERS[id];
  const [threadId, setThreadId] = useState(openThreadId);
  const [messages, setMessages] = useState<Message[]>(savedMessages);
  const [shownThreadId, setShownThreadId] = useState(openThreadId);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [mood, setMood] = useState<Mood>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const nextLocalId = useRef(0);
  const moodTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const endOfChat = useRef<HTMLDivElement>(null);

  // When the URL opens a different chat (sidebar, New chat), show it. This
  // runs during render, React's way to reset state when a prop changes.
  if (openThreadId !== shownThreadId) {
    setShownThreadId(openThreadId);
    setThreadId(openThreadId);
    setMessages(savedMessages);
    setError('');
  }

  // Keep the newest words in view while the answer streams in.
  useEffect(() => {
    endOfChat.current?.scrollIntoView({block: 'end'});
  }, [messages]);

  /** Adds a message that has no server id yet; returns its local id. */
  function addMessage(message: Omit<Message, 'id'>) {
    nextLocalId.current += 1;
    const localId = `local-${nextLocalId.current}`;
    setMessages((current) => [...current, {...message, id: localId}]);
    return localId;
  }

  function updateMessage(
    localId: string,
    change: (message: Message) => Message,
  ) {
    setMessages((current) =>
      current.map((message) =>
        message.id === localId ? change(message) : message,
      ),
    );
  }

  /** Plays a short sequence of moods, e.g. happy, then idle. */
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

  /** Shows a failure in the reply bubble, keeping any words that arrived. */
  function showFailure(replyId: string, reason: string) {
    updateMessage(replyId, (message) => ({
      ...message,
      error: reason,
      isStreaming: false,
    }));
    playMoods([['oops', 0]]);
  }

  async function send(text: string) {
    const parsed = sendMessageSchema.safeParse({content: text});
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the message.');
      return;
    }

    setError('');
    setDraft('');
    setIsRunning(true);
    addMessage({role: 'user', content: parsed.data.content});
    const replyId = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    });
    playMoods([['thinking', 0]]);

    // A new chat is saved on its first message. Updating the address bar
    // without navigating keeps this page (and the stream) alive.
    let chatId = threadId;
    if (!chatId) {
      chatId = (await startThread(agent.id)) ?? undefined;
      if (!chatId) {
        showFailure(replyId, 'Could not start the chat. Is the API running?');
        setIsRunning(false);
        return;
      }
      setThreadId(chatId);
      window.history.replaceState(
        null,
        '',
        `/agents/${agent.id}?chat=${chatId}`,
      );
    }

    const response = await fetch(`${API_URL}/api/threads/${chatId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify(parsed.data),
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      showFailure(replyId, body?.error ?? 'Could not reach the API.');
      setIsRunning(false);
      return;
    }

    try {
      for await (const event of readNdjson<ChatStreamEvent>(response)) {
        if (event.type === 'tool') {
          // The character "thinks" while a tool works, then talks again.
          setMood(event.call.status === 'running' ? 'thinking' : 'talking');
          updateMessage(replyId, (message) =>
            withToolCall(message, event.call),
          );
        } else if (event.type === 'delta') {
          setMood('talking');
          updateMessage(replyId, (message) => ({
            ...message,
            content: message.content + event.text,
          }));
        } else if (event.type === 'done') {
          updateMessage(replyId, () => event.message);
          playMoods([
            ['happy', 1500],
            ['idle', 0],
          ]);
        } else {
          showFailure(replyId, event.error);
        }
      }
    } catch {
      showFailure(
        replyId,
        'The connection dropped before the answer finished.',
      );
    }
    setIsRunning(false);
    // Reload the sidebar so this chat moves to the top of Recent chats.
    router.refresh();
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
    // Reset here too: if the address was only replaced, the router may not
    // see this as a change of chat.
    setThreadId(undefined);
    setMessages([]);
    setError('');
    playMoods([
      ['happy', 900],
      ['idle', 0],
    ]);
    router.push(`/agents/${agent.id}`);
  }

  async function handleDeleteChat() {
    if (
      !threadId ||
      !window.confirm('Delete this chat? This cannot be undone.')
    ) {
      return;
    }
    const response = await fetch(`${API_URL}/api/threads/${threadId}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => null);
    if (!response?.ok) {
      setError('Could not delete the chat. Try again.');
      return;
    }
    handleNewChat();
    router.refresh();
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

        <div className="flex lg:justify-center">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link
              href={`/agents/${agent.id}/edit`}
              aria-label={`Edit ${agent.name}`}
            >
              <Pencil />
              <span className="hidden sm:inline">Edit</span>
            </Link>
          </Button>
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
          <h2 className="truncate text-sm font-medium">
            {/* A new chat gets its title from the first message once saved. */}
            {(threadId && title) || 'New chat'}
          </h2>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={handleNewChat}
              disabled={isRunning || !threadId}
            >
              <Plus />
              New chat
            </Button>
            {threadId && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-muted-foreground hover:text-destructive"
                onClick={handleDeleteChat}
                disabled={isRunning}
                aria-label="Delete chat"
                title="Delete chat"
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </header>

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
                <div
                  key={message.id}
                  className={cn(
                    'flex justify-end',
                    isNew(message) && 'animate-rise',
                  )}
                >
                  <p className="max-w-[85%] rounded-3xl rounded-tr-md bg-secondary px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              ) : (
                <div
                  key={message.id}
                  className={cn(
                    'flex items-start gap-3',
                    isNew(message) && 'animate-rise',
                  )}
                >
                  <CharacterAvatar
                    id={id}
                    mood={message.error ? 'oops' : 'idle'}
                    size={36}
                  />
                  {message.isStreaming &&
                  !message.content &&
                  !message.toolCalls ? (
                    <div
                      className="flex gap-1.5 rounded-3xl rounded-tl-md border bg-card px-4 py-4"
                      aria-label={`${agent.name} is thinking`}
                      role="status"
                    >
                      <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
                      <span className="size-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                      <span className="size-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'max-w-[85%] min-w-0 space-y-3 rounded-3xl rounded-tl-md border bg-card px-4 py-3',
                        message.error && 'border-destructive/50',
                      )}
                    >
                      {message.toolCalls && (
                        <div className="space-y-1.5">
                          {message.toolCalls.map((call) => (
                            <ToolCall key={call.id} call={call} />
                          ))}
                        </div>
                      )}
                      {message.content && (
                        <Markdown isStreaming={message.isStreaming}>
                          {message.content}
                        </Markdown>
                      )}
                      {message.error && (
                        <p role="alert" className="text-sm text-destructive">
                          {message.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ),
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
