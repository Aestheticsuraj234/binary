import type {RunnerJob} from '@binary/shared';
import {tool} from 'ai';
import {z} from 'zod';

import type {YourComputers} from '../runner/your-computers';
import type {AgentTool} from './agent-tool';

const SOURCE = 'Your computer';
const COMMAND_TIMEOUT_MS = 3 * 60_000;
const FILE_TIMEOUT_MS = 30_000;

/**
 * Tools that work on the user's own computer through the Runner, only
 * inside the folders they shared. Reading and listing only look; running a
 * command or writing a file can change anything in those folders, so they
 * ask first in every approval mode.
 *
 * `about` names the computer and its folders for the model, when it is
 * online; the Runner checks every path itself either way.
 */
export function runnerTools(
  computers: YourComputers,
  userId: string,
  about?: {name: string; folders: string[]},
): AgentTool[] {
  const where = about
    ? `the user's computer "${about.name}". Shared folders: ${about.folders.join(', ') || '(none yet)'}. Relative paths start in the first one`
    : "the user's computer (through the Runner)";
  const run = (job: RunnerJob, timeoutMs: number) =>
    computers.run(userId, job, {timeoutMs});

  return [
    {
      name: 'computer_run_command',
      description: "Run a shell command on the user's computer.",
      risk: 'computer',
      source: SOURCE,
      tool: tool({
        description: `Run a shell command on ${where}. It runs in a shared folder and stops after 2 minutes.`,
        inputSchema: z.object({
          command: z.string().min(1).max(4000),
          folder: z
            .string()
            .optional()
            .describe(
              'A shared folder (or one inside it). Default: the first.',
            ),
        }),
        execute: ({command, folder}) =>
          run({type: 'command', command, folder}, COMMAND_TIMEOUT_MS),
      }),
    },
    {
      name: 'computer_read_file',
      description: "Read a text file on the user's computer.",
      risk: 'read',
      source: SOURCE,
      tool: tool({
        description: `Read a text file on ${where}. First 10,000 characters.`,
        inputSchema: z.object({path: z.string().min(1).max(1000)}),
        execute: ({path}) => run({type: 'read', path}, FILE_TIMEOUT_MS),
      }),
    },
    {
      name: 'computer_list_files',
      description: "List a folder on the user's computer.",
      risk: 'read',
      source: SOURCE,
      tool: tool({
        description: `List the files and folders in a folder on ${where}.`,
        inputSchema: z.object({path: z.string().max(1000).optional()}),
        execute: ({path}) => run({type: 'list', path}, FILE_TIMEOUT_MS),
      }),
    },
    {
      name: 'computer_write_file',
      description: "Create or replace a file on the user's computer.",
      risk: 'computer',
      source: SOURCE,
      tool: tool({
        description: `Create or replace a text file on ${where}.`,
        inputSchema: z.object({
          path: z.string().min(1).max(1000),
          content: z.string().max(200_000),
        }),
        execute: ({path, content}) =>
          run({type: 'write', path, content}, FILE_TIMEOUT_MS),
      }),
    },
  ];
}
