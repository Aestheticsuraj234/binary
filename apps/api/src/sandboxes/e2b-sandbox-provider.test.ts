import {describe, expect, it} from 'vitest';

import {E2BSandboxProvider} from './e2b-sandbox-provider';

const apiKey = process.env.E2B_API_KEY;

/**
 * Runs against real E2B, so it only runs when E2B_API_KEY is set:
 *
 *   E2B_API_KEY=e2b_… pnpm --filter @binary/api test e2b
 *
 * It starts one sandbox (a few cents at most) and always kills it.
 */
describe.skipIf(!apiKey)('E2BSandboxProvider (real E2B)', () => {
  const provider = new E2BSandboxProvider(apiKey ?? '');

  it(
    'runs code, commands and files, then stops',
    {timeout: 120_000},
    async () => {
      const sandbox = await provider.create({userId: 'test', threadId: 'test'});
      try {
        const hello = await sandbox.runCode('x = 21\nprint(x * 2)', 'python');
        expect(hello).toMatchObject({stdout: '42\n', results: []});

        // Variables are kept between runs.
        const again = await sandbox.runCode('x + 1', 'python');
        expect(again.results).toEqual([{text: '22'}]);

        const chart = await sandbox.runCode(
          'import matplotlib.pyplot as plt\nplt.plot([1, 2, 3])\nplt.show()',
          'python',
        );
        expect(chart.results.some((result) => result.png)).toBe(true);

        const failed = await sandbox.runCode('1 / 0', 'python');
        expect(failed.error?.name).toBe('ZeroDivisionError');

        const command = await sandbox.runCommand('echo hi && exit 3');
        expect(command).toMatchObject({exitCode: 3, stdout: 'hi\n'});

        await sandbox.writeFile('notes/a.md', '# A');
        expect(await sandbox.readFile('notes/a.md')).toBe('# A');
        const [entry] = await sandbox.listFiles('notes');
        expect(entry).toMatchObject({name: 'a.md', type: 'file', size: 3});

        // Found again by id, as the next message in a chat would.
        const same = await provider.connect(sandbox.id);
        expect(await same?.readFile('notes/a.md')).toBe('# A');
        expect(await provider.isRunning(sandbox.id)).toBe(true);
      } finally {
        await provider.kill(sandbox.id);
      }

      expect(await provider.isRunning(sandbox.id)).toBe(false);
      expect(await provider.connect(sandbox.id)).toBeUndefined();
    },
  );
});
