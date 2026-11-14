import {eq} from 'drizzle-orm';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createDatabase} from '../client';
import {agentTemplates, users} from '../schema';
import {createTestUser} from '../test-utils';
import {AgentRepository} from './agent-repository';
import {AgentTemplateRepository} from './agent-template-repository';
import {MessageRepository} from './message-repository';
import {ProviderKeyRepository} from './provider-key-repository';
import {ThreadRepository} from './thread-repository';
import {UserRepository} from './user-repository';

const db = createDatabase(process.env.DATABASE_URL ?? '');
const TEMPLATE_SLUG = `test-template-${Date.now()}`;
let userId = '';
let userEmail = '';
let otherUserId = '';

beforeAll(async () => {
  const user = await createTestUser(db);
  userId = user.id;
  userEmail = user.email;
  otherUserId = (await createTestUser(db)).id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(users).where(eq(users.id, otherUserId));
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

  it('finds a template by id', async () => {
    const saved = await repository.findBySlug(TEMPLATE_SLUG);

    expect(await repository.findById(saved?.id ?? '')).toMatchObject(template);
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

describe('AgentRepository', () => {
  const repository = new AgentRepository(db);
  const agent = {
    name: 'Researcher',
    role: 'Finds sources.',
    instructions: 'List your sources.',
    provider: 'anthropic' as const,
    model: 'claude-sonnet-5-5',
    avatar: 'nova',
  };
  let agentId = '';

  it('creates an agent without exposing its owner', async () => {
    const created = await repository.create({...agent, userId});
    agentId = created.id;

    expect(created).toMatchObject(agent);
    expect(created).not.toHaveProperty('userId');
  });

  it('lists the newest agent first', async () => {
    const newer = await repository.create({...agent, userId, name: 'Newer'});

    const list = await repository.listForUser(userId);
    expect(list.map((saved) => saved.id)).toEqual([newer.id, agentId]);
    await repository.delete(userId, newer.id);
  });

  it("never returns another user's agent", async () => {
    expect(await repository.listForUser(otherUserId)).toEqual([]);
    expect(await repository.findForUser(otherUserId, agentId)).toBeUndefined();
  });

  it('updates an agent', async () => {
    const updated = await repository.update(userId, agentId, {
      ...agent,
      name: 'Senior Researcher',
    });

    expect(updated?.name).toBe('Senior Researcher');
    expect(await repository.findForUser(userId, agentId)).toMatchObject({
      name: 'Senior Researcher',
    });
  });

  it("does not update or delete another user's agent", async () => {
    expect(
      await repository.update(otherUserId, agentId, agent),
    ).toBeUndefined();
    expect(await repository.delete(otherUserId, agentId)).toBe(false);
    expect(await repository.findForUser(userId, agentId)).toBeDefined();
  });

  it('deletes an agent and reports whether one existed', async () => {
    expect(await repository.delete(userId, agentId)).toBe(true);
    expect(await repository.delete(userId, agentId)).toBe(false);
  });
});

describe('ThreadRepository and MessageRepository', () => {
  const agentRepository = new AgentRepository(db);
  const threadRepository = new ThreadRepository(db);
  const messageRepository = new MessageRepository(db);
  let agentId = '';
  let threadId = '';

  beforeAll(async () => {
    const agent = await agentRepository.create({
      userId,
      name: 'Chatty',
      role: 'Talks.',
      avatar: 'juno',
    });
    agentId = agent.id;
  });

  it('starts a chat called "New chat"', async () => {
    const thread = await threadRepository.createForAgent(userId, agentId);
    threadId = thread.id;

    expect(thread).toMatchObject({agentId, title: 'New chat'});
  });

  it('keeps messages in the order they were written', async () => {
    await messageRepository.add({threadId, role: 'user', content: 'Hi'});
    await messageRepository.add({
      threadId,
      role: 'assistant',
      authorAgentId: agentId,
      content: 'Hello!',
    });

    const saved = await messageRepository.listForThread(threadId);
    expect(saved.map((message) => message.content)).toEqual(['Hi', 'Hello!']);
  });

  it('lists recent chats with their agent, most active first', async () => {
    const older = await threadRepository.createForAgent(userId, agentId);
    await threadRepository.rename(userId, threadId, 'Greetings');
    await threadRepository.touch(threadId);

    const recent = await threadRepository.listRecentForUser(userId, 10);
    expect(recent.map((thread) => thread.id)).toEqual([threadId, older.id]);
    expect(recent[0]).toMatchObject({
      title: 'Greetings',
      agent: {id: agentId, name: 'Chatty', avatar: 'juno'},
    });
    await threadRepository.delete(userId, older.id);
  });

  it("never returns or deletes another user's chat", async () => {
    expect(
      await threadRepository.findForUser(otherUserId, threadId),
    ).toBeUndefined();
    expect(await threadRepository.listRecentForUser(otherUserId, 10)).toEqual(
      [],
    );
    expect(await threadRepository.delete(otherUserId, threadId)).toBe(false);
  });

  it('deletes a chat together with its messages', async () => {
    expect(await threadRepository.delete(userId, threadId)).toBe(true);
    expect(await messageRepository.listForThread(threadId)).toEqual([]);
  });
});
