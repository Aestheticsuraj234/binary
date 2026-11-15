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
  /** Set while the call waits for the user's decision (Chapter 8). */
  approvalId?: string;
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

/** A picture a tool made, ready for an <img> or <Image> as a data URL. */
export interface ToolImage {
  src: string;
  alt: string;
}

function fieldOf(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? Reflect.get(value, key)
    : undefined;
}

/**
 * Charts from a code run, and the screenshot of a browser or desktop step:
 * shown under the tool's row, since the picture is usually the point.
 */
export function toolCallImages(call: ToolCallView): ToolImage[] {
  if (call.status !== 'succeeded') {
    return [];
  }
  const results = fieldOf(call.output, 'results');
  const charts = (Array.isArray(results) ? results : []).flatMap(
    (result: unknown) => {
      const png = fieldOf(result, 'png');
      return typeof png === 'string' ? [png] : [];
    },
  );
  const images = charts.map((png, index) => ({
    src: `data:image/png;base64,${png}`,
    alt: `Chart ${index + 1} from the sandbox`,
  }));
  const screenshot = fieldOf(call.output, 'screenshot');
  if (typeof screenshot !== 'string' || !screenshot) {
    return images;
  }
  const title = fieldOf(call.output, 'title');
  // Browsers send JPEGs, desktops PNGs; a PNG's base64 starts "iVBOR".
  const type = screenshot.startsWith('iVBOR') ? 'png' : 'jpeg';
  return [
    ...images,
    {
      src: `data:image/${type};base64,${screenshot}`,
      alt:
        typeof title === 'string' && title
          ? `Screenshot of ${title}`
          : 'Screenshot of the screen',
    },
  ];
}
