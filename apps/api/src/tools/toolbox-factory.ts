import type {McpServer, McpServerRepository} from '@binary/db';
import type {ConnectedApp} from '@binary/shared';

import {AppConnectionError} from '../errors';
import type {KeyVault} from '../keys/key-vault';
import {toToolInfo, type AgentTool} from './agent-tool';
import {builtInTools} from './built-in';
import {
  connectApp,
  type AppConnection,
  type AppConnectionDetails,
  type AppConnector,
} from './mcp';
import {Toolbox} from './toolbox';

interface OpenedApp {
  app: ConnectedApp;
  connection?: AppConnection;
}

/**
 * Builds a user's Toolbox (the Factory pattern, like EngineFactory): the
 * built-in tools plus the tools of every app they connected. Apps open in
 * parallel; one that fails is skipped and marked "error", so a broken app
 * never breaks a chat.
 */
export class ToolboxFactory {
  constructor(
    private readonly servers: McpServerRepository,
    private readonly keyVault: KeyVault,
    private readonly connect: AppConnector = connectApp,
    private readonly builtIns: AgentTool[] = builtInTools(),
  ) {}

  async forUser(userId: string) {
    const saved = await this.servers.listForUser(userId);
    const opened = await Promise.all(
      saved
        .filter((server) => server.status !== 'disabled')
        .map((server) => this.open(server)),
    );
    const connections = opened.flatMap(({connection}) =>
      connection ? [connection] : [],
    );
    const appTools = connections.flatMap((connection) => connection.tools);
    return {
      toolbox: new Toolbox([...this.builtIns, ...appTools], connections),
      apps: opened.map(({app}) => app),
    };
  }

  /** Tries a new app before it is saved; throws AppConnectionError if it fails. */
  async test(details: AppConnectionDetails): Promise<AppConnection> {
    try {
      return await this.connect(details);
    } catch (error) {
      throw new AppConnectionError(details.name, error);
    }
  }

  /** The secret parts to store for an optional Authorization header. */
  encryptAuthorization(authorization?: string) {
    if (!authorization) {
      return {encryptedAuth: null, iv: null};
    }
    const {ciphertext, iv} = this.keyVault.encrypt(authorization);
    return {encryptedAuth: ciphertext, iv};
  }

  private async open(server: McpServer): Promise<OpenedApp> {
    const authorization =
      server.encryptedAuth && server.iv
        ? this.keyVault.decrypt({
            ciphertext: server.encryptedAuth,
            iv: server.iv,
          })
        : null;
    try {
      const connection = await this.connect({
        name: server.name,
        url: server.url,
        authorization,
      });
      if (server.status !== 'active') {
        await this.servers.setStatus(server.id, 'active');
      }
      return {
        app: toConnectedApp(server, connection.tools, 'active'),
        connection,
      };
    } catch (error) {
      if (server.status !== 'error') {
        await this.servers.setStatus(server.id, 'error');
      }
      const reason = new AppConnectionError(server.name, error).message;
      return {app: {...toConnectedApp(server, [], 'error'), error: reason}};
    }
  }
}

/** What the Apps page sees: never the secret Authorization header. */
export function toConnectedApp(
  server: McpServer,
  tools: AgentTool[],
  status: ConnectedApp['status'],
): ConnectedApp {
  return {
    id: server.id,
    name: server.name,
    url: server.url,
    status,
    hasAuthorization: server.encryptedAuth !== null,
    tools: tools.map(toToolInfo),
  };
}
