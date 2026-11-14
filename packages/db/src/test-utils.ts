import {randomUUID} from 'node:crypto';

import {eq, inArray} from 'drizzle-orm';

import type {Database} from './client';
import {agentTemplates, users} from './schema';

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

/**
 * Removes the users a test signed up; their agents, chats and keys go with
 * them. Lives here so app tests never import drizzle-orm themselves.
 */
export async function deleteUsersByEmail(db: Database, emails: string[]) {
  if (emails.length > 0) {
    await db.delete(users).where(inArray(users.email, emails));
  }
}

export async function deleteTemplateBySlug(db: Database, slug: string) {
  await db.delete(agentTemplates).where(eq(agentTemplates.slug, slug));
}
