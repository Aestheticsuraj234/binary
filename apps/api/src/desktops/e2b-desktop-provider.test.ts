import {describe, expect, it} from 'vitest';

import {E2BDesktopProvider} from './e2b-desktop-provider';

const apiKey = process.env.E2B_API_KEY;

/**
 * Runs against real E2B, so it only runs when E2B_API_KEY is set:
 *
 *   E2B_API_KEY=e2b_… pnpm --filter @binary/api exec vitest run src/desktops
 *
 * It starts one desktop (a few cents at most) and always kills it.
 */
describe.skipIf(!apiKey)('E2BDesktopProvider (real E2B)', () => {
  const provider = new E2BDesktopProvider(apiKey ?? '');

  it(
    'shows the screen, clicks and types, can be watched, then stops',
    {timeout: 180_000},
    async () => {
      const desktop = await provider.create({userId: 'test', threadId: 'test'});
      try {
        const screen = await desktop.screen();
        expect(screen).toMatchObject({width: 1024, height: 768});
        // A PNG.
        expect(
          Buffer.from(screen.screenshot, 'base64').subarray(1, 4).toString(),
        ).toBe('PNG');

        await desktop.click(512, 384, {button: 'left', double: false});
        await desktop.press(['ctrl', 'a']);
        await desktop.type('hello');

        expect(provider.watchUrl(desktop.id)).toMatch(/^https:\/\//);
        const same = await provider.connect(desktop.id);
        expect((await same?.screen())?.width).toBe(1024);
      } finally {
        await provider.kill(desktop.id);
      }
      expect(await provider.isRunning(desktop.id)).toBe(false);
      expect(provider.watchUrl(desktop.id)).toBeUndefined();
    },
  );
});
