import type {ToolCallView} from './tools';

/**
 * How much an agent may do without asking, from most careful to most
 * trusting. The database enum uses this list.
 */
export const APPROVAL_MODES = [
  'plan_only',
  'ask_first',
  'auto_approve_reads',
  'accept_edits',
] as const;

export type ApprovalMode = (typeof APPROVAL_MODES)[number];

export const APPROVAL_MODE_INFO: Record<
  ApprovalMode,
  {label: string; description: string}
> = {
  plan_only: {
    label: 'Plan only',
    description: 'Uses no tools. Says what it would do, and you do it.',
  },
  ask_first: {
    label: 'Ask first',
    description: 'Asks before every tool, even ones that only read.',
  },
  auto_approve_reads: {
    label: 'Auto-approve reads',
    description:
      'Looks things up on its own; asks before changing anything. Recommended.',
  },
  accept_edits: {
    label: 'Accept edits',
    description:
      'Reads and changes things on its own; asks only before controlling a computer.',
  },
};

/** The mode new agents start with. */
export const DEFAULT_APPROVAL_MODE: ApprovalMode = 'auto_approve_reads';

export const APPROVAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'expired',
  'executed',
] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** A tool call waiting for (or decided by) the user. */
export interface Approval {
  id: string;
  status: ApprovalStatus;
  /** One line: what the agent wants to do. */
  summary: string;
  createdAt: string;
  decidedAt: string | null;
  toolCall: ToolCallView;
  agent: {id: string; name: string; avatar: string | null};
  /** The chat it came from, to read the context. */
  threadId: string;
}
