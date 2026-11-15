import {
  sendMessageSchema,
  type ChatMessage,
  type ChatStreamEvent,
  type ToolCallView,
} from '@binary/shared';
import {useCallback, useRef, useState} from 'react';

import type {Mood} from '@/components/character-face';
import {apiFetch, apiJson} from '@/lib/api';
import {readNdjson} from '@/lib/read-ndjson';
import {useTodayCount} from '@/lib/today-count';

/** A message on screen: saved ones, plus answers still streaming in. */
export interface Message {
  id: string;
  role: ChatMessage['role'];
  content: string;
  authorAgentId?: string | null;
  /** Why the answer failed. Shown under any words that did arrive. */
  error?: string;
  isStreaming?: boolean;
  toolCalls?: ToolCallView[];
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

interface ChatOptions {
  /** Creates the chat on the server, on its first message. */
  start: () => Promise<string | undefined>;
  /**
   * One-to-one: the agent whose answer starts as soon as you send. In a
   * room it is undefined, and each `turn` event starts an answer.
   */
  agentId?: string;
}

/**
 * The state of one chat, shared by agent and room chats: the messages,
 * the streamed answers, approvals, and how the speaking character feels.
 */
export function useChat({start, agentId}: ChatOptions) {
  const [threadId, setThreadId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [mood, setMood] = useState<Mood>('idle');
  /** Who is answering right now (in a room, it changes per turn). */
  const [speakerId, setSpeakerId] = useState(agentId);
  const nextLocalId = useRef(0);
  const moodTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const today = useTodayCount();

  function localId() {
    nextLocalId.current += 1;
    return `local-${nextLocalId.current}`;
  }

  function update(id: string, change: (message: Message) => Message) {
    setMessages((list) =>
      list.map((message) => (message.id === id ? change(message) : message)),
    );
  }

  /** Happy for a moment, then idle again. */
  function cheer() {
    clearTimeout(moodTimer.current);
    setMood('happy');
    moodTimer.current = setTimeout(() => setMood('idle'), 1500);
  }

  /** Shows a saved chat, or a new one when `id` is undefined. */
  const open = useCallback(async (id: string | undefined) => {
    setThreadId(id);
    setError('');
    setMessages([]);
    if (!id) {
      return;
    }
    const {data, error: failed} = await apiJson<{messages: ChatMessage[]}>(
      `/api/threads/${id}`,
    );
    setMessages(data?.messages ?? []);
    setError(failed ?? '');
  }, []);

  function fail(id: string | undefined, reason: string) {
    if (id) {
      update(id, (message) => ({
        ...message,
        isStreaming: false,
        error: reason,
      }));
    } else {
      setError(reason);
    }
    clearTimeout(moodTimer.current);
    setMood('oops');
  }

  async function send(text: string) {
    const parsed = sendMessageSchema.safeParse({content: text});
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the message.');
      return false;
    }
    setError('');
    setIsRunning(true);
    setMood('thinking');
    const reply = agentId ? localId() : undefined;
    setMessages((list) => [
      ...list,
      {id: localId(), role: 'user', content: parsed.data.content},
      ...(reply
        ? [
            {
              id: reply,
              role: 'assistant' as const,
              content: '',
              isStreaming: true,
            },
          ]
        : []),
    ]);

    let chatId = threadId;
    if (!chatId) {
      chatId = await start();
      if (!chatId) {
        fail(reply, 'Could not start the chat. Is the API running?');
        setIsRunning(false);
        return true;
      }
      setThreadId(chatId);
    }

    const response = await apiFetch(`/api/threads/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    }).catch(() => null);
    if (!response?.ok) {
      const body: {error?: string} | null = response
        ? await response.json().catch(() => null)
        : null;
      fail(reply, body?.error ?? 'Could not reach the API.');
      setIsRunning(false);
      return true;
    }

    // The answer being written now, if any.
    let current = reply;
    try {
      for await (const event of readNdjson<ChatStreamEvent>(response)) {
        if (event.type === 'turn') {
          const id = localId();
          current = id;
          setSpeakerId(event.agentId);
          setMood('thinking');
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
          setMood('talking');
          update(current, (message) => ({
            ...message,
            content: message.content + event.text,
          }));
        } else if (event.type === 'tool' && current) {
          setMood(event.call.status === 'running' ? 'thinking' : 'talking');
          update(current, (message) => withToolCall(message, event.call));
        } else if (event.type === 'done' && current) {
          update(current, () => event.message);
          current = undefined;
          cheer();
        } else if (event.type === 'error') {
          fail(current, event.error);
          current = undefined;
        }
      }
    } catch {
      fail(current, 'The connection dropped before the answer finished.');
    }
    setIsRunning(false);
    // An answer may have asked for approval: the Today badge changes.
    void today.refresh();
    return true;
  }

  /**
   * Approves or rejects a call the agent asked for. The server runs the
   * tool and lets the agent reply, so the chat is reloaded afterwards.
   */
  async function decide(approvalId: string, decision: 'approve' | 'reject') {
    setError('');
    setMood('thinking');
    // The decision can stand while the agent's follow-up fails (`error`).
    const result = await apiJson<{error?: string}>(
      `/api/approvals/${approvalId}/${decision}`,
      {method: 'POST'},
    );
    if (threadId) {
      const {data} = await apiJson<{messages: ChatMessage[]}>(
        `/api/threads/${threadId}`,
      );
      if (data) {
        setMessages(data.messages);
      }
    }
    const reason = result.error ?? result.data?.error;
    if (reason) {
      fail(undefined, reason);
    } else {
      cheer();
    }
    void today.refresh();
  }

  return {
    threadId,
    messages,
    error,
    isRunning,
    mood,
    speakerId,
    open,
    send,
    decide,
  };
}
