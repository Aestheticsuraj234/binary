import {randomUUID} from 'node:crypto';

import type {CodeLanguage, CodeRunOutput} from '@binary/shared';

import type {
  CloudSandbox,
  SandboxEntry,
  SandboxProvider,
} from './cloud-sandbox';

// A 1×1 PNG: what the fake returns as a "chart".
export const FAKE_CHART_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

/**
 * A sandbox that lives in memory, for tests and offline checks. It does not
 * run anything; it follows a few simple rules so tests can tell what
 * happened:
 *
 * - code: every `print("…")` becomes a line of stdout; `raise` gives an
 *   error; `plt.` gives a chart.
 * - commands: `echo …` prints the rest; `exit N` exits with N.
 * - files are kept until the sandbox is killed.
 */
class FakeSandbox implements CloudSandbox {
  readonly files = new Map<string, string>();
  readonly ran: string[] = [];

  constructor(readonly id: string) {}

  async runCode(code: string, language: CodeLanguage) {
    this.ran.push(`${language}: ${code}`);
    const printed = [...code.matchAll(/print\(["'](.*?)["']\)/g)].map(
      (match) => `${match[1]}\n`,
    );
    const output: CodeRunOutput = {
      stdout: printed.join(''),
      stderr: '',
      results: code.includes('plt.') ? [{png: FAKE_CHART_PNG}] : [],
    };
    if (code.includes('raise')) {
      output.error = {
        name: 'ValueError',
        value: 'something went wrong',
        traceback: 'Traceback (most recent call last):\nValueError',
      };
    }
    return output;
  }

  async runCommand(command: string) {
    this.ran.push(`$ ${command}`);
    const exit = /^exit (\d+)$/.exec(command);
    if (exit) {
      return {exitCode: Number(exit[1]), stdout: '', stderr: 'exited'};
    }
    const echo = /^echo (.*)$/.exec(command);
    return {exitCode: 0, stdout: echo ? `${echo[1]}\n` : '', stderr: ''};
  }

  async writeFile(path: string, content: string) {
    this.files.set(path, content);
  }

  async readFile(path: string) {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`No file at ${path}.`);
    }
    return content;
  }

  async listFiles(path: string): Promise<SandboxEntry[]> {
    const prefix = path.endsWith('/') ? path : `${path}/`;
    return [...this.files.entries()]
      .filter(([filePath]) => filePath.startsWith(prefix))
      .map(([filePath, content]) => ({
        name: filePath.slice(prefix.length),
        path: filePath,
        type: 'file',
        size: content.length,
      }));
  }

  async keepAlive() {}
}

export class FakeSandboxProvider implements SandboxProvider {
  readonly sandboxes = new Map<string, FakeSandbox>();
  created = 0;

  async create() {
    this.created += 1;
    const sandbox = new FakeSandbox(`fake-${randomUUID()}`);
    this.sandboxes.set(sandbox.id, sandbox);
    return sandbox;
  }

  async connect(id: string) {
    return this.sandboxes.get(id);
  }

  async isRunning(id: string) {
    return this.sandboxes.has(id);
  }

  async kill(id: string) {
    this.sandboxes.delete(id);
  }

  /** What the sandbox ran, for tests; empty if it is gone. */
  ranIn(id: string): string[] {
    return this.sandboxes.get(id)?.ran ?? [];
  }
}
