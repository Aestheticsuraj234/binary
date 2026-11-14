import {asc, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {messages, toolCalls} from '../schema';

export type NewToolCall = typeof toolCalls.$inferInsert;

const TOOL_CALL_COLUMNS = {
  id: toolCalls.id,
  messageId: toolCalls.messageId,
  toolName: toolCalls.toolName,
  risk: toolCalls.risk,
  status: toolCalls.status,
  input: toolCalls.input,
  output: toolCalls.output,
};

/**
 * Stores the tools an agent used while writing a message. Like messages,
 * callers check who owns the thread first.
 */
export class ToolCallRepository {
  constructor(private readonly db: Database) {}

  /** Saves the calls of one answer, keeping their order. */
  async addMany(calls: NewToolCall[]) {
    if (calls.length === 0) {
      return [];
    }
    return this.db.insert(toolCalls).values(calls).returning(TOOL_CALL_COLUMNS);
  }

  /** Every tool call in a chat, oldest first. */
  listForThread(threadId: string) {
    return this.db
      .select(TOOL_CALL_COLUMNS)
      .from(toolCalls)
      .innerJoin(messages, eq(toolCalls.messageId, messages.id))
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(toolCalls.createdAt));
  }
}
