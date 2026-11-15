import {deleteUsersByEmail} from '@binary/db/test-utils';
import type {
  Agent,
  ChatMessage,
  ChatStreamEvent,
  ComputerView,
  Thread,
  ToolCallView,
} from '@binary/shared';
import {simulateReadableStream} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {
  FAKE_SCREEN_PNG,
  FakeDesktopProvider,
} from '../desktops/fake-desktop-provider';
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

const TOOL_FOR_WORD: [string, string, unknown][] = [
  ['look', 'desktop_screenshot', {}],
  ['click', 'desktop_click', {x: 10, y: 20}],
  ['type', 'desktop_type', {text: 'hello'}],
];

let lastPrompt = '';

function fakeModel() {
  return new MockLanguageModelV4({
    doStream: async ({prompt}) => {
      lastPrompt = JSON.stringify(prompt);
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

const provider = new FakeDesktopProvider();
const app = createApp(
  createDependencies(fakeModel, {
    sandboxProvider: null,
    browserGuard: null,
    desktopProvider: provider,
  }),
);
const createdEmails: string[] = [];
let cookie = '';
let agent: Agent;

function request(method: string, path: string, body?: unknown) {
  return app.request(path, {
    method,
    headers: {'Content-Type': 'application/json', Cookie: cookie},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function say(threadId: string, content: string) {
  const response = await request('POST', `/api/threads/${threadId}/messages`, {
    content,
  });
  const events: ChatStreamEvent[] = (await response.text())
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const done = events.at(-1);
  return done?.type === 'done' ? (done.message.toolCalls ?? []) : [];
}

async function desktops() {
  const {computers} = await readJson<{computers: ComputerView[]}>(
    await request('GET', '/api/computers'),
  );
  return computers.filter((computer) => computer.kind === 'desktop');
}

beforeAll(async () => {
  const user = await signUpTestUser(app);
  cookie = user.cookie;
  createdEmails.push(user.email);
  await request('PUT', '/api/provider-keys/anthropic', {apiKey: ANTHROPIC_KEY});
  const response = await request('POST', '/api/agents', {
    name: 'Juno',
    role: 'Uses a desktop.',
    instructions: '',
    provider: 'anthropic',
    model: 'claude-sonnet-5-5',
    avatar: 'juno',
    approvalMode: 'auto_approve_reads',
    defaultComputer: 'desktop',
  });
  agent = (await readJson<{agent: Agent}>(response)).agent;
});

afterAll(async () => {
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('a chat with a cloud desktop', () => {
  let thread: Thread;
  let desktopId = '';

  it('looks without asking, and the model sees the screen as an image', async () => {
    const {thread: created} = await readJson<{thread: Thread}>(
      await request('POST', `/api/agents/${agent.id}/threads`),
    );
    thread = created;
    const [look] = await say(thread.id, 'Take a look at the desktop');

    expect(look).toMatchObject({
      toolName: 'desktop_screenshot',
      risk: 'read',
      status: 'succeeded',
      output: {width: 1024, height: 768, screenshot: FAKE_SCREEN_PNG},
    });
    // The model got the PNG itself, as a file part, not a note.
    expect(lastPrompt).toContain('"mediaType":"image/png"');
    expect(lastPrompt).toContain(FAKE_SCREEN_PNG);
  });

  it('can be watched live, from the computers list', async () => {
    const [desktop] = await desktops();
    desktopId = desktop?.id ?? '';

    expect(desktop).toMatchObject({
      kind: 'desktop',
      threadId: thread.id,
      watchUrl: expect.stringMatching(/^https:\/\/watch\.test\//),
    });
  });

  it('asks before clicking, then clicks where the model said', async () => {
    const [click] = await say(thread.id, 'Now click the button');
    expect(click).toMatchObject({
      toolName: 'desktop_click',
      risk: 'computer',
      status: 'awaiting_approval',
    });

    await request('POST', `/api/approvals/${click?.approvalId}/approve`);

    const [id] = [...provider.desktops.keys()];
    expect(provider.actionsOn(id ?? '')).toEqual(['left click 10,20']);
    // The follow-up turn shows the model the screen after its click.
    expect(lastPrompt).toContain('The screen afterwards is attached.');
    expect(lastPrompt).toContain(FAKE_SCREEN_PNG);
    const {messages} = await readJson<{messages: ChatMessage[]}>(
      await request('GET', `/api/threads/${thread.id}`),
    );
    const saved: ToolCallView | undefined = messages
      .flatMap((message) => message.toolCalls ?? [])
      .find((call) => call.id === click?.id);
    expect(saved).toMatchObject({status: 'succeeded', output: {width: 1024}});
  });

  it('stops when the user stops it', async () => {
    expect(
      (await request('DELETE', `/api/computers/${desktopId}`)).status,
    ).toBe(204);
    expect(provider.desktops.size).toBe(0);
    expect(await desktops()).toEqual([]);
  });

  it('types only into a desktop that exists', async () => {
    const [typed] = await say(thread.id, 'Please type hello');
    expect(typed?.status).toBe('awaiting_approval');
    await request('POST', `/api/approvals/${typed?.approvalId}/approve`);

    const {messages} = await readJson<{messages: ChatMessage[]}>(
      await request('GET', `/api/threads/${thread.id}`),
    );
    const saved = messages
      .flatMap((message) => message.toolCalls ?? [])
      .find((call) => call.id === typed?.id);
    expect(saved?.output).toMatchObject({
      error: expect.stringContaining('no desktop yet'),
    });
    expect(provider.desktops.size).toBe(0);
  });
});
