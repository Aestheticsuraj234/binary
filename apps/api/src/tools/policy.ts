import type {ApprovalMode, ToolRisk} from '@binary/shared';

/** What happens when an agent calls a tool. */
export type ToolDecision = 'run' | 'ask' | 'block';

/**
 * Decides what each tool call may do (the Strategy pattern, like
 * AgentEngine). The toolbox asks the policy before every call, so changing
 * the rules means swapping the policy, not touching any tool.
 */
export interface ToolPolicy {
  decide(risk: ToolRisk): ToolDecision;
}

// Each approval mode as a table: for every risk, run, ask or block.
const DECISIONS: Record<ApprovalMode, Record<ToolRisk, ToolDecision>> = {
  plan_only: {read: 'block', write: 'block', computer: 'block'},
  ask_first: {read: 'ask', write: 'ask', computer: 'ask'},
  auto_approve_reads: {read: 'run', write: 'ask', computer: 'ask'},
  accept_edits: {read: 'run', write: 'run', computer: 'ask'},
};

/** The policy for an agent's approval mode. */
export function approvalPolicy(mode: ApprovalMode): ToolPolicy {
  return {decide: (risk) => DECISIONS[mode][risk]};
}

/** What a blocked tool returns to the model (plan-only agents). */
export const BLOCKED_RESULT = {
  blocked: true,
  reason:
    'This agent is in plan-only mode, so it uses no tools. Tell the user what you would do, step by step, so they can do it.',
} as const;

/**
 * What a tool that needs approval returns at once. Nothing waits: the
 * request is saved, the agent tells the user what it asked for, and the
 * tool runs later, when (and if) the user approves.
 */
export const AWAITING_APPROVAL_RESULT = {
  awaitingApproval: true,
  reason:
    "This needs the user's approval. It has been asked for and has not run yet. Tell the user what you asked to do and why. Do not call it again.",
} as const;

function hasFlag(output: unknown, flag: string): boolean {
  return (
    typeof output === 'object' &&
    output !== null &&
    Reflect.get(output, flag) === true
  );
}

export function isBlockedResult(output: unknown): boolean {
  return hasFlag(output, 'blocked');
}

export function isAwaitingApproval(output: unknown): boolean {
  return hasFlag(output, 'awaitingApproval');
}
