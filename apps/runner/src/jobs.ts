import {spawn} from 'node:child_process';
import {readdir, readFile, stat, writeFile} from 'node:fs/promises';
import {platform} from 'node:os';
import {join} from 'node:path';

import type {RunnerEvent, RunnerJob} from '@binary/shared';

import {runEngine} from './engines';
import type {SharedFolders} from './folders';

const COMMAND_TIMEOUT_MS = 2 * 60_000;
// Output the agent sees; the rest is cut.
const MAX_OUTPUT = 10_000;
const MAX_ENTRIES = 200;

function clip(text: string): string {
  return text.length > MAX_OUTPUT
    ? `${text.slice(0, MAX_OUTPUT)}\n… (cut, ${text.length - MAX_OUTPUT} more characters)`
    : text;
}

/** Runs a shell command in a shared folder. A non-zero exit is a result. */
export function runCommand(
  command: string,
  cwd: string,
  timeoutMs = COMMAND_TIMEOUT_MS,
): Promise<{exitCode: number; stdout: string; stderr: string}> {
  const [shell, flag] =
    platform() === 'win32' ? ['cmd.exe', '/c'] : ['/bin/sh', '-c'];
  return new Promise((resolve, reject) => {
    const child = spawn(shell, [flag, command], {cwd});
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      stderr += `\nStopped after ${timeoutMs / 1000} seconds.`;
    }, timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? -1,
        stdout: clip(stdout),
        stderr: clip(stderr),
      });
    });
  });
}

/**
 * Does one job on this computer, inside the shared folders. Throws with a
 * message for the agent when it can't (a path outside them, a missing file).
 */
export async function runJob(
  job: RunnerJob,
  folders: SharedFolders,
  onEvent: (event: RunnerEvent) => void,
): Promise<unknown> {
  switch (job.type) {
    case 'command': {
      const cwd = job.folder
        ? await folders.existing(job.folder)
        : folders.home;
      if (!(await stat(cwd)).isDirectory()) {
        throw new Error(`${job.folder} is not a folder.`);
      }
      return runCommand(job.command, cwd);
    }
    case 'read': {
      const path = await folders.existing(job.path);
      return {path, content: clip(await readFile(path, 'utf8'))};
    }
    case 'list': {
      const path = await folders.existing(job.path ?? folders.home);
      const entries = await readdir(path, {withFileTypes: true});
      return {
        path,
        entries: entries.slice(0, MAX_ENTRIES).map((entry) => ({
          name: entry.name,
          path: join(path, entry.name),
          type: entry.isDirectory() ? 'dir' : 'file',
        })),
        ...(entries.length > MAX_ENTRIES
          ? {more: entries.length - MAX_ENTRIES}
          : {}),
      };
    }
    case 'write': {
      const path = await folders.writable(job.path);
      await writeFile(path, job.content);
      return {written: path, bytes: Buffer.byteLength(job.content)};
    }
    case 'engine':
      return runEngine(job, folders.home, onEvent);
  }
}
