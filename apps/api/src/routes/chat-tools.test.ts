import type {
  Agent,
  ChatMessage,
  ChatStreamEvent,
  Thread,
  ToolCallView,
} from '@binary/shared';
import {simulateReadableStream} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import {deleteUsersByEmail} from '@binary/db/test-utils';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {readJson, signUpTestUser} from '../test-helpers';
import {startTestMcpServer, TEST_MCP_TOKEN} from '../test-mcp-server';

const USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {total: 5, text: 5, reasoning: undefined},
};

// Which tool the fake model calls, chosen by a word in the message.
const TOOL_FOR_WORD: [string, string, object][] = [
  ['refund', 'shop_refund_order', {orderId: 'A1'}],
  ['order', 'shop_lookup_order', {orderId: 'A1'}],
  ['time', 'get_current_time', {timeZone: 'Asia/Kolkata'}],
];

const prompts: unknown[][] = [];

/**
 * A fake model that behaves like a real one with tools: on the first step
 * it calls a tool, on the second (once the tool's result is in the prompt)
 * it answers with text that quotes the result.
 */
function fakeModel() {
  return new MockLanguageModelV4({
    doStream: async ({prompt}) => {
      prompts.push(prompt);
      const toolMessage = prompt.find((message) => message.role === 'tool');
      const question = JSON.stringify(
        prompt.filter((m) => m.role === 'user').at(-1),
      );
      const chosen = TOOL_FOR_WORD.find(([word]) => question.includes(word));

      const parts =
        !toolMessage && chosen
          ? [
              {
                type: 'tool-call' as const,
                toolCallId: `call-${prompts.length}`,
                toolName: chosen[1],
                input: JSON.stringify(chosen[2]),
              },
            ]
          : [
              {type: 'text-start' as const, id: 't'},
              {
                type: 'text-delta' as const,
                id: 't',
                delta: `Answer using ${JSON.stringify(toolMessage?.content ?? 'no tools').slice(0, 300)}`,
              },
              {type: 'text-end' as const, id: 't'},
            ];
      return {
        stream: simulateReadableStream({
          chunks: [
            {type: 'stream-start' as const, warnings: []},
            ...parts,
            {
              type: 'finish' as const,
              finishReason:
                toolMessage || !chosen
                  ? {unified: 'stop' as const, raw: 'stop'}
                  : {unified: 'tool-calls' as const, raw: 'tool_use'},
              usage: USAGE,
            },
          ],
        }),
      };
    },
  });
}

const app = createApp(createDependencies(fakeModel));
const createdEmails: string[] = [];
let shop: Awaited<ReturnType<typeof startTestMcpServer>>;
let cookie = '';
let agent: Agent;

function request(method: string, path: string, body?: unknown) {
  return app.request(path, {
    method,
    headers: {'Content-Type': 'application/json', Cookie: cookie},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Starts a chat, sends one message and returns every streamed event. */
async function ask(content: string) {
  const {thread} = await readJson<{thread: Thread}>(
    await request('POST', `/api/agents/${agent.id}/threads`),
  );
  const response = await request('POST', `/api/threads/${thread.id}/messages`, {
    content,
  });
  const events: ChatStreamEvent[] = (await response.text())
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return {thread, events};
}

function toolEvents(events: ChatStreamEvent[]): ToolCallView[] {
  return events.flatMap((event) => (event.type === 'tool' ? [event.call] : []));
}

beforeAll(async () => {
  shop = await startTestMcpServer();
  const user = await signUpTestUser(app);
  cookie = user.cookie;
  createdEmails.push(user.email);
  await request('PUT', '/api/provider-keys/anthropic', {
    apiKey: 'sk-ant-test-1234567890wxyz',
  });
  await request('POST', '/api/apps', {
    name: 'Shop',
    url: shop.url,
    authorization: TEST_MCP_TOKEN,
  });
  const created = await request('POST', '/api/agents', {
    name: 'Mimi',
    role: 'Helps customers.',
    instructions: '',
    provider: 'anthropic',
    model: 'claude-sonnet-5-5',
    avatar: 'mimi',
  });
  agent = (await readJson<{agent: Agent}>(created)).agent;
});

afterAll(async () => {
  await shop.close();
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('an agent using a read tool from an app', () => {
  it('streams the tool starting and finishing, then the answer', async () => {
    const {events} = await ask('Where is my order A1?');
    const calls = toolEvents(events);

    expect(
      calls.map(({toolName, risk, status}) => ({toolName, risk, status})),
    ).toEqual([
      {toolName: 'shop_lookup_order', risk: 'read', status: 'running'},
      {toolName: 'shop_lookup_order', risk: 'read', status: 'succeeded'},
    ]);
    expect(JSON.stringify(calls[1]?.output)).toContain('2 mugs, shipped');
    const done = events.at(-1);
    expect(done?.type).toBe('done');
    expect(JSON.stringify(done)).toContain('Answer using');
  });

  it('gives the tool result back to the model', () => {
    const second = JSON.stringify(prompts.at(-1));

    expect(second).toContain('"role":"tool"');
    expect(second).toContain('2 mugs, shipped');
  });

  it('saves the tool call with the answer', async () => {
    const {thread} = await ask('Check order A1 again');
    const {messages} = await readJson<{messages: ChatMessage[]}>(
      await request('GET', `/api/threads/${thread.id}`),
    );

    expect(messages.map((message) => message.toolCalls?.length ?? 0)).toEqual([
      0, 1,
    ]);
    expect(messages[1]?.toolCalls?.[0]).toMatchObject({
      toolName: 'shop_lookup_order',
      status: 'succeeded',
      input: {orderId: 'A1'},
    });
  });
});

describe('an agent trying a write tool', () => {
  it('is blocked: the tool never runs and the model is told why', async () => {
    const {events} = await ask('Please refund my order A1');
    const calls = toolEvents(events);

    expect(calls.at(-1)).toMatchObject({
      toolName: 'shop_refund_order',
      risk: 'write',
      status: 'rejected',
      output: {blocked: true},
    });
    expect(shop.refunds).toEqual([]);
    expect(JSON.stringify(prompts.at(-1))).toContain(
      'Binary blocked this action',
    );
  });
});

describe('built-in tools and broken apps', () => {
  it('can use a built-in tool even when an app is unreachable', async () => {
    await shop.close();
    const {events} = await ask('What time is it?');

    expect(toolEvents(events).at(-1)).toMatchObject({
      toolName: 'get_current_time',
      status: 'succeeded',
      output: {timeZone: 'Asia/Kolkata'},
    });
    expect(events.at(-1)?.type).toBe('done');
    shop = await startTestMcpServer();
  });

  it('answers without tools when none are needed', async () => {
    const {events} = await ask('Say hello');

    expect(toolEvents(events)).toEqual([]);
    expect(events.at(-1)).toMatchObject({type: 'done'});
    const done = events.at(-1);
    expect(done?.type === 'done' && done.message.toolCalls).toBeFalsy();
  });
});
