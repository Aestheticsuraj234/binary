import {randomUUID} from 'node:crypto';

import {AgentTemplateRepository} from '@binary/db';
import type {Agent, AgentTemplate} from '@binary/shared';
import {deleteTemplateBySlug, deleteUsersByEmail} from '@binary/db/test-utils';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {readJson, signUpTestUser} from '../test-helpers';

const ANTHROPIC_KEY = 'sk-ant-test-1234567890wxyz';
const TEMPLATE_SLUG = `test-template-${randomUUID()}`;
const createdEmails: string[] = [];
// These tests never reach a model; chat is tested in threads.test.ts.
const app = createApp(createDependencies());
const NEW_AGENT = {
  name: 'Researcher',
  role: 'Finds and summarizes sources.',
  instructions: 'Always list your sources.',
  provider: 'anthropic',
  model: 'claude-sonnet-5-5',
  avatar: 'nova',
  approvalMode: 'auto_approve_reads',
};
let cookie = '';
let otherCookie = '';
let templateId = '';
let agentId = '';

function request(method: string, path: string, body?: unknown, as = cookie) {
  return app.request(path, {
    method,
    headers: {'Content-Type': 'application/json', Cookie: as},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeAll(async () => {
  const user = await signUpTestUser(app);
  const other = await signUpTestUser(app);
  cookie = user.cookie;
  otherCookie = other.cookie;
  createdEmails.push(user.email, other.email);

  const template = await new AgentTemplateRepository(db).upsert({
    slug: TEMPLATE_SLUG,
    name: 'Test Researcher',
    role: 'Finds sources.',
    instructions: 'Cite everything.',
  });
  templateId = template.id;
});

afterAll(async () => {
  await deleteUsersByEmail(db, createdEmails);
  await deleteTemplateBySlug(db, TEMPLATE_SLUG);
  await db.$client.end();
});

describe('agent templates', () => {
  it('requires a signed-in user', async () => {
    const response = await app.request('/api/agent-templates');

    expect(response.status).toBe(401);
  });

  it('lists the templates', async () => {
    const response = await request('GET', '/api/agent-templates');
    const {templates} = await readJson<{templates: AgentTemplate[]}>(response);

    expect(templates).toContainEqual(
      expect.objectContaining({slug: TEMPLATE_SLUG, name: 'Test Researcher'}),
    );
  });
});

describe('hiring an agent', () => {
  it('requires a signed-in user', async () => {
    const response = await app.request('/api/agents');

    expect(response.status).toBe(401);
  });

  it('asks for a key before the agent can use a provider', async () => {
    const response = await request('POST', '/api/agents', NEW_AGENT);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Add your Anthropic API key in Settings first.',
    });
  });

  it('validates the form', async () => {
    await request('PUT', '/api/provider-keys/anthropic', {
      apiKey: ANTHROPIC_KEY,
    });
    const response = await request('POST', '/api/agents', {
      ...NEW_AGENT,
      name: '',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({error: 'Give your agent a name.'});
  });

  it('rejects a template that does not exist', async () => {
    const response = await request('POST', '/api/agents', {
      ...NEW_AGENT,
      templateId: randomUUID(),
    });

    expect(response.status).toBe(400);
  });

  it('creates an agent from a template', async () => {
    const response = await request('POST', '/api/agents', {
      ...NEW_AGENT,
      templateId,
    });
    const {agent} = await readJson<{agent: Agent}>(response);
    agentId = agent.id;

    expect(response.status).toBe(201);
    expect(agent).toMatchObject({...NEW_AGENT, templateId});
    expect(agent).not.toHaveProperty('userId');
  });

  it('lists and reads the new agent', async () => {
    const list = await request('GET', '/api/agents');
    const {agents} = await readJson<{agents: Agent[]}>(list);
    expect(agents.map((agent) => agent.id)).toEqual([agentId]);

    const one = await request('GET', `/api/agents/${agentId}`);
    expect(await one.json()).toMatchObject({agent: {name: 'Researcher'}});
  });

  it('treats a malformed id as not found', async () => {
    const response = await request('GET', '/api/agents/not-a-uuid');

    expect(response.status).toBe(404);
  });
});

describe("another user's agent", () => {
  it('is invisible', async () => {
    const list = await request('GET', '/api/agents', undefined, otherCookie);
    expect(await list.json()).toEqual({agents: []});

    const one = await request(
      'GET',
      `/api/agents/${agentId}`,
      undefined,
      otherCookie,
    );
    expect(one.status).toBe(404);
  });

  it('cannot be edited, chatted with or deleted', async () => {
    const path = `/api/agents/${agentId}`;
    const edit = await request('PUT', path, NEW_AGENT, otherCookie);
    const chat = await request(
      'POST',
      `${path}/threads`,
      undefined,
      otherCookie,
    );
    const remove = await request('DELETE', path, undefined, otherCookie);

    expect([edit.status, chat.status, remove.status]).toEqual([404, 404, 404]);
  });
});

describe('editing an agent', () => {
  it('updates the agent, including its character', async () => {
    const response = await request('PUT', `/api/agents/${agentId}`, {
      ...NEW_AGENT,
      name: 'Senior Researcher',
      avatar: 'juno',
      approvalMode: 'auto_approve_reads',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      agent: {name: 'Senior Researcher', avatar: 'juno', templateId},
    });
  });

  it('will not switch to a provider without a key', async () => {
    const response = await request('PUT', `/api/agents/${agentId}`, {
      ...NEW_AGENT,
      provider: 'google',
      model: 'gemini-flash-latest',
    });

    expect(response.status).toBe(400);
  });

  it('fires the agent', async () => {
    const response = await request('DELETE', `/api/agents/${agentId}`);
    expect(response.status).toBe(204);

    const again = await request('DELETE', `/api/agents/${agentId}`);
    expect(again.status).toBe(404);
  });
});
