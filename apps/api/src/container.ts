import {
  AgentRepository,
  AgentTemplateRepository,
  McpServerRepository,
  MessageRepository,
  ProviderKeyRepository,
  ThreadRepository,
  ToolCallRepository,
} from '@binary/db';

import {db} from './db';
import {EngineFactory} from './engines/engine-factory';
import {
  createLanguageModel,
  type LanguageModelFactory,
} from './engines/language-models';
import {env} from './env';
import {KeyVault} from './keys/key-vault';
import {connectApp, type AppConnector} from './tools/mcp';
import {ToolboxFactory} from './tools/toolbox-factory';

/** Everything the routes need, created once and passed in. */
export interface AppDependencies {
  agents: AgentRepository;
  agentTemplates: AgentTemplateRepository;
  providerKeys: ProviderKeyRepository;
  threads: ThreadRepository;
  messages: MessageRepository;
  toolCalls: ToolCallRepository;
  mcpServers: McpServerRepository;
  keyVault: KeyVault;
  engineFactory: EngineFactory;
  toolboxes: ToolboxFactory;
}

/**
 * The composition root: the one place where classes are created and wired
 * together. Tests call it with a fake model factory (and, when they need it,
 * a fake app connector), so no real LLM or app is ever reached.
 */
export function createDependencies(
  createModel: LanguageModelFactory = createLanguageModel,
  connect: AppConnector = connectApp,
): AppDependencies {
  const agents = new AgentRepository(db);
  const agentTemplates = new AgentTemplateRepository(db);
  const providerKeys = new ProviderKeyRepository(db);
  const threads = new ThreadRepository(db);
  const messages = new MessageRepository(db);
  const toolCalls = new ToolCallRepository(db);
  const mcpServers = new McpServerRepository(db);
  const keyVault = new KeyVault(env.ENCRYPTION_KEY);
  const engineFactory = new EngineFactory(providerKeys, keyVault, createModel);
  const toolboxes = new ToolboxFactory(mcpServers, keyVault, connect);
  return {
    agents,
    agentTemplates,
    providerKeys,
    threads,
    messages,
    toolCalls,
    mcpServers,
    keyVault,
    engineFactory,
    toolboxes,
  };
}
