import {eq} from 'drizzle-orm';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createDatabase} from '../client';
import {agentTemplates, users} from '../schema';
import {createTestUser} from '../test-utils';
import {AgentTemplateRepository} from './agent-template-repository';
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
