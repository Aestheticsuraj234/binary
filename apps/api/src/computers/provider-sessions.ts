import type {ComputerSessionRepository} from '@binary/db';
import type {SessionComputer} from '@binary/shared';

import {ComputerSessions} from './computer-sessions';

/** A computer a provider runs for us (an E2B sandbox or desktop). */
export interface RemoteComputer {
  readonly id: string;
  /** Pushes the time-out back, because the chat is still using it. */
  keepAlive(): Promise<void>;
}

/**
 * Where remote computers come from (the Strategy pattern). The app uses
 * E2B; tests use fakes that keep everything in memory.
 */
export interface ComputerProvider<T extends RemoteComputer> {
  create(labels: {userId: string; threadId: string}): Promise<T>;
  /** Connects to an existing one; undefined if it timed out or was stopped. */
  connect(id: string): Promise<T | undefined>;
  /** Checks without connecting, so nothing is woken up or extended. */
  isRunning(id: string): Promise<boolean>;
  kill(id: string): Promise<void>;
}

export interface Opened<T> {
  computer: T;
  /** True when the chat had one before that timed out (its state is gone). */
  replaced: boolean;
}

/**
 * One chat's remote computer, for one request. It is only started when a
 * tool first needs it, and found again (by its saved id) on later messages.
 */
export class ChatComputer<T extends RemoteComputer> {
  private opening?: Promise<Opened<T>>;

  constructor(
    private readonly sessions: ComputerSessionRepository,
    private readonly provider: ComputerProvider<T>,
    private readonly kind: SessionComputer,
    private readonly userId: string,
    private readonly threadId: string,
  ) {}

  /**
   * The chat's computer, started if it has none. Two tools called at once
   * share one, because the first call's promise is reused.
   */
  open(): Promise<Opened<T>> {
    this.opening ??= this.connectOrCreate();
    return this.opening;
  }

  /** The chat's computer if one is running; never starts one. */
  async existing(): Promise<T | undefined> {
    if (this.opening) {
      return (await this.opening).computer;
    }
    return this.connectTo(await this.findSaved());
  }

  private async connectTo(
    saved: Awaited<ReturnType<ChatComputer<T>['findSaved']>>,
  ): Promise<T | undefined> {
    if (!saved?.providerId) {
      return undefined;
    }
    const computer = await this.provider.connect(saved.providerId);
    if (!computer) {
      await this.sessions.close(saved.id, {stillRunning: false});
      return undefined;
    }
    await computer.keepAlive();
    await this.sessions.touch(saved.id);
    return computer;
  }

  private async connectOrCreate(): Promise<Opened<T>> {
    const saved = await this.findSaved();
    const existing = await this.connectTo(saved);
    if (existing) {
      return {computer: existing, replaced: false};
    }
    const computer = await this.provider.create({
      userId: this.userId,
      threadId: this.threadId,
    });
    const session = await this.sessions.create({
      userId: this.userId,
      kind: this.kind,
      providerId: computer.id,
      threadId: this.threadId,
    });
    await this.sessions.touch(session.id);
    return {computer, replaced: saved !== undefined};
  }

  private findSaved() {
    return this.sessions.findRunningForThread(
      this.userId,
      this.threadId,
      this.kind,
    );
  }
}

/**
 * Remote computers of one kind across all of a user's chats: open one for a
 * chat, list the ones running, and stop them (listing and stopping come
 * from ComputerSessions).
 */
export class ProviderSessions<
  T extends RemoteComputer,
> extends ComputerSessions {
  constructor(
    sessions: ComputerSessionRepository,
    kind: SessionComputer,
    protected readonly provider: ComputerProvider<T>,
  ) {
    super(sessions, kind);
  }

  forThread(userId: string, threadId: string): ChatComputer<T> {
    return new ChatComputer(
      this.sessions,
      this.provider,
      this.kind,
      userId,
      threadId,
    );
  }

  protected isRunning(providerId: string) {
    return this.provider.isRunning(providerId);
  }

  protected kill(providerId: string) {
    return this.provider.kill(providerId);
  }
}
