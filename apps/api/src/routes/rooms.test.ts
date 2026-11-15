import {deleteUsersByEmail} from '@binary/db/test-utils';
import type {
  Agent,
  ChatMessage,
  ChatStreamEvent,
  Room,
  Thread,
} from '@binary/shared';
import {simulateReadableStream} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {FakeSandboxProvider} from '../sandboxes/fake-sandbox-provider';
import {readJson, signUpTestUser} from '../test-helpers';

const USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {total: 5, text: 5, reasoning: undefined},
};

/** What each agent was shown when it answered, by name. */
const promptsBy = new Map<string, string>();
let routerPrompt = '';
let routerAnswer = '';

/** The agent a system prompt is for ("You are Ava, …"). */
function nameIn(prompt: unknown) {
  return /You are (\w+),/.exec(JSON.stringify(prompt))?.[1] ?? '?';
}

/**
 * A fake model that plays every agent: each answers "<Name> here." Ava
 * hands over to Ben when asked to. Cy, who has a sandbox, runs code when
 * asked. As the router, it answers whatever `routerAnswer` says.
 */
function fakeModel() {
  return new MockLanguageModelV4({
    doGenerate: async ({prompt}) => {
      routerPrompt = JSON.stringify(prompt);
      return {
        content: [{type: 'text', text: routerAnswer}],
        finishReason: {unified: 'stop', raw: 'stop'},
        usage: USAGE,
        warnings: [],
      };
    },
    doStream: async ({prompt}) => {
      const name = nameIn(prompt);
      const all = JSON.stringify(prompt);
      promptsBy.set(name, all);
      const done =
        prompt.some((m) => m.role === 'tool') || all.includes('You approved');
      const runCode = name === 'Cy' && all.includes('run some code') && !done;
      const text =
        name === 'Ava' && all.includes('hand it over')
          ? 'Ava here. @Ben, can you check the numbers?'
          : `${name} here.`;
      return {
        stream: simulateReadableStream({
          chunks: [
            {type: 'stream-start' as const, warnings: []},
            ...(runCode
              ? [
                  {
                    type: 'tool-call' as const,
                    toolCallId: `call-${Date.now()}`,
                    toolName: 'run_code',
                    input: JSON.stringify({code: 'print("hi")'}),
                  },
                ]
              : [
                  {type: 'text-start' as const, id: 't'},
                  {type: 'text-delta' as const, id: 't', delta: text},
                  {type: 'text-end' as const, id: 't'},
                ]),
            {
              type: 'finish' as const,
              finishReason: runCode
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
    sandboxProvider: new FakeSandboxProvider(),
    desktopProvider: null,
    browserGuard: null,
  }),
);
const createdEmails: string[] = [];
let cookie = '';
let otherCookie = '';
const team: Record<string, Agent> = {};

function request(method: string, path: string, body?: unknown, as = cookie) {
  return app.request(path, {
    method,
    headers: {'Content-Type': 'application/json', Cookie: as},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function hire(name: string, extra: Record<string, unknown> = {}) {
  const response = await request('POST', '/api/agents', {
    name,
    role: `${name} does ${name.toLowerCase()} things.`,
    instructions: '',
    provider: 'anthropic',
    model: 'claude-sonnet-5-5',
    avatar: 'nova',
    approvalMode: 'auto_approve_reads',
    ...extra,
  });
  return (await readJson<{agent: Agent}>(response)).agent;
}

async function createRoom(
  names: string[],
  routingMode: 'mention' | 'auto',
  lead: string,
) {
  const response = await request('POST', '/api/rooms', {
    name: 'Launch',
    memberIds: names.map((name) => team[name]?.id),
    routingMode,
    leadAgentId: team[lead]?.id,
  });
  expect(response.status).toBe(201);
  return (await readJson<{room: Room}>(response)).room;
}

async function newChat(room: Room) {
  const response = await request('POST', `/api/rooms/${room.id}/threads`);
  return (await readJson<{thread: Thread}>(response)).thread;
}

/** Sends a message to a room chat; returns its events and who answered. */
async function say(threadId: string, content: string, as = cookie) {
  const response = await request(
    'POST',
    `/api/threads/${threadId}/messages`,
    {content},
    as,
  );
  const events: ChatStreamEvent[] = (await response.text())
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const name = (id: string) =>
    Object.values(team).find((agent) => agent.id === id)?.name;
  return {
    status: response.status,
    events,
    turns: events.flatMap((event) =>
      event.type === 'turn' ? [name(event.agentId)] : [],
    ),
    replies: events.flatMap((event) =>
      event.type === 'done' ? [event.message.content] : [],
    ),
  };
}

beforeAll(async () => {
  const user = await signUpTestUser(app);
  const other = await signUpTestUser(app);
  cookie = user.cookie;
  otherCookie = other.cookie;
  createdEmails.push(user.email, other.email);
  await request('PUT', '/api/provider-keys/anthropic', {
    apiKey: 'sk-ant-test-1234567890wxyz',
  });
  for (const name of ['Ava', 'Ben', 'Dee', 'Eli']) {
    team[name] = await hire(name);
  }
  team.Cy = await hire('Cy', {defaultComputer: 'sandbox'});
  // Thinks with OpenAI, but the user has no OpenAI key.
  team.Fay = await hire('Fay', {provider: 'anthropic'});
  await db.$client.query(
    "UPDATE agents SET provider = 'openai', model = 'gpt-5.5' WHERE id = $1",
    [team.Fay?.id],
  );
});

afterAll(async () => {
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('creating rooms', () => {
  it('needs two characters, a lead among them, and only your own', async () => {
    const one = await request('POST', '/api/rooms', {
      name: 'Solo',
      memberIds: [team.Ava?.id],
      routingMode: 'mention',
      leadAgentId: team.Ava?.id,
    });
    expect(one.status).toBe(400);

    const theirs = await request(
      'POST',
      '/api/rooms',
      {
        name: 'Borrowed',
        memberIds: [team.Ava?.id, team.Ben?.id],
        routingMode: 'mention',
        leadAgentId: team.Ava?.id,
      },
      otherCookie,
    );
    expect(theirs.status).toBe(400);
    expect((await readJson<{error: string}>(theirs)).error).toBe(
      'Pick characters you have hired.',
    );
  });

  it('lists a room with its members, and keeps it from other users', async () => {
    const room = await createRoom(['Ava', 'Ben'], 'mention', 'Ava');

    expect(room.members.map((member) => member.name)).toEqual(['Ava', 'Ben']);
    const {rooms} = await readJson<{rooms: Room[]}>(
      await request('GET', '/api/rooms'),
    );
    expect(rooms.some((item) => item.id === room.id)).toBe(true);
    expect(
      (await request('GET', `/api/rooms/${room.id}`, undefined, otherCookie))
        .status,
    ).toBe(404);
  });
});

describe('@mention rooms', () => {
  let room: Room;
  let thread: Thread;

  beforeAll(async () => {
    room = await createRoom(['Ava', 'Ben', 'Dee'], 'mention', 'Dee');
    thread = await newChat(room);
  });

  it('lets the mentioned characters answer, in the order mentioned', async () => {
    const {turns, replies, events} = await say(thread.id, '@Ben then @ava, hi');

    expect(turns).toEqual(['Ben', 'Ava']);
    expect(replies).toEqual(['Ben here.', 'Ava here.']);
    expect(events.at(-1)).toEqual({type: 'end'});
  });

  it("shows each one the others' words, and who is in the room", async () => {
    const ava = promptsBy.get('Ava') ?? '';
    expect(ava).toContain('[Ben]: Ben here.');
    expect(ava).toContain('You are in a room called \\"Launch\\"');
    expect(ava).toContain('Ben (Ben does ben things.)');
  });

  it('saves the message once, and each answer with its author', async () => {
    const {thread: saved, messages} = await readJson<{
      thread: Thread;
      messages: ChatMessage[];
    }>(await request('GET', `/api/threads/${thread.id}`));

    expect(saved.roomId).toBe(room.id);
    expect(messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'assistant',
    ]);
    expect(messages.map((message) => message.authorAgentId)).toEqual([
      null,
      team.Ben?.id,
      team.Ava?.id,
    ]);
  });

  it('lets the lead answer when no one is mentioned', async () => {
    const {turns} = await say(thread.id, 'Anyone there?');
    expect(turns).toEqual(['Dee']);
  });

  it('passes the turn on when an answer @mentions a teammate', async () => {
    const {turns, replies} = await say(
      thread.id,
      '@Ava please hand it over when you are done',
    );
    expect(turns).toEqual(['Ava', 'Ben']);
    expect(replies[0]).toBe('Ava here. @Ben, can you check the numbers?');
  });

  it("can't be written to by another user", async () => {
    const {status} = await say(thread.id, 'Hello', otherCookie);
    expect(status).toBe(404);
  });
});

describe('automatic rooms', () => {
  let room: Room;
  let thread: Thread;

  beforeAll(async () => {
    room = await createRoom(['Ava', 'Ben', 'Dee'], 'auto', 'Ava');
    thread = await newChat(room);
  });

  it('lets the lead pick who answers, in its order', async () => {
    routerAnswer = 'Dee should take this, then Ben.';
    const {turns} = await say(thread.id, 'Plan the launch party');

    expect(turns).toEqual(['Dee', 'Ben']);
    expect(routerPrompt).toContain('- Dee: Dee does dee things.');
    expect(routerPrompt).toContain('Plan the launch party');
  });

  it('still lets an @mention win', async () => {
    routerAnswer = 'Dee';
    const {turns} = await say(thread.id, '@Ben what do you think?');
    expect(turns).toEqual(['Ben']);
  });

  it('falls back to the lead when the router names no one', async () => {
    routerAnswer = 'Nobody in particular.';
    const {turns} = await say(thread.id, 'Hmm');
    expect(turns).toEqual(['Ava']);
  });
});

describe('room limits and failures', () => {
  it('stops after four answers to one message', async () => {
    const room = await createRoom(
      ['Ava', 'Ben', 'Dee', 'Eli', 'Cy'],
      'mention',
      'Ava',
    );
    const thread = await newChat(room);
    const {turns} = await say(thread.id, '@Ava @Ben @Dee @Eli @Cy all of you');
    expect(turns).toEqual(['Ava', 'Ben', 'Dee', 'Eli']);
  });

  it('reports one character failing, and lets the next one answer', async () => {
    const room = await createRoom(['Fay', 'Ben'], 'mention', 'Fay');
    const thread = await newChat(room);
    const {events, replies} = await say(thread.id, '@Fay @Ben go');

    expect(events).toContainEqual({
      type: 'error',
      error: expect.stringMatching(/^Fay: /),
    });
    expect(replies).toEqual(['Ben here.']);
  });
});

describe('approvals in a room', () => {
  it('asks in the inbox, and the agent carries on in the room after approval', async () => {
    const room = await createRoom(['Cy', 'Ava'], 'mention', 'Cy');
    const thread = await newChat(room);
    const {events} = await say(thread.id, '@Cy please run some code');
    const done = events.find((event) => event.type === 'done');
    const call =
      done?.type === 'done' ? done.message.toolCalls?.[0] : undefined;
    expect(call).toMatchObject({
      toolName: 'run_code',
      status: 'awaiting_approval',
    });

    const {approvals} = await readJson<{
      approvals: {id: string; roomId: string | null; agent: {name: string}}[];
    }>(await request('GET', '/api/approvals'));
    expect(
      approvals.find((item) => item.id === call?.approvalId),
    ).toMatchObject({
      roomId: room.id,
      agent: {name: 'Cy'},
    });

    const decided = await request(
      'POST',
      `/api/approvals/${call?.approvalId}/approve`,
    );
    expect((await readJson<{reply: ChatMessage}>(decided)).reply).toMatchObject(
      {content: 'Cy here.', authorAgentId: team.Cy?.id},
    );
    // Cy's follow-up still knows it is in the room.
    expect(promptsBy.get('Cy')).toContain('You are in a room called');
  });
});

describe('deleting a room', () => {
  it('takes its chats with it', async () => {
    const room = await createRoom(['Ava', 'Ben'], 'mention', 'Ava');
    const thread = await newChat(room);
    expect((await request('DELETE', `/api/rooms/${room.id}`)).status).toBe(204);
    expect((await request('GET', `/api/threads/${thread.id}`)).status).toBe(
      404,
    );
  });
});
