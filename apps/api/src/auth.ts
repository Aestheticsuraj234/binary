import {expo} from '@better-auth/expo';
import {schema} from '@binary/db';
import {APP_SCHEME} from '@binary/shared';
import {betterAuth} from 'better-auth';
import {drizzleAdapter} from 'better-auth/adapters/drizzle';

import {db} from './db';
import {env} from './env';

// While developing, Expo Go opens the app through `exp://<your-ip>:<port>`.
// Those addresses change per network, so they are trusted only in development.
const EXPO_DEV_ORIGINS = ['exp://', 'exp://**'];

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  // Better Auth reads and writes the users, sessions, accounts and
  // verifications tables defined in packages/db through Drizzle.
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema: {
      users: schema.users,
      sessions: schema.sessions,
      accounts: schema.accounts,
      verifications: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  trustedOrigins: [
    env.WEB_URL,
    `${APP_SCHEME}://`,
    ...(process.env.NODE_ENV === 'production' ? [] : EXPO_DEV_ORIGINS),
  ],
  // Lets the mobile app keep its session in the phone's secure storage.
  plugins: [expo()],
});

export type Session = typeof auth.$Infer.Session;
