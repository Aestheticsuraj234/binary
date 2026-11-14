// Applies every pending migration. Run with `pnpm db:migrate` from the repo root.
import {createDatabase} from './client';
import {migrateDatabase} from './migrations';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Set DATABASE_URL in the root .env file.');
}

const db = createDatabase(connectionString);
await migrateDatabase(db);
await db.$client.end();
console.log('Database migrated.');
