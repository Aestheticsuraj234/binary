import {ProviderKeyRepository, schema, UserRepository} from '@binary/db';
import type {Provider} from '@binary/shared';
import {MockLanguageModelV4} from 'ai/test';
import {inArray} from 'drizzle-orm';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {signUpTestUser} from '../test-helpers';

const OPENAI_KEY = 'sk-test-openai-1234567890abcd';
const createdEmails: string[] = [];
const modelCalls: {provider: Provider; model: string; apiKey: string}[] = [];

/** A fake model that answers instantly and records which key it was given. */
function fakeModel(provider: Provider, model: string, apiKey: string) {
  modelCalls.push({provider, model, apiKey});
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{type: 'text', text: `Hello from ${provider}/${model}`}],
      finishReason: {unified: 'stop', raw: 'stop'},
      usage: {
        inputTokens: {
          total: 12,
          noCache: 12,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {total: 5, text: 5, reasoning: undefined},
      },
      warnings: [],
    },
  });
}

const app = createApp(createDependencies(fakeModel));
let cookie = '';

function request(method: string, path: string, body?: unknown) {
  return app.request(path, {
    method,
    headers: {'Content-Type': 'application/json', Cookie: cookie},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeAll(async () => {
  const user = await signUpTestUser(app);
  cookie = user.cookie;
  createdEmails.push(user.email);
});

afterAll(async () => {
  await db
    .delete(schema.users)
    .where(inArray(schema.users.email, createdEmails));
  await db.$client.end();
});

describe('provider keys', () => {
  it('requires a signed-in user', async () => {
    const response = await app.request('/api/provider-keys');

    expect(response.status).toBe(401);
  });

  it('starts with no keys', async () => {
    const response = await request('GET', '/api/provider-keys');

    expect(await response.json()).toEqual({keys: []});
  });

  it('rejects a key that is too short', async () => {
    const response = await request('PUT', '/api/provider-keys/openai', {
      apiKey: 'short',
    });

    expect(response.status).toBe(400);
  });

  it('rejects an unknown provider', async () => {
    const response = await request('PUT', '/api/provider-keys/acme', {
      apiKey: OPENAI_KEY,
    });

    expect(response.status).toBe(404);
  });

  it('saves a key and only ever returns its last 4 characters', async () => {
    const saved = await request('PUT', '/api/provider-keys/openai', {
      apiKey: OPENAI_KEY,
    });
    expect(await saved.json()).toEqual({provider: 'openai', last4: 'abcd'});

    const list = await request('GET', '/api/provider-keys');
    const text = await list.text();
    expect(text).toContain('"last4":"abcd"');
    expect(text).not.toContain(OPENAI_KEY);
  });

  it('stores the key encrypted in the database', async () => {
    const user = await new UserRepository(db).findByEmail(
      createdEmails[0] ?? '',
    );
    const saved = await new ProviderKeyRepository(db).find(
      user?.id ?? '',
      'openai',
    );

    expect(saved?.encryptedKey).toBeTruthy();
    expect(saved?.encryptedKey).not.toContain('sk-test');
  });
});

describe('playground', () => {
  it('answers with the decrypted key, model and token usage', async () => {
    const response = await request('POST', '/api/playground', {
      provider: 'openai',
      model: 'gpt-5.5',
      prompt: 'Say hello',
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      provider: 'openai',
      model: 'gpt-5.5',
      text: 'Hello from openai/gpt-5.5',
      inputTokens: 12,
      outputTokens: 5,
    });
    expect(modelCalls.at(-1)?.apiKey).toBe(OPENAI_KEY);
  });

  it('asks for a key when the provider has none', async () => {
    const response = await request('POST', '/api/playground', {
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      prompt: 'Say hello',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Add your Anthropic API key in Settings first.',
    });
  });

  it('validates the prompt', async () => {
    const response = await request('POST', '/api/playground', {
      provider: 'openai',
      model: 'gpt-5.5',
      prompt: '   ',
    });

    expect(response.status).toBe(400);
  });

  it('reports provider failures as 502 with the reason', async () => {
    const failingApp = createApp(
      createDependencies(
        () =>
          new MockLanguageModelV4({
            doGenerate: async () => {
              throw new Error('model "nope" does not exist');
            },
          }),
      ),
    );
    const response = await failingApp.request('/api/playground', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Cookie: cookie},
      body: JSON.stringify({provider: 'openai', model: 'nope', prompt: 'Hi'}),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('does not exist'),
    });
  });

  it('deletes a key', async () => {
    const response = await request('DELETE', '/api/provider-keys/openai');
    expect(response.status).toBe(204);

    const again = await request('DELETE', '/api/provider-keys/openai');
    expect(again.status).toBe(404);
  });
});
