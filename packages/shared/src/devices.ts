import {z} from 'zod';

/** A computer the user paired with the Runner, as the web app shows it. */
export interface DeviceView {
  id: string;
  name: string;
  os: string;
  /** Waiting for its pairing code to be typed into the Runner. */
  pairing: boolean;
  /** Seen in the last minute. */
  online: boolean;
  /** The kill switch: while paused, the Runner is sent nothing. */
  paused: boolean;
  /** The folders the Runner was started with; it works only inside them. */
  allowedFolders: string[];
  lastSeenAt: string | null;
  createdAt: string;
}

export const addDeviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name this computer, e.g. "MacBook".')
    .max(60, 'Keep the name under 60 characters.'),
});

export const updateDeviceSchema = z.object({paused: z.boolean()});

// --- The Runner protocol (the API and apps/runner both use these) --------

export const RUNNER_VERSION = '1';

export const pairRunnerSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/, 'The code looks like ABCD-1234.')
    // Stored with the dash; typed with or without it.
    .transform((code) => `${code.slice(0, 4)}-${code.slice(-4)}`),
  os: z.string().trim().min(1).max(60),
});

export const runnerHelloSchema = z.object({
  version: z.string().max(20),
  os: z.string().trim().min(1).max(60),
  folders: z.array(z.string().min(1).max(1000)).max(20),
});

/** Something the Runner is asked to do on the user's computer. */
export const runnerJobSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('command'),
    command: z.string().min(1).max(4000),
    folder: z.string().max(1000).optional(),
  }),
  z.object({type: z.literal('read'), path: z.string().min(1).max(1000)}),
  z.object({type: z.literal('list'), path: z.string().max(1000).optional()}),
  z.object({
    type: z.literal('write'),
    path: z.string().min(1).max(1000),
    content: z.string().max(200_000),
  }),
  z.object({
    type: z.literal('engine'),
    engine: z.enum(['claude_code', 'codex']),
    prompt: z.string().min(1).max(100_000),
    /**
     * plan: describe only; read_only: look, change nothing; edit: may
     * change files in the folder. From the agent's approval mode.
     */
    permission: z.enum(['plan', 'read_only', 'edit']),
  }),
]);

export type RunnerJob = z.infer<typeof runnerJobSchema>;

/** One thing a CLI engine did, streamed back while the job runs. */
export const runnerEventSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('text'), text: z.string().max(100_000)}),
  z.object({
    type: z.literal('tool-call'),
    id: z.string().max(200),
    name: z.string().max(200),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal('tool-result'),
    id: z.string().max(200),
    output: z.unknown(),
  }),
]);

export type RunnerEvent = z.infer<typeof runnerEventSchema>;

export const runnerEventsSchema = z.object({
  events: z.array(runnerEventSchema).max(500),
});

/** How a job ended. */
export const runnerResultSchema = z.union([
  z.object({ok: z.literal(true), output: z.unknown()}),
  z.object({ok: z.literal(false), error: z.string().max(4000)}),
]);

export type RunnerResult = z.infer<typeof runnerResultSchema>;
