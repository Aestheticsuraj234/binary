import {eq} from 'drizzle-orm';

import type {Database} from '../client';
import {users} from '../schema';

export type User = typeof users.$inferSelect;

/**
 * Reads users. Creating users is Better Auth's job (it hashes passwords),
 * so this repository has no create method on purpose.
 */
export class UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return user;
  }
}
