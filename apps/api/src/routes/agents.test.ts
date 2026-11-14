import {randomUUID} from 'node:crypto';

import {AgentTemplateRepository, schema} from '@binary/db';
import type {Agent, AgentTemplate} from '@binary/shared';
import {MockLanguageModelV4} from 'ai/test';
import {eq, inArray} from 'drizzle-orm';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {readJson, signUpTestUser} from '../test-helpers';

const ANTHROPIC_KEY = 'sk-ant-test-1234567890wxyz';
const TEMPLATE_SLUG = `test-template-${randomUUID()}`;
const createdEmails: string[] = [];
const models: MockLanguageModelV4[] = [];
const apiKeys: string[] = [];

/** A fake model that answers instantly; tests read what it was sent. */
function fakeModel(_provider: string, _model: string, apiKey: string) {
  apiKeys.push(apiKey);
  const model = new MockLanguageModelV4({
    doGenerate: {
      content: [{type: 'text', text: 'Here are three sources.'}],
      finishReason: {unified: 'stop', raw: 'stop'},
      usage: {
        inputTokens: {
          total: 30,
          noCache: 30,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {total: 8, text: 8, reasoning: undefined},
      },
      warnings: [],
    },
  });
  models.push(model);
  return model;
}

const app = createApp(createDependencies(fakeModel));
const NEW_AGENT = {
  name: 'Researcher',
  role: 'Finds and summarizes sources.',
  instructions: 'Always list your sources.',
  provider: 'anthropic',
  model: 'claude-sonnet-5-5',
  avatar: 'nova',
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
  await db
    .delete(schema.users)
    .where(inArray(schema.users.email, createdEmails));
  await db
    .delete(schema.agentTemplates)
    .where(eq(schema.agentTemplates.slug, TEMPLATE_SLUG));
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

  it('cannot be edited, run or deleted', async () => {
    const path = `/api/agents/${agentId}`;
    const edit = await request('PUT', path, NEW_AGENT, otherCookie);
    const run = await request(
      'POST',
      `${path}/run`,
      {prompt: 'Hi'},
      otherCookie,
    );
    const remove = await request('DELETE', path, undefined, otherCookie);

    expect([edit.status, run.status, remove.status]).toEqual([404, 404, 404]);
  });
});

describe('editing and running an agent', () => {
  it('updates the agent, including its character', async () => {
    const response = await request('PUT', `/api/agents/${agentId}`, {
      ...NEW_AGENT,
      name: 'Senior Researcher',
      avatar: 'juno',
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

  it('answers in character with the decrypted key', async () => {
    const response = await request('POST', `/api/agents/${agentId}/run`, {
      prompt: 'Find me three sources on pgvector.',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      text: 'Here are three sources.',
      inputTokens: 30,
      outputTokens: 8,
    });
    expect(apiKeys.at(-1)).toBe(ANTHROPIC_KEY);

    const [system, user] = models.at(-1)?.doGenerateCalls[0]?.prompt ?? [];
    expect(system).toMatchObject({
      role: 'system',
      content: expect.stringContaining('You are Senior Researcher'),
    });
    expect(system?.content).toContain('Always list your sources.');
    expect(system?.content).toContain('Dreamy and creative.');
    expect(JSON.stringify(user)).toContain('three sources on pgvector');
  });

  it('sends the earlier conversation before the new message', async () => {
    const response = await request('POST', `/api/agents/${agentId}/run`, {
      prompt: 'And a fourth?',
      history: [
        {role: 'user', content: 'Find three sources.'},
        {role: 'assistant', content: 'Here are three sources.'},
      ],
    });

    expect(response.status).toBe(200);
    const prompt = models.at(-1)?.doGenerateCalls[0]?.prompt ?? [];
    expect(prompt.map((message) => message.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
    ]);
    expect(JSON.stringify(prompt.at(-1))).toContain('And a fourth?');
  });

  it('rejects a history that is too long', async () => {
    const history = Array.from({length: 21}, () => ({
      role: 'user',
      content: 'Hi',
    }));
    const response = await request('POST', `/api/agents/${agentId}/run`, {
      prompt: 'Hi',
      history,
    });

    expect(response.status).toBe(400);
  });

  it('validates the message', async () => {
    const response = await request('POST', `/api/agents/${agentId}/run`, {
      prompt: '  ',
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
