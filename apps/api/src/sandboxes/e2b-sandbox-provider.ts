import {
  CommandExitError,
  FileType,
  Sandbox,
  SandboxNotFoundError,
  type Execution,
} from '@e2b/code-interpreter';
import type {
  CodeLanguage,
  CodeResult,
  CodeRunOutput,
  CommandRunOutput,
} from '@binary/shared';

import type {
  CloudSandbox,
  SandboxEntry,
  SandboxProvider,
} from './cloud-sandbox';

// A sandbox lives this long after its last use, then E2B shuts it down, so
// a forgotten chat never keeps a machine running (and billing) for hours.
const IDLE_TIMEOUT_MS = 10 * 60_000;
// One code run or command may take this long before it is stopped.
const RUN_TIMEOUT_MS = 2 * 60_000;
// Logs the agent and the chat see; the rest is cut.
const MAX_LOG_LENGTH = 10_000;
// Charts per run that are kept and shown.
const MAX_IMAGES = 4;

function clip(text: string): string {
  return text.length > MAX_LOG_LENGTH
    ? `${text.slice(0, MAX_LOG_LENGTH)}\n… (cut, ${text.length - MAX_LOG_LENGTH} more characters)`
    : text;
}

function toCodeOutput(execution: Execution): CodeRunOutput {
  const results: CodeResult[] = [];
  for (const result of execution.results) {
    if (result.png && results.filter((item) => item.png).length < MAX_IMAGES) {
      results.push({png: result.png});
    } else if (result.text) {
      results.push({text: clip(result.text)});
    }
  }
  const output: CodeRunOutput = {
    stdout: clip(execution.logs.stdout.join('')),
    stderr: clip(execution.logs.stderr.join('')),
    results,
  };
  if (execution.error) {
    const {name, value, traceback} = execution.error;
    output.error = {name, value, traceback: clip(traceback)};
  }
  return output;
}

class E2BSandbox implements CloudSandbox {
  constructor(private readonly sandbox: Sandbox) {}

  get id() {
    return this.sandbox.sandboxId;
  }

  async runCode(code: string, language: CodeLanguage) {
    const execution = await this.sandbox.runCode(code, {
      language,
      timeoutMs: RUN_TIMEOUT_MS,
    });
    return toCodeOutput(execution);
  }

  async runCommand(command: string, cwd?: string): Promise<CommandRunOutput> {
    try {
      const result = await this.sandbox.commands.run(command, {
        cwd,
        timeoutMs: RUN_TIMEOUT_MS,
      });
      return {
        exitCode: result.exitCode,
        stdout: clip(result.stdout),
        stderr: clip(result.stderr),
      };
    } catch (error) {
      // E2B throws for a non-zero exit; for the agent it is just a result.
      if (error instanceof CommandExitError) {
        return {
          exitCode: error.exitCode,
          stdout: clip(error.stdout),
          stderr: clip(error.stderr),
        };
      }
      throw error;
    }
  }

  async writeFile(path: string, content: string) {
    await this.sandbox.files.write(path, content);
  }

  async readFile(path: string) {
    return clip(await this.sandbox.files.read(path));
  }

  async listFiles(path: string): Promise<SandboxEntry[]> {
    const entries = await this.sandbox.files.list(path);
    return entries.map((entry) => ({
      name: entry.name,
      path: entry.path,
      type: entry.type === FileType.DIR ? 'dir' : 'file',
      size: entry.size,
    }));
  }

  async keepAlive() {
    await this.sandbox.setTimeout(IDLE_TIMEOUT_MS);
  }
}

/** Real sandboxes on E2B (e2b.dev), with the code interpreter template. */
export class E2BSandboxProvider implements SandboxProvider {
  constructor(private readonly apiKey: string) {}

  async create(labels: {userId: string; threadId: string}) {
    const sandbox = await Sandbox.create({
      apiKey: this.apiKey,
      timeoutMs: IDLE_TIMEOUT_MS,
      // Shown in the E2B dashboard, so a sandbox can be traced to its chat.
      metadata: {app: 'binary', ...labels},
    });
    return new E2BSandbox(sandbox);
  }

  async connect(id: string) {
    try {
      const sandbox = await Sandbox.connect(id, {
        apiKey: this.apiKey,
        timeoutMs: IDLE_TIMEOUT_MS,
      });
      return new E2BSandbox(sandbox);
    } catch (error) {
      if (error instanceof SandboxNotFoundError) {
        return undefined;
      }
      throw error;
    }
  }

  async isRunning(id: string) {
    try {
      const info = await Sandbox.getInfo(id, {apiKey: this.apiKey});
      return info.state === 'running';
    } catch (error) {
      if (error instanceof SandboxNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  async kill(id: string) {
    await Sandbox.kill(id, {apiKey: this.apiKey});
  }
}
