import {Hono} from 'hono';
import {cors} from 'hono/cors';

import {requireUser, type AppEnv} from './app-env';
import {auth} from './auth';
import type {AppDependencies} from './container';
import {env} from './env';
import {playgroundRoutes} from './routes/playground';
import {providerKeyRoutes} from './routes/provider-keys';

/** Builds the API. Dependencies come in from the composition root. */
export function createApp(dependencies: AppDependencies) {
  const app = new Hono<AppEnv>();

  // The web app runs on another port, so the browser needs CORS headers.
  // `credentials: true` lets it send the session cookie with each request.
  app.use(
    '/api/*',
    cors({
      origin: env.WEB_URL,
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

  app.get('/api/me', requireUser, (c) => c.json({user: c.get('user')}));

  app.route('/api/provider-keys', providerKeyRoutes(dependencies));
  app.route('/api/playground', playgroundRoutes(dependencies));

  return app;
}
