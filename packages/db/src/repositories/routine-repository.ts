import {and, asc, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {agents, routines} from '../schema';

export type NewRoutine = typeof routines.$inferInsert;

export type RoutineChanges = Pick<
  NewRoutine,
  'agentId' | 'name' | 'prompt' | 'enabled'
>;

// A routine with the agent that runs it, as lists and pages show it.
const ROUTINE_COLUMNS = {
  id: routines.id,
  name: routines.name,
  prompt: routines.prompt,
  enabled: routines.enabled,
  createdAt: routines.createdAt,
  agent: {id: agents.id, name: agents.name, avatar: agents.avatar},
};

/**
 * Stores routines. A routine has no user column of its own: it belongs to
 * whoever owns its agent, so every user-facing query joins through agents.
 */
export class RoutineRepository {
  constructor(private readonly db: Database) {}

  async create(routine: NewRoutine) {
    const [created] = await this.db
      .insert(routines)
      .values(routine)
      .returning({id: routines.id});
    if (!created) {
      throw new Error(`Could not save the routine "${routine.name}".`);
    }
    return created;
  }

  /** Oldest first, so routines keep their place on the page. */
  listForUser(userId: string) {
    return this.db
      .select(ROUTINE_COLUMNS)
      .from(routines)
      .innerJoin(agents, eq(routines.agentId, agents.id))
      .where(eq(agents.userId, userId))
      .orderBy(asc(routines.createdAt));
  }

  async findForUser(userId: string, id: string) {
    const [routine] = await this.db
      .select(ROUTINE_COLUMNS)
      .from(routines)
      .innerJoin(agents, eq(routines.agentId, agents.id))
      .where(and(eq(agents.userId, userId), eq(routines.id, id)));
    return routine;
  }

  /**
   * Everything a job needs to run a routine, without a user to check: jobs
   * only ever receive ids that Binary created itself.
   */
  async findForJob(id: string) {
    const [found] = await this.db
      .select({
        id: routines.id,
        name: routines.name,
        prompt: routines.prompt,
        enabled: routines.enabled,
        agentId: agents.id,
        userId: agents.userId,
      })
      .from(routines)
      .innerJoin(agents, eq(routines.agentId, agents.id))
      .where(eq(routines.id, id));
    return found;
  }

  /** Callers check ownership first, with findForUser. */
  async update(id: string, changes: RoutineChanges) {
    await this.db.update(routines).set(changes).where(eq(routines.id, id));
  }

  async delete(id: string) {
    await this.db.delete(routines).where(eq(routines.id, id));
  }
}
