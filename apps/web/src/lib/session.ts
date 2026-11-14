import 'server-only';

import {cookies} from 'next/headers';

import type {Session} from './auth-client';
import {API_URL} from './env';

/**
 * Reads the signed-in user on the server, before the page renders.
 *
 * The session cookie was set by the API. Browsers share cookies across ports
 * on the same host, so the web server sees it too and simply forwards it.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const response = await fetch(`${API_URL}/api/auth/get-session`, {
    headers: {cookie: cookieStore.toString()},
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }
  return response.json();
}
