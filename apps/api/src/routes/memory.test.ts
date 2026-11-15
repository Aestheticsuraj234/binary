import {deleteUsersByEmail} from '@binary/db/test-utils';
import type {
  Agent,
  ChatStreamEvent,
  KnowledgeDocumentView,
  KnowledgeMatch,
  MemoryStatus,
  MemoryView,
  Thread,
  ToolCallView,
} from '@binary/shared';
import {simulateReadableStream} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {fakeEmbedder} from '../memory/fake-embedder';
import {readJson, signUpTestUser} from '../test-helpers';
import {startTestWebSite} from '../test-web-site';

const USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {total: 5, text: 5, reasoning: undefined},
};

const TOOL_FOR_WORD: [string, string, unknown][] = [
  [
    'remember that',
    'remember',
    {fact: 'Prefers TypeScript for backend services'},
  ],
  ['handbook', 'search_knowledge', {query: 'how many holiday days'}],
];

let lastSystem = '';
let lastTools: string[] = [];

function fakeModel() {
  return new MockLanguageModelV4({
    doStream: async ({prompt, tools}) => {
      lastSystem = JSON.stringify(prompt.filter((m) => m.role === 'system'));
      lastTools = (tools ?? []).map((tool) => tool.name);
      const lastUser = JSON.stringify(
        prompt.filter((m) => m.role === 'user').at(-1),
      );
      const done = prompt.some((m) => m.role === 'tool');
      const match = TOOL_FOR_WORD.find(([word]) => lastUser.includes(word));
      const call = match && !done ? match : undefined;
      return {
        stream: simulateReadableStream({
          chunks: [
            {type: 'stream-start' as const, warnings: []},
            ...(call
              ? [
                  {
                    type: 'tool-call' as const,
                    toolCallId: `call-${Date.now()}`,
                    toolName: call[1],
                    input: JSON.stringify(call[2]),
                  },
                ]
              : [
                  {type: 'text-start' as const, id: 't'},
                  {type: 'text-delta' as const, id: 't', delta: 'Done.'},
                  {type: 'text-end' as const, id: 't'},
                ]),
            {
              type: 'finish' as const,
              finishReason: call
                ? {unified: 'tool-calls' as const, raw: 'tool_use'}
                : {unified: 'stop' as const, raw: 'stop'},
              usage: USAGE,
            },
          ],
        }),
      };
    },
  });
}

let site: Awaited<ReturnType<typeof startTestWebSite>>;
const app = createApp(
  createDependencies(fakeModel, {
    sandboxProvider: null,
    desktopProvider: null,
    browserGuard: null,
    createEmbedder: () => fakeEmbedder(),
    // Knowledge may read the local test site.
    pageGuard: async () => {},
  }),
);
const createdEmails: string[] = [];
let cookie = '';
let otherCookie = '';
let nova: Agent;

