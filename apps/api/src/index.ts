import {serve} from '@hono/node-server';

import {createApp} from './app';
import {createDependencies} from './container';
import {env} from './env';

const app = createApp(createDependencies());

serve({fetch: app.fetch, port: env.PORT}, (info) => {
  console.log(`Binary API running on http://localhost:${info.port}`);
});
