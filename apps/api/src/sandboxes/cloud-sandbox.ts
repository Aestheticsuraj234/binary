import type {
  CodeLanguage,
  CodeRunOutput,
  CommandRunOutput,
} from '@binary/shared';

import type {
  ComputerProvider,
  RemoteComputer,
} from '../computers/provider-sessions';

/** A file or folder in a sandbox. */
export interface SandboxEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
}

/**
 * One running sandbox: a small Linux machine that only this chat uses.
 * Methods throw when the sandbox can't do what was asked (a missing file,
 * a command that runs too long); the agent sees the reason.
 */
export interface CloudSandbox extends RemoteComputer {
  runCode(code: string, language: CodeLanguage): Promise<CodeRunOutput>;
  /** A non-zero exit code is a result, not an error. */
  runCommand(command: string, cwd?: string): Promise<CommandRunOutput>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  listFiles(path: string): Promise<SandboxEntry[]>;
}

/** Where sandboxes come from: E2B in the app, an in-memory fake in tests. */
export type SandboxProvider = ComputerProvider<CloudSandbox>;
