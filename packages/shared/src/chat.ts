import {z} from 'zod';

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Write a message first.')
    .max(4000, 'Keep the message under 4,000 characters.'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** One earlier message, as the model reads it. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** A saved message. `tool` messages arrive with tools in a later chapter. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: string;
}

/** A saved conversation with one agent. */
export interface Thread {
  id: string;
  agentId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** A thread in the sidebar's "Recent chats", with who it was with. */
export interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: string;
  agent: {id: string; name: string; avatar: string | null};
}

/**
 * What the API streams back while an agent answers: one JSON object per
 * line (NDJSON). Pieces of text first, then either the saved message or an
 * error.
 */
export type ChatStreamEvent =
  | {type: 'delta'; text: string}
  | {type: 'done'; message: ChatMessage}
  | {type: 'error'; error: string};
