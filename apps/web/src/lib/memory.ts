import type {
  AddDocumentInput,
  KnowledgeDocumentView,
  KnowledgeMatch,
  MemoryView,
} from '@binary/shared';

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

export function addMemory(agentId: string, content: string) {
  return call<{saved?: MemoryView; alreadyKnown?: string}>(
    `/api/agents/${agentId}/memories`,
    {method: 'POST', body: JSON.stringify({content})},
  );
}

export function deleteMemory(agentId: string, memoryId: string) {
  return call<never>(`/api/agents/${agentId}/memories/${memoryId}`, {
    method: 'DELETE',
  });
}

export function addDocument(input: AddDocumentInput) {
  return call<{document: KnowledgeDocumentView}>('/api/knowledge', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteDocument(id: string) {
  return call<never>(`/api/knowledge/${id}`, {method: 'DELETE'});
}

export function searchKnowledge(query: string) {
  return call<{matches: KnowledgeMatch[]}>(
    `/api/knowledge/search?q=${encodeURIComponent(query)}`,
  );
}
