import {defineConfig} from 'vitest/config';

// Tests run against a real Postgres with pgvector (docker compose locally,
// a service container in CI). DATABASE_URL can override the default.
// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  test: {
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgres://binary:binary@localhost:5432/binary',
    },
  },
});
