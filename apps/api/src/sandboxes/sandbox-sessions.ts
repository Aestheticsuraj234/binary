import type {ComputerSessionRepository} from '@binary/db';

import type {ChatComputer} from '../computers/provider-sessions';
import {ProviderSessions} from '../computers/provider-sessions';
import type {CloudSandbox, SandboxProvider} from './cloud-sandbox';

/** One chat's sandbox (see ChatComputer). */
export type ChatSandbox = ChatComputer<CloudSandbox>;

/** Sandboxes across all of a user's chats. */
export class SandboxSessions extends ProviderSessions<CloudSandbox> {
  constructor(sessions: ComputerSessionRepository, provider: SandboxProvider) {
    super(sessions, 'sandbox', provider);
  }
}
