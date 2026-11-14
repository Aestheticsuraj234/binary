import type {
  Agent,
  ChatMessage,
  ChatStreamEvent,
  Thread,
  ThreadSummary,
} from '@binary/shared';
import {simulateReadableStream} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import {deleteUsersByEmail} from '@binary/db/test-utils';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {readJson, signUpTestUser} from '../test-helpers';

const ANTHROPIC_KEY = 'sk-ant-test-1234567890wxyz';
const FIRST_MESSAGE =
  'Find me three good sources on pgvector and explain how indexes work';
const createdEmails: string[] = [];
const models: MockLanguageModelV4[] = [];

/** One streamed answer, in the shape a provider sends it. */
function streamedAnswer(pieces: string[], failure?: Error) {
  return simulateReadableStream({
    chunks: [
      {type: 'stream-start' as const, warnings: []},
      {type: 'text-start' as const, id: 't1'},
      ...pieces.map((delta) => ({
        type: 'text-delta' as const,
        id: 't1',
        delta,
      })),
      ...(failure ? [{type: 'error' as const, error: failure}] : []),
      {type: 'text-end' as const, id: 't1'},
      {
        type: 'finish' as const,
        finishReason: {unified: 'stop' as const, raw: 'stop'},
        usage: {
          inputTokens: {
            total: 30,
            noCache: 30,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: {total: 8, text: 8, reasoning: undefined},
        },
      },
    ],
  });
}

/** A fake model that streams "Here are three sources." in two pieces. */
function fakeModel() {
  const model = new MockLanguageModelV4({
    doStream: async () => ({
      stream: streamedAnswer(['Here are ', 'three sources.']),
    }),
  });
  models.push(model);
  return model;
}

const app = createApp(createDependencies(fakeModel));
let cookie = '';
let otherCookie = '';
let agent: Agent;
let threadId = '';

function request(method: string, path: string, body?: unknown, as = cookie) {
  return app.request(path, {
    method,
    headers: {'Content-Type': 'application/json', Cookie: as},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Reads a streamed reply: one JSON event per line. */
async function readEvents(response: Response): Promise<ChatStreamEvent[]> {
  const text = await response.text();
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function startChat(path = `/api/agents/${agent.id}/threads`) {
  const response = await request('POST', path);
  const {thread} = await readJson<{thread: Thread}>(response);
  return thread;
}

beforeAll(async () => {
  const user = await signUpTestUser(app);
  const other = await signUpTestUser(app);
  cookie = user.cookie;
  otherCookie = other.cookie;
  createdEmails.push(user.email, other.email);

  await request('PUT', '/api/provider-keys/anthropic', {apiKey: ANTHROPIC_KEY});
  const created = await request('POST', '/api/agents', {
    name: 'Ada',
    role: 'Finds and summarizes sources.',
    instructions: 'Always list your sources.',
    provider: 'anthropic',
    model: 'claude-sonnet-5-5',
    avatar: 'nova',
  });
  agent = (await readJson<{agent: Agent}>(created)).agent;
});

afterAll(async () => {
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('starting a chat', () => {
  it('requires a signed-in user', async () => {
    const response = await app.request('/api/threads');

    expect(response.status).toBe(401);
  });

  it('starts an empty chat with an agent', async () => {
    const response = await request('POST', `/api/agents/${agent.id}/threads`);
    const {thread} = await readJson<{thread: Thread}>(response);
    threadId = thread.id;

    expect(response.status).toBe(201);
    expect(thread).toMatchObject({agentId: agent.id, title: 'New chat'});
  });

  it("can't start a chat with someone else's agent", async () => {
    const response = await request(
      'POST',
      `/api/agents/${agent.id}/threads`,
      undefined,
      otherCookie,
    );

    expect(response.status).toBe(404);
  });
});

describe('talking', () => {
  it('streams the answer piece by piece, then the saved message', async () => {
    const response = await request(
      'POST',
      `/api/threads/${threadId}/messages`,
      {content: FIRST_MESSAGE},
    );
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain(
      'application/x-ndjson',
    );
    expect(events.slice(0, 2)).toEqual([
      {type: 'delta', text: 'Here are '},
      {type: 'delta', text: 'three sources.'},
    ]);
    expect(events[2]).toMatchObject({
      type: 'done',
      message: {role: 'assistant', content: 'Here are three sources.'},
    });
  });

  it('gives the model the system prompt and the message', async () => {
    const prompt = models.at(-1)?.doStreamCalls[0]?.prompt ?? [];

    expect(prompt.map((message) => message.role)).toEqual(['system', 'user']);
    expect(prompt[0]?.content).toContain('You are Ada');
    expect(prompt[0]?.content).toContain('Curious, precise');
    expect(JSON.stringify(prompt[1])).toContain('three good sources');
  });

  it('saves both messages and names the chat after the first one', async () => {
    const response = await request('GET', `/api/threads/${threadId}`);
    const body = await readJson<{thread: Thread; messages: ChatMessage[]}>(
      response,
    );

    expect(body.thread.title).toBe(
      'Find me three good sources on pgvector and…',
    );
    expect(body.messages.map(({role, content}) => ({role, content}))).toEqual([
      {role: 'user', content: FIRST_MESSAGE},
      {role: 'assistant', content: 'Here are three sources.'},
    ]);
  });

  it('remembers the conversation on the next message', async () => {
    const response = await request(
      'POST',
      `/api/threads/${threadId}/messages`,
      {content: 'And a fourth?'},
    );
    await readEvents(response);

    const prompt = models.at(-1)?.doStreamCalls[0]?.prompt ?? [];
    expect(prompt.map((message) => message.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
    ]);
    const {thread} = await readJson<{thread: Thread}>(
      await request('GET', `/api/threads/${threadId}`),
    );
    expect(thread.title).toBe('Find me three good sources on pgvector and…');
  });

  it('lists the chat in recent chats with its agent', async () => {
    const response = await request('GET', '/api/threads');
    const {threads} = await readJson<{threads: ThreadSummary[]}>(response);

    expect(threads[0]).toMatchObject({
      id: threadId,
      agent: {id: agent.id, name: 'Ada', avatar: 'nova'},
    });
  });

  it('validates the message', async () => {
    const response = await request(
      'POST',
      `/api/threads/${threadId}/messages`,
      {content: '  '},
    );

    expect(response.status).toBe(400);
  });

  it('asks for a key before streaming when the key is gone', async () => {
    await request('DELETE', '/api/provider-keys/anthropic');
    const response = await request(
      'POST',
      `/api/threads/${threadId}/messages`,
      {content: 'Hello?'},
    );
    await request('PUT', '/api/provider-keys/anthropic', {
      apiKey: ANTHROPIC_KEY,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Add your Anthropic API key in Settings first.',
    });
  });
});

describe('when the provider fails', () => {
  async function chatWith(createModel: () => MockLanguageModelV4) {
    const failingApp = createApp(createDependencies(createModel));
    const thread = await startChat();
    const response = await failingApp.request(
      `/api/threads/${thread.id}/messages`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Cookie: cookie},
        body: JSON.stringify({content: 'Hi'}),
      },
    );
    const events = await readEvents(response);
    const {messages} = await readJson<{messages: ChatMessage[]}>(
      await request('GET', `/api/threads/${thread.id}`),
    );
    return {events, messages};
  }

  it('sends an error event and keeps only the question', async () => {
    const {events, messages} = await chatWith(
      () =>
        new MockLanguageModelV4({
          doStream: async () => {
            throw new Error('model "nope" does not exist');
          },
        }),
    );

    expect(events).toEqual([
      {
        type: 'error',
        error: expect.stringContaining('model "nope" does not exist'),
      },
    ]);
    expect(messages.map((message) => message.role)).toEqual(['user']);
  });

  it('reports a failure part-way through the answer', async () => {
    const {events, messages} = await chatWith(
      () =>
        new MockLanguageModelV4({
          doStream: async () => ({
            stream: streamedAnswer(['Here are '], new Error('overloaded')),
          }),
        }),
    );

    expect(events.map((event) => event.type)).toEqual(['delta', 'error']);
    expect(messages).toHaveLength(1);
  });
});

describe("another user's chat", () => {
  it('is invisible and cannot be used or deleted', async () => {
    const path = `/api/threads/${threadId}`;
    const read = await request('GET', path, undefined, otherCookie);
    const send = await request(
      'POST',
      `${path}/messages`,
      {content: 'Hi'},
      otherCookie,
    );
    const remove = await request('DELETE', path, undefined, otherCookie);
    const recent = await request('GET', '/api/threads', undefined, otherCookie);

    expect([read.status, send.status, remove.status]).toEqual([404, 404, 404]);
    expect(await recent.json()).toEqual({threads: []});
  });

  it('treats a malformed id as not found', async () => {
    const response = await request('GET', '/api/threads/not-a-uuid');

    expect(response.status).toBe(404);
  });
});

describe('deleting a chat', () => {
  it('deletes it, then reports it gone', async () => {
    const response = await request('DELETE', `/api/threads/${threadId}`);
    expect(response.status).toBe(204);

    const again = await request('DELETE', `/api/threads/${threadId}`);
    expect(again.status).toBe(404);
  });
});
