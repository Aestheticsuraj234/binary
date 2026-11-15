import type {DeviceView} from '@binary/shared';

import {API_URL} from '@/lib/env';

export interface NewDevice {
  device: DeviceView;
  /** Typed into the Runner once; shown only now. */
  pairingCode: string;
  expiresAt: string;
}

async function call<T>(
  path: string,
  init: RequestInit = {},
): Promise<{data?: T; error?: string}> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    ...init,
  }).catch(() => null);
  if (!response) {
    return {error: 'Could not reach the API.'};
  }
  if (response.status === 204) {
    return {};
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = Reflect.get(Object(body), 'error');
    return {
      error: typeof message === 'string' ? message : 'Something went wrong.',
    };
  }
  // Our own API's answer, in the shape the route promises.
  const data: T = await response.json();
  return {data};
}

export function listDevices() {
  return call<{devices: DeviceView[]}>('/api/devices');
}

export function addDevice(name: string) {
  return call<NewDevice>('/api/devices', {
    method: 'POST',
    body: JSON.stringify({name}),
  });
}

export function setPaused(id: string, paused: boolean) {
  return call<{device: DeviceView}>(`/api/devices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({paused}),
  });
}

export function removeDevice(id: string) {
  return call<never>(`/api/devices/${id}`, {method: 'DELETE'});
}

/** Whether any computer is paired and so can be used by agents. */
export function hasPairedComputer(devices: DeviceView[] | undefined) {
  return (devices ?? []).some((device) => !device.pairing);
}
