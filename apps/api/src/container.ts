import {
  AgentRepository,
  ApprovalRepository,
  AgentTemplateRepository,
  ComputerSessionRepository,
  McpServerRepository,
  MessageRepository,
  ProviderKeyRepository,
  RoutineRepository,
  RoutineRunRepository,
  ThreadRepository,
  ToolCallRepository,
  TriggerRepository,
} from '@binary/db';

import {db} from './db';
import {EngineFactory} from './engines/engine-factory';
import {
  createLanguageModel,
  type LanguageModelFactory,
} from './engines/language-models';
import {env} from './env';
import {InProcessRunner, type JobRunner} from './jobs/job-runner';
import {TriggerDevRunner} from './jobs/trigger-dev-runner';
import {KeyVault} from './keys/key-vault';
import {runRoutine, type RoutineDependencies} from './routines/run-routine';
import type {SandboxProvider} from './sandboxes/cloud-sandbox';
import {E2BSandboxProvider} from './sandboxes/e2b-sandbox-provider';
import {SandboxSessions} from './sandboxes/sandbox-sessions';
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
  approvals: ApprovalRepository;
  mcpServers: McpServerRepository;
  routines: RoutineRepository;
  triggers: TriggerRepository;
  routineRuns: RoutineRunRepository;
  keyVault: KeyVault;
  engineFactory: EngineFactory;
  toolboxes: ToolboxFactory;
  /** Undefined when E2B is not set up. */
  sandboxes?: SandboxSessions;
  jobs: JobRunner;
}

/**
 * The composition root: the one place where classes are created and wired
 * together. Tests call it with a fake model factory (and, when they need
 * them, a fake app connector, job runner or sandbox provider), so no real
 * LLM, app or sandbox is ever reached.
 */
export function createDependencies(
  createModel: LanguageModelFactory = createLanguageModel,
  connect: AppConnector = connectApp,
  makeJobs: (deps: RoutineDependencies) => JobRunner = defaultJobs,
  sandboxProvider: SandboxProvider | undefined = defaultSandboxes(),
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
  const sandboxes = sandboxProvider
    ? new SandboxSessions(new ComputerSessionRepository(db), sandboxProvider)
    : undefined;
  const toolboxes = new ToolboxFactory(
    mcpServers,
    keyVault,
    connect,
    sandboxes,
  );
  const base = {
    agents,
    agentTemplates,
    providerKeys,
    threads,
    messages,
    toolCalls,
    approvals: new ApprovalRepository(db),
    mcpServers,
    routines: new RoutineRepository(db),
    triggers: new TriggerRepository(db),
    routineRuns: new RoutineRunRepository(db),
    keyVault,
    engineFactory,
    toolboxes,
    sandboxes,
  };
  return {...base, jobs: makeJobs(base)};
}

/** E2B when it is set up; otherwise agents get no sandbox. */
function defaultSandboxes(): SandboxProvider | undefined {
  return env.E2B_API_KEY ? new E2BSandboxProvider(env.E2B_API_KEY) : undefined;
}

/** Trigger.dev when it is set up; otherwise runs happen inside the API. */
function defaultJobs(deps: RoutineDependencies): JobRunner {
  return env.TRIGGER_SECRET_KEY
    ? new TriggerDevRunner(env.TRIGGER_SECRET_KEY)
    : new InProcessRunner((job) => runRoutine(deps, job));
}
