import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  symlink,
  writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import type {RunnerEvent} from '@binary/shared';
import {beforeAll, describe, expect, it} from 'vitest';

import {claudeEvents, codexEvents} from './engines';
import {SharedFolders} from './folders';
import {runJob} from './jobs';

let shared = '';
let outside = '';
let folders: SharedFolders;

async function run(job: Parameters<typeof runJob>[0]) {
  const events: RunnerEvent[] = [];
  const output = await runJob(job, folders, (event) => events.push(event));
  return {output, events};
}

beforeAll(async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'binary-runner-')));
  shared = join(root, 'shared');
  outside = join(root, 'outside');
  await mkdir(join(shared, 'docs'), {recursive: true});
  await mkdir(outside);
  await writeFile(join(shared, 'notes.md'), '# Notes');
  await writeFile(join(outside, 'secret.txt'), 'the password');
  // A link inside the shared folder that points outside it.
  await symlink(join(outside, 'secret.txt'), join(shared, 'link.txt'));
  folders = await SharedFolders.from([shared]);
});

describe('shared folders', () => {
  it('reads, lists and writes inside them', async () => {
    expect((await run({type: 'read', path: 'notes.md'})).output).toMatchObject({
      content: '# Notes',
    });
    const {output} = await run({type: 'list'});
    expect(Reflect.get(Object(output), 'entries')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({name: 'docs', type: 'dir'}),
        expect.objectContaining({name: 'notes.md', type: 'file'}),
      ]),
    );
    await run({type: 'write', path: 'docs/plan.md', content: 'Step 1'});
    expect(await readFile(join(shared, 'docs/plan.md'), 'utf8')).toBe('Step 1');
  });

  it('refuses anything outside them: absolute, ../ or through a link', async () => {
    await expect(
      run({type: 'read', path: join(outside, 'secret.txt')}),
    ).rejects.toThrow('outside the shared folders');
    await expect(
      run({type: 'read', path: '../outside/secret.txt'}),
    ).rejects.toThrow('outside the shared folders');
    await expect(run({type: 'read', path: 'link.txt'})).rejects.toThrow(
      'outside the shared folders',
    );
    await expect(
      run({type: 'write', path: '../outside/new.txt', content: 'x'}),
    ).rejects.toThrow('outside the shared folders');
    await expect(
      run({type: 'command', command: 'ls', folder: outside}),
    ).rejects.toThrow('outside the shared folders');
  });

  it('refuses to start without a folder that exists', async () => {
    await expect(SharedFolders.from([])).rejects.toThrow(
      'Share at least one folder',
    );
    await expect(SharedFolders.from([join(shared, 'nope')])).rejects.toThrow(
      'does not exist',
    );
  });
});

describe('commands', () => {
  it('run in the shared folder; a failing exit is a result', async () => {
    expect((await run({type: 'command', command: 'pwd'})).output).toMatchObject(
      {
        exitCode: 0,
        stdout: `${shared}\n`,
      },
    );
    expect(
      (await run({type: 'command', command: 'echo oops >&2; exit 3'})).output,
    ).toMatchObject({exitCode: 3, stderr: 'oops\n'});
  });
});

describe('reading the CLIs', () => {
  it('turns Claude Code lines into text, tool calls and results', () => {
    expect(
      claudeEvents({
        type: 'assistant',
        message: {
          content: [
            {type: 'text', text: 'Hi'},
            {type: 'tool_use', id: 't', name: 'Read', input: {file_path: 'a'}},
          ],
        },
      }),
    ).toEqual([
      {type: 'text', text: 'Hi'},
      {type: 'tool-call', id: 't', name: 'Read', input: {file_path: 'a'}},
    ]);
    expect(claudeEvents({type: 'system', subtype: 'init'})).toEqual([]);
  });

  it('turns Codex file changes into a tool call and its result', () => {
    expect(
      codexEvents({
        type: 'item.completed',
        item: {
          id: 'f',
          type: 'file_change',
          changes: [{path: 'a'}],
          status: 'completed',
        },
      }),
    ).toEqual([
      {
        type: 'tool-call',
        id: 'f',
        name: 'edit_files',
        input: {changes: [{path: 'a'}]},
      },
      {type: 'tool-result', id: 'f', output: {status: 'completed'}},
    ]);
    expect(
      codexEvents({type: 'item.completed', item: {type: 'reasoning'}}),
    ).toEqual([]);
  });
});

describe('CLI engines', () => {
  it('run Claude Code in the shared folder and stream what it does', async () => {
    const {output, events} = await run({
      type: 'engine',
      engine: 'claude_code',
      prompt: 'Look around',
      permission: 'edit',
    });

    expect(events.map((event) => event.type)).toEqual([
      'text',
      'tool-call',
      'tool-result',
      'text',
    ]);
    expect(events[1]).toMatchObject({name: 'Bash', input: {command: 'ls'}});
    const text = Reflect.get(Object(output), 'text');
    expect(text).toContain(`Done in ${shared}`);
    expect(text).toContain('--permission-mode acceptEdits');
  });

  it('reports a failed Claude Code run', async () => {
    await expect(
      run({
        type: 'engine',
        engine: 'claude_code',
        prompt: 'please fail',
        permission: 'read_only',
      }),
    ).rejects.toThrow('Claude Code could not do that.');
  });

  it('runs Codex read-only, and in plan mode asks only for a plan', async () => {
    const {output, events} = await run({
      type: 'engine',
      engine: 'codex',
      prompt: 'Look around',
      permission: 'plan',
    });

    expect(events.slice(0, 2)).toEqual([
      {type: 'tool-call', id: 'c1', name: 'shell', input: {command: 'ls'}},
      {
        type: 'tool-result',
        id: 'c1',
        output: {exitCode: 0, stdout: 'notes.md\n', stderr: ''},
      },
    ]);
    const text = String(Reflect.get(Object(output), 'text'));
    expect(text).toContain('Plan first: yes');
    expect(text).toContain('--sandbox read-only');
  });

  it('explains when the CLI is not installed', async () => {
    const saved = process.env.BINARY_CODEX_BIN;
    process.env.BINARY_CODEX_BIN = join(outside, 'no-codex-here');
    try {
      await expect(
        run({
          type: 'engine',
          engine: 'codex',
          prompt: 'hi',
          permission: 'read_only',
        }),
      ).rejects.toThrow('Is it installed and signed in on this computer?');
    } finally {
      process.env.BINARY_CODEX_BIN = saved;
    }
  });
});
