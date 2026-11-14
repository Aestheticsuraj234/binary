import type {NewToolCall} from '@binary/db';
import type {ToolCallStatus, ToolCallView, ToolRisk} from '@binary/shared';

import {isAwaitingApproval, isBlockedResult} from '../tools/policy';

interface TrackedCall extends ToolCallView {
  startedAt: Date;
  finishedAt?: Date;
}

/** MCP tools report their own failures with `isError: true`. */
function reportsError(output: unknown): boolean {
  return (
    typeof output === 'object' &&
    output !== null &&
    'isError' in output &&
    output.isError === true
  );
}

function statusOf(output: unknown): ToolCallStatus {
  if (isBlockedResult(output)) {
    return 'rejected';
  }
  if (isAwaitingApproval(output)) {
    return 'awaiting_approval';
  }
  return reportsError(output) ? 'failed' : 'succeeded';
}

/**
 * Follows the tools an agent calls while writing one answer: when each
 * starts, how it ends, and in which order. The chat streams every change
 * and saves the whole log with the answer.
 */
export class ToolCallLog {
  private readonly calls = new Map<string, TrackedCall>();

  constructor(private readonly riskOf: (toolName: string) => ToolRisk) {}

  start(id: string, toolName: string, input: unknown): ToolCallView {
    const call: TrackedCall = {
      id,
      toolName,
      risk: this.riskOf(toolName),
      status: 'running',
      input,
      output: null,
      startedAt: new Date(),
    };
    this.calls.set(id, call);
    return this.view(call);
  }

  finish(id: string, output: unknown): ToolCallView | undefined {
    return this.end(id, statusOf(output), output);
  }

  fail(id: string, error: string): ToolCallView | undefined {
    return this.end(id, 'failed', {error});
  }

  /** Rows to save once the answer has its message id. */
  toRows(messageId: string): NewToolCall[] {
    return [...this.calls.values()].map((call) => ({
      messageId,
      toolName: call.toolName,
      risk: call.risk,
      // A call the stream never finished did not succeed.
      status: call.status === 'running' ? 'failed' : call.status,
      input: call.input ?? {},
      output: call.output,
      createdAt: call.startedAt,
      finishedAt: call.finishedAt ?? new Date(),
    }));
  }

  private end(id: string, status: ToolCallStatus, output: unknown) {
    const call = this.calls.get(id);
    if (!call) {
      return undefined;
    }
    Object.assign(call, {status, output, finishedAt: new Date()});
    return this.view(call);
  }

  private view({
    id,
    toolName,
    risk,
    status,
    input,
    output,
  }: TrackedCall): ToolCallView {
    return {id, toolName, risk, status, input, output};
  }
}
