import {deleteUsersByEmail} from '@binary/db/test-utils';
import type {
  Agent,
  ChatMessage,
  ChatStreamEvent,
  SandboxView,
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
import {
  FAKE_CHART_PNG,
  FakeSandboxProvider,
} from '../sandboxes/fake-sandbox-provider';
import {readJson, signUpTestUser} from '../test-helpers';

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
const CHART_CODE = 'import matplotlib.pyplot as plt\nplt.plot([1, 2, 3])';

// What the fake model does for a word in the user's message.
const TOOL_FOR_WORD: [string, string, unknown][] = [
  ['chart', 'run_code', {language: 'python', code: CHART_CODE}],
  ['hello', 'run_code', {language: 'python', code: 'print("hello")'}],
  ['broken', 'run_command', {command: 'exit 3'}],
  ['save', 'write_file', {path: 'notes.md', content: '# Notes'}],
  ['read', 'read_file', {path: 'notes.md'}],
];

let lastPrompt = '';
let lastTools: string[] = [];

/**
 * A fake model that calls the sandbox tool its message asks for, and
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

const provider = new FakeSandboxProvider();
const app = createApp(
  createDependencies(fakeModel, undefined, undefined, provider),
);
// The same API with E2B not set up.
const appWithoutE2B = createApp(createDependencies(fakeModel));
const createdEmails: string[] = [];
let cookie = '';
let otherCookie = '';
let ada: Agent;

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

async function hire(defaultComputer: 'sandbox' | null, on = app) {
  const response = await request(
    'POST',
    '/api/agents',
    {
      name: 'Ada',
      role: 'Analyses data.',
      instructions: '',
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      avatar: 'bolt',
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
  const call = messages
    .flatMap((message) => message.toolCalls ?? [])
    .find((saved) => saved.id === calls[0]?.id);
  return {call, messages};
}

async function running(as = cookie) {
  return readJson<{available: boolean; sandboxes: SandboxView[]}>(
    await request('GET', '/api/sandboxes', undefined, {as}),
  );
}

beforeAll(async () => {
  const user = await signUpTestUser(app);
  const other = await signUpTestUser(app);
  cookie = user.cookie;
  otherCookie = other.cookie;
  createdEmails.push(user.email, other.email);
  await request('PUT', '/api/provider-keys/anthropic', {apiKey: ANTHROPIC_KEY});
  ada = await hire('sandbox');
});

afterAll(async () => {
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('sandbox tools', () => {
  it('lists the sandbox tools on the Apps page, with their risks', async () => {
    const {sandbox} = await readJson<{
      sandbox: {available: boolean; tools: ToolInfo[]};
    }>(await request('GET', '/api/apps'));

    expect(sandbox.available).toBe(true);
    expect(
      Object.fromEntries(sandbox.tools.map((tool) => [tool.name, tool.risk])),
    ).toEqual({
      run_code: 'computer',
      run_command: 'computer',
      write_file: 'computer',
      read_file: 'read',
      list_files: 'read',
    });
  });

  it('only gives them to agents that have a sandbox', async () => {
    const plain = await hire(null);
    await say((await newChat(plain)).id, 'Say hi');
    expect(lastTools).not.toContain('run_code');

    await say((await newChat(ada)).id, 'Say hi');
    expect(lastTools).toEqual(
      expect.arrayContaining(['run_code', 'run_command', 'read_file']),
    );
  });

  it('asks before running code, and starts no sandbox until approved', async () => {
    const before = provider.created;
    const calls = await say((await newChat(ada)).id, 'Say hello in Python');

    expect(calls[0]).toMatchObject({
      toolName: 'run_code',
      risk: 'computer',
      status: 'awaiting_approval',
    });
    expect(provider.created).toBe(before);
  });
});

describe('a chat with a sandbox', () => {
  let thread: Thread;
  let sandboxId = '';

  it('runs the code once approved, in a new sandbox for the chat', async () => {
    thread = await newChat(ada);
    const before = provider.created;
    const calls = await say(thread.id, 'Say hello in Python');

    const {call, messages} = await approve(thread.id, calls);

    expect(provider.created).toBe(before + 1);
    expect(call).toMatchObject({
      status: 'succeeded',
      output: {stdout: 'hello\n', stderr: '', results: []},
    });
    expect(messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: 'Done.',
    });

    const {sandboxes} = await running();
    const mine = sandboxes.find((sandbox) => sandbox.threadId === thread.id);
    expect(mine).toMatchObject({
      threadTitle: 'Say hello in Python',
      agent: {id: ada.id, name: 'Ada'},
      minutesUsed: 1,
    });
    sandboxId = mine?.id ?? '';
  });

  it('keeps files for the next message, in the same sandbox', async () => {
    const before = provider.created;
    const {call} = await approve(
      thread.id,
      await say(thread.id, 'Please save my notes'),
    );
    expect(call).toMatchObject({status: 'succeeded', output: {bytes: 7}});

    // Reading only looks, so it runs without asking.
    const [read] = await say(thread.id, 'Now read them back');
    expect(read).toMatchObject({
      toolName: 'read_file',
      status: 'succeeded',
      output: {path: 'notes.md', content: '# Notes'},
    });
    expect(provider.created).toBe(before);
  });

  it('treats a failing command as a result the agent can read', async () => {
    const {call} = await approve(
      thread.id,
      await say(thread.id, 'Run the broken script'),
    );

    expect(call).toMatchObject({
      status: 'succeeded',
      output: {exitCode: 3, stderr: 'exited'},
    });
  });

  it('shows a chart to the user but only a note to the model', async () => {
    const {call} = await approve(
      thread.id,
      await say(thread.id, 'Draw a chart of 1, 2, 3'),
    );

    expect(call?.output).toMatchObject({results: [{png: FAKE_CHART_PNG}]});
    // The follow-up turn tells the model the result, without the image.
    expect(lastPrompt).toContain('A chart. The user can see it.');
    expect(lastPrompt).not.toContain(FAKE_CHART_PNG);
  });

  it('starts a fresh sandbox, and says so, when the old one timed out', async () => {
    const [old] = [...provider.sandboxes.keys()].slice(-1);
    await provider.kill(old ?? '');

    const {call} = await approve(
      thread.id,
      await say(thread.id, 'Say hello in Python'),
    );

    expect(call).toMatchObject({
      status: 'succeeded',
      output: {stdout: 'hello\n', newSandbox: true},
    });
    const {sandboxes} = await running();
    const mine = sandboxes.filter((sandbox) => sandbox.threadId === thread.id);
    expect(mine).toHaveLength(1);
    expect(mine[0]?.id).not.toBe(sandboxId);
    sandboxId = mine[0]?.id ?? '';
  });

  it("can't be seen or stopped by another user", async () => {
    expect((await running(otherCookie)).sandboxes).toEqual([]);
    const response = await request(
      'DELETE',
      `/api/sandboxes/${sandboxId}`,
      undefined,
      {as: otherCookie},
    );
    expect(response.status).toBe(404);
  });

  it('stops when the user stops it', async () => {
    const before = provider.sandboxes.size;
    expect(
      (await request('DELETE', `/api/sandboxes/${sandboxId}`)).status,
    ).toBe(204);

    expect(provider.sandboxes.size).toBe(before - 1);
    expect(
      (await running()).sandboxes.some((item) => item.id === sandboxId),
    ).toBe(false);
    expect(
      (await request('DELETE', `/api/sandboxes/${sandboxId}`)).status,
    ).toBe(404);
  });
});

describe('sandbox housekeeping', () => {
  it('reads a file only from a sandbox that exists, never starting one', async () => {
    const before = provider.created;
    const [read] = await say((await newChat(ada)).id, 'Please read my notes');

    expect(read).toMatchObject({
      toolName: 'read_file',
      status: 'succeeded',
      output: {error: expect.stringContaining('no sandbox')},
    });
    expect(provider.created).toBe(before);
  });

  it('closes sandboxes that timed out on their own when listed', async () => {
    const thread = await newChat(ada);
    await approve(thread.id, await say(thread.id, 'Say hello in Python'));
    const [id] = [...provider.sandboxes.keys()].slice(-1);
    await provider.kill(id ?? '');

    const {sandboxes} = await running();
    expect(sandboxes.some((sandbox) => sandbox.threadId === thread.id)).toBe(
      false,
    );
  });

  it("stops a chat's sandbox when the chat is deleted", async () => {
    const thread = await newChat(ada);
    await approve(thread.id, await say(thread.id, 'Say hello in Python'));
    const before = provider.sandboxes.size;

    await request('DELETE', `/api/threads/${thread.id}`);

    expect(provider.sandboxes.size).toBe(before - 1);
  });

  it('saves the computer when an agent is edited', async () => {
    const response = await request('PUT', `/api/agents/${ada.id}`, {
      ...ada,
      defaultComputer: null,
    });

    expect((await readJson<{agent: Agent}>(response)).agent).toMatchObject({
      defaultComputer: null,
    });
    await request('PUT', `/api/agents/${ada.id}`, ada);
  });
});

describe('without E2B', () => {
  it('says sandboxes are not available, and gives agents no sandbox tools', async () => {
    const {available} = await readJson<{available: boolean}>(
      await request('GET', '/api/sandboxes', undefined, {on: appWithoutE2B}),
    );
    expect(available).toBe(false);

    await say((await newChat(ada, appWithoutE2B)).id, 'Hi', appWithoutE2B);
    expect(lastTools).not.toContain('run_code');
  });
});
