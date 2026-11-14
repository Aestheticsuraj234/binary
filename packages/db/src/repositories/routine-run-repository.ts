import {and, desc, eq, gte, inArray} from 'drizzle-orm';

import type {Database} from '../client';
import {agents, routineRuns, routines} from '../schema';

export type RoutineRunRow = typeof routineRuns.$inferSelect;

const RUN_COLUMNS = {
  id: routineRuns.id,
  routineId: routineRuns.routineId,
  status: routineRuns.status,
  error: routineRuns.error,
  threadId: routineRuns.threadId,
  createdAt: routineRuns.createdAt,
  startedAt: routineRuns.startedAt,
  finishedAt: routineRuns.finishedAt,
};

/**
 * Stores the history of routine runs: queued → running → succeeded or
 * failed. Callers check who owns the routine first.
 */
export class RoutineRunRepository {
  constructor(private readonly db: Database) {}

  async create(routineId: string) {
    const [created] = await this.db
      .insert(routineRuns)
      .values({routineId})
      .returning(RUN_COLUMNS);
    if (!created) {
      throw new Error('Could not queue the run.');
    }
    return created;
  }

  async find(id: string) {
    const [run] = await this.db
      .select(RUN_COLUMNS)
      .from(routineRuns)
      .where(eq(routineRuns.id, id));
    return run;
  }

  /** Newest first. */
  listForRoutine(routineId: string, limit: number) {
    return this.db
      .select(RUN_COLUMNS)
      .from(routineRuns)
      .where(eq(routineRuns.routineId, routineId))
      .orderBy(desc(routineRuns.createdAt))
      .limit(limit);
  }

  /** The newest run of each routine, for the list page. */
  latestForRoutines(routineIds: string[]) {
    if (routineIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.db
      .selectDistinctOn([routineRuns.routineId], RUN_COLUMNS)
      .from(routineRuns)
      .where(inArray(routineRuns.routineId, routineIds))
      .orderBy(routineRuns.routineId, desc(routineRuns.createdAt));
  }

  /** The user's runs since a moment (Today), newest first, with their routine. */
  listForUserSince(userId: string, since: Date) {
    return this.db
      .select({
        ...RUN_COLUMNS,
        routine: {id: routines.id, name: routines.name},
        agent: {id: agents.id, name: agents.name, avatar: agents.avatar},
      })
      .from(routineRuns)
      .innerJoin(routines, eq(routineRuns.routineId, routines.id))
      .innerJoin(agents, eq(routines.agentId, agents.id))
      .where(and(eq(agents.userId, userId), gte(routineRuns.createdAt, since)))
      .orderBy(desc(routineRuns.createdAt));
  }

  async markRunning(id: string, threadId: string) {
    await this.db
      .update(routineRuns)
      .set({status: 'running', threadId, startedAt: new Date()})
      .where(eq(routineRuns.id, id));
  }

  async finish(
    id: string,
    outcome: {status: 'succeeded'} | {status: 'failed'; error: string},
  ) {
    await this.db
      .update(routineRuns)
      .set({
        status: outcome.status,
        error: outcome.status === 'failed' ? outcome.error : null,
        finishedAt: new Date(),
      })
      .where(eq(routineRuns.id, id));
  }
}
