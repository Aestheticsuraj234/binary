import type {AgentComputer, ComputerView} from '@binary/shared';

import {API_URL} from '@/lib/env';

export interface ComputerList {
  /** Which computers this server can give agents (E2B key, Chromium). */
  available: Record<AgentComputer, boolean>;
  computers: ComputerView[];
}

const NONE: ComputerList = {
  available: {sandbox: false, browser: false},
  computers: [],
};

/** The user's running sandboxes and browsers, from the browser. */
export async function listComputers(): Promise<ComputerList> {
  const response = await fetch(`${API_URL}/api/computers`, {
    credentials: 'include',
  }).catch(() => null);
  const body: ComputerList | null = response?.ok
    ? await response.json().catch(() => null)
    : null;
  return body ?? NONE;
}

/** Stops a sandbox or browser at once. True if it worked. */
export async function stopComputer(id: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/api/computers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  }).catch(() => null);
  return response?.ok ?? false;
}
