import {and, desc, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {agents, threads} from '../schema';

const THREAD_COLUMNS = {
  id: threads.id,
  agentId: threads.agentId,
  title: threads.title,
  createdAt: threads.createdAt,
  updatedAt: threads.updatedAt,
};

/**
 * Stores conversations. Like agents, every read and change goes through the
 * owner's id, so one user can never open another user's chat.
 */
export class ThreadRepository {
  constructor(private readonly db: Database) {}

  /** Starts an empty one-to-one chat with an agent. */
  async createForAgent(userId: string, agentId: string) {
    const [created] = await this.db
      .insert(threads)
      .values({userId, agentId})
      .returning(THREAD_COLUMNS);

    if (!created) {
      throw new Error('Could not start a chat.');
    }
    return created;
  }

  async findForUser(userId: string, id: string) {
    const [thread] = await this.db
      .select(THREAD_COLUMNS)
      .from(threads)
      .where(and(eq(threads.userId, userId), eq(threads.id, id)));
    return thread;
  }

  /**
   * The user's latest chats with whoever they were with, for the sidebar.
   * Most recently active first.
   */
  listRecentForUser(userId: string, limit: number) {
    return this.db
      .select({
        id: threads.id,
        title: threads.title,
        updatedAt: threads.updatedAt,
        agent: {id: agents.id, name: agents.name, avatar: agents.avatar},
      })
      .from(threads)
      .innerJoin(agents, eq(threads.agentId, agents.id))
      .where(eq(threads.userId, userId))
      .orderBy(desc(threads.updatedAt))
      .limit(limit);
  }

  async rename(userId: string, id: string, title: string) {
    await this.db
      .update(threads)
      .set({title})
      .where(and(eq(threads.userId, userId), eq(threads.id, id)));
  }

  /** Marks the chat as active now, which moves it to the top of the list. */
  async touch(id: string) {
    await this.db
      .update(threads)
      .set({updatedAt: new Date()})
      .where(eq(threads.id, id));
  }

  /** Returns false when there was no chat to delete. Messages go with it. */
  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(threads)
      .where(and(eq(threads.userId, userId), eq(threads.id, id)))
      .returning({id: threads.id});
    return deleted.length > 0;
  }
}
