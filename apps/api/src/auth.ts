import {expo} from '@better-auth/expo';
import {APP_SCHEME} from '@binary/shared';
import {betterAuth} from 'better-auth';

import {pool} from './db';
import {env} from './env';

// While developing, Expo Go opens the app through `exp://<your-ip>:<port>`.
// Those addresses change per network, so they are trusted only in development.
const EXPO_DEV_ORIGINS = ['exp://', 'exp://**'];

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: pool,
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
