import {z} from 'zod';

/**
 * Ready-made schedules. A cron expression has five fields:
 * minute, hour, day of month, month, day of week.
 */
export const SCHEDULE_PRESETS = [
  {cron: '0 * * * *', label: 'Every hour'},
  {cron: '0 9 * * *', label: 'Every day at 9:00'},
  {cron: '0 9 * * 1-5', label: 'Weekdays at 9:00'},
  {cron: '0 9 * * 1', label: 'Mondays at 9:00'},
] as const;

/** A friendly name for a cron expression, or the expression itself. */
export function describeSchedule(cron: string): string {
  return SCHEDULE_PRESETS.find((preset) => preset.cron === cron)?.label ?? cron;
}

// Five fields of digits, *, /, - or commas. Trigger.dev checks the rest.
const CRON_PATTERN = /^[\d*/,-]+( [\d*/,-]+){4}$/;

export const routineInputSchema = z.object({
  agentId: z.uuid('Choose who runs this routine.'),
  name: z
    .string()
    .trim()
    .min(1, 'Give the routine a name.')
    .max(80, 'Keep the name under 80 characters.'),
  prompt: z
    .string()
    .trim()
    .min(1, 'Tell the agent what to do.')
    .max(4000, 'Keep the instructions under 4,000 characters.'),
  enabled: z.boolean(),
  /** A cron expression, or null for no schedule. */
  schedule: z
    .string()
    .trim()
    .regex(CRON_PATTERN, 'Use five cron fields, like "0 9 * * 1-5".')
    .nullable(),
  /** An IANA time zone for the schedule, e.g. "Asia/Kolkata". */
  timezone: z.string().trim().min(1).max(64),
  /** Whether a webhook can start the routine. */
  webhook: z.boolean(),
});

export type RoutineInput = z.infer<typeof routineInputSchema>;

export const RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

/** One run of a routine. Its thread holds the full transcript. */
export interface RoutineRun {
  id: string;
  status: RunStatus;
  error: string | null;
  threadId: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

/** A routine as the Routines pages show it. Never includes a secret. */
export interface Routine {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  agent: {id: string; name: string; avatar: string | null};
  schedule: {cron: string; timezone: string} | null;
  /** The trigger id in the webhook URL, when a webhook is on. */
  webhookId: string | null;
  lastRun: RoutineRun | null;
  createdAt: string;
}
