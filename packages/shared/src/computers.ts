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
 * The computers an agent can work on: a cloud sandbox (Chapter 9), a
 * headless browser (Chapter 10), a cloud desktop and your own computer
 * through the Runner (Chapter 11).
 */
export const AGENT_COMPUTERS = [
  'sandbox',
  'browser',
  'desktop',
  'runner',
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
      'A private Linux machine in the cloud (E2B), one per chat. Runs code and commands and keeps files until it times out. Running code always asks you first.',
  },
  browser: {
    label: 'Browser',
    description:
      'A headless browser on this server, one per chat. Opens and reads public pages on its own; asks before it clicks or types.',
  },
  desktop: {
    label: 'Cloud desktop',
    description:
      'A full Linux desktop in the cloud (E2B), one per chat, that you can watch live. It looks on its own; asks before it clicks or types.',
  },
  runner: {
    label: 'Your computer',
    description:
      'Your own computer, through the Runner, only inside the folders you shared. Reads on its own; asks before it runs a command or writes a file.',
  },
};

/** Templates whose job needs a computer start with one, when it's set up. */
export const TEMPLATE_COMPUTERS: Record<string, AgentComputer> = {
  'coding-agent': 'sandbox',
  'research-assistant': 'browser',
};

/**
 * A computer running for one of the user's chats: a sandbox, a browser or a
 * cloud desktop. (Your own computer is a device, not a session.)
 */
export interface ComputerView {
  id: string;
  kind: SessionComputer;
  threadId: string | null;
  threadTitle: string | null;
  agent: {id: string; name: string; avatar: string | null} | null;
  startedAt: string;
  /** Minutes it had been running at its last use. */
  minutesUsed: number;
  /** A cloud desktop's view-only live stream, to watch it work. */
  watchUrl?: string;
}

/** The computers that run per chat and can be stopped. */
export type SessionComputer = Exclude<AgentComputer, 'runner'>;
