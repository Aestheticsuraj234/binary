import type {Approval, ChatMessage} from '@binary/shared';

import {API_URL} from '@/lib/env';

export interface DecisionResponse {
  approval?: Approval;
  reply?: ChatMessage;
  error?: string;
}

/**
 * Approves or rejects what an agent asked to do. Approving runs the tool
 * on the server; either way the agent then replies in its chat.
 */
export async function decide(
  approvalId: string,
  decision: 'approve' | 'reject',
): Promise<DecisionResponse> {
  const response = await fetch(
    `${API_URL}/api/approvals/${approvalId}/${decision}`,
    {
      method: 'POST',
      credentials: 'include',
    },
  ).catch(() => null);
  if (!response) {
    return {error: 'Could not reach the API.'};
  }
  const body: DecisionResponse | null = await response.json().catch(() => null);
  if (!response.ok) {
    return {error: body?.error ?? 'Could not record the decision.'};
  }
  return body ?? {};
}
