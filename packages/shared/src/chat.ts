import {z} from 'zod';

import type {ToolCallView} from './tools';

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

/** A saved message. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  /** The agent that wrote it; tells who is who in a room. */
  authorAgentId?: string | null;
  createdAt: string;
  /** Tools the agent used while writing this answer, in order. */
  toolCalls?: ToolCallView[];
}

/** A saved conversation, with one agent or in a room. */
export interface Thread {
  id: string;
  agentId: string | null;
  roomId: string | null;
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
 * line (NDJSON). Pieces of text and tool updates as they happen, then either
 * the saved message or an error. A `tool` event is sent when a tool starts
 * and again when it ends; `call.id` ties the two together. In a room, each
 * agent's answer starts with `turn` and ends with `done`, and `end` closes
 * the whole turn.
 */
export type ChatStreamEvent =
  /** In a room: this agent answers next (its deltas and tools follow). */
  | {type: 'turn'; agentId: string}
  | {type: 'delta'; text: string}
  | {type: 'tool'; call: ToolCallView}
  | {type: 'done'; message: ChatMessage}
  | {type: 'error'; error: string}
  /** In a room: every agent that was going to answer has. */
  | {type: 'end'};
