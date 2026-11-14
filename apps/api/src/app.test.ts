import {schema} from '@binary/db';
import {eq} from 'drizzle-orm';
import {afterAll, describe, expect, it} from 'vitest';

import {createApp} from './app';
import {createDependencies} from './container';
import {db} from './db';
import {cookieFrom, WEB_ORIGIN} from './test-helpers';

// A fresh email per run keeps the tests independent of earlier runs.
const email = `test-${Date.now()}@example.com`;
const password = 'correct-horse-battery';
const app = createApp(createDependencies());

function postJson(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: WEB_ORIGIN},
    body: JSON.stringify(body),
  });
}

afterAll(async () => {
  await db.delete(schema.users).where(eq(schema.users.email, email));
  await db.$client.end();
});

describe('health check', () => {
  it('responds with ok', async () => {
    const response = await app.request('/health');

    expect(await response.json()).toEqual({status: 'ok'});
  });
});

describe('authentication', () => {
  it('signs up a new user and returns a session cookie', async () => {
    const response = await postJson('/api/auth/sign-up/email', {
      name: 'Test User',
      email,
      password,
    });

    expect(response.status).toBe(200);
    expect(cookieFrom(response)).toContain('session_token');
  });

  it('rejects a wrong password', async () => {
    const response = await postJson('/api/auth/sign-in/email', {
      email,
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
  });

  it('signs in and reads the current user from /api/me', async () => {
    const signIn = await postJson('/api/auth/sign-in/email', {email, password});
    expect(signIn.status).toBe(200);

    const me = await app.request('/api/me', {
      headers: {Cookie: cookieFrom(signIn)},
    });

    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({user: {email}});
  });

  it('blocks /api/me without a session', async () => {
    const response = await app.request('/api/me');

    expect(response.status).toBe(401);
  });

  it('allows the web app origin with credentials (CORS)', async () => {
    const response = await app.request('/api/me', {
      method: 'OPTIONS',
      headers: {
        Origin: WEB_ORIGIN,
        'Access-Control-Request-Method': 'GET',
      },
    });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      WEB_ORIGIN,
    );
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
      'true',
    );
  });
});
