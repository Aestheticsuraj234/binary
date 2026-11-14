import {createMCPClient} from '@ai-sdk/mcp';
import type {ToolRisk} from '@binary/shared';

import type {AgentTool} from './agent-tool';

const CONNECT_TIMEOUT_MS = 8000;

export interface AppConnectionDetails {
  name: string;
  url: string;
  /** The full `Authorization` header value, already decrypted. */
  authorization?: string | null;
}

/** An open connection to one app, with its tools ready to call. */
export interface AppConnection {
  tools: AgentTool[];
  close(): Promise<void>;
}

/** How Binary opens app connections. Tests can swap in their own. */
export type AppConnector = (
  details: AppConnectionDetails,
) => Promise<AppConnection>;

/**
 * Turns an app name into a tool name prefix: "Google Calendar" → "google_calendar".
 * Prefixes keep two apps' `search` tools apart.
 */
export function toolPrefix(appName: string): string {
  return (
    appName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'app'
  );
}

/**
 * MCP servers describe their tools with hints. A tool is only "read" when
 * the server says it is read-only; anything else could change something,
 * so it counts as "write". The user trusted this server by connecting it,
 * which is what makes its hints worth using.
 */
export function riskFromHints(hints?: {readOnlyHint?: boolean}): ToolRisk {
  return hints?.readOnlyHint === true ? 'read' : 'write';
}

function withTimeout<T>(promise: Promise<T>, what: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${what} took too long.`)),
        CONNECT_TIMEOUT_MS,
      ),
    ),
  ]);
}

/**
 * Connects to an MCP server over Streamable HTTP (the kind of URL Composio
 * gives you) and lists its tools.
 */
export const connectApp: AppConnector = async ({name, url, authorization}) => {
  const client = await withTimeout(
    createMCPClient({
      transport: {
        type: 'http',
        url,
        headers: authorization ? {Authorization: authorization} : undefined,
      },
    }),
    'Connecting',
  );
  try {
    const definitions = await withTimeout(client.listTools(), 'Listing tools');
    const callable = client.toolsFromDefinitions(definitions);
    const prefix = toolPrefix(name);

    const tools = definitions.tools.flatMap((definition): AgentTool[] => {
      const tool = callable[definition.name];
      if (!tool) {
        return [];
      }
      return [
        {
          // Providers allow at most 64 characters in a tool name.
          name: `${prefix}_${definition.name}`.slice(0, 64),
          description: definition.description ?? definition.name,
          risk: riskFromHints(definition.annotations),
          source: name,
          tool,
        },
      ];
    });
    return {tools, close: () => client.close()};
  } catch (error) {
    await client.close();
    throw error;
  }
};
