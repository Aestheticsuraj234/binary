import {
  AgentRepository,
  ApprovalRepository,
  AgentTemplateRepository,
  ComputerSessionRepository,
  DeviceRepository,
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
import {RunnerHub} from './runner/runner-hub';
import {YourComputers} from './runner/your-computers';
import {BrowserSessions, chromiumInstalled} from './browsers/browser-sessions';
import type {ComputerSessions} from './computers/computer-sessions';
import {DesktopSessions, type DesktopProvider} from './desktops/cloud-desktop';
import {E2BDesktopProvider} from './desktops/e2b-desktop-provider';
import type {SandboxProvider} from './sandboxes/cloud-sandbox';
import {E2BSandboxProvider} from './sandboxes/e2b-sandbox-provider';
import {SandboxSessions} from './sandboxes/sandbox-sessions';
import type {AppConnector} from './tools/mcp';
import {ToolboxFactory} from './tools/toolbox-factory';
import {publicUrlsOnly, type UrlGuard} from './tools/web-page';

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
  /** The per-chat computers this server can give agents. */
  computers: ComputerSessions[];
  /** Undefined when Chromium is not installed. Closed on shutdown. */
  browsers?: BrowserSessions;
  /** The user's own computers and the Runners on them (Chapter 11). */
  devices: DeviceRepository;
  runnerHub: RunnerHub;
  jobs: JobRunner;
}

/** What tests (and later, other runtimes) can swap. Undefined = the default. */
export interface DependencyOptions {
  connect?: AppConnector;
  makeJobs?: (deps: RoutineDependencies) => JobRunner;
  /** null: no sandboxes. Default: E2B when E2B_API_KEY is set. */
  sandboxProvider?: SandboxProvider | null;
  /** null: no cloud desktops. Default: E2B when E2B_API_KEY is set. */
  desktopProvider?: DesktopProvider | null;
  /**
   * null: no browsers. Default: Chromium when installed, allowed to reach
   * public addresses only. Tests pass a guard that allows their local site.
   */
  browserGuard?: UrlGuard | null;
}

/**
 * The composition root: the one place where classes are created and wired
 * together. Tests call it with a fake model factory (and, when they need
 * them, a fake app connector, job runner, sandbox provider or browser
 * guard), so no real LLM, app or sandbox is ever reached.
 */
export function createDependencies(
  createModel: LanguageModelFactory = createLanguageModel,
  {
    connect,
    makeJobs = defaultJobs,
    sandboxProvider = defaultSandboxes(),
    desktopProvider = defaultDesktops(),
    browserGuard = chromiumInstalled() ? publicUrlsOnly : null,
  }: DependencyOptions = {},
): AppDependencies {
  const agents = new AgentRepository(db);
  const agentTemplates = new AgentTemplateRepository(db);
  const providerKeys = new ProviderKeyRepository(db);
  const threads = new ThreadRepository(db);
  const messages = new MessageRepository(db);
  const toolCalls = new ToolCallRepository(db);
  const mcpServers = new McpServerRepository(db);
  const keyVault = new KeyVault(env.ENCRYPTION_KEY);
  const devices = new DeviceRepository(db);
  const runnerHub = new RunnerHub();
  const yourComputers = new YourComputers(devices, runnerHub);
  const engineFactory = new EngineFactory(
    providerKeys,
    keyVault,
    createModel,
    yourComputers,
  );
  const computerSessions = new ComputerSessionRepository(db);
  const sandboxes = sandboxProvider
    ? new SandboxSessions(computerSessions, sandboxProvider)
    : undefined;
  const browsers = browserGuard
    ? new BrowserSessions(computerSessions, browserGuard)
    : undefined;
  const desktops = desktopProvider
    ? new DesktopSessions(computerSessions, desktopProvider)
    : undefined;
  const toolboxes = new ToolboxFactory(mcpServers, keyVault, {
    connect,
    sandboxes,
    browsers,
    desktops,
    yourComputers,
  });
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
    computers: [sandboxes, browsers, desktops].flatMap((manager) =>
      manager ? [manager] : [],
    ),
    browsers,
    devices,
    runnerHub,
  };
  return {...base, jobs: makeJobs(base)};
}

/** E2B when it is set up; otherwise agents get no sandbox. */
function defaultSandboxes(): SandboxProvider | null {
  return env.E2B_API_KEY ? new E2BSandboxProvider(env.E2B_API_KEY) : null;
}

/** E2B Desktop when E2B is set up; otherwise agents get no cloud desktop. */
function defaultDesktops(): DesktopProvider | null {
  return env.E2B_API_KEY ? new E2BDesktopProvider(env.E2B_API_KEY) : null;
}

/** Trigger.dev when it is set up; otherwise runs happen inside the API. */
function defaultJobs(deps: RoutineDependencies): JobRunner {
  return env.TRIGGER_SECRET_KEY
    ? new TriggerDevRunner(env.TRIGGER_SECRET_KEY)
    : new InProcessRunner((job) => runRoutine(deps, job));
}
