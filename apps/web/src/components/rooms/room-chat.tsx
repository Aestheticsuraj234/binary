'use client';

import {
  characterOf,
  ROUTING_MODE_INFO,
  sendMessageSchema,
  type ChatMessage,
  type ChatStreamEvent,
  type Room,
  type Thread,
  type ToolCallView,
} from '@binary/shared';
import {ArrowUp, Pencil, Plus, Trash2} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';

import {Markdown} from '@/components/chat/markdown';
import {ToolCall} from '@/components/chat/tool-call';
import {CharacterAvatar} from '@/components/characters/character';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {decide} from '@/lib/approvals';
import {API_URL} from '@/lib/env';
import {readNdjson} from '@/lib/read-ndjson';
import {startRoomChat} from '@/lib/rooms';
import {cn} from '@/lib/utils';

interface Message {
  id: string;
  role: ChatMessage['role'];
  content: string;
  authorAgentId?: string | null;
  error?: string;
  isStreaming?: boolean;
  toolCalls?: ToolCallView[];
}

interface RoomChatProps {
  room: Room;
  threadId?: string;
  title?: string;
  savedMessages: ChatMessage[];
  chats: Thread[];
}

function withToolCall(message: Message, call: ToolCallView): Message {
  const calls = message.toolCalls ?? [];
  return {
    ...message,
    toolCalls: calls.some((existing) => existing.id === call.id)
      ? calls.map((existing) => (existing.id === call.id ? call : existing))
      : [...calls, call],
  };
}

/**
 * A chat with a whole room. Every character's answer streams in under its
 * own face and name, one after the other; chips above the box @mention a
 * member.
 */
