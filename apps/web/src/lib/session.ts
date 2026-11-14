import 'server-only';

import type {Session} from './auth-client';
import {getFromApi} from './server-api';

/** Reads the signed-in user on the server, before the page renders. */
export function getSession() {
  return getFromApi<Session>('/api/auth/get-session');
}
