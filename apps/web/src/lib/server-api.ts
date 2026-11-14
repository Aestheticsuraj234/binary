import 'server-only';

import {cookies} from 'next/headers';

import {API_URL} from './env';

/**
 * GETs a JSON endpoint of the Binary API from a server component, as the
 * signed-in user. Returns null when the API errors or cannot be reached.
 *
 * The session cookie was set by the API. Browsers share cookies across ports
 * on the same host, so the web server sees it too and simply forwards it.
 */
export async function getFromApi<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  // If the API is down, behave as if signed out instead of crashing the page.
  const response = await fetch(`${API_URL}${path}`, {
    headers: {cookie: cookieStore.toString()},
    cache: 'no-store',
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }
  return response.json();
}
