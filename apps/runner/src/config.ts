import {chmod, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {dirname, join} from 'node:path';

/** What pairing leaves on this computer. The token is like a password. */
export interface RunnerConfig {
  api: string;
  token: string;
  deviceId: string;
  name: string;
}

export function configPath(): string {
  return (
    process.env.BINARY_RUNNER_CONFIG ??
    join(homedir(), '.binary', 'runner.json')
  );
}

export async function loadConfig(): Promise<RunnerConfig | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(configPath(), 'utf8'));
    const value = (key: string) =>
      typeof parsed === 'object' && parsed !== null
        ? Reflect.get(parsed, key)
        : undefined;
    const [api, token, deviceId, name] = [
      'api',
      'token',
      'deviceId',
      'name',
    ].map(value);
    if (
      typeof api === 'string' &&
      typeof token === 'string' &&
      typeof deviceId === 'string' &&
      typeof name === 'string'
    ) {
      return {api, token, deviceId, name};
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Saved readable by this user only. */
export async function saveConfig(config: RunnerConfig) {
  const path = configPath();
  await mkdir(dirname(path), {recursive: true, mode: 0o700});
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, {mode: 0o600});
  await chmod(path, 0o600);
}

export async function forgetConfig() {
  await rm(configPath(), {force: true});
}
