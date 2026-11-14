import {createDatabase} from '@binary/db';

import {env} from './env';

/** One shared database connection for the whole API. */
export const db = createDatabase(env.DATABASE_URL);
