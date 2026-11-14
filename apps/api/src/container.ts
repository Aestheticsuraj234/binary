import {
  AgentRepository,
  AgentTemplateRepository,
  MessageRepository,
  ProviderKeyRepository,
  ThreadRepository,
} from '@binary/db';

import {db} from './db';
import {EngineFactory} from './engines/engine-factory';
import {
  createLanguageModel,
  type LanguageModelFactory,
} from './engines/language-models';
import {env} from './env';
import {KeyVault} from './keys/key-vault';

/** Everything the routes need, created once and passed in. */
export interface AppDependencies {
  agents: AgentRepository;
  agentTemplates: AgentTemplateRepository;
  providerKeys: ProviderKeyRepository;
  threads: ThreadRepository;
  messages: MessageRepository;
  keyVault: KeyVault;
  engineFactory: EngineFactory;
}

/**
 * The composition root: the one place where classes are created and wired
 * together. Tests call it with a fake model factory, so no real LLM is hit.
 */
export function createDependencies(
  createModel: LanguageModelFactory = createLanguageModel,
): AppDependencies {
  const agents = new AgentRepository(db);
  const agentTemplates = new AgentTemplateRepository(db);
  const providerKeys = new ProviderKeyRepository(db);
  const threads = new ThreadRepository(db);
  const messages = new MessageRepository(db);
  const keyVault = new KeyVault(env.ENCRYPTION_KEY);
  const engineFactory = new EngineFactory(providerKeys, keyVault, createModel);
  return {
    agents,
    agentTemplates,
    providerKeys,
    threads,
    messages,
    keyVault,
    engineFactory,
  };
}
