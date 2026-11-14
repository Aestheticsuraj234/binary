import {deleteUsersByEmail} from '@binary/db/test-utils';
import type {Agent, Routine, RoutineRun} from '@binary/shared';
import {simulateReadableStream} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {
  InProcessRunner,
  type JobRunner,
  type Schedule,
} from '../jobs/job-runner';
import {runRoutine, type RoutineJob} from '../routines/run-routine';
import {readJson, signUpTestUser} from '../test-helpers';

const ANTHROPIC_KEY = 'sk-ant-test-1234567890wxyz';
const prompts: string[] = [];

/** A fake model that records what it read and answers in one piece. */
function fakeModel() {
  return new MockLanguageModelV4({
    doStream: async ({prompt}) => {
      prompts.push(JSON.stringify(prompt));
      return {
        stream: simulateReadableStream({
          chunks: [
            {type: 'stream-start' as const, warnings: []},
            {type: 'text-start' as const, id: 't'},
            {
              type: 'text-delta' as const,
              id: 't',
              delta: 'Your day is planned.',
            },
            {type: 'text-end' as const, id: 't'},
            {
              type: 'finish' as const,
              finishReason: {unified: 'stop' as const, raw: 'stop'},
              usage: {
                inputTokens: {
                  total: 5,
                  noCache: 5,
                  cacheRead: undefined,
                  cacheWrite: undefined,
                },
                outputTokens: {total: 5, text: 5, reasoning: undefined},
              },
            },
          ],
        }),
      };
    },
  });
}

/** Runs jobs in-process like the real fallback, and records schedule calls. */
class RecordingRunner implements JobRunner {
  readonly schedulesEnabled = true;
  readonly saved: Schedule[] = [];
  readonly removed: string[] = [];
  readonly inner: InProcessRunner;
  /** Makes the next saveSchedule fail, like Trigger.dev refusing it. */
  failNextSave = false;

  constructor(run: (job: RoutineJob) => Promise<void>) {
    this.inner = new InProcessRunner(run);
  }

  enqueue(job: RoutineJob) {
    return this.inner.enqueue(job);
  }

  async saveSchedule(schedule: Schedule) {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error('Invalid cron');
    }
    this.saved.push(schedule);
  }

  async removeSchedule(triggerId: string) {
    this.removed.push(triggerId);
  }
}

let runner: RecordingRunner;
const deps = createDependencies(fakeModel, undefined, (base) => {
  runner = new RecordingRunner((job) => runRoutine(base, job));
  return runner;
});
const app = createApp(deps);
const createdEmails: string[] = [];
let cookie = '';
let otherCookie = '';
let agent: Agent;
let routine: Routine;
let webhookSecret = '';

const ROUTINE = {
  name: 'Morning plan',
  prompt: 'Plan my day in three bullet points.',
  enabled: true,
  schedule: '0 9 * * 1-5',
  timezone: 'Asia/Kolkata',
  webhook: true,
};

