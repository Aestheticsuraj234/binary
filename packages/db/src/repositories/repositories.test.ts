import {eq} from 'drizzle-orm';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createDatabase} from '../client';
import {agentTemplates, users} from '../schema';
import {createTestUser} from '../test-utils';
import {AgentRepository} from './agent-repository';
import {ApprovalRepository} from './approval-repository';
import {AgentTemplateRepository} from './agent-template-repository';
import {McpServerRepository} from './mcp-server-repository';
import {MessageRepository} from './message-repository';
import {ProviderKeyRepository} from './provider-key-repository';
import {RoutineRepository} from './routine-repository';
import {RoutineRunRepository} from './routine-run-repository';
import {ThreadRepository} from './thread-repository';
import {ToolCallRepository} from './tool-call-repository';
import {TriggerRepository} from './trigger-repository';
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

describe('McpServerRepository', () => {
  const repository = new McpServerRepository(db);
  let serverId = '';

  it('saves an app with its encrypted auth', async () => {
    const saved = await repository.create({
      userId,
      name: 'Shop',
      url: 'https://shop.example/mcp',
      encryptedAuth: 'ciphertext',
      iv: 'iv',
    });
    serverId = saved.id;

    expect(saved).toMatchObject({name: 'Shop', status: 'active'});
    expect(await repository.listForUser(userId)).toHaveLength(1);
  });

  it('records a failed connection', async () => {
    await repository.setStatus(serverId, 'error');

    const [saved] = await repository.listForUser(userId);
    expect(saved?.status).toBe('error');
  });

  it("never lists or deletes another user's app", async () => {
    expect(await repository.listForUser(otherUserId)).toEqual([]);
    expect(await repository.delete(otherUserId, serverId)).toBe(false);
    expect(await repository.delete(userId, serverId)).toBe(true);
  });
});

describe('ToolCallRepository', () => {
  const toolCallRepository = new ToolCallRepository(db);

  it('saves the tools of an answer and lists them in order', async () => {
    const agent = await new AgentRepository(db).create({
      userId,
      name: 'Toolsy',
      role: 'Uses tools.',
    });
    const thread = await new ThreadRepository(db).createForAgent(
      userId,
      agent.id,
    );
    const message = await new MessageRepository(db).add({
      threadId: thread.id,
      role: 'assistant',
      content: 'Done.',
    });
    const startedAt = Date.now();

    await toolCallRepository.addMany(
      ['first_tool', 'second_tool'].map((toolName, index) => ({
        messageId: message.id,
        toolName,
        risk: 'read' as const,
        status: 'succeeded' as const,
        input: {index},
        output: {ok: true},
        createdAt: new Date(startedAt + index),
      })),
    );

    const saved = await toolCallRepository.listForThread(thread.id);
    expect(saved.map((call) => call.toolName)).toEqual([
      'first_tool',
      'second_tool',
    ]);
    expect(saved[1]).toMatchObject({messageId: message.id, input: {index: 1}});
  });

  it('saves nothing for an answer without tools', async () => {
    expect(await toolCallRepository.addMany([])).toEqual([]);
  });
});

