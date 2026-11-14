import {asc, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {agentTemplates} from '../schema';

export type AgentTemplate = typeof agentTemplates.$inferSelect;
export type NewAgentTemplate = typeof agentTemplates.$inferInsert;

/** Reads and saves the ready-made agent templates. */
export class AgentTemplateRepository {
  constructor(private readonly db: Database) {}

  findAll(): Promise<AgentTemplate[]> {
    return this.db
      .select()
      .from(agentTemplates)
      .orderBy(asc(agentTemplates.name));
  }

  async findById(id: string): Promise<AgentTemplate | undefined> {
    const [template] = await this.db
      .select()
      .from(agentTemplates)
      .where(eq(agentTemplates.id, id));
    return template;
  }

  async findBySlug(slug: string): Promise<AgentTemplate | undefined> {
    const [template] = await this.db
      .select()
      .from(agentTemplates)
      .where(eq(agentTemplates.slug, slug));
    return template;
  }

  /**
   * Inserts the template, or updates it when the slug already exists.
   * Running the seed twice therefore never creates duplicates.
   */
  async upsert(template: NewAgentTemplate): Promise<AgentTemplate> {
    const [saved] = await this.db
      .insert(agentTemplates)
      .values(template)
      .onConflictDoUpdate({
        target: agentTemplates.slug,
        set: {
          name: template.name,
          role: template.role,
          instructions: template.instructions,
        },
      })
      .returning();

    if (!saved) {
      throw new Error(`Could not save template "${template.slug}".`);
    }
    return saved;
  }
}
