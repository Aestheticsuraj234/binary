import type {ComputerSessionRepository} from '@binary/db';
import type {AgentComputer, ComputerView} from '@binary/shared';

/**
 * What every kind of computer (sandbox, browser) shares: its sessions are
 * rows in `computer_sessions`, and they can be listed and stopped. Each
 * kind only says how to check one and how to stop one (the Template Method
 * pattern).
 */
export abstract class ComputerSessions {
  constructor(
    protected readonly sessions: ComputerSessionRepository,
    readonly kind: AgentComputer,
  ) {}

  /** Whether the computer behind a session is still there. */
  protected abstract isRunning(providerId: string): Promise<boolean>;

  /** Stops the computer behind a session. */
  protected abstract kill(providerId: string): Promise<void>;

  /**
   * Running sessions, oldest first. One whose computer is gone (timed out,
   * or the API restarted) is marked closed here, the first time anyone looks.
   */
  async listRunning(userId: string): Promise<ComputerView[]> {
    const saved = await this.sessions.listRunningForUser(userId, this.kind);
    const checked = await Promise.all(
      saved.map(async (session) => {
        const running = session.providerId
          ? await this.isRunning(session.providerId)
          : false;
        if (!running) {
          await this.sessions.close(session.id, {stillRunning: false});
        }
        return running ? [session] : [];
      }),
    );
    return checked.flat().map((session) => ({
      id: session.id,
      kind: this.kind,
      threadId: session.threadId,
      threadTitle: session.threadTitle,
      agent: session.agent,
      startedAt: session.createdAt.toISOString(),
      minutesUsed: session.minutesUsed,
    }));
  }

  /** Stops one session of this kind; false if the user has no such one running. */
  async stop(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.sessions.findForUser(userId, sessionId);
    if (session?.status !== 'running' || session.kind !== this.kind) {
      return false;
    }
    if (session.providerId) {
      await this.kill(session.providerId);
    }
    await this.sessions.close(session.id, {stillRunning: true});
    return true;
  }

  /** Stops the chat's session, if it has one (before the chat is deleted). */
  async stopForThread(userId: string, threadId: string) {
    const session = await this.sessions.findRunningForThread(
      userId,
      threadId,
      this.kind,
    );
    if (session) {
      await this.stop(userId, session.id);
    }
  }
}
