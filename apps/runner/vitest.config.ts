import {defineConfig} from 'vitest/config';

// Vitest reads its config from the default export.
// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  test: {
    // The engine tests run fake CLIs (small Node scripts) instead of the
    // real Claude Code and Codex.
    env: {
      BINARY_CLAUDE_BIN: new URL('./test/fake-claude.mjs', import.meta.url)
        .pathname,
      BINARY_CODEX_BIN: new URL('./test/fake-codex.mjs', import.meta.url)
        .pathname,
    },
  },
});
