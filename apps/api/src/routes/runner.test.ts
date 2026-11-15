import {deleteUsersByEmail} from '@binary/db/test-utils';
import type {
  Agent,
  ChatMessage,
  ChatStreamEvent,
  DeviceView,
  RunnerEvent,
  RunnerJob,
  Thread,
  ToolCallView,
} from '@binary/shared';
import {simulateReadableStream} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
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
  ['list', 'computer_list_files', {}],
  ['build', 'computer_run_command', {command: 'npm run build'}],
];

/** A fake API model that calls the computer tool its message asks for. */
function fakeModel() {
  return new MockLanguageModelV4({
    doStream: async ({prompt}) => {
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

const app = createApp(
  createDependencies(fakeModel, {
    sandboxProvider: null,
    desktopProvider: null,
    browserGuard: null,
  }),
);
const createdEmails: string[] = [];
let cookie = '';
let otherCookie = '';
let token = '';
let deviceId = '';

function request(
  method: string,
  path: string,
  body?: unknown,
  {as = cookie, bearer}: {as?: string; bearer?: string} = {},
) {
  return app.request(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? {Authorization: `Bearer ${bearer}`} : {Cookie: as}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * Plays the Runner for one job: waits for it, sends `events` (as a CLI
 * engine would), then hands in `result`. Returns the job it was given.
 */
async function serveOneJob(
  answer: (job: RunnerJob) => {
    events?: RunnerEvent[];
    result: {ok: true; output: unknown} | {ok: false; error: string};
  },
): Promise<RunnerJob> {
  const response = await request(
    'GET',
    '/api/runner/jobs?wait=10000',
    undefined,
    {
      bearer: token,
    },
  );
  expect(response.status).toBe(200);
  const {id, job} = await readJson<{id: string; job: RunnerJob}>(response);
  const {events, result} = answer(job);
  if (events) {
    await request(
      'POST',
      `/api/runner/jobs/${id}/events`,
      {events},
      {bearer: token},
    );
  }
  await request('POST', `/api/runner/jobs/${id}/result`, result, {
    bearer: token,
  });
  return job;
}

async function hire(body: Record<string, unknown>) {
  const response = await request('POST', '/api/agents', {
    name: 'Bolt',
    role: 'Works on my projects.',
    instructions: 'Be careful.',
    avatar: 'bolt',
    approvalMode: 'auto_approve_reads',
    ...body,
  });
  expect(response.status).toBe(201);
  return (await readJson<{agent: Agent}>(response)).agent;
}

async function newChat(agent: Agent, as = cookie) {
  const response = await request(
    'POST',
    `/api/agents/${agent.id}/threads`,
    undefined,
    {as},
  );
  return (await readJson<{thread: Thread}>(response)).thread;
}

/** Sends one message; returns the stream's events. */
async function say(threadId: string, content: string, as = cookie) {
  const response = await request(
    'POST',
    `/api/threads/${threadId}/messages`,
    {content},
    {as},
  );
  const events: ChatStreamEvent[] = (await response.text())
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return events;
}

function callsOf(events: ChatStreamEvent[]): ToolCallView[] {
  const done = events.at(-1);
  return done?.type === 'done' ? (done.message.toolCalls ?? []) : [];
}

async function devices(as = cookie) {
  return (
    await readJson<{devices: DeviceView[]}>(
      await request('GET', '/api/devices', undefined, {as}),
    )
  ).devices;
}

beforeAll(async () => {
  const user = await signUpTestUser(app);
  const other = await signUpTestUser(app);
  cookie = user.cookie;
  otherCookie = other.cookie;
  createdEmails.push(user.email, other.email);
  await request('PUT', '/api/provider-keys/anthropic', {apiKey: ANTHROPIC_KEY});
});

afterAll(async () => {
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('pairing a computer', () => {
  let code = '';

  it('adds a computer with a one-time code', async () => {
    const response = await request('POST', '/api/devices', {name: 'MacBook'});
    expect(response.status).toBe(201);
    const body = await readJson<{
      device: DeviceView;
      pairingCode: string;
      expiresAt: string;
    }>(response);
    code = body.pairingCode;
    deviceId = body.device.id;

    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(body.device).toMatchObject({
      name: 'MacBook',
      pairing: true,
      online: false,
    });
    expect(await devices(otherCookie)).toEqual([]);
  });

  it('refuses a wrong code', async () => {
    const response = await request('POST', '/api/runner/pair', {
      code: 'ZZZZ-2222',
      os: 'macOS',
    });
    expect(response.status).toBe(400);
  });

  it('swaps the code for a token, once', async () => {
    const response = await request('POST', '/api/runner/pair', {
      code: code.toLowerCase().replace('-', ''),
      os: 'macOS 15',
    });
    expect(response.status).toBe(200);
    const body = await readJson<{
      token: string;
      device: {id: string; name: string};
    }>(response);
    token = body.token;

    expect(body.device).toEqual({id: deviceId, name: 'MacBook'});
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(
      (await request('POST', '/api/runner/pair', {code, os: 'macOS'})).status,
    ).toBe(400);
  });

  it('shows the computer online with the folders the Runner shares', async () => {
    const hello = await request(
      'POST',
      '/api/runner/hello',
      {version: '1', os: 'macOS 15', folders: ['/Users/me/projects']},
      {bearer: token},
    );
    expect(hello.status).toBe(200);

    const [device] = await devices();
    expect(device).toMatchObject({
      pairing: false,
      online: true,
      paused: false,
      os: 'macOS 15',
      allowedFolders: ['/Users/me/projects'],
    });
  });

  it('turns away a Runner without a valid token', async () => {
    expect(
      (await request('GET', '/api/runner/jobs', undefined, {bearer: 'nope'}))
        .status,
    ).toBe(401);
  });
});

describe('tools on your computer', () => {
  let agent: Agent;

  beforeAll(async () => {
    agent = await hire({
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      defaultComputer: 'runner',
    });
  });

  it('lists files without asking, through the Runner', async () => {
    const thread = await newChat(agent);
    const served = serveOneJob(() => ({
      result: {
        ok: true,
        output: {
          path: '/Users/me/projects',
          entries: [{name: 'app', type: 'dir'}],
        },
      },
    }));
    const [call] = callsOf(await say(thread.id, 'Please list my files'));

    expect(await served).toEqual({type: 'list'});
    expect(call).toMatchObject({
      toolName: 'computer_list_files',
      risk: 'read',
      status: 'succeeded',
      output: {entries: [{name: 'app'}]},
    });
  });

  it('asks before running a command, then runs it on approval', async () => {
    const thread = await newChat(agent);
    const [asked] = callsOf(await say(thread.id, 'Please build it'));
    expect(asked).toMatchObject({
      toolName: 'computer_run_command',
      risk: 'computer',
      status: 'awaiting_approval',
    });

    const served = serveOneJob(() => ({
      result: {ok: true, output: {exitCode: 0, stdout: 'built\n', stderr: ''}},
    }));
    await request('POST', `/api/approvals/${asked?.approvalId}/approve`);

    expect(await served).toEqual({type: 'command', command: 'npm run build'});
    const {messages} = await readJson<{messages: ChatMessage[]}>(
      await request('GET', `/api/threads/${thread.id}`),
    );
    expect(messages[1]?.toolCalls?.[0]).toMatchObject({
      status: 'succeeded',
      output: {exitCode: 0, stdout: 'built\n'},
    });
  });

  it('reports what the Runner could not do', async () => {
    const thread = await newChat(agent);
    const served = serveOneJob(() => ({
      result: {ok: false, error: '../secret is outside the shared folders.'},
    }));
    const [call] = callsOf(await say(thread.id, 'Please list my files'));
    await served;

    expect(call).toMatchObject({
      status: 'failed',
      output: {error: '../secret is outside the shared folders.'},
    });
  });

  it('sends nothing while the kill switch is on', async () => {
    const paused = await request('PATCH', `/api/devices/${deviceId}`, {
      paused: true,
    });
    expect((await readJson<{device: DeviceView}>(paused)).device.paused).toBe(
      true,
    );

    const [call] = callsOf(
      await say((await newChat(agent)).id, 'Please list my files'),
    );
    expect(call).toMatchObject({
      status: 'failed',
      output: {error: expect.stringContaining('paused')},
    });
    expect(
      (
        await request('GET', '/api/runner/jobs?wait=100', undefined, {
          bearer: token,
        })
      ).status,
    ).toBe(204);

    await request('PATCH', `/api/devices/${deviceId}`, {paused: false});
  });

  it('tells a user without a computer to pair one', async () => {
    const other = await signUpTestUser(app);
    createdEmails.push(other.email);
    await request(
      'PUT',
      '/api/provider-keys/anthropic',
      {apiKey: ANTHROPIC_KEY},
      {as: other.cookie},
    );
    const response = await request(
      'POST',
      '/api/agents',
      {
        name: 'Bolt',
        role: 'Works on my projects.',
        instructions: '',
        avatar: 'bolt',
        approvalMode: 'auto_approve_reads',
        provider: 'anthropic',
        model: 'claude-sonnet-5-5',
        defaultComputer: 'runner',
      },
      {as: other.cookie},
    );
    const theirs = (await readJson<{agent: Agent}>(response)).agent;
    const thread = await newChat(theirs, other.cookie);
    const [call] = callsOf(
      await say(thread.id, 'Please list my files', other.cookie),
    );

    expect(call).toMatchObject({
      status: 'failed',
      output: {error: expect.stringContaining('No computer is paired yet')},
    });
  });
});

describe('Claude Code as the engine', () => {
  it('needs no model, and streams what the CLI does into the chat', async () => {
    const agent = await hire({engine: 'claude_code', defaultComputer: null});
    expect(agent).toMatchObject({
      engine: 'claude_code',
      provider: null,
      model: null,
    });

    const thread = await newChat(agent);
    const served = serveOneJob(() => ({
      events: [
        {type: 'text', text: 'Let me check.'},
        {type: 'tool-call', id: 't1', name: 'Bash', input: {command: 'ls'}},
        {type: 'tool-result', id: 't1', output: {content: 'app\n'}},
        {type: 'text', text: 'You have one folder, app.'},
      ],
      result: {
        ok: true,
        output: {text: 'Let me check.You have one folder, app.'},
      },
    }));
    const events = await say(thread.id, 'What is in my project?');
    const job = await served;

    expect(job).toMatchObject({
      type: 'engine',
      engine: 'claude_code',
      // auto_approve_reads: Claude Code may look, not change.
      permission: 'read_only',
    });
    // One prompt with the instructions and the message.
    expect(job.type === 'engine' && job.prompt).toContain('Be careful.');
    expect(job.type === 'engine' && job.prompt).toContain(
      'User: What is in my project?',
    );

    const done = events.at(-1);
    expect(done?.type === 'done' && done.message.content).toBe(
      'Let me check.\n\nYou have one folder, app.',
    );
    expect(callsOf(events)[0]).toMatchObject({
      toolName: 'Bash',
      risk: 'computer',
      status: 'succeeded',
      output: {content: 'app\n'},
    });
  });

  it('maps plan only and accept edits to how far the CLI may go', async () => {
    for (const [approvalMode, permission] of [
      ['plan_only', 'plan'],
      ['accept_edits', 'edit'],
    ]) {
      const agent = await hire({engine: 'codex', approvalMode});
      const served = serveOneJob(() => ({
        result: {ok: true, output: {text: ''}},
      }));
      await say((await newChat(agent)).id, 'Fix the bug');
      expect(await served).toMatchObject({engine: 'codex', permission});
    }
  });

  it('shows the CLI failing as an error in the chat', async () => {
    const agent = await hire({engine: 'claude_code'});
    const served = serveOneJob(() => ({
      result: {
        ok: false,
        error:
          'Could not start claude. Is it installed and signed in on this computer?',
      },
    }));
    const events = await say((await newChat(agent)).id, 'Hello');
    await served;

    expect(events.at(-1)).toMatchObject({
      type: 'error',
      error: expect.stringContaining('Is it installed'),
    });
  });
});

describe('removing a computer', () => {
  it('signs its Runner out', async () => {
    expect(
      (
        await request('DELETE', `/api/devices/${deviceId}`, undefined, {
          as: otherCookie,
        })
      ).status,
    ).toBe(404);
    expect((await request('DELETE', `/api/devices/${deviceId}`)).status).toBe(
      204,
    );

    expect(
      (await request('GET', '/api/runner/jobs', undefined, {bearer: token}))
        .status,
    ).toBe(401);
    expect(await devices()).toEqual([]);
  });
});
