import type {Provider} from '@binary/shared';
import {and, asc, eq} from 'drizzle-orm';

import type {Database} from '../client';
import {providerKeys} from '../schema';

export type ProviderKey = typeof providerKeys.$inferSelect;
export type NewProviderKey = typeof providerKeys.$inferInsert;

/**
 * Stores users' LLM API keys. Keys arrive here already encrypted; this class
 * never sees a plain-text key.
 */
export class ProviderKeyRepository {
  constructor(private readonly db: Database) {}

  /** Saves the key, replacing any earlier key for the same provider. */
  async save(key: NewProviderKey): Promise<ProviderKey> {
    const [saved] = await this.db
      .insert(providerKeys)
      .values(key)
      .onConflictDoUpdate({
        target: [providerKeys.userId, providerKeys.provider],
        set: {
          encryptedKey: key.encryptedKey,
          iv: key.iv,
          last4: key.last4,
          createdAt: new Date(),
        },
      })
      .returning();

    if (!saved) {
      throw new Error(`Could not save the ${key.provider} key.`);
    }
    return saved;
  }

  /** The user's keys without the secret parts, safe to send to a browser. */
  listForUser(userId: string) {
    return this.db
      .select({
        provider: providerKeys.provider,
        last4: providerKeys.last4,
        createdAt: providerKeys.createdAt,
      })
      .from(providerKeys)
      .where(eq(providerKeys.userId, userId))
      .orderBy(asc(providerKeys.provider));
  }

  async find(
    userId: string,
    provider: Provider,
  ): Promise<ProviderKey | undefined> {
    const [key] = await this.db
      .select()
      .from(providerKeys)
      .where(
        and(
          eq(providerKeys.userId, userId),
          eq(providerKeys.provider, provider),
        ),
      );
    return key;
  }

  /** Returns false when there was no key to delete. */
  async delete(userId: string, provider: Provider): Promise<boolean> {
    const deleted = await this.db
      .delete(providerKeys)
      .where(
        and(
          eq(providerKeys.userId, userId),
          eq(providerKeys.provider, provider),
        ),
      )
      .returning({id: providerKeys.id});
    return deleted.length > 0;
  }
}
