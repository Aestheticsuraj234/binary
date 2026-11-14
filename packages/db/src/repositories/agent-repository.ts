import {and, desc, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {agents} from '../schema';

export type NewAgent = typeof agents.$inferInsert;

/** The fields a user can change after hiring an agent. */
export type AgentChanges = Pick<
  NewAgent,
  'name' | 'role' | 'instructions' | 'provider' | 'model'
>;

// The columns the app shows today. `userId` stays on the server, and the
// columns later chapters use (engine, approvals, computers) are left out.
const AGENT_COLUMNS = {
  id: agents.id,
  templateId: agents.templateId,
  name: agents.name,
  role: agents.role,
  instructions: agents.instructions,
  provider: agents.provider,
  model: agents.model,
  createdAt: agents.createdAt,
  updatedAt: agents.updatedAt,
};

/**
 * Stores users' agents. Every method takes the owner's id, so one user can
 * never read or change another user's agent.
 */
export class AgentRepository {
  constructor(private readonly db: Database) {}

  async create(agent: NewAgent) {
    const [created] = await this.db
      .insert(agents)
      .values(agent)
      .returning(AGENT_COLUMNS);

    if (!created) {
      throw new Error(`Could not create agent "${agent.name}".`);
    }
    return created;
  }

  /** Newest first, so a freshly hired agent is at the top. */
  listForUser(userId: string) {
    return this.db
      .select(AGENT_COLUMNS)
      .from(agents)
      .where(eq(agents.userId, userId))
      .orderBy(desc(agents.createdAt));
  }

  async findForUser(userId: string, id: string) {
    const [agent] = await this.db
      .select(AGENT_COLUMNS)
      .from(agents)
      .where(and(eq(agents.userId, userId), eq(agents.id, id)));
    return agent;
  }

  /** Returns undefined when the user has no agent with this id. */
  async update(userId: string, id: string, changes: AgentChanges) {
    const [updated] = await this.db
      .update(agents)
      .set(changes)
      .where(and(eq(agents.userId, userId), eq(agents.id, id)))
      .returning(AGENT_COLUMNS);
    return updated;
  }

  /** Returns false when there was no agent to delete. */
  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(agents)
      .where(and(eq(agents.userId, userId), eq(agents.id, id)))
      .returning({id: agents.id});
    return deleted.length > 0;
  }
}
