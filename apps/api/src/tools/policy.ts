import type {ToolRisk} from '@binary/shared';

/**
 * Decides whether a tool may run (the Strategy pattern, like AgentEngine).
 * The toolbox asks the policy before every call, so changing the rules
 * means swapping the policy, not touching any tool.
 */
export interface ToolPolicy {
  allows(risk: ToolRisk): boolean;
}

/**
 * Chapter 6's policy: tools that only read run straight away. Tools that
 * write or control a computer are refused, because asking you first
 * (approvals) arrives in Chapter 8, and until then "no" is the safe answer.
 */
export const readOnlyPolicy: ToolPolicy = {
  allows: (risk) => risk === 'read',
};

/** What a refused tool returns to the model, so it can explain itself. */
export const BLOCKED_RESULT = {
  blocked: true,
  reason:
    'Binary blocked this action because it can change things outside Binary, and asking the user for approval is not set up yet. Tell the user what you would have done instead.',
} as const;

export function isBlockedResult(output: unknown): boolean {
  return (
    typeof output === 'object' &&
    output !== null &&
    'blocked' in output &&
    output.blocked === true
  );
}
