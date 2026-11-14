import {cosineDistance, eq} from 'drizzle-orm';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createDatabase} from '../client';
import {createTestUser} from '../test-utils';
import {
  agents,
  EMBEDDING_DIMENSIONS,
  memories,
  providerKeys,
  threads,
  users,
} from './index';

const db = createDatabase(process.env.DATABASE_URL ?? '');
let userId = '';
let agentId = '';

/** A vector with a single 1 at `position`, so similarity is easy to predict. */
function unitVector(position: number) {
  const values = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  values[position] = 1;
  return values;
}

beforeAll(async () => {
  userId = (await createTestUser(db)).id;
  const [agent] = await db
    .insert(agents)
    .values({userId, name: 'Scout', role: 'Researcher'})
    .returning();
  agentId = agent?.id ?? '';
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
  await db.$client.end();
});

describe('agents', () => {
  it('fills in safe defaults', async () => {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId));

    expect(agent?.engine).toBe('api');
    expect(agent?.approvalMode).toBe('ask_first');
  });
});

describe('threads', () => {
  it('accepts a thread that belongs to an agent', async () => {
    const [thread] = await db
      .insert(threads)
      .values({userId, agentId})
      .returning();

    expect(thread?.title).toBe('New chat');
  });

  it('rejects a thread with neither an agent nor a room', async () => {
    await expect(db.insert(threads).values({userId})).rejects.toThrow();
  });
});

describe('provider keys', () => {
  it('allows only one key per provider per user', async () => {
    const key = {
      userId,
      provider: 'openai' as const,
      encryptedKey: 'encrypted',
      iv: 'iv',
      last4: '1234',
    };
    await db.insert(providerKeys).values(key);

    await expect(db.insert(providerKeys).values(key)).rejects.toThrow();
  });
});

describe('memories', () => {
  it('finds the most similar memory with vector search', async () => {
    await db.insert(memories).values([
      {agentId, content: 'Likes TypeScript', embedding: unitVector(0)},
      {agentId, content: 'Lives in India', embedding: unitVector(1)},
    ]);

    const [closest] = await db
      .select({content: memories.content})
      .from(memories)
      .where(eq(memories.agentId, agentId))
      .orderBy(cosineDistance(memories.embedding, unitVector(1)))
      .limit(1);

    expect(closest?.content).toBe('Lives in India');
  });
});

describe('deleting a user', () => {
  it('removes everything they own', async () => {
    const owner = await createTestUser(db);
    await db
      .insert(agents)
      .values({userId: owner.id, name: 'Temp', role: 'Temporary'});

    await db.delete(users).where(eq(users.id, owner.id));

    const leftovers = await db
      .select()
      .from(agents)
      .where(eq(agents.userId, owner.id));
    expect(leftovers).toHaveLength(0);
  });
});
