import {hostname, platform, release} from 'node:os';

import {RUNNER_VERSION} from '@binary/shared';

import {pair, RunnerAuthError, RunnerClient} from './client';
import {configPath, forgetConfig, loadConfig, saveConfig} from './config';
import {SharedFolders} from './folders';
import {runLoop} from './runner';

const HELP = `Binary Runner: lets your characters work on this computer.

  pnpm runner pair <CODE> [--api http://localhost:4000]
      Pair with the code from "Your computers" in Binary.
  pnpm runner start --folder <path> [--folder <path>…]
      Start working, only inside the folders you name.
  pnpm runner status     Show what this computer is paired with.
  pnpm runner forget     Unpair (delete the saved token).
`;

function osName() {
  const names: Record<string, string> = {
    darwin: 'macOS',
    win32: 'Windows',
    linux: 'Linux',
  };
  return `${names[platform()] ?? platform()} ${release()}`.slice(0, 60);
}

function option(args: string[], name: string): string[] {
  return args.flatMap((arg, index) =>
    arg === name && args[index + 1] ? [args[index + 1] ?? ''] : [],
  );
}

async function main(args: string[]) {
  const [command, ...rest] = args;
  const log = {
    info: (message: string) => console.log(message),
    error: (message: string) => console.error(message),
  };

  if (command === 'pair') {
    const code = rest.find(
      (arg) => !arg.startsWith('--') && !option(rest, '--api').includes(arg),
    );
    if (!code) {
      throw new Error('Give the pairing code: pnpm runner pair ABCD-1234');
    }
    const api = (
      option(rest, '--api')[0] ??
      process.env.BINARY_API_URL ??
      'http://localhost:4000'
    ).replace(/\/$/, '');
    const paired = await pair(api, code, osName());
    await saveConfig({api, ...paired});
    log.info(`Paired as "${paired.name}". Saved to ${configPath()}.`);
    log.info('Start it with: pnpm runner start --folder <a folder to share>');
    return;
  }

  if (command === 'start') {
    const config = await loadConfig();
    if (!config) {
      throw new Error('Not paired yet. Run: pnpm runner pair <CODE>');
    }
    const folders = await SharedFolders.from(option(rest, '--folder'));
    const controller = new AbortController();
    process.once('SIGINT', () => {
      log.info(
        '\nStopping. Your characters can no longer reach this computer.',
      );
      controller.abort();
      process.exit(0);
    });
    log.info(`"${config.name}" → ${config.api}. Press Ctrl+C to stop.`);
    await runLoop(
      new RunnerClient(config.api, config.token),
      folders,
      {version: RUNNER_VERSION, os: osName()},
      log,
      controller.signal,
    );
    return;
  }

  if (command === 'status') {
    const config = await loadConfig();
    log.info(
      config
        ? `Paired as "${config.name}" with ${config.api} (${hostname()}).`
        : 'Not paired.',
    );
    return;
  }

  if (command === 'forget') {
    await forgetConfig();
    log.info('Forgot this pairing. Remove the computer in Binary too.');
    return;
  }

  log.info(HELP);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  if (error instanceof RunnerAuthError) {
    console.error(`${error.message}`);
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exit(1);
});
