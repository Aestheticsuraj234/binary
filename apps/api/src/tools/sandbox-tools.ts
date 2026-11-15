import {CODE_LANGUAGES} from '@binary/shared';
import {tool} from 'ai';
import {z} from 'zod';

import type {ChatSandbox} from '../sandboxes/sandbox-sessions';
import type {AgentTool} from './agent-tool';
import {withoutImages} from './model-view';

const SOURCE = 'Sandbox';
const HOME = '/home/user';

const NO_SANDBOX = {
  error:
    'This chat has no sandbox running yet. Use run_code, run_command or write_file first.',
} as const;

/**
 * Tools that work in the chat's cloud sandbox. Running code, running
 * commands and writing files control a computer, so they ask first in every
 * approval mode; reading and listing files only look, and never start a
 * sandbox.
 */
export function sandboxTools(sandbox: ChatSandbox): AgentTool[] {
  return [
    {
      name: 'run_code',
      description: 'Run Python or JavaScript in the cloud sandbox.',
      risk: 'computer',
      source: SOURCE,
      forModel: withoutImages,
      tool: tool({
        description: `Run Python or JavaScript in this chat's private cloud sandbox (Linux, files in ${HOME}). Variables and imports are kept between runs. Python has pandas, numpy and matplotlib; a chart you plot is shown to the user. Install more with run_command.`,
        inputSchema: z.object({
          language: z.enum(CODE_LANGUAGES).default('python'),
          code: z.string().min(1).describe('The code to run.'),
        }),
        execute: async ({language, code}) => {
          const {sandbox: opened, replaced} = await sandbox.open();
          const output = await opened.runCode(code, language);
          return replaced ? {...output, newSandbox: true} : output;
        },
      }),
    },
    {
      name: 'run_command',
      description: 'Run a shell command in the cloud sandbox.',
      risk: 'computer',
      source: SOURCE,
      tool: tool({
        description: `Run a shell command in this chat's private cloud sandbox, for example to install a package (pip install …) or use git. Runs in ${HOME} unless you give a folder. Stops after 2 minutes.`,
        inputSchema: z.object({
          command: z.string().min(1).describe('The command, e.g. "ls -la".'),
          cwd: z.string().optional().describe(`The folder. Default ${HOME}.`),
        }),
        execute: async ({command, cwd}) => {
          const {sandbox: opened, replaced} = await sandbox.open();
          const output = await opened.runCommand(command, cwd);
          return replaced ? {...output, newSandbox: true} : output;
        },
      }),
    },
    {
      name: 'write_file',
      description: 'Create or replace a file in the cloud sandbox.',
      risk: 'computer',
      source: SOURCE,
      tool: tool({
        description: `Create or replace a text file in this chat's cloud sandbox. Relative paths are inside ${HOME}.`,
        inputSchema: z.object({
          path: z.string().min(1).describe('e.g. "data/notes.md"'),
          content: z.string(),
        }),
        execute: async ({path, content}) => {
          const {sandbox: opened, replaced} = await sandbox.open();
          await opened.writeFile(path, content);
          return {
            written: path,
            bytes: Buffer.byteLength(content),
            ...(replaced ? {newSandbox: true} : {}),
          };
        },
      }),
    },
    {
      name: 'read_file',
      description: 'Read a text file in the cloud sandbox.',
      risk: 'read',
      source: SOURCE,
      tool: tool({
        description: `Read a text file from this chat's cloud sandbox (first 10,000 characters). Relative paths are inside ${HOME}.`,
        inputSchema: z.object({path: z.string().min(1)}),
        execute: async ({path}) => {
          const opened = await sandbox.existing();
          return opened
            ? {path, content: await opened.readFile(path)}
            : NO_SANDBOX;
        },
      }),
    },
    {
      name: 'list_files',
      description: 'List the files in a folder of the cloud sandbox.',
      risk: 'read',
      source: SOURCE,
      tool: tool({
        description: `List the files and folders in a folder of this chat's cloud sandbox. Default ${HOME}.`,
        inputSchema: z.object({
          path: z.string().default(HOME),
        }),
        execute: async ({path}) => {
          const opened = await sandbox.existing();
          return opened
            ? {path, entries: await opened.listFiles(path)}
            : NO_SANDBOX;
        },
      }),
    },
  ];
}
