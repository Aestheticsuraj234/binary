import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';

import type {RunnerEvent, RunnerJob} from '@binary/shared';

type EngineJob = Extract<RunnerJob, {type: 'engine'}>;

/** The CLI to run, from PATH; tests point these at fake ones. */
function binaryFor(engine: EngineJob['engine']): string {
  return engine === 'claude_code'
    ? (process.env.BINARY_CLAUDE_BIN ?? 'claude')
    : (process.env.BINARY_CODEX_BIN ?? 'codex');
}

/** Reads a field of an unknown JSON object. */
function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? Reflect.get(value, key)
    : undefined;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * One line of `claude -p --output-format stream-json`, as Binary events:
 * the assistant's text and tool uses, and the results that come back.
 */
export function claudeEvents(line: unknown): RunnerEvent[] {
  const type = field(line, 'type');
  const content = list(field(field(line, 'message'), 'content'));
  if (type === 'assistant') {
    return content.flatMap((part): RunnerEvent[] => {
      if (field(part, 'type') === 'text') {
        return [{type: 'text', text: String(field(part, 'text') ?? '')}];
      }
      if (field(part, 'type') === 'tool_use') {
        return [
          {
            type: 'tool-call',
            id: String(field(part, 'id') ?? ''),
            name: String(field(part, 'name') ?? 'tool'),
            input: field(part, 'input') ?? {},
          },
        ];
      }
      return [];
    });
  }
  if (type === 'user') {
    return content.flatMap((part): RunnerEvent[] =>
      field(part, 'type') === 'tool_result'
        ? [
            {
              type: 'tool-result',
              id: String(field(part, 'tool_use_id') ?? ''),
              output: {content: field(part, 'content') ?? ''},
            },
          ]
        : [],
    );
  }
  return [];
}

/**
 * One line of `codex exec --json`, as Binary events: messages, commands
 * and file changes (each a tool call and its result).
 */
export function codexEvents(line: unknown): RunnerEvent[] {
  const type = field(line, 'type');
  const item = field(line, 'item');
  const itemType = field(item, 'type');
  const id = String(field(item, 'id') ?? '');
  if (type === 'item.completed' && itemType === 'agent_message') {
    return [{type: 'text', text: String(field(item, 'text') ?? '')}];
  }
  if (type === 'item.started' && itemType === 'command_execution') {
    return [
      {
        type: 'tool-call',
        id,
        name: 'shell',
        input: {command: field(item, 'command')},
      },
    ];
  }
  if (type === 'item.completed' && itemType === 'command_execution') {
    return [
      {
        type: 'tool-result',
        id,
        output: {
          exitCode: field(item, 'exit_code'),
          stdout: String(field(item, 'aggregated_output') ?? ''),
          stderr: '',
        },
      },
    ];
  }
  if (type === 'item.completed' && itemType === 'file_change') {
    return [
      {
        type: 'tool-call',
        id,
        name: 'edit_files',
        input: {changes: field(item, 'changes')},
      },
      {type: 'tool-result', id, output: {status: field(item, 'status')}},
    ];
  }
  return [];
}

/** The CLI's arguments for a permission, and how to read its output. */
function command(job: EngineJob) {
  if (job.engine === 'claude_code') {
    const mode = {plan: 'plan', read_only: 'default', edit: 'acceptEdits'}[
      job.permission
    ];
    return {
      args: [
        '-p',
        '--output-format',
        'stream-json',
        '--verbose',
        '--permission-mode',
        mode,
      ],
      prompt: job.prompt,
      parse: claudeEvents,
    };
  }
  const sandbox = job.permission === 'edit' ? 'workspace-write' : 'read-only';
  return {
    args: [
      'exec',
      '--json',
      '--skip-git-repo-check',
      '--sandbox',
      sandbox,
      '-',
    ],
    prompt:
      job.permission === 'plan'
        ? `Only describe what you would do, step by step. Do not run or change anything.\n\n${job.prompt}`
        : job.prompt,
    parse: codexEvents,
  };
}

/**
 * Runs Claude Code or Codex in the first shared folder, with the prompt on
 * standard input, and streams what it does as events. Resolves with its
 * final text; rejects if the CLI is missing or fails.
 */
export function runEngine(
  job: EngineJob,
  cwd: string,
  onEvent: (event: RunnerEvent) => void,
): Promise<{text: string}> {
  const {args, prompt, parse} = command(job);
  const binary = binaryFor(job.engine);
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {cwd, stdio: ['pipe', 'pipe', 'pipe']});
    let text = '';
    let failure = '';
    let stderr = '';
    createInterface({input: child.stdout}).on('line', (line) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        return;
      }
      // Claude's last line says whether the whole run worked.
      if (
        field(parsed, 'type') === 'result' &&
        field(parsed, 'is_error') === true
      ) {
        failure = String(field(parsed, 'result') ?? 'Claude Code failed.');
      }
      if (
        field(parsed, 'type') === 'turn.failed' ||
        field(parsed, 'type') === 'error'
      ) {
        failure = String(
          field(field(parsed, 'error'), 'message') ??
            field(parsed, 'message') ??
            'Codex failed.',
        );
      }
      for (const event of parse(parsed)) {
        if (event.type === 'text') {
          text += event.text;
        }
        onEvent(event);
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      reject(
        new Error(
          `Could not start ${binary} (${error.message}). Is it installed and signed in on this computer?`,
          {cause: error},
        ),
      );
    });
    child.on('close', (code) => {
      if (failure || code !== 0) {
        reject(
          new Error(
            failure ||
              stderr.trim().slice(-1000) ||
              `${binary} exited with ${code}.`,
          ),
        );
      } else {
        resolve({text});
      }
    });
    child.stdin.end(prompt);
  });
}
