import {asc, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {messages} from '../schema';

export type NewMessage = typeof messages.$inferInsert;

const MESSAGE_COLUMNS = {
  id: messages.id,
  role: messages.role,
  content: messages.content,
  authorAgentId: messages.authorAgentId,
  createdAt: messages.createdAt,
};

/**
 * Stores the messages of a chat. Methods take a thread id, not a user id:
 * callers must load the thread through ThreadRepository first, which checks
 * who owns it.
 */
export class MessageRepository {
  constructor(private readonly db: Database) {}

  async add(message: NewMessage) {
    const [saved] = await this.db
      .insert(messages)
      .values(message)
      .returning(MESSAGE_COLUMNS);

    if (!saved) {
      throw new Error('Could not save the message.');
    }
    return saved;
  }

  /** Oldest first, the order a conversation is read in. */
  listForThread(threadId: string) {
    return this.db
      .select(MESSAGE_COLUMNS)
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(messages.createdAt));
  }
}
