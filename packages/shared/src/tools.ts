import {z} from 'zod';

/**
 * How much harm a tool can do. The database enum uses this list.
 *
 * - read: only looks things up (the time, a web page, an order)
 * - write: changes something outside Binary (sends, refunds, deletes)
 * - computer: controls a sandbox, a browser or your own computer
 */
export const TOOL_RISKS = ['read', 'write', 'computer'] as const;

export type ToolRisk = (typeof TOOL_RISKS)[number];

/** A tool an agent can use, as the Apps page shows it. */
export interface ToolInfo {
  /** The name the model calls it by, e.g. `fetch_web_page`. */
  name: string;
  description: string;
  risk: ToolRisk;
  /** "Binary" for built-in tools, else the app (MCP server) it comes from. */
  source: string;
}

export const TOOL_CALL_STATUSES = [
  'pending',
  'awaiting_approval',
  'running',
  'succeeded',
  'failed',
  'rejected',
] as const;

export type ToolCallStatus = (typeof TOOL_CALL_STATUSES)[number];

/** One tool an agent used while answering, shown inside its reply. */
export interface ToolCallView {
  id: string;
  toolName: string;
  risk: ToolRisk;
  status: ToolCallStatus;
  input: unknown;
  output: unknown;
}

export const connectAppSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the app a name.')
    .max(60, 'Keep the name under 60 characters.'),
  url: z
    .url({
      protocol: /^https?$/,
      error: 'Paste the MCP server URL, starting with https://',
    })
    .max(2000),
  /** Sent as the `Authorization` header, e.g. `Bearer sk-...`. Optional. */
  authorization: z.string().trim().max(2000).optional(),
});

export type ConnectAppInput = z.infer<typeof connectAppSchema>;

/** A connected app, as the Apps page shows it. Never includes the secret. */
export interface ConnectedApp {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'error' | 'disabled';
  hasAuthorization: boolean;
  tools: ToolInfo[];
  /** Why the last connection failed, when status is "error". */
  error?: string;
}
