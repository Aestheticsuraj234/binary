import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';

import {defineConfig} from 'vitest/config';

// Tests talk to a real Postgres: the one in DATABASE_URL, else the one in the
// root .env (the same database `pnpm db:migrate` just migrated), else the
// docker compose default. CI sets DATABASE_URL to its service container.
// Only DATABASE_URL is read from .env, so no real key reaches a test.
function testDatabaseUrl(): string {
  const envFile = path.resolve(import.meta.dirname, '../../.env');
  const fromFile = existsSync(envFile)
    ? parseEnv(readFileSync(envFile, 'utf8')).DATABASE_URL
    : undefined;
  return (
    process.env.DATABASE_URL ??
    fromFile ??
    'postgres://binary:binary@localhost:5432/binary'
  );
}

// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: testDatabaseUrl(),
    },
  },
});
