import {and, asc, cosineDistance, count, desc, eq, ne} from 'drizzle-orm';

import type {Database} from '../client';
import {memories} from '../schema';

export interface NewMemory {
  agentId: string;
  content: string;
  embedding: number[];
  embeddingModel: string;
  /** A chat's id, or "manual" when the user added it. */
  source: string;
}

const MEMORY_COLUMNS = {
  id: memories.id,
  content: memories.content,
  source: memories.source,
  embeddingModel: memories.embeddingModel,
  createdAt: memories.createdAt,
};

/**
 * What agents remember (Chapter 12). Memories belong to an agent; routes
 * check that the agent is the user's before calling these.
 */
export class MemoryRepository {
  constructor(private readonly db: Database) {}

  async add(memory: NewMemory) {
    const [saved] = await this.db
      .insert(memories)
      .values(memory)
      .returning(MEMORY_COLUMNS);
    if (!saved) {
      throw new Error('Could not save the memory.');
    }
    return saved;
  }

  /** Newest first. */
  listForAgent(agentId: string) {
    return this.db
      .select(MEMORY_COLUMNS)
      .from(memories)
      .where(eq(memories.agentId, agentId))
      .orderBy(desc(memories.createdAt));
  }

  /**
   * The memories closest in meaning to `embedding`, nearest first, with
   * their cosine distance (0 = the same meaning, 2 = the opposite). Only
   * memories embedded by the same model can be compared.
   */
  search(
    agentId: string,
    {embedding, embeddingModel}: {embedding: number[]; embeddingModel: string},
    limit: number,
  ) {
    const distance = cosineDistance(memories.embedding, embedding).mapWith(
      Number,
    );
    return this.db
      .select({...MEMORY_COLUMNS, distance})
      .from(memories)
      .where(
        and(
          eq(memories.agentId, agentId),
          eq(memories.embeddingModel, embeddingModel),
        ),
      )
      .orderBy(asc(distance))
      .limit(limit);
  }

  async countForAgent(agentId: string) {
    const [row] = await this.db
      .select({total: count()})
      .from(memories)
      .where(eq(memories.agentId, agentId));
    return row?.total ?? 0;
  }

  /** How many memories were embedded by another model (can't be searched). */
  async countOtherModels(agentId: string, embeddingModel: string) {
    const [row] = await this.db
      .select({others: count()})
      .from(memories)
      .where(
        and(
          eq(memories.agentId, agentId),
          ne(memories.embeddingModel, embeddingModel),
        ),
      );
    return row?.others ?? 0;
  }

  async delete(agentId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(memories)
      .where(and(eq(memories.id, id), eq(memories.agentId, agentId)))
      .returning({id: memories.id});
    return deleted.length > 0;
  }
}
