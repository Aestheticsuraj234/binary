import {defineConfig} from '@trigger.dev/sdk';

// The Trigger.dev project these tasks belong to. A project ref is not a
// secret (the secret key stays in TRIGGER_SECRET_KEY). Building your own
// copy of Binary? Replace it with your project's ref from Project settings.
export default defineConfig({
  project: 'proj_redvmhgdglygdseurohf',
  dirs: ['./src/trigger'],
  runtime: 'node',
  maxDuration: 600,
  build: {
    // Playwright (Chapter 10) loads its browser driver at run time, which a
    // bundler can't follow; the worker uses it from node_modules instead.
    external: ['playwright', 'playwright-core', 'chromium-bidi'],
  },
});
