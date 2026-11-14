import {existsSync} from 'node:fs';

import {defineConfig} from 'drizzle-kit';

// drizzle-kit runs from this folder; the shared settings live in the repo root.
if (existsSync('../../.env')) {
  process.loadEnvFile('../../.env');
}

// drizzle-kit reads its config from the default export.
// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  // TypeScript uses camelCase (`createdAt`); Postgres gets snake_case (`created_at`).
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
