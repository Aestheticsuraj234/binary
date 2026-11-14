import {randomUUID} from 'node:crypto';

import type {Database} from './client';
import {users} from './schema';

/** Inserts a throwaway user. Tests delete it afterwards, which cascades. */
export async function createTestUser(db: Database) {
  const id = randomUUID();
  const [user] = await db
    .insert(users)
    .values({id, name: 'Test User', email: `test-${id}@example.com`})
    .returning();

  if (!user) {
    throw new Error('Could not create test user.');
  }
  return user;
}
