/**
 * Every kind of computer Binary knows (the database enum uses this list):
 * your own computer through the Runner, an E2B sandbox, an E2B desktop and
 * a headless browser.
 */
export const COMPUTER_KINDS = [
  'runner',
  'sandbox',
  'desktop',
  'browser',
] as const;

export type ComputerKind = (typeof COMPUTER_KINDS)[number];

/**
 * The computers an agent can work on so far. Chapter 9 adds cloud sandboxes;
 * browsers (Chapter 10) and your own computer (Chapter 11) join this list.
 */
export const AGENT_COMPUTERS = [
  'sandbox',
] as const satisfies readonly ComputerKind[];

export type AgentComputer = (typeof AGENT_COMPUTERS)[number];

/** What the agent form says about each computer. */
export const AGENT_COMPUTER_INFO: Record<
  AgentComputer,
  {label: string; description: string}
> = {
  sandbox: {
    label: 'Cloud sandbox',
    description:
      'A private Linux machine in the cloud (E2B), one per chat. Runs code and commands and keeps files until it times out.',
  },
};

/** Templates whose job needs a computer start with one, when it's set up. */
export const TEMPLATE_COMPUTERS: Record<string, AgentComputer> = {
  'coding-agent': 'sandbox',
};

/** Languages the run_code tool takes. Shell commands use run_command. */
export const CODE_LANGUAGES = ['python', 'javascript'] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

/** One thing a code run produced besides its logs: a value or a chart. */
export interface CodeResult {
  text?: string;
  /** A PNG image, base64, e.g. a matplotlib chart. */
  png?: string;
}

/** What the run_code tool returns. */
export interface CodeRunOutput {
  stdout: string;
  stderr: string;
  results: CodeResult[];
  error?: {name: string; value: string; traceback: string};
  /** Set when an earlier sandbox had timed out, so its files are gone. */
  newSandbox?: true;
}

/** What the run_command tool returns. */
export interface CommandRunOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
  newSandbox?: true;
}

/** A sandbox that is running for one of the user's chats. */
export interface SandboxView {
  id: string;
  threadId: string | null;
  threadTitle: string | null;
  agent: {id: string; name: string; avatar: string | null} | null;
  startedAt: string;
  /** Minutes it had been running at its last use. */
  minutesUsed: number;
}
