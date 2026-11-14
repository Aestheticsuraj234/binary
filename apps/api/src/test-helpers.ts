import {randomUUID} from 'node:crypto';

import type {Hono} from 'hono';

import type {AppEnv} from './app-env';

export const WEB_ORIGIN = 'http://localhost:3000';

/** Turns `Set-Cookie` response headers into a `Cookie` request header. */
export function cookieFrom(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

/** Creates a fresh user through the real sign-up route; returns their cookie. */
export async function signUpTestUser(app: Hono<AppEnv>) {
  const email = `test-${randomUUID()}@example.com`;
  const response = await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: WEB_ORIGIN},
    body: JSON.stringify({name: 'Test User', email, password: 'test-password'}),
  });
  return {email, cookie: cookieFrom(response)};
}

/** Reads a JSON body as the shape our own API promises to send. */
export function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}
