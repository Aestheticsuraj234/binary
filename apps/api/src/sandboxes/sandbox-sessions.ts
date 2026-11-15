import type {ComputerSessionRepository} from '@binary/db';
import type {SandboxView} from '@binary/shared';

import type {CloudSandbox, SandboxProvider} from './cloud-sandbox';

export interface OpenedSandbox {
  sandbox: CloudSandbox;
  /** True when the chat had a sandbox before that timed out (files gone). */
  replaced: boolean;
}

/**
 * The sandbox of one chat, for one request. It is only started when a tool
 * first needs it, and found again (by its saved id) on later messages.
 */
export class ChatSandbox {
  private opening?: Promise<OpenedSandbox>;

  constructor(
    private readonly sessions: ComputerSessionRepository,
    private readonly provider: SandboxProvider,
    private readonly userId: string,
    private readonly threadId: string,
  ) {}

  /**
   * The chat's sandbox, started if it has none. Two tools called at once
   * share one sandbox, because the first call's promise is reused.
   */
  open(): Promise<OpenedSandbox> {
    this.opening ??= this.connectOrCreate();
    return this.opening;
  }

  /** The chat's sandbox if one is running; never starts one. */
  async existing(): Promise<CloudSandbox | undefined> {
    if (this.opening) {
      return (await this.opening).sandbox;
    }
    return this.connectTo(await this.findSaved());
  }

  private async connectTo(
    saved: Awaited<ReturnType<ChatSandbox['findSaved']>>,
  ): Promise<CloudSandbox | undefined> {
    if (!saved?.providerId) {
      return undefined;
    }
    const sandbox = await this.provider.connect(saved.providerId);
    if (!sandbox) {
      await this.sessions.close(saved.id, {stillRunning: false});
      return undefined;
    }
    await sandbox.keepAlive();
    await this.sessions.touch(saved.id);
    return sandbox;
  }

  private async connectOrCreate(): Promise<OpenedSandbox> {
    const saved = await this.findSaved();
    const existing = await this.connectTo(saved);
    if (existing) {
      return {sandbox: existing, replaced: false};
    }
    const sandbox = await this.provider.create({
      userId: this.userId,
      threadId: this.threadId,
    });
    const session = await this.sessions.create({
      userId: this.userId,
      kind: 'sandbox',
      providerId: sandbox.id,
      threadId: this.threadId,
    });
    await this.sessions.touch(session.id);
    return {sandbox, replaced: saved !== undefined};
  }

  private findSaved() {
    return this.sessions.findRunningForThread(
      this.userId,
      this.threadId,
      'sandbox',
    );
  }
}

/**
 * Sandboxes across all of a user's chats: open one for a chat, list the
 * ones running, and stop them.
 */
export class SandboxSessions {
  constructor(
    private readonly sessions: ComputerSessionRepository,
    private readonly provider: SandboxProvider,
  ) {}

  forThread(userId: string, threadId: string): ChatSandbox {
    return new ChatSandbox(this.sessions, this.provider, userId, threadId);
  }

  /**
   * Running sandboxes, oldest first. One that timed out on its own is
   * marked closed here, the first time anyone looks.
   */
  async listRunning(userId: string): Promise<SandboxView[]> {
    const saved = await this.sessions.listRunningForUser(userId, 'sandbox');
    const checked = await Promise.all(
      saved.map(async (session) => {
        const running = session.providerId
          ? await this.provider.isRunning(session.providerId)
          : false;
        if (!running) {
          await this.sessions.close(session.id, {stillRunning: false});
        }
        return running ? [session] : [];
      }),
    );
    return checked.flat().map((session) => ({
      id: session.id,
      threadId: session.threadId,
      threadTitle: session.threadTitle,
      agent: session.agent,
      startedAt: session.createdAt.toISOString(),
      minutesUsed: session.minutesUsed,
    }));
  }

  /** Stops one sandbox; false if the user has no such running sandbox. */
  async stop(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.sessions.findForUser(userId, sessionId);
    if (session?.status !== 'running') {
      return false;
    }
    if (session.providerId) {
      await this.provider.kill(session.providerId);
    }
    await this.sessions.close(session.id, {stillRunning: true});
    return true;
  }

  /** Stops the chat's sandbox, if it has one (before the chat is deleted). */
  async stopForThread(userId: string, threadId: string) {
    const session = await this.sessions.findRunningForThread(
      userId,
      threadId,
      'sandbox',
    );
    if (session) {
      await this.stop(userId, session.id);
    }
  }
}
