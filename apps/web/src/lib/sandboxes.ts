import type {SandboxView} from '@binary/shared';

import {API_URL} from '@/lib/env';

export interface SandboxList {
  /** False when the API has no E2B key, so agents get no sandbox. */
  available: boolean;
  sandboxes: SandboxView[];
}

/** The user's running sandboxes, from the browser. */
export async function listSandboxes(): Promise<SandboxList> {
  const response = await fetch(`${API_URL}/api/sandboxes`, {
    credentials: 'include',
  }).catch(() => null);
  const body: SandboxList | null = response?.ok
    ? await response.json().catch(() => null)
    : null;
  return body ?? {available: false, sandboxes: []};
}

/** Stops a sandbox at once; its files are gone. True if it worked. */
export async function stopSandbox(id: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/api/sandboxes/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  }).catch(() => null);
  return response?.ok ?? false;
}