function request(method: string, path: string, body?: unknown, as = cookie) {
  return app.request(path, {
    method,
    headers: {'Content-Type': 'application/json', Cookie: as},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function hire(as = cookie) {
  const response = await request(
    'POST',
    '/api/agents',
    {
      name: 'Nova',
      role: 'Helps with my work.',
      instructions: '',
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      avatar: 'nova',
      approvalMode: 'auto_approve_reads',
    },
    as,
  );
  return (await readJson<{agent: Agent}>(response)).agent;
}

async function say(agent: Agent, content: string, as = cookie) {
  const {thread} = await readJson<{thread: Thread}>(
    await request('POST', `/api/agents/${agent.id}/threads`, undefined, as),
  );
  const response = await request(
    'POST',
    `/api/threads/${thread.id}/messages`,
    {content},
    as,
  );
  const events: ChatStreamEvent[] = (await response.text())
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const done = events.at(-1);
  return {
    thread,
    calls: done?.type === 'done' ? (done.message.toolCalls ?? []) : [],
  };
}

async function memories(agent: Agent, as = cookie) {
  return readJson<{status: MemoryStatus; memories: MemoryView[]}>(
    await request('GET', `/api/agents/${agent.id}/memories`, undefined, as),
  );
}

beforeAll(async () => {
  site = await startTestWebSite();
  const user = await signUpTestUser(app);
  const other = await signUpTestUser(app);
  cookie = user.cookie;
  otherCookie = other.cookie;
  createdEmails.push(user.email, other.email);
  await request('PUT', '/api/provider-keys/anthropic', {
    apiKey: 'sk-ant-test-1234567890wxyz',
  });
  nova = await hire();
});

afterAll(async () => {
  await site.close();
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('without an embedding key', () => {
  it('is off, and says which key it needs', async () => {
    const {status} = await memories(nova);
    expect(status).toEqual({available: false, model: null, unsearchable: 0});

    const response = await request('POST', `/api/agents/${nova.id}/memories`, {
      content: 'Likes tea',
    });
    expect(response.status).toBe(400);
    expect((await readJson<{error: string}>(response)).error).toContain(
      'needs an OpenAI or Google key',
    );
    await say(nova, 'Hello');
    expect(lastTools).not.toContain('remember');
  });
});

describe('memory', () => {
  beforeAll(async () => {
    // Anthropic has no embeddings; an OpenAI key turns memory on.
    await request('PUT', '/api/provider-keys/openai', {
      apiKey: 'sk-test-1234567890abcdefwxyz',
    });
  });

  it('adds a memory by hand, but not the same one twice', async () => {
    const first = await request('POST', `/api/agents/${nova.id}/memories`, {
      content: 'Lives in Pune and works remotely',
    });
    expect(first.status).toBe(201);
    expect(await readJson<{saved: MemoryView}>(first)).toMatchObject({
      saved: {content: 'Lives in Pune and works remotely', from: 'you'},
    });

    const again = await request('POST', `/api/agents/${nova.id}/memories`, {
      content: 'lives in Pune, works remotely',
    });
    expect(again.status).toBe(200);
    expect(await readJson<{alreadyKnown: string}>(again)).toEqual({
      alreadyKnown: 'Lives in Pune and works remotely',
    });
  });

  it('lets the agent remember a fact from a chat, without asking', async () => {
    const {calls} = await say(nova, 'Please remember that I like TypeScript');

    expect(calls[0]).toMatchObject({
      toolName: 'remember',
      risk: 'read',
      status: 'succeeded',
      output: {saved: {from: 'chat'}},
    });
    const {status, memories: saved} = await memories(nova);
    expect(status).toMatchObject({available: true, model: 'fake/bag-of-words'});
    expect(saved.map((memory) => memory.content)).toEqual([
      'Prefers TypeScript for backend services',
      'Lives in Pune and works remotely',
    ]);
  });

  it('brings every memory into later chats while there are few', async () => {
    await say(nova, 'Hello there');
    expect(lastSystem).toContain('What you remember about the user');
    expect(lastSystem).toContain('Prefers TypeScript for backend services');
    expect(lastSystem).toContain('Pune');
  });

  it('brings only the related ones once there are many', async () => {
    const many = await hire();
    const facts = [
      'Prefers TypeScript for backend services',
      'Lives in Pune and works remotely',
      ...Array.from(
        {length: 10},
        (_, index) => `Owns pet number ${index} called Rex${index}`,
      ),
    ];
    for (const content of facts) {
      await request('POST', `/api/agents/${many.id}/memories`, {content});
    }

    await say(many, 'Which language for our backend services?');
    expect(lastSystem).toContain('Prefers TypeScript for backend services');
    expect(lastSystem).not.toContain('Pune');
    expect(lastSystem).not.toContain('Rex');
  });

  it('brings nothing to an agent that remembers nothing', async () => {
    const fresh = await hire();
    await say(fresh, 'Hello there');
    expect(lastSystem).not.toContain('What you remember');
  });

  it("keeps an agent's memories to its owner", async () => {
    const {memories: saved} = await memories(nova);
    const response = await request(
      'DELETE',
      `/api/agents/${nova.id}/memories/${saved[0]?.id}`,
      undefined,
      otherCookie,
    );
    expect(response.status).toBe(404);
    expect(
      (
        await request(
          'GET',
          `/api/agents/${nova.id}/memories`,
          undefined,
          otherCookie,
        )
      ).status,
    ).toBe(404);
  });

  it('forgets a memory when the user deletes it', async () => {
    const {memories: saved} = await memories(nova);
    const pune = saved.find((memory) => memory.content.includes('Pune'));
    expect(
      (await request('DELETE', `/api/agents/${nova.id}/memories/${pune?.id}`))
        .status,
    ).toBe(204);
    expect((await memories(nova)).memories).toHaveLength(1);
  });

  it("is each agent's own", async () => {
    const other = await hire();
    expect((await memories(other)).memories).toEqual([]);
  });
});

describe('knowledge', () => {
  let handbookId = '';

  it('adds pasted text, cut into passages', async () => {
    const holidays =
      'Everyone gets 25 holiday days a year, plus public holidays.';
    const laptops = 'New starters get a MacBook Pro on their first day.';
    // Padding the test embedder ignores (stop words), to make long sections.
    const filler = 'and the '.repeat(100);
    const response = await request('POST', '/api/knowledge', {
      source: 'text',
      title: 'Team handbook',
      // Two long sections: two passages.
      text: `${holidays} ${filler}\n\n${laptops} ${filler}`,
    });
    expect(response.status).toBe(201);
    const {document} = await readJson<{document: KnowledgeDocumentView}>(
      response,
    );
    handbookId = document.id;

    expect(document).toMatchObject({
      title: 'Team handbook',
      source: 'text',
      chunks: 2,
    });
  });

  it('adds a web page, titled from the page', async () => {
    const response = await request('POST', '/api/knowledge', {
      source: 'url',
      url: `${site.url}/pricing`,
    });
    expect(response.status).toBe(201);
    expect(
      (await readJson<{document: KnowledgeDocumentView}>(response)).document,
    ).toMatchObject({
      title: 'Pricing',
      source: 'url',
      sourceUrl: `${site.url}/pricing`,
    });
  });

  it('finds the right passage by meaning', async () => {
    const {matches} = await readJson<{matches: KnowledgeMatch[]}>(
      await request(
        'GET',
        '/api/knowledge/search?q=how%20many%20holiday%20days',
      ),
    );
    expect(matches[0]).toMatchObject({title: 'Team handbook'});
    expect(matches[0]?.content).toContain('25 holiday days');
  });

  it('lets an agent search it and cite the document', async () => {
    const {calls} = await say(
      nova,
      'What does the handbook say about time off?',
    );
    const search: ToolCallView | undefined = calls[0];

    expect(search).toMatchObject({
      toolName: 'search_knowledge',
      risk: 'read',
      status: 'succeeded',
    });
    const matches: unknown = Reflect.get(Object(search?.output), 'matches');
    expect(Array.isArray(matches) && matches[0]).toMatchObject({
      title: 'Team handbook',
    });
  });

  it("keeps the user's knowledge to them", async () => {
    const {documents} = await readJson<{documents: KnowledgeDocumentView[]}>(
      await request('GET', '/api/knowledge', undefined, otherCookie),
    );
    expect(documents).toEqual([]);
    expect(
      (
        await request(
          'DELETE',
          `/api/knowledge/${handbookId}`,
          undefined,
          otherCookie,
        )
      ).status,
    ).toBe(404);
  });

  it('deletes a document and its passages', async () => {
    expect(
      (await request('DELETE', `/api/knowledge/${handbookId}`)).status,
    ).toBe(204);
    const {matches} = await readJson<{matches: KnowledgeMatch[]}>(
      await request('GET', '/api/knowledge/search?q=holiday'),
    );
    expect(matches.every((match) => match.title !== 'Team handbook')).toBe(
      true,
    );
  });
});
