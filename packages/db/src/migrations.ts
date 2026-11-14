import path from 'node:path';

import {migrate} from 'drizzle-orm/node-postgres/migrator';

import type {Database} from './client';

const MIGRATIONS_FOLDER = path.resolve(import.meta.dirname, '../drizzle');

/** Applies every pending SQL migration from packages/db/drizzle, in order. */
export async function migrateDatabase(db: Database) {
  await migrate(db, {migrationsFolder: MIGRATIONS_FOLDER});
}
