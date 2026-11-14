import {createMiddleware} from 'hono/factory';

import type {Session} from './auth';

/** Values every request can read with `c.get(...)`. */
export interface AppEnv {
  Variables: {
    session: Session | null;
    /** Set by requireUser, so it exists on every protected route. */
    user: Session['user'];
  };
}

/** Stops the request with 401 unless someone is signed in. */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const session = c.get('session');
  if (!session) {
    return c.json({error: 'Not signed in.'}, 401);
  }
  c.set('user', session.user);
  await next();
});
