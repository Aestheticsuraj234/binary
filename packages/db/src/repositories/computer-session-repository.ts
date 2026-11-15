import {and, asc, eq, sql} from 'drizzle-orm';

import type {Database} from '../client';
import {agents, computerSessions, threads} from '../schema';

type ComputerKind = (typeof computerSessions.$inferInsert)['kind'];

// Whole minutes since the session started, at least one.
const minutesSinceStart = sql<number>`greatest(1, ceil(extract(epoch from (now() - ${computerSessions.createdAt})) / 60))::int`;

/**
 * Remembers the computers agents are using (Chapter 9: E2B sandboxes), so a
 * chat finds its sandbox again on the next message. Every read goes through
 * the owner's id.
 */
export class ComputerSessionRepository {
  constructor(private readonly db: Database) {}

  async create(session: {
    userId: string;
    kind: ComputerKind;
    providerId: string;
    threadId: string;
  }) {
    const [created] = await this.db
      .insert(computerSessions)
      .values(session)
      .returning();
    if (!created) {
      throw new Error('Could not save the computer session.');
    }
    return created;
  }

  /** The chat's running session of this kind, if it has one. */
  async findRunningForThread(
    userId: string,
    threadId: string,
    kind: ComputerKind,
  ) {
    const [session] = await this.db
      .select()
      .from(computerSessions)
      .where(
        and(
          eq(computerSessions.userId, userId),
          eq(computerSessions.threadId, threadId),
          eq(computerSessions.kind, kind),
          eq(computerSessions.status, 'running'),
        ),
      )
      .limit(1);
    return session;
  }

  /** Running sessions with their chat and agent, oldest first. */
  listRunningForUser(userId: string, kind: ComputerKind) {
    return this.db
      .select({
        id: computerSessions.id,
        providerId: computerSessions.providerId,
        threadId: computerSessions.threadId,
        threadTitle: threads.title,
        agent: {id: agents.id, name: agents.name, avatar: agents.avatar},
        createdAt: computerSessions.createdAt,
        minutesUsed: computerSessions.minutesUsed,
      })
      .from(computerSessions)
      .leftJoin(threads, eq(computerSessions.threadId, threads.id))
      .leftJoin(agents, eq(threads.agentId, agents.id))
      .where(
        and(
          eq(computerSessions.userId, userId),
          eq(computerSessions.kind, kind),
          eq(computerSessions.status, 'running'),
        ),
      )
      .orderBy(asc(computerSessions.createdAt));
  }

  async findForUser(userId: string, id: string) {
    const [session] = await this.db
      .select()
      .from(computerSessions)
      .where(
        and(eq(computerSessions.id, id), eq(computerSessions.userId, userId)),
      );
    return session;
  }

  /** Records a use: how long the session has been running so far. */
  async touch(id: string) {
    await this.db
      .update(computerSessions)
      .set({minutesUsed: minutesSinceStart})
      .where(eq(computerSessions.id, id));
  }

  /**
   * Marks a session closed. `stillRunning` is true when we stop it
   * ourselves, so its minutes count up to now; a session that timed out on
   * its own keeps the minutes of its last use.
   */
  async close(id: string, {stillRunning}: {stillRunning: boolean}) {
    await this.db
      .update(computerSessions)
      .set({
        status: 'closed',
        closedAt: new Date(),
        ...(stillRunning ? {minutesUsed: minutesSinceStart} : {}),
      })
      .where(
        and(
          eq(computerSessions.id, id),
          eq(computerSessions.status, 'running'),
        ),
      );
  }
}
