import type {McpServer, McpServerRepository} from '@binary/db';
import type {
  AgentComputer,
  ComputerKind,
  ConnectedApp,
  ToolInfo,
} from '@binary/shared';

import type {BrowserSessions} from '../browsers/browser-sessions';
import type {DesktopSessions} from '../desktops/cloud-desktop';
import type {AgentMemory} from '../memory/agent-memory';
import type {KnowledgeBase} from '../memory/knowledge-base';
import type {YourComputers} from '../runner/your-computers';

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
import {browserTools} from './browser-tools';
import {desktopTools} from './desktop-tools';
import {memoryTools} from './memory-tools';
import {runnerTools} from './runner-tools';
import {sandboxTools} from './sandbox-tools';
import {Toolbox} from './toolbox';

/** Which chat the tools are for, its agent, and the computer it uses. */
export interface ToolScope {
  threadId: string;
  agentId: string;
  computer: ComputerKind | null;
}

/** The computers this server can give agents, and what each needs. */
export interface ToolboxOptions {
  connect?: AppConnector;
  /** Undefined when E2B is not set up. */
  sandboxes?: SandboxSessions;
  /** Undefined when Playwright's Chromium is not installed. */
  browsers?: BrowserSessions;
  /** Undefined when E2B is not set up. */
  desktops?: DesktopSessions;
  /** The user's own computers, through the Runner. */
  yourComputers?: YourComputers;
  /** Memory and knowledge (Chapter 12), for users with an embedding key. */
  memory?: AgentMemory;
  knowledge?: KnowledgeBase;
  builtIns?: AgentTool[];
}

/** A computer as the Apps page shows it. */
export interface ComputerTools {
  kind: AgentComputer;
  available: boolean;
  tools: ToolInfo[];
}

interface OpenedApp {
  app: ConnectedApp;
  connection?: AppConnection;
}

/**
 * Builds a user's Toolbox (the Factory pattern, like EngineFactory): the
 * built-in tools, the tools of every app they connected, and the tools of
 * the chat's computer (a cloud sandbox or a browser) when its agent has
 * one. Apps open in parallel; one that fails is skipped and marked "error",
 * so a broken app never breaks a chat.
 *
 * A computer this server can't provide (no E2B key, no Chromium) is simply
 * left out: agents that would use it get no tools for it.
 */
export class ToolboxFactory {
  private readonly connect: AppConnector;
  private readonly sandboxes?: SandboxSessions;
  private readonly browsers?: BrowserSessions;
  private readonly desktops?: DesktopSessions;
  private readonly yourComputers?: YourComputers;
  private readonly memory?: AgentMemory;
  private readonly knowledge?: KnowledgeBase;
  private readonly builtIns: AgentTool[];

  constructor(
    private readonly servers: McpServerRepository,
    private readonly keyVault: KeyVault,
    options: ToolboxOptions = {},
  ) {
    this.connect = options.connect ?? connectApp;
    this.sandboxes = options.sandboxes;
    this.browsers = options.browsers;
    this.desktops = options.desktops;
    this.yourComputers = options.yourComputers;
    this.memory = options.memory;
    this.knowledge = options.knowledge;
    this.builtIns = options.builtIns ?? builtInTools();
  }

  /**
   * Each computer, whether this server can provide it, and its tools (only
   * their descriptions are read, so they are bound to no chat).
   */
  computers(): ComputerTools[] {
    return [
      {
        kind: 'sandbox',
        available: this.sandboxes !== undefined,
        tools: this.sandboxes
          ? sandboxTools(this.sandboxes.forThread('', '')).map(toToolInfo)
          : [],
      },
      {
        kind: 'browser',
        available: this.browsers !== undefined,
        tools: this.browsers
          ? browserTools(this.browsers.forThread('', '')).map(toToolInfo)
          : [],
      },
      {
        kind: 'desktop',
        available: this.desktops !== undefined,
        tools: this.desktops
          ? desktopTools(this.desktops.forThread('', '')).map(toToolInfo)
          : [],
      },
      {
        kind: 'runner',
        available: this.yourComputers !== undefined,
        tools: this.yourComputers
          ? runnerTools(this.yourComputers, '').map(toToolInfo)
          : [],
      },
    ];
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
    const computerTools = scope ? await this.computerTools(userId, scope) : [];
    const rememberingTools = scope ? await this.memoryTools(userId, scope) : [];
    return {
      toolbox: new Toolbox(
        [...this.builtIns, ...rememberingTools, ...computerTools, ...appTools],
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

  /** Memory and knowledge tools, when the user has a key to embed with. */
  private async memoryTools(userId: string, {threadId, agentId}: ToolScope) {
    if (
      !this.memory ||
      !this.knowledge ||
      !(await this.memory.available(userId))
    ) {
      return [];
    }
    return memoryTools(this.memory, this.knowledge, {
      userId,
      agentId,
      threadId,
    });
  }

  private async computerTools(
    userId: string,
    {threadId, computer}: ToolScope,
  ): Promise<AgentTool[]> {
    if (computer === 'sandbox' && this.sandboxes) {
      return sandboxTools(this.sandboxes.forThread(userId, threadId));
    }
    if (computer === 'browser' && this.browsers) {
      return browserTools(this.browsers.forThread(userId, threadId));
    }
    if (computer === 'desktop' && this.desktops) {
      return desktopTools(this.desktops.forThread(userId, threadId));
    }
    if (computer === 'runner' && this.yourComputers) {
      const about = await this.yourComputers.describe(userId);
      return runnerTools(this.yourComputers, userId, about);
    }
    return [];
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
