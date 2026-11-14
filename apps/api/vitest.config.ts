import {defineConfig} from 'vitest/config';

// Tests talk to a real Postgres. Locally that is the one from docker compose;
// in CI it is a service container. DATABASE_URL can override the default.
// Vitest reads its config from the default export.
// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  test: {
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgres://binary:binary@localhost:5432/binary',
      BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters-long',
      BETTER_AUTH_URL: 'http://localhost:4000',
      WEB_URL: 'http://localhost:3000',
    },
  },
});
