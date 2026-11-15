import {Hono} from 'hono';
import {cors} from 'hono/cors';

import {requireUser, type AppEnv} from './app-env';
import {auth} from './auth';
import type {AppDependencies} from './container';
import {env} from './env';
import {AppError} from './errors';
import {agentTemplateRoutes} from './routes/agent-templates';
import {approvalRoutes, todayRoutes} from './routes/approvals';
import {appRoutes} from './routes/apps';
import {hookRoutes} from './routes/hooks';
import {agentRoutes} from './routes/agents';
import {playgroundRoutes} from './routes/playground';
import {providerKeyRoutes} from './routes/provider-keys';
import {routineRoutes} from './routes/routines';
import {sandboxRoutes} from './routes/sandboxes';
import {threadRoutes} from './routes/threads';

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

  // Routes throw AppErrors for problems the user can fix; anything else is a
  // bug, logged here and hidden behind a plain message.
  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json({error: error.message}, error.status);
    }
    console.error(error);
    return c.json({error: 'Something went wrong on the server.'}, 500);
  });

  app.get('/health', (c) => c.json({status: 'ok'}));

  app.get('/api/me', requireUser, (c) => c.json({user: c.get('user')}));

  app.route('/api/provider-keys', providerKeyRoutes(dependencies));
  app.route('/api/playground', playgroundRoutes(dependencies));
  app.route('/api/agents', agentRoutes(dependencies));
  app.route('/api/agent-templates', agentTemplateRoutes(dependencies));
  app.route('/api/threads', threadRoutes(dependencies));
  app.route('/api/apps', appRoutes(dependencies));
  app.route('/api/routines', routineRoutes(dependencies));
  app.route('/api/hooks', hookRoutes(dependencies));
  app.route('/api/approvals', approvalRoutes(dependencies));
  app.route('/api/today', todayRoutes(dependencies));
  app.route('/api/sandboxes', sandboxRoutes(dependencies));

  return app;
}
