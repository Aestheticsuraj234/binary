import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';

import type {ComputerSessionRepository} from '@binary/db';
import {chromium, type Browser} from 'playwright';

import {ComputerSessions} from '../computers/computer-sessions';
import type {UrlGuard} from '../tools/web-page';
import {ChatBrowser} from './chat-browser';

// A browser closes after this long without use, like a sandbox.
const IDLE_TIMEOUT_MS = 10 * 60_000;
// Each open browser costs memory on this server; this many at most.
const MAX_OPEN = 5;

/** True when Playwright's Chromium is installed on this machine. */
export function chromiumInstalled(): boolean {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

/** One chat's browser, as the tools see it. */
export interface ChatBrowserAccess {
  /** The chat's browser, opened if it has none. */
  start(): Promise<ChatBrowser>;
  /** The chat's browser if one is open; never opens one. */
  existing(): Promise<ChatBrowser | undefined>;
}

interface OpenBrowser {
  chat: ChatBrowser;
  sessionId: string;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Headless browsers for chats. They run inside this API process: one
 * Chromium, started on first use, with a separate context per chat, so
 * chats never share cookies or tabs. The `computer_sessions` row of each
 * holds a random id that points into `open`.
 *
 * Because they live in memory, a restart closes them all; their rows are
 * closed the next time sessions are listed.
 */
export class BrowserSessions extends ComputerSessions {
  private chromium?: Promise<Browser>;
  private readonly open = new Map<string, OpenBrowser>();
  // A chat whose browser is being opened right now, so two tools at once
  // share one.
  private readonly starting = new Map<string, Promise<ChatBrowser>>();

  constructor(
    sessions: ComputerSessionRepository,
    private readonly guard: UrlGuard,
    private readonly launch: () => Promise<Browser> = () => chromium.launch(),
  ) {
    super(sessions, 'browser');
  }

  forThread(userId: string, threadId: string): ChatBrowserAccess {
    return {
      start: () => this.start(userId, threadId),
      existing: () => this.existing(userId, threadId),
    };
  }

  /** Closes every browser and Chromium itself (on shutdown, in tests). */
  async closeAll() {
    await Promise.all([...this.open.keys()].map((id) => this.kill(id)));
    const browser = await this.chromium?.catch(() => undefined);
    this.chromium = undefined;
    await browser?.close();
  }

  protected async isRunning(providerId: string) {
    return this.open.has(providerId);
  }

  protected async kill(providerId: string) {
    const entry = this.open.get(providerId);
    this.open.delete(providerId);
    if (entry) {
      clearTimeout(entry.timer);
      await entry.chat.close();
    }
  }

  private start(userId: string, threadId: string): Promise<ChatBrowser> {
    const key = `${userId}:${threadId}`;
    let starting = this.starting.get(key);
    if (!starting) {
      starting = this.existingOrNew(userId, threadId).finally(() => {
        this.starting.delete(key);
      });
      this.starting.set(key, starting);
    }
    return starting;
  }

  private async existingOrNew(userId: string, threadId: string) {
    const existing = await this.existing(userId, threadId);
    if (existing) {
      return existing;
    }
    if (this.open.size >= MAX_OPEN) {
      throw new Error(
        `${MAX_OPEN} browsers are open already. Stop one on Apps & tools first.`,
      );
    }
    this.chromium ??= this.launch();
    const chat = await ChatBrowser.create(await this.chromium, this.guard);
    const providerId = randomUUID();
    const session = await this.sessions.create({
      userId,
      kind: 'browser',
      providerId,
      threadId,
    });
    this.open.set(providerId, {
      chat,
      sessionId: session.id,
      timer: this.idleTimer(providerId, session.id),
    });
    await this.sessions.touch(session.id);
    return chat;
  }

  private async existing(userId: string, threadId: string) {
    const saved = await this.sessions.findRunningForThread(
      userId,
      threadId,
      'browser',
    );
    if (!saved?.providerId) {
      return undefined;
    }
    const entry = this.open.get(saved.providerId);
    if (!entry) {
      // The API restarted since; that browser is gone.
      await this.sessions.close(saved.id, {stillRunning: false});
      return undefined;
    }
    clearTimeout(entry.timer);
    entry.timer = this.idleTimer(saved.providerId, saved.id);
    await this.sessions.touch(saved.id);
    return entry.chat;
  }

  private idleTimer(providerId: string, sessionId: string) {
    const timer = setTimeout(() => {
      this.sessions
        .close(sessionId, {stillRunning: true})
        .then(() => this.kill(providerId))
        .catch((error: unknown) => console.error(error));
    }, IDLE_TIMEOUT_MS);
    // An idle browser should never keep the process alive.
    timer.unref();
    return timer;
  }
}
