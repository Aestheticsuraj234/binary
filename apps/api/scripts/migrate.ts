// Creates (or updates) the tables Better Auth needs: user, session, account
// and verification. Run it with `pnpm setup` or `pnpm --filter @binary/api db:migrate`.
import {getMigrations} from 'better-auth/db/migration';

import {auth} from '../src/auth';
import {pool} from '../src/db';

const {toBeCreated, toBeAdded, runMigrations} = await getMigrations(
  auth.options,
);

if (toBeCreated.length === 0 && toBeAdded.length === 0) {
  console.log('Database is already up to date.');
} else {
  await runMigrations();
  console.log('Database migrated.');
}

await pool.end();
