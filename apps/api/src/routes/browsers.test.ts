import {deleteUsersByEmail} from '@binary/db/test-utils';
import type {
  Agent,
  ChatMessage,
  ChatStreamEvent,
  ComputerView,
  Thread,
  ToolCallView,
  ToolInfo,
} from '@binary/shared';
import {simulateReadableStream} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {readJson, signUpTestUser} from '../test-helpers';
import {startTestWebSite} from '../test-web-site';

const ANTHROPIC_KEY = 'sk-ant-test-1234567890wxyz';
const USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {total: 5, text: 5, reasoning: undefined},
};

let site: Awaited<ReturnType<typeof startTestWebSite>>;
let lastPrompt = '';
let lastTools: string[] = [];

/** What the fake model does for a word in the user's message. */
function toolFor(message: string): [string, unknown] | undefined {
  if (message.includes('open')) {
    return ['browser_open', {url: site.url}];
  }
  if (message.includes('pricing')) {
    return ['browser_click', {ref: 1}];
  }
  if (message.includes('search')) {
    return ['browser_type', {ref: 2, text: 'mugs', submit: true}];
  }
  if (message.includes('look')) {
    return ['browser_read', {}];
  }
  return undefined;
}

/**
 * A fake model that calls the browser tool its message asks for, and
 * answers in text once a tool result or a decision note is in the prompt.
 */
