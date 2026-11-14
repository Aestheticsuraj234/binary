import type {ToolInfo} from '@binary/shared';
import type {Tool} from 'ai';

/**
 * A tool an agent can call, plus what Binary needs to know about it: how
 * risky it is and where it comes from. `tool` is the AI SDK tool the model
 * actually calls.
 */
export interface AgentTool extends ToolInfo {
  tool: Tool;
}

/** The public description of a tool, without its code. */
export function toToolInfo({
  name,
  description,
  risk,
  source,
}: AgentTool): ToolInfo {
  return {name, description, risk, source};
}
