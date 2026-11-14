import {connectAppSchema} from '@binary/shared';
import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {NotFoundError, parseBody} from '../errors';
import {toConnectedApp} from '../tools/toolbox-factory';
import {isUuid} from './ids';

/** The Apps page: built-in tools, and apps connected through MCP servers. */
export function appRoutes({mcpServers, toolboxes}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  // Opens every connected app to list its tools, so the page also shows
  // which ones are reachable right now.
  routes.get('/', async (c) => {
    const {toolbox, apps} = await toolboxes.forUser(c.get('user').id);
    await toolbox.close();
    const builtIn = toolbox.list().filter((tool) => tool.source === 'Binary');
    return c.json({builtIn, apps});
  });

  // An app is only saved after Binary could connect and list its tools.
  routes.post('/', async (c) => {
    const {name, url, authorization} = await parseBody(c, connectAppSchema);
    const connection = await toolboxes.test({name, url, authorization});
    await connection.close();

    const server = await mcpServers.create({
      userId: c.get('user').id,
      name,
      url,
      ...toolboxes.encryptAuthorization(authorization),
    });
    return c.json(
      {app: toConnectedApp(server, connection.tools, 'active')},
      201,
    );
  });

  routes.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const deleted =
      isUuid(id) && (await mcpServers.delete(c.get('user').id, id));
    if (!deleted) {
      throw new NotFoundError('App');
    }
    return c.body(null, 204);
  });

  return routes;
}