function request(method: string, path: string, body?: unknown, as = cookie) {
  return app.request(path, {
    method,
    headers: {'Content-Type': 'application/json', Cookie: as},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function callWebhook(id: string | null, secret: string, body = '') {
  return app.request(`/api/hooks/routines/${id}`, {
    method: 'POST',
    headers: {'X-Binary-Secret': secret, 'Content-Type': 'text/plain'},
    body,
  });
}

/** The routine's runs, once every queued run has finished. */
async function settledRuns() {
  await runner.inner.idle();
  const body = await readJson<{runs: RoutineRun[]}>(
    await request('GET', `/api/routines/${routine.id}`),
  );
  return body.runs;
}

beforeAll(async () => {
  const user = await signUpTestUser(app);
  const other = await signUpTestUser(app);
  cookie = user.cookie;
  otherCookie = other.cookie;
  createdEmails.push(user.email, other.email);
  await request('PUT', '/api/provider-keys/anthropic', {apiKey: ANTHROPIC_KEY});
  const created = await request('POST', '/api/agents', {
    name: 'Sunny',
    role: 'Plans days.',
    instructions: '',
    provider: 'anthropic',
    model: 'claude-sonnet-5-5',
    avatar: 'sunny',
  });
  agent = (await readJson<{agent: Agent}>(created)).agent;
});

afterAll(async () => {
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('creating a routine', () => {
  it('requires a signed-in user', async () => {
    expect((await app.request('/api/routines')).status).toBe(401);
  });

  it("refuses someone else's agent", async () => {
    const response = await request(
      'POST',
      '/api/routines',
      {...ROUTINE, agentId: agent.id},
      otherCookie,
    );

    expect(response.status).toBe(400);
  });

  it('refuses an unknown time zone before saving anything', async () => {
    const response = await request('POST', '/api/routines', {
      ...ROUTINE,
      agentId: agent.id,
      timezone: 'Mars/Olympus_Mons',
    });
    const {routines} = await readJson<{routines: Routine[]}>(
      await request('GET', '/api/routines'),
    );

    expect(response.status).toBe(400);
    expect(routines).toEqual([]);
  });

  it('leaves no half-made routine when the schedule is refused', async () => {
    runner.failNextSave = true;
    const response = await request('POST', '/api/routines', {
      ...ROUTINE,
      agentId: agent.id,
    });
    const {routines} = await readJson<{routines: Routine[]}>(
      await request('GET', '/api/routines'),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Trigger.dev could not save the schedule: Invalid cron',
    });
    expect(routines).toEqual([]);
  });

  it('saves the routine, its schedule and a webhook shown once', async () => {
    const response = await request('POST', '/api/routines', {
      ...ROUTINE,
      agentId: agent.id,
    });
    const body = await readJson<{routine: Routine; webhookSecret: string}>(
      response,
    );
    routine = body.routine;
    webhookSecret = body.webhookSecret;

    expect(response.status).toBe(201);
    expect(routine).toMatchObject({
      name: 'Morning plan',
      enabled: true,
      agent: {id: agent.id, name: 'Sunny'},
      schedule: {cron: '0 9 * * 1-5', timezone: 'Asia/Calcutta'},
      lastRun: null,
    });
    expect(routine.webhookId).toBeTruthy();
    expect(webhookSecret).toMatch(/^whsec_/);
    expect(runner.saved.at(-1)).toMatchObject({
      cron: '0 9 * * 1-5',
      timezone: 'Asia/Calcutta',
    });
  });

  it('never shows the webhook secret again', async () => {
    const text = await (await request('GET', '/api/routines')).text();

    expect(text).toContain('Morning plan');
    expect(text).not.toContain(webhookSecret);
  });
});

describe('running a routine', () => {
  it('queues "Run now" and records a successful run with its transcript', async () => {
    const response = await request('POST', `/api/routines/${routine.id}/runs`);
    const {run} = await readJson<{run: RoutineRun}>(response);
    expect(response.status).toBe(202);
    expect(run.status).toBe('queued');

    const [latest] = await settledRuns();
    expect(latest).toMatchObject({
      id: run.id,
      status: 'succeeded',
      error: null,
    });
    const {messages, thread} = await readJson<{
      thread: {title: string};
      messages: {role: string; content: string}[];
    }>(await request('GET', `/api/threads/${latest?.threadId}`));
    expect(thread.title).toMatch(/^Morning plan · /);
    expect(messages.map(({role, content}) => ({role, content}))).toEqual([
      {role: 'user', content: ROUTINE.prompt},
      {role: 'assistant', content: 'Your day is planned.'},
    ]);
  });

  it('never runs the same run twice', async () => {
    const [latest] = await settledRuns();
    const before = prompts.length;
    await runRoutine(deps, {runId: latest?.id ?? ''});

    expect(prompts.length).toBe(before);
  });

  it('records a failed run with the reason', async () => {
    await request('DELETE', '/api/provider-keys/anthropic');
    await request('POST', `/api/routines/${routine.id}/runs`);
    const [latest] = await settledRuns();
    await request('PUT', '/api/provider-keys/anthropic', {
      apiKey: ANTHROPIC_KEY,
    });

    expect(latest).toMatchObject({
      status: 'failed',
      error: 'Add your Anthropic API key in Settings first.',
    });
  });
});

describe('webhooks', () => {
  it('rejects a wrong secret and an unknown webhook', async () => {
    expect((await callWebhook(routine.webhookId, 'whsec_wrong')).status).toBe(
      401,
    );
    expect(
      (await callWebhook('00000000-0000-4000-8000-000000000000', webhookSecret))
        .status,
    ).toBe(404);
  });

  it('starts a run, passing the body to the agent as data', async () => {
    const response = await callWebhook(
      routine.webhookId,
      webhookSecret,
      'New issue: login is broken',
    );
    expect(response.status).toBe(202);

    const [latest] = await settledRuns();
    expect(latest?.status).toBe('succeeded');
    expect(prompts.at(-1)).toContain(
      '<webhook-body>\\nNew issue: login is broken\\n</webhook-body>',
    );
  });

  it('refuses to start a switched-off routine', async () => {
    await request('PUT', `/api/routines/${routine.id}`, {
      ...ROUTINE,
      agentId: agent.id,
      enabled: false,
    });
    const response = await callWebhook(routine.webhookId, webhookSecret);
    await request('PUT', `/api/routines/${routine.id}`, {
      ...ROUTINE,
      agentId: agent.id,
    });

    expect(response.status).toBe(409);
  });

  it('makes a new secret, and the old one stops working', async () => {
    const {webhookSecret: fresh} = await readJson<{webhookSecret: string}>(
      await request('POST', `/api/routines/${routine.id}/webhook-secret`),
    );

    expect((await callWebhook(routine.webhookId, webhookSecret)).status).toBe(
      401,
    );
    expect((await callWebhook(routine.webhookId, fresh)).status).toBe(202);
    webhookSecret = fresh;
    await runner.inner.idle();
  });
});

describe('editing a routine', () => {
  it('keeps the schedule id when the time changes', async () => {
    const response = await request('PUT', `/api/routines/${routine.id}`, {
      ...ROUTINE,
      agentId: agent.id,
      schedule: '0 8 * * *',
    });
    const body = await readJson<{routine: Routine; webhookSecret?: string}>(
      response,
    );

    expect(body.routine.schedule).toEqual({
      cron: '0 8 * * *',
      timezone: 'Asia/Calcutta',
    });
    expect(runner.saved.at(-1)?.triggerId).toBe(runner.saved[0]?.triggerId);
    expect(body.webhookSecret).toBeUndefined();
  });

  it('removes the schedule from the job runner when it is cleared', async () => {
    const triggerId = runner.saved[0]?.triggerId;
    const response = await request('PUT', `/api/routines/${routine.id}`, {
      ...ROUTINE,
      agentId: agent.id,
      schedule: null,
    });

    expect(
      (await readJson<{routine: Routine}>(response)).routine.schedule,
    ).toBeNull();
    expect(runner.removed).toContain(triggerId);
  });

  it('turns the webhook off, and on again with a new secret', async () => {
    const off = await readJson<{routine: Routine}>(
      await request('PUT', `/api/routines/${routine.id}`, {
        ...ROUTINE,
        agentId: agent.id,
        webhook: false,
      }),
    );
    expect(off.routine.webhookId).toBeNull();

    const on = await readJson<{routine: Routine; webhookSecret: string}>(
      await request('PUT', `/api/routines/${routine.id}`, {
        ...ROUTINE,
        agentId: agent.id,
      }),
    );
    expect(on.webhookSecret).toMatch(/^whsec_/);
    expect(on.webhookSecret).not.toBe(webhookSecret);
  });
});

describe("another user's routine", () => {
  it('is invisible and cannot be changed, run or deleted', async () => {
    const path = `/api/routines/${routine.id}`;
    const list = await request('GET', '/api/routines', undefined, otherCookie);
    const statuses = await Promise.all([
      request('GET', path, undefined, otherCookie),
      request('PUT', path, {...ROUTINE, agentId: agent.id}, otherCookie),
      request('POST', `${path}/runs`, undefined, otherCookie),
      request('DELETE', path, undefined, otherCookie),
    ]);

    expect(await list.json()).toMatchObject({routines: []});
    expect(statuses.map((response) => response.status)).toEqual([
      404, 404, 404, 404,
    ]);
  });
});

describe('deleting a routine', () => {
  it('removes it, and its schedule from the job runner', async () => {
    await request('PUT', `/api/routines/${routine.id}`, {
      ...ROUTINE,
      agentId: agent.id,
    });
    const scheduleId = runner.saved.at(-1)?.triggerId;

    expect(
      (await request('DELETE', `/api/routines/${routine.id}`)).status,
    ).toBe(204);
    expect(runner.removed).toContain(scheduleId);
    expect((await request('GET', `/api/routines/${routine.id}`)).status).toBe(
      404,
    );
  });
});
