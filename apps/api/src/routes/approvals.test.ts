import {deleteUsersByEmail} from '@binary/db/test-utils';
import {
  CLIENT_HEADER,
  type Agent,
  type Approval,
  type ApprovalMode,
  type ChatMessage,
  type ChatStreamEvent,
  type ConnectedApp,
  type Thread,
} from '@binary/shared';
import {simulateReadableStream} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {InProcessRunner} from '../jobs/job-runner';
import {readJson, signUpTestUser} from '../test-helpers';
import {startTestMcpServer, TEST_MCP_TOKEN} from '../test-mcp-server';

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

/**
 * A fake model that uses tools like a real one. A message about a refund
 * or an order makes it call that tool; once a tool result is in the
 * prompt, or when the message is the note about a decision, it answers in
 * text.
 */
function fakeModel() {
  return new MockLanguageModelV4({
    doStream: async ({prompt}) => {
      lastPrompt = prompt;
      const lastUser = JSON.stringify(
        prompt.filter((m) => m.role === 'user').at(-1),
      );
      const hasToolResult = prompt.some((m) => m.role === 'tool');
      const isDecisionNote = /You (approved|rejected)/.test(lastUser);
      const tool = lastUser.includes('refund')
        ? {toolName: 'shop_refund_order', input: {orderId: 'A1'}}
        : lastUser.includes('order')
          ? {toolName: 'shop_lookup_order', input: {orderId: 'A1'}}
          : undefined;
      const callTool = tool && !hasToolResult && !isDecisionNote;
      const text = isDecisionNote
        ? 'All sorted, the refund is done.'
        : 'I asked for your approval.';
      return {
        stream: simulateReadableStream({
          chunks: [
            {type: 'stream-start' as const, warnings: []},
            ...(callTool
              ? [
                  {
                    type: 'tool-call' as const,
                    toolCallId: `call-${Date.now()}`,
                    toolName: tool.toolName,
                    input: JSON.stringify(tool.input),
                  },
                ]
              : [
                  {type: 'text-start' as const, id: 't'},
                  {type: 'text-delta' as const, id: 't', delta: text},
                  {type: 'text-end' as const, id: 't'},
                ]),
            {
              type: 'finish' as const,
              finishReason: callTool
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

let lastPrompt: unknown;
const deps = createDependencies(fakeModel);
const app = createApp(deps);
const createdEmails: string[] = [];
let shop: Awaited<ReturnType<typeof startTestMcpServer>>;
let cookie = '';
let otherCookie = '';
let mimi: Agent;

function request(method: string, path: string, body?: unknown, as = cookie) {
  return app.request(path, {
    method,
    headers: {'Content-Type': 'application/json', Cookie: as},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function hire(approvalMode: ApprovalMode) {
  const response = await request('POST', '/api/agents', {
    name: 'Mimi',
    role: 'Helps customers.',
    instructions: '',
    provider: 'anthropic',
    model: 'claude-sonnet-5-5',
    avatar: 'mimi',
    approvalMode,
  });
  return (await readJson<{agent: Agent}>(response)).agent;
}

/** Starts a chat with an agent, sends one message, returns the events. */
async function ask(agent: Agent, content: string) {
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
  const done = events.at(-1);
  return {
    thread,
    calls: done?.type === 'done' ? (done.message.toolCalls ?? []) : [],
  };
}

async function pending(as = cookie) {
  return (
    await readJson<{approvals: Approval[]}>(
      await request('GET', '/api/approvals', undefined, as),
    )
  ).approvals;
}

async function threadMessages(threadId: string) {
  return (
    await readJson<{messages: ChatMessage[]}>(
      await request('GET', `/api/threads/${threadId}`),
    )
  ).messages;
}

beforeAll(async () => {
  shop = await startTestMcpServer();
  const user = await signUpTestUser(app);
  const other = await signUpTestUser(app);
  cookie = user.cookie;
  otherCookie = other.cookie;
  createdEmails.push(user.email, other.email);
  await request('PUT', '/api/provider-keys/anthropic', {apiKey: ANTHROPIC_KEY});
  await request('POST', '/api/apps', {
    name: 'Shop',
    url: shop.url,
    authorization: TEST_MCP_TOKEN,
  });
  mimi = await hire('auto_approve_reads');
});

afterAll(async () => {
  await shop.close();
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('asking for approval', () => {
  let approval: Approval;
  let threadId = '';

  it('saves a request for a write tool and puts it in the inbox', async () => {
    const {thread, calls} = await ask(mimi, 'Please refund order A1');
    threadId = thread.id;
    [approval] = (await pending()) as [Approval];

    expect(calls[0]).toMatchObject({
      status: 'awaiting_approval',
      approvalId: approval.id,
    });
    expect(approval).toMatchObject({
      status: 'pending',
      summary: 'shop refund order {"orderId":"A1"}',
      threadId,
      agent: {id: mimi.id, name: 'Mimi'},
      toolCall: {
        toolName: 'shop_refund_order',
        risk: 'write',
        input: {orderId: 'A1'},
      },
    });
    expect(shop.refunds).toEqual([]);
  });

  it('counts it for the sidebar and lists it in Today', async () => {
    const count = await readJson<{pending: number}>(
      await request('GET', '/api/today/count'),
    );
    const today = await readJson<{approvals: Approval[]}>(
      await request('GET', '/api/today'),
    );

    expect(count.pending).toBe(1);
    expect(today.approvals.map((item) => item.id)).toEqual([approval.id]);
  });

  it("is invisible to another user, who can't decide it", async () => {
    expect(await pending(otherCookie)).toEqual([]);
    const response = await request(
      'POST',
      `/api/approvals/${approval.id}/approve`,
      undefined,
      otherCookie,
    );

    expect(response.status).toBe(404);
    expect(shop.refunds).toEqual([]);
  });

  it('runs the tool once approved, and the agent carries on', async () => {
    const response = await request(
      'POST',
      `/api/approvals/${approval.id}/approve`,
    );
    const body = await readJson<{approval: Approval; reply: ChatMessage}>(
      response,
    );

    expect(response.status).toBe(200);
    expect(shop.refunds).toEqual(['A1']);
    expect(body.approval).toMatchObject({
      status: 'executed',
      decidedFrom: 'web',
      toolCall: {status: 'succeeded'},
    });
    expect(JSON.stringify(body.approval.toolCall.output)).toContain(
      'Refunded order A1',
    );
    expect(body.reply.content).toBe('All sorted, the refund is done.');
  });

  it('gives the agent the tool result, but keeps the note readable', () => {
    const followUp = JSON.stringify(lastPrompt);

    expect(followUp).toContain('You approved shop refund order.');
    expect(followUp).toContain("The tool's result:");
    expect(followUp).toContain('Refunded order A1');
  });

  it('records the decision in the chat, between the two answers', async () => {
    const messages = await threadMessages(threadId);

    expect(messages.map(({role}) => role)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant',
    ]);
    expect(messages[2]?.content).toBe('You approved shop refund order.');
    expect(messages[1]?.toolCalls?.[0]?.status).toBe('succeeded');
  });

  it('never runs twice, even when approved again', async () => {
    const again = await request(
      'POST',
      `/api/approvals/${approval.id}/approve`,
    );

    expect(again.status).toBe(409);
    expect(shop.refunds).toEqual(['A1']);
    expect(await pending()).toEqual([]);
  });
});

describe('rejecting', () => {
  it("doesn't run the tool, and the agent acknowledges it", async () => {
    const {thread} = await ask(mimi, 'Please refund order A1 again');
    const [approval] = await pending();
    // From the phone: the mobile app says so in a header.
    const response = await app.request(
      `/api/approvals/${approval?.id}/reject`,
      {method: 'POST', headers: {Cookie: cookie, [CLIENT_HEADER]: 'mobile'}},
    );
    const body = await readJson<{approval: Approval; reply: ChatMessage}>(
      response,
    );

    expect(body.approval).toMatchObject({
      status: 'rejected',
      decidedFrom: 'mobile',
      toolCall: {status: 'rejected'},
    });
    expect(shop.refunds).toEqual(['A1']);
    expect((await threadMessages(thread.id))[2]?.content).toBe(
      'You rejected shop refund order.',
    );
    expect(body.reply.content).toBe('All sorted, the refund is done.');
  });
});

describe('approval modes', () => {
  it('ask first: even a lookup waits', async () => {
    const careful = await hire('ask_first');
    const {calls} = await ask(careful, 'Where is order A1?');

    expect(calls[0]).toMatchObject({
      toolName: 'shop_lookup_order',
      status: 'awaiting_approval',
    });
    const request = (await pending()).find(
      (item) => item.toolCall.id === calls[0]?.id,
    );
    expect(request).toBeDefined();
  });

  it('accept edits: the refund runs at once, nothing to approve', async () => {
    const trusting = await hire('accept_edits');
    const before = (await pending()).length;
    const {calls} = await ask(trusting, 'Please refund order A1');

    expect(calls[0]).toMatchObject({
      toolName: 'shop_refund_order',
      status: 'succeeded',
    });
    expect(shop.refunds).toEqual(['A1', 'A1']);
    expect((await pending()).length).toBe(before);
  });

  it('plan only: no tool runs and nothing is asked', async () => {
    const planner = await hire('plan_only');
    const before = (await pending()).length;
    const {calls} = await ask(planner, 'Where is order A1?');

    expect(calls[0]).toMatchObject({
      status: 'rejected',
      output: {blocked: true},
    });
    expect((await pending()).length).toBe(before);
  });

  it('saves a new mode when the agent is edited', async () => {
    const response = await request('PUT', `/api/agents/${mimi.id}`, {
      name: 'Mimi',
      role: 'Helps customers.',
      instructions: '',
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      avatar: 'mimi',
      approvalMode: 'ask_first',
    });

    expect((await readJson<{agent: Agent}>(response)).agent.approvalMode).toBe(
      'ask_first',
    );
  });
});

describe('when something changed before the decision', () => {
  it("records a failure when the tool's app is gone", async () => {
    const helper = await hire('auto_approve_reads');
    await ask(helper, 'Please refund order A1');
    const waiting = (await pending()).find(
      (item) => item.agent.id === helper.id,
    );
    const {apps} = await readJson<{apps: ConnectedApp[]}>(
      await request('GET', '/api/apps'),
    );
    await request('DELETE', `/api/apps/${apps[0]?.id}`);

    const body = await readJson<{approval: Approval}>(
      await request('POST', `/api/approvals/${waiting?.id}/approve`),
    );
    await request('POST', '/api/apps', {
      name: 'Shop',
      url: shop.url,
      authorization: TEST_MCP_TOKEN,
    });

    expect(body.approval).toMatchObject({
      status: 'executed',
      toolCall: {
        status: 'failed',
        output: {error: 'The tool shop_refund_order is no longer available.'},
      },
    });
  });

  it('keeps the decision when the agent cannot reply', async () => {
    const helper = await hire('auto_approve_reads');
    await ask(helper, 'Please refund order A1');
    const waiting = (await pending()).find(
      (item) => item.agent.id === helper.id,
    );
    const refundsBefore = shop.refunds.length;
    await request('DELETE', '/api/provider-keys/anthropic');

    const body = await readJson<{approval: Approval; error: string}>(
      await request('POST', `/api/approvals/${waiting?.id}/approve`),
    );
    await request('PUT', '/api/provider-keys/anthropic', {
      apiKey: ANTHROPIC_KEY,
    });

    expect(shop.refunds.length).toBe(refundsBefore + 1);
    expect(body.approval.status).toBe('executed');
    expect(body.error).toBe('Add your Anthropic API key in Settings first.');
  });
});

describe('Today', () => {
  it("lists today's routine runs with their routine and agent", async () => {
    const created = await request('POST', '/api/routines', {
      agentId: mimi.id,
      name: 'Inbox sweep',
      prompt: 'Say hello.',
      enabled: true,
      schedule: null,
      timezone: 'UTC',
      webhook: false,
    });
    const {routine} = await readJson<{routine: {id: string}}>(created);
    await request('POST', `/api/routines/${routine.id}/runs`);
    if (deps.jobs instanceof InProcessRunner) {
      await deps.jobs.idle();
    }

    const today = await readJson<{
      runs: {status: string; routine: {name: string}; agent: {name: string}}[];
    }>(await request('GET', '/api/today'));
    expect(today.runs[0]).toMatchObject({
      status: 'succeeded',
      routine: {name: 'Inbox sweep'},
      agent: {name: 'Mimi'},
    });
  });
});
