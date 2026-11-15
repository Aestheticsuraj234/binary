import {serve} from '@hono/node-server';

import {createApp} from './app';
import {createDependencies} from './container';
import {env} from './env';

const dependencies = createDependencies();
const app = createApp(dependencies);

const server = serve({fetch: app.fetch, port: env.PORT}, (info) => {
  console.log(`Binary API running on http://localhost:${info.port}`);
});

// Close the chats' browsers (and Chromium) before the process ends.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    server.close();
    await dependencies.browsers?.closeAll().catch(console.error);
    process.exit(0);
  });
}