export function RoomChat({
  room,
  threadId: openThreadId,
  title,
  savedMessages,
  chats,
}: RoomChatProps) {
  const router = useRouter();
  const [threadId, setThreadId] = useState(openThreadId);
  const [shownThreadId, setShownThreadId] = useState(openThreadId);
  const [messages, setMessages] = useState<Message[]>(savedMessages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const nextLocalId = useRef(0);
  const endOfChat = useRef<HTMLDivElement>(null);
  const memberById = new Map(room.members.map((member) => [member.id, member]));
  const lead = room.members.find((member) => member.id === room.leadAgentId);

  if (openThreadId !== shownThreadId) {
    setShownThreadId(openThreadId);
    setThreadId(openThreadId);
    setMessages(savedMessages);
    setError('');
  }

  useEffect(() => {
    endOfChat.current?.scrollIntoView({block: 'end'});
  }, [messages]);

  function localId() {
    nextLocalId.current += 1;
    return `local-${nextLocalId.current}`;
  }

  function update(id: string, change: (message: Message) => Message) {
    setMessages((current) =>
      current.map((message) => (message.id === id ? change(message) : message)),
    );
  }

  async function reload(chatId: string) {
    const response = await fetch(`${API_URL}/api/threads/${chatId}`, {
      credentials: 'include',
    }).catch(() => null);
    if (response?.ok) {
      const body: {messages: ChatMessage[]} = await response.json();
      setMessages(body.messages);
    }
  }

  async function send(text: string) {
    const parsed = sendMessageSchema.safeParse({content: text});
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your message.');
      return;
    }
    setError('');
    setDraft('');
    setIsRunning(true);
    setMessages((current) => [
      ...current,
      {id: localId(), role: 'user', content: parsed.data.content},
    ]);

    let chatId = threadId;
    if (!chatId) {
      const {data} = await startRoomChat(room.id);
      chatId = data?.thread.id;
      if (!chatId) {
        setError('Could not start the chat. Is the API running?');
        setIsRunning(false);
        return;
      }
      setThreadId(chatId);
      window.history.replaceState(null, '', `/rooms/${room.id}?chat=${chatId}`);
    }

    const response = await fetch(`${API_URL}/api/threads/${chatId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(parsed.data),
    }).catch(() => null);
    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(body?.error ?? 'Could not reach the API.');
      setIsRunning(false);
      return;
    }

    // The answer being written now, if any.
    let current: string | undefined;
    try {
      for await (const event of readNdjson<ChatStreamEvent>(response)) {
        if (event.type === 'turn') {
          const id = localId();
          current = id;
          setMessages((list) => [
            ...list,
            {
              id,
              role: 'assistant',
              content: '',
              authorAgentId: event.agentId,
              isStreaming: true,
            },
          ]);
        } else if (event.type === 'delta' && current) {
          update(current, (message) => ({
            ...message,
            content: message.content + event.text,
          }));
        } else if (event.type === 'tool' && current) {
          update(current, (message) => withToolCall(message, event.call));
        } else if (event.type === 'done' && current) {
          update(current, () => event.message);
          current = undefined;
        } else if (event.type === 'error') {
          if (current) {
            const failed = current;
            update(failed, (message) => ({
              ...message,
              isStreaming: false,
              error: event.error,
            }));
            current = undefined;
          } else {
            setError(event.error);
          }
        }
      }
    } catch {
      setError('The connection dropped before everyone finished.');
    }
    setIsRunning(false);
    router.refresh();
  }

  async function handleDecide(
    approvalId: string,
    choice: 'approve' | 'reject',
  ) {
    const result = await decide(approvalId, choice);
    if (threadId) {
      await reload(threadId);
    }
    if (result.error) {
      setError(result.error);
    }
    router.refresh();
  }

  async function handleDeleteChat() {
    if (
      !threadId ||
      !window.confirm('Delete this chat? This cannot be undone.')
    ) {
      return;
    }
    await fetch(`${API_URL}/api/threads/${threadId}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => null);
    router.push(`/rooms/${room.id}`);
    router.refresh();
  }

  function mention(name: string) {
    setDraft(
      (text) => `${text}${text && !text.endsWith(' ') ? ' ' : ''}@${name} `,
    );
  }

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

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="hidden w-80 shrink-0 flex-col gap-6 border-r p-6 lg:flex">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{room.name}</h1>
          <Badge variant="outline">
            {ROUTING_MODE_INFO[room.routingMode].label}
          </Badge>
          <p className="text-xs text-muted-foreground">
            {ROUTING_MODE_INFO[room.routingMode].description}
          </p>
        </div>
        <ul className="space-y-3">
          {room.members.map((member) => (
            <li key={member.id} className="flex items-center gap-3">
              <CharacterAvatar id={characterOf(member.avatar)} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {member.name}
                  {member.id === room.leadAgentId && (
                    <span className="ml-1 text-xs font-normal text-primary">
                      lead
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {member.role}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-fit rounded-full"
        >
          <Link href={`/rooms/${room.id}/edit`}>
            <Pencil />
            Edit room
          </Link>
        </Button>
        {chats.length > 0 && (
          <div className="min-h-0 space-y-1 overflow-y-auto">
            <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Chats
            </p>
            {chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/rooms/${room.id}?chat=${chat.id}`}
                className={cn(
                  'block truncate rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground',
                  chat.id === threadId && 'bg-secondary text-foreground',
                )}
              >
                {chat.title}
              </Link>
            ))}
          </div>
        )}
      </aside>

      <section className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex shrink-0 -space-x-2 lg:hidden">
              {room.members.slice(0, 4).map((member) => (
                <CharacterAvatar
                  key={member.id}
                  id={characterOf(member.avatar)}
                  size={28}
                />
              ))}
            </div>
            <h2 className="truncate text-sm font-medium">
              {(threadId && title) || room.name}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="rounded-full lg:hidden"
            >
              <Link href={`/rooms/${room.id}/edit`} aria-label="Edit room">
                <Pencil />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              disabled={isRunning || !threadId}
              onClick={() => router.push(`/rooms/${room.id}`)}
              aria-label="New chat"
            >
              <Plus />
              <span className="hidden sm:inline">New chat</span>
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
              <p className="pt-4 text-center text-sm text-muted-foreground">
                {room.routingMode === 'auto'
                  ? `Say what you need; ${lead?.name ?? 'the lead'} will pick who answers.`
                  : `@Mention who should answer, or ${lead?.name ?? 'the lead'} will.`}
              </p>
            )}
            {messages.map((message) => {
              if (message.role === 'tool') {
                return (
                  <p
                    key={message.id}
                    className="mx-auto max-w-[85%] text-center text-xs text-muted-foreground"
                  >
                    {message.content}
                  </p>
                );
              }
              if (message.role === 'user') {
                return (
                  <div key={message.id} className="flex justify-end">
                    <p className="max-w-[85%] rounded-3xl rounded-tr-md bg-secondary px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                );
              }
              const author = message.authorAgentId
                ? memberById.get(message.authorAgentId)
                : undefined;
              return (
                <div key={message.id} className="flex items-start gap-3">
                  <CharacterAvatar
                    id={characterOf(author?.avatar ?? null)}
                    mood={
                      message.error
                        ? 'oops'
                        : message.isStreaming
                          ? 'talking'
                          : 'idle'
                    }
                    size={36}
                  />
                  <div className="max-w-[85%] min-w-0 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {author?.name ?? 'A former member'}
                    </p>
                    <div
                      className={cn(
                        'space-y-3 rounded-3xl rounded-tl-md border bg-card px-4 py-3',
                        message.error && 'border-destructive/50',
                      )}
                    >
                      {message.isStreaming &&
                        !message.content &&
                        !message.toolCalls && (
                          <span
                            className="flex gap-1.5 py-1"
                            role="status"
                            aria-label={`${author?.name ?? 'Someone'} is thinking`}
                          >
                            <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
                            <span className="size-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                            <span className="size-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                          </span>
                        )}
                      {message.toolCalls && (
                        <div className="space-y-1.5">
                          {message.toolCalls.map((call) => (
                            <ToolCall
                              key={call.id}
                              call={call}
                              onDecide={handleDecide}
                            />
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
                  </div>
                </div>
              );
            })}
            <div ref={endOfChat} />
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!isRunning) {
              send(draft);
            }
          }}
          className="space-y-2 border-t p-3 sm:p-4"
        >
          <div className="mx-auto flex max-w-3xl flex-wrap gap-1.5">
            {room.members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => mention(member.name)}
                className="flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
              >
                <CharacterAvatar id={characterOf(member.avatar)} size={20} />@
                {member.name}
              </button>
            ))}
          </div>
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border bg-card p-2 transition-colors focus-within:border-primary/60">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              aria-label={`Message ${room.name}`}
              placeholder={`Message ${room.name}…`}
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
              className="mx-auto max-w-3xl px-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
