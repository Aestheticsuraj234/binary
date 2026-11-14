import {eq} from 'drizzle-orm';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createDatabase} from '../client';
import {agentTemplates, users} from '../schema';
import {createTestUser} from '../test-utils';
import {AgentTemplateRepository} from './agent-template-repository';
import {ProviderKeyRepository} from './provider-key-repository';
import {UserRepository} from './user-repository';

const db = createDatabase(process.env.DATABASE_URL ?? '');
const TEMPLATE_SLUG = `test-template-${Date.now()}`;
let userId = '';
let userEmail = '';

beforeAll(async () => {
  const user = await createTestUser(db);
  userId = user.id;
  userEmail = user.email;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(agentTemplates).where(eq(agentTemplates.slug, TEMPLATE_SLUG));
  await db.$client.end();
});

describe('UserRepository', () => {
  const repository = new UserRepository(db);

  it('finds a user by id', async () => {
    const user = await repository.findById(userId);

    expect(user?.email).toBe(userEmail);
  });

  it('finds a user by email, ignoring letter case', async () => {
    const user = await repository.findByEmail(userEmail.toUpperCase());

    expect(user?.id).toBe(userId);
  });

  it('returns undefined for an unknown email', async () => {
    expect(await repository.findByEmail('nobody@example.com')).toBeUndefined();
  });
});

describe('AgentTemplateRepository', () => {
  const repository = new AgentTemplateRepository(db);
  const template = {
    slug: TEMPLATE_SLUG,
    name: 'Test Template',
    role: 'Tests things.',
    instructions: 'Be thorough.',
  };

  it('creates a template', async () => {
    const saved = await repository.upsert(template);

    expect(saved.id).toBeTruthy();
    expect(await repository.findBySlug(TEMPLATE_SLUG)).toMatchObject(template);
  });

  it('updates instead of duplicating when the slug exists', async () => {
    await repository.upsert({...template, role: 'Tests things twice.'});

    const all = await repository.findAll();
    const matches = all.filter((saved) => saved.slug === TEMPLATE_SLUG);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.role).toBe('Tests things twice.');
  });
});

describe('ProviderKeyRepository', () => {
  const repository = new ProviderKeyRepository(db);
  const key = {
    provider: 'openai' as const,
    encryptedKey: 'ciphertext-1',
    iv: 'iv-1',
    last4: 'a1b2',
  };

  it('saves a key and lists it without the secret parts', async () => {
    await repository.save({...key, userId});

    const list = await repository.listForUser(userId);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({provider: 'openai', last4: 'a1b2'});
    expect(list[0]).not.toHaveProperty('encryptedKey');
  });

  it('replaces the key when saving the same provider again', async () => {
    await repository.save({...key, userId, encryptedKey: 'ciphertext-2'});

    const saved = await repository.find(userId, 'openai');
    expect(saved?.encryptedKey).toBe('ciphertext-2');
    expect(await repository.listForUser(userId)).toHaveLength(1);
  });

  it('deletes a key and reports whether one existed', async () => {
    expect(await repository.delete(userId, 'openai')).toBe(true);
    expect(await repository.delete(userId, 'openai')).toBe(false);
    expect(await repository.find(userId, 'openai')).toBeUndefined();
  });
});