describe('routines, triggers and runs', () => {
  const routineRepository = new RoutineRepository(db);
  const triggerRepository = new TriggerRepository(db);
  const runRepository = new RoutineRunRepository(db);
  let routineId = '';
  let scheduleId = '';

  beforeAll(async () => {
    const agent = await new AgentRepository(db).create({
      userId,
      name: 'Sunny',
      role: 'Plans days.',
      avatar: 'sunny',
    });
    routineId = (
      await routineRepository.create({
        agentId: agent.id,
        name: 'Morning plan',
        prompt: 'Plan my day.',
      })
    ).id;
  });

  it('lists a routine with its agent, only for the owner', async () => {
    const [routine] = await routineRepository.listForUser(userId);

    expect(routine).toMatchObject({
      name: 'Morning plan',
      agent: {name: 'Sunny'},
    });
    expect(await routineRepository.listForUser(otherUserId)).toEqual([]);
    expect(
      await routineRepository.findForUser(otherUserId, routineId),
    ).toBeUndefined();
  });

  it('gives a job the routine with its owner', async () => {
    expect(await routineRepository.findForJob(routineId)).toMatchObject({
      name: 'Morning plan',
      userId,
    });
  });

  it('keeps the schedule id when the schedule changes', async () => {
    const first = await triggerRepository.setSchedule(
      routineId,
      '0 9 * * *',
      'UTC',
    );
    scheduleId = first.trigger?.id ?? '';
    const second = await triggerRepository.setSchedule(
      routineId,
      '0 9 * * 1-5',
      'Asia/Kolkata',
    );

    expect(second.trigger).toMatchObject({
      id: scheduleId,
      cron: '0 9 * * 1-5',
      timezone: 'Asia/Kolkata',
    });
  });

  it('reports the removed schedule so Trigger.dev can drop it too', async () => {
    const removed = await triggerRepository.setSchedule(routineId, null, 'UTC');

    expect(removed).toEqual({trigger: undefined, removedId: scheduleId});
  });

  it('turns a webhook on and off', async () => {
    const webhook = await triggerRepository.setWebhook(routineId, 'hash-1');
    expect(
      await triggerRepository.findWithRoutine(webhook?.id ?? ''),
    ).toMatchObject({
      type: 'webhook',
      webhookSecret: 'hash-1',
      routineId,
      enabled: true,
    });

    await triggerRepository.setWebhook(routineId, null);
    expect(await triggerRepository.listForRoutines([routineId])).toEqual([]);
  });

  it('records a run from queued to succeeded, newest first', async () => {
    const first = await runRepository.create(routineId);
    await runRepository.finish(first.id, {status: 'failed', error: 'No key.'});
    const second = await runRepository.create(routineId);
    expect(second.status).toBe('queued');

    const thread = await new ThreadRepository(db).createForAgent(
      userId,
      (await routineRepository.findForJob(routineId))?.agentId ?? '',
    );
    await runRepository.markRunning(second.id, thread.id);
    await runRepository.finish(second.id, {status: 'succeeded'});

    const runs = await runRepository.listForRoutine(routineId, 10);
    expect(runs.map((run) => run.status)).toEqual(['succeeded', 'failed']);
    expect(runs[0]).toMatchObject({threadId: thread.id, error: null});
    expect(runs[1]?.error).toBe('No key.');
    const [latest] = await runRepository.latestForRoutines([routineId]);
    expect(latest?.id).toBe(second.id);
  });
});

describe('ApprovalRepository', () => {
  const approvals = new ApprovalRepository(db);
  const toolCallRepository = new ToolCallRepository(db);
  let threadId = '';
  let approvalId = '';
  let toolCallId = '';

  beforeAll(async () => {
    const agent = await new AgentRepository(db).create({
      userId,
      name: 'Mimi',
      role: 'Helps customers.',
      avatar: 'mimi',
      approvalMode: 'auto_approve_reads',
    });
    threadId = (await new ThreadRepository(db).createForAgent(userId, agent.id))
      .id;
    const message = await new MessageRepository(db).add({
      threadId,
      role: 'assistant',
      content: 'I asked to refund it.',
    });
    const [call] = await toolCallRepository.addMany([
      {
        messageId: message.id,
        toolName: 'shop_refund_order',
        risk: 'write',
        status: 'awaiting_approval',
        input: {orderId: 'A1'},
      },
    ]);
    toolCallId = call?.id ?? '';
  });

  it('creates a request and lists it as pending, with its agent and chat', async () => {
    const [created] = await approvals.createMany(userId, [
      {toolCallId, summary: 'shop refund order {"orderId":"A1"}'},
    ]);
    approvalId = created?.id ?? '';

    const [pending] = await approvals.listPendingForUser(userId);
    expect(pending).toMatchObject({
      id: approvalId,
      status: 'pending',
      threadId,
      agent: {name: 'Mimi'},
      toolCall: {toolName: 'shop_refund_order', input: {orderId: 'A1'}},
    });
    expect(await approvals.countPendingForUser(userId)).toBe(1);
  });

  it("shows the approval id on the chat's tool calls", async () => {
    const [call] = await toolCallRepository.listForThread(threadId);

    expect(call?.approvalId).toBe(approvalId);
  });

  it('is invisible to another user', async () => {
    expect(await approvals.listPendingForUser(otherUserId)).toEqual([]);
    expect(
      await approvals.findForUser(otherUserId, approvalId),
    ).toBeUndefined();
  });

  it('accepts only the first decision', async () => {
    expect(await approvals.decide(approvalId, 'approved')).toBe(true);
    expect(await approvals.decide(approvalId, 'rejected')).toBe(false);
    expect(await approvals.countPendingForUser(userId)).toBe(0);
  });

  it('records the tool result and marks the request executed', async () => {
    await toolCallRepository.finish(toolCallId, 'succeeded', {ok: true});
    await approvals.markExecuted(approvalId);

    const approval = await approvals.findForUser(userId, approvalId);
    expect(approval).toMatchObject({
      status: 'executed',
      toolCall: {status: 'succeeded', output: {ok: true}},
    });
  });
});
