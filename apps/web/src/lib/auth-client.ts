import {createAuthClient} from 'better-auth/react';

import {API_URL} from './env';

/** Talks to the Better Auth routes on the Binary API from the browser. */
export const authClient = createAuthClient({
  baseURL: API_URL,
});

export type Session = typeof authClient.$Infer.Session;
