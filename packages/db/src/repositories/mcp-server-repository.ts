import {and, asc, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {mcpServers} from '../schema';

export type McpServer = typeof mcpServers.$inferSelect;
export type NewMcpServer = typeof mcpServers.$inferInsert;

/**
 * Stores the apps (MCP servers) a user connected. The optional auth header
 * arrives here already encrypted, like provider keys.
 */
export class McpServerRepository {
  constructor(private readonly db: Database) {}

  async create(server: NewMcpServer): Promise<McpServer> {
    const [created] = await this.db
      .insert(mcpServers)
      .values(server)
      .returning();

    if (!created) {
      throw new Error(`Could not save the app "${server.name}".`);
    }
    return created;
  }

  /** Oldest first, so apps keep their place on the page. */
  listForUser(userId: string): Promise<McpServer[]> {
    return this.db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.userId, userId))
      .orderBy(asc(mcpServers.createdAt));
  }

  /** Records whether the last connection worked. */
  async setStatus(id: string, status: McpServer['status']) {
    await this.db.update(mcpServers).set({status}).where(eq(mcpServers.id, id));
  }

  /** Returns false when the user had no app with this id. */
  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(mcpServers)
      .where(and(eq(mcpServers.userId, userId), eq(mcpServers.id, id)))
      .returning({id: mcpServers.id});
    return deleted.length > 0;
  }
}
