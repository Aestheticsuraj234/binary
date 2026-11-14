import {Hono} from 'hono';
import {cors} from 'hono/cors';

import {auth, type Session} from './auth';
import {env} from './env';

interface AppEnv {
  Variables: {
    session: Session | null;
  };
}

export const app = new Hono<AppEnv>();

// The web app runs on another port, so the browser needs CORS headers.
// `credentials: true` lets it send the session cookie with each request.
app.use(
  '/api/*',
  cors({
    origin: env.WEB_URL,
    credentials: true,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  }),
);

// Better Auth handles sign-up, sign-in, sign-out and sessions.
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// Every other API route can read the signed-in user from the context.
app.use('/api/*', async (c, next) => {
  const session = await auth.api.getSession({headers: c.req.raw.headers});
  c.set('session', session);
  await next();
});

app.get('/health', (c) => c.json({status: 'ok'}));

app.get('/api/me', (c) => {
  const session = c.get('session');
  if (!session) {
    return c.json({error: 'Not signed in.'}, 401);
  }
  return c.json({user: session.user});
});
