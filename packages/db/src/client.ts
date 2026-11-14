import {drizzle} from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema';

/**
 * Opens a connection pool and wraps it in Drizzle.
 * Call it once per process (the API, a script, a test) and share the result.
 */
export function createDatabase(connectionString: string) {
  const pool = new pg.Pool({connectionString});
  return drizzle({client: pool, schema, casing: 'snake_case'});
}

export type Database = ReturnType<typeof createDatabase>;