function fakeModel() {
  return new MockLanguageModelV4({
    doStream: async ({prompt, tools}) => {
      lastPrompt = JSON.stringify(prompt);
      lastTools = (tools ?? []).map((tool) => tool.name);
      const lastUser = JSON.stringify(
        prompt.filter((m) => m.role === 'user').at(-1),
      );
      const done =
        prompt.some((m) => m.role === 'tool') ||
        /You (approved|rejected)/.test(lastUser);
      const call = done ? undefined : toolFor(lastUser);
      return {
        stream: simulateReadableStream({
          chunks: [
            {type: 'stream-start' as const, warnings: []},
            ...(call
              ? [
                  {
                    type: 'tool-call' as const,
                    toolCallId: `call-${Date.now()}`,
                    toolName: call[0],
                    input: JSON.stringify(call[1]),
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

// The test site runs on 127.0.0.1, so this API lets its browsers reach it.
const deps = createDependencies(fakeModel, {
  sandboxProvider: null,
  browserGuard: async () => {},
});
const app = createApp(deps);
// The same API with the real guard: loopback is a private address.
const guardedDeps = createDependencies(fakeModel, {sandboxProvider: null});
const guardedApp = createApp(guardedDeps);
const createdEmails: string[] = [];
let cookie = '';
let otherCookie = '';
let juno: Agent;

function request(
  method: string,
  path: string,
  body?: unknown,
  {as = cookie, on = app} = {},
) {
  return on.request(path, {
    method,
    headers: {'Content-Type': 'application/json', Cookie: as},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function hire(defaultComputer: 'browser' | null, on = app) {
  const response = await request(
    'POST',
    '/api/agents',
    {
      name: 'Juno',
      role: 'Researches things on the web.',
      instructions: '',
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      avatar: 'juno',
      approvalMode: 'auto_approve_reads',
      defaultComputer,
    },
    {on},
  );
  return (await readJson<{agent: Agent}>(response)).agent;
}

async function newChat(agent: Agent, on = app) {
  const response = await request(
    'POST',
    `/api/agents/${agent.id}/threads`,
    undefined,
    {on},
  );
  return (await readJson<{thread: Thread}>(response)).thread;
}

/** Sends one message; returns the tool calls of the answer. */
async function say(threadId: string, content: string, on = app) {
  const response = await request(
    'POST',
    `/api/threads/${threadId}/messages`,
    {content},
    {on},
  );
  const events: ChatStreamEvent[] = (await response.text())
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const done = events.at(-1);
  return done?.type === 'done' ? (done.message.toolCalls ?? []) : [];
}

/** Approves the first waiting call; returns the call as saved after it ran. */
async function approve(threadId: string, calls: ToolCallView[]) {
  const response = await request(
    'POST',
    `/api/approvals/${calls[0]?.approvalId}/approve`,
  );
  expect(response.status).toBe(200);
  const {messages} = await readJson<{messages: ChatMessage[]}>(
    await request('GET', `/api/threads/${threadId}`),
  );
  return messages
    .flatMap((message) => message.toolCalls ?? [])
    .find((saved) => saved.id === calls[0]?.id);
}

async function browsers(as = cookie) {
  const {available, computers} = await readJson<{
    available: {sandbox: boolean; browser: boolean; desktop: boolean};
    computers: ComputerView[];
  }>(await request('GET', '/api/computers', undefined, {as}));
  return {
    available,
    open: computers.filter((computer) => computer.kind === 'browser'),
  };
}

beforeAll(async () => {
  site = await startTestWebSite();
  const user = await signUpTestUser(app);
  const other = await signUpTestUser(app);
  cookie = user.cookie;
  otherCookie = other.cookie;
  createdEmails.push(user.email, other.email);
  await request('PUT', '/api/provider-keys/anthropic', {apiKey: ANTHROPIC_KEY});
  juno = await hire('browser');
});

afterAll(async () => {
  await deps.browsers?.closeAll();
  await guardedDeps.browsers?.closeAll();
  await site.close();
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('browser tools', () => {
  it('lists the browser tools on the Apps page, with their risks', async () => {
    const {computers} = await readJson<{
      computers: {kind: string; available: boolean; tools: ToolInfo[]}[];
    }>(await request('GET', '/api/apps'));
    const browser = computers.find((computer) => computer.kind === 'browser');

    expect(browser?.available).toBe(true);
    expect(
      Object.fromEntries(
        (browser?.tools ?? []).map((tool) => [tool.name, tool.risk]),
      ),
    ).toEqual({
      browser_open: 'read',
      browser_read: 'read',
      browser_click: 'computer',
      browser_type: 'computer',
    });
    expect((await browsers()).available).toEqual({
      sandbox: false,
      browser: true,
      desktop: false,
    });
  });

  it('only gives them to agents that have a browser', async () => {
    const plain = await hire(null);
    await say((await newChat(plain)).id, 'Say hi');
    expect(lastTools).not.toContain('browser_open');

    await say((await newChat(juno)).id, 'Say hi');
    expect(lastTools).toEqual(
      expect.arrayContaining(['browser_open', 'browser_click']),
    );
  });
});

describe('a chat with a browser', () => {
  let thread: Thread;
  let browserId = '';

  it('opens a page without asking, and shows the user a screenshot', async () => {
    thread = await newChat(juno);
    const [open] = await say(thread.id, 'Please open the shop');

    expect(open).toMatchObject({
      toolName: 'browser_open',
      risk: 'read',
      status: 'succeeded',
      output: {
        title: 'Test Shop',
        elements: expect.arrayContaining([
          expect.objectContaining({ref: 1, text: 'Pricing'}),
        ]),
      },
    });
    const screenshot = Reflect.get(Object(open?.output), 'screenshot');
    expect(typeof screenshot).toBe('string');
    // The model read the page, but not the image.
    expect(lastPrompt).toContain('We sell mugs.');
    expect(lastPrompt).toContain('A screenshot of the page.');
    expect(lastPrompt).not.toContain(String(screenshot).slice(0, 100));

    const {open: running} = await browsers();
    const mine = running.find((browser) => browser.threadId === thread.id);
    expect(mine).toMatchObject({
      kind: 'browser',
      agent: {name: 'Juno'},
      threadTitle: 'Please open the shop',
    });
    browserId = mine?.id ?? '';
  });

  it('asks before clicking, then clicks in the same browser', async () => {
    const calls = await say(thread.id, 'Show me the pricing');
    expect(calls[0]).toMatchObject({
      toolName: 'browser_click',
      risk: 'computer',
      status: 'awaiting_approval',
    });

    const clicked = await approve(thread.id, calls);
    expect(clicked).toMatchObject({
      status: 'succeeded',
      output: {title: 'Pricing', url: `${site.url}/pricing`},
    });
  });

  it('asks before typing, then searches', async () => {
    await say(thread.id, 'Please open the shop');
    const typed = await approve(
      thread.id,
      await say(thread.id, 'Now search for mugs'),
    );

    expect(typed).toMatchObject({
      status: 'succeeded',
      output: {title: 'Search', url: `${site.url}/search?q=mugs`},
    });
    expect(Reflect.get(Object(typed?.output), 'text')).toContain(
      'Results for mugs',
    );
  });

  it("can't be seen or stopped by another user", async () => {
    expect((await browsers(otherCookie)).open).toEqual([]);
    const response = await request(
      'DELETE',
      `/api/computers/${browserId}`,
      undefined,
      {as: otherCookie},
    );
    expect(response.status).toBe(404);
  });

  it('closes when the user stops it', async () => {
    expect(
      (await request('DELETE', `/api/computers/${browserId}`)).status,
    ).toBe(204);

    expect(
      (await browsers()).open.some((browser) => browser.id === browserId),
    ).toBe(false);
    const [look] = await say(thread.id, 'Take another look');
    expect(look).toMatchObject({
      toolName: 'browser_read',
      output: {error: 'This chat has no browser open. Use browser_open first.'},
    });
  });
});

describe('browser housekeeping', () => {
  it('reads nothing, and opens no browser, in a chat without one', async () => {
    const before = (await browsers()).open.length;
    const [look] = await say((await newChat(juno)).id, 'Take a look');

    expect(look).toMatchObject({
      status: 'succeeded',
      output: {error: expect.stringContaining('no browser open')},
    });
    expect((await browsers()).open).toHaveLength(before);
  });

  it("closes a chat's browser when the chat is deleted", async () => {
    const thread = await newChat(juno);
    await say(thread.id, 'Please open the shop');
    expect(
      (await browsers()).open.some((item) => item.threadId === thread.id),
    ).toBe(true);

    await request('DELETE', `/api/threads/${thread.id}`);

    expect(
      (await browsers()).open.some((item) => item.threadId === thread.id),
    ).toBe(false);
  });

  it('will not open a private address', async () => {
    const guarded = await hire('browser', guardedApp);
    const thread = await newChat(guarded, guardedApp);
    const [open] = await say(thread.id, 'Please open the shop', guardedApp);

    expect(open).toMatchObject({
      toolName: 'browser_open',
      status: 'failed',
      output: {error: expect.stringContaining('is a private address')},
    });
  });
});
