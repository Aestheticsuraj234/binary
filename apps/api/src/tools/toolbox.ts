import type {ToolInfo, ToolRisk} from '@binary/shared';
import {dynamicTool, type ToolSet} from 'ai';

import {toToolInfo, type AgentTool} from './agent-tool';
import type {AppConnection} from './mcp';
import {BLOCKED_RESULT, type ToolPolicy} from './policy';

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
   * first; a refused tool returns BLOCKED_RESULT instead of running.
   */
  toToolSet(policy: ToolPolicy): ToolSet {
    const entries = [...this.tools.values()].map(({name, risk, tool}) => [
      name,
      dynamicTool({
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: async (input, options) => {
          if (!policy.allows(risk)) {
            return BLOCKED_RESULT;
          }
          return tool.execute?.(input, options);
        },
      }),
    ]);
    return Object.fromEntries(entries);
  }

  /** Closes the app connections opened for this request. */
  async close() {
    await Promise.allSettled(
      this.connections.map((connection) => connection.close()),
    );
  }
}
