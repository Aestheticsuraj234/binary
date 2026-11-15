import type {McpServer, McpServerRepository} from '@binary/db';
import type {ComputerKind, ConnectedApp, ToolInfo} from '@binary/shared';

import {AppConnectionError} from '../errors';
import type {KeyVault} from '../keys/key-vault';
import type {SandboxSessions} from '../sandboxes/sandbox-sessions';
import {toToolInfo, type AgentTool} from './agent-tool';
import {builtInTools} from './built-in';
import {
  connectApp,
  type AppConnection,
  type AppConnectionDetails,
  type AppConnector,
} from './mcp';
import {sandboxTools} from './sandbox-tools';
import {Toolbox} from './toolbox';

/** Which chat the tools are for, and the computer its agent uses. */
export interface ToolScope {
  threadId: string;
  computer: ComputerKind | null;
}

interface OpenedApp {
  app: ConnectedApp;
  connection?: AppConnection;
}

/**
 * Builds a user's Toolbox (the Factory pattern, like EngineFactory): the
 * built-in tools, the tools of every app they connected, and, for an agent
 * with a cloud sandbox, the sandbox tools of that chat. Apps open in
 * parallel; one that fails is skipped and marked "error", so a broken app
 * never breaks a chat.
 *
 * `sandboxes` is undefined when E2B is not set up; agents then simply have
 * no sandbox tools.
 */
export class ToolboxFactory {
  constructor(
    private readonly servers: McpServerRepository,
    private readonly keyVault: KeyVault,
    private readonly connect: AppConnector = connectApp,
    private readonly sandboxes?: SandboxSessions,
    private readonly builtIns: AgentTool[] = builtInTools(),
  ) {}

  /** Whether agents can be given a cloud sandbox (E2B is set up). */
  get sandboxesAvailable() {
    return this.sandboxes !== undefined;
  }

  /** The sandbox tools, as the Apps page lists them (none without E2B). */
  sandboxToolInfo(): ToolInfo[] {
    if (!this.sandboxes) {
      return [];
    }
    // Only their descriptions are read, so the tools are never run.
    return sandboxTools(this.sandboxes.forThread('', '')).map(toToolInfo);
  }

  async forUser(userId: string, scope?: ToolScope) {
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
    const computerTools =
      this.sandboxes && scope?.computer === 'sandbox'
        ? sandboxTools(this.sandboxes.forThread(userId, scope.threadId))
        : [];
    return {
      toolbox: new Toolbox(
        [...this.builtIns, ...computerTools, ...appTools],
        connections,
      ),
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
