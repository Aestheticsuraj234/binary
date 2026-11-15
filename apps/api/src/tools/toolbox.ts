import type {ToolInfo, ToolRisk} from '@binary/shared';
import {dynamicTool, type ToolSet} from 'ai';

import {toToolInfo, type AgentTool} from './agent-tool';
import type {AppConnection} from './mcp';
import {
  AWAITING_APPROVAL_RESULT,
  BLOCKED_RESULT,
  type ToolPolicy,
} from './policy';

/**
 * Every tool one user's agents can call right now: the built-in ones plus
 * those of each connected app (the Registry pattern). Built per request,
 * because apps can be connected or removed at any time.
 */
export class Toolbox {
  private readonly tools = new Map<string, AgentTool>();

  constructor(
    tools: AgentTool[],
    private readonly connections: AppConnection[] = [],
  ) {
    // Names must be unique for the model; the first tool with a name wins.
    for (const tool of tools) {
      if (!this.tools.has(tool.name)) {
        this.tools.set(tool.name, tool);
      }
    }
  }

  list(): ToolInfo[] {
    return [...this.tools.values()].map(toToolInfo);
  }

  /** A tool the model invented is treated as risky. */
  riskOf(name: string): ToolRisk {
    return this.tools.get(name)?.risk ?? 'write';
  }

  /**
   * The tools in the shape the AI SDK expects. Each one asks the policy
   * first: it runs, returns AWAITING_APPROVAL_RESULT (asked, not run), or
   * returns BLOCKED_RESULT (never runs).
   */
  toToolSet(policy: ToolPolicy): ToolSet {
    const entries = [...this.tools.values()].map((agentTool) => [
      agentTool.name,
      this.wrap(agentTool, policy),
    ]);
    return Object.fromEntries(entries);
  }

  private wrap({risk, tool, forModel}: AgentTool, policy: ToolPolicy) {
    return dynamicTool({
      description: tool.description,
      inputSchema: tool.inputSchema,
      toModelOutput: forModel
        ? ({output}) => ({
            type: 'text',
            value: JSON.stringify(forModel(output)),
          })
        : undefined,
      execute: async (input, options) => {
        const decision = policy.decide(risk);
        if (decision === 'block') {
          return BLOCKED_RESULT;
        }
        if (decision === 'ask') {
          return AWAITING_APPROVAL_RESULT;
        }
        return tool.execute?.(input, options);
      },
    });
  }

  /** A result as the model should read it (see AgentTool.forModel). */
  forModel(name: string, output: unknown): unknown {
    const forModel = this.tools.get(name)?.forModel;
    return forModel ? forModel(output) : output;
  }

  /**
   * Runs a call the user approved. The approval is the permission, so the
   * policy is not asked again. Throws if the tool is gone (for example, its
   * app was removed since the agent asked).
   */
  async runApproved(name: string, input: unknown): Promise<unknown> {
    const execute = this.tools.get(name)?.tool.execute;
    if (!execute) {
      throw new Error(`The tool ${name} is no longer available.`);
    }
    return execute(input, {
      toolCallId: `approved-${name}`,
      messages: [],
      context: {},
    });
  }

  /** Closes the app connections opened for this request. */
  async close() {
    await Promise.allSettled(
      this.connections.map((connection) => connection.close()),
    );
  }
}
