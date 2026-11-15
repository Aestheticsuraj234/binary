import type {Room, RoomInput, Thread} from '@binary/shared';

import {API_URL} from '@/lib/env';

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
  const data: T = await response.json();
  return {data};
}

export function saveRoom(input: RoomInput, roomId?: string) {
  return call<{room: Room}>(roomId ? `/api/rooms/${roomId}` : '/api/rooms', {
    method: roomId ? 'PUT' : 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteRoom(roomId: string) {
  return call<never>(`/api/rooms/${roomId}`, {method: 'DELETE'});
}

export function startRoomChat(roomId: string) {
  return call<{thread: Thread}>(`/api/rooms/${roomId}/threads`, {
    method: 'POST',
  });
}
