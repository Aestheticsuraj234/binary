import pg from 'pg';

import {env} from './env';

/** One shared connection pool for the whole API. */
export const pool = new pg.Pool({connectionString: env.DATABASE_URL});
