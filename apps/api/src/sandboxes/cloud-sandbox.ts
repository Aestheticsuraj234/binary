import type {
  CodeLanguage,
  CodeRunOutput,
  CommandRunOutput,
} from '@binary/shared';

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
export interface CloudSandbox {
  readonly id: string;
  runCode(code: string, language: CodeLanguage): Promise<CodeRunOutput>;
  /** A non-zero exit code is a result, not an error. */
  runCommand(command: string, cwd?: string): Promise<CommandRunOutput>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  listFiles(path: string): Promise<SandboxEntry[]>;
  /** Pushes the time-out back, because the chat is still using it. */
  keepAlive(): Promise<void>;
}

/**
 * Where sandboxes come from (the Strategy pattern, like JobRunner). The app
 * uses E2B; tests use a fake that keeps everything in memory.
 */
export interface SandboxProvider {
  create(labels: {userId: string; threadId: string}): Promise<CloudSandbox>;
  /** Connects to an existing sandbox; undefined if it timed out or was stopped. */
  connect(id: string): Promise<CloudSandbox | undefined>;
  /** Checks without connecting, so nothing is woken up or extended. */
  isRunning(id: string): Promise<boolean>;
  kill(id: string): Promise<void>;
}
