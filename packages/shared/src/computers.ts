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
 * The computers an agent can work on so far: cloud sandboxes (Chapter 9)
 * and a headless browser (Chapter 10). Your own computer (Chapter 11) joins
 * this list.
 */
export const AGENT_COMPUTERS = [
  'sandbox',
  'browser',
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
};

/** Templates whose job needs a computer start with one, when it's set up. */
export const TEMPLATE_COMPUTERS: Record<string, AgentComputer> = {
  'coding-agent': 'sandbox',
  'research-assistant': 'browser',
};

/** A computer (sandbox or browser) running for one of the user's chats. */
export interface ComputerView {
  id: string;
  kind: AgentComputer;
  threadId: string | null;
  threadTitle: string | null;
  agent: {id: string; name: string; avatar: string | null} | null;
  startedAt: string;
  /** Minutes it had been running at its last use. */
  minutesUsed: number;
}
