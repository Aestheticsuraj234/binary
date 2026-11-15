import {CLIENT_HEADER} from '@binary/shared';
import {fetch} from 'expo/fetch';
import {Platform} from 'react-native';

import {authClient} from '@/lib/auth-client';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export interface ApiResult<T> {
  data?: T;
  /** A message to show: the API's own, or why it could not be reached. */
  error?: string;
}

/**
 * Calls the Binary API as the signed-in user. On a phone the session
 * cookie lives in secure storage, so it is added by hand; in a browser
 * (the web build) the browser sends it. Every request says it comes from
 * the mobile app, so approvals record where they were decided.
 *
 * `expo/fetch` can stream a response body, which the chat needs.
 */
export async function apiFetch(
  path: string,
  init: {method?: string; body?: string | FormData} = {},
) {
  const headers: Record<string, string> = {[CLIENT_HEADER]: 'mobile'};
  if (typeof init.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  if (Platform.OS !== 'web') {
    headers.Cookie = await authClient.getCookie();
  }
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
  });
}

/** Sends a request and reads the JSON answer, never throwing. */
export async function apiJson<T>(
  path: string,
  init: {method?: string; body?: unknown} = {},
): Promise<ApiResult<T>> {
  const response = await apiFetch(path, {
    method: init.method,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  }).catch(() => null);
  if (!response) {
    return {error: 'Could not reach the API. Is it running?'};
  }
  if (response.status === 204) {
    return {};
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String(body.error)
        : 'Something went wrong. Try again.';
    return {error: message};
  }
  return {data: body as T};
}
