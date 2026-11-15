import type {ComputerSessionRepository} from '@binary/db';

import type {ChatComputer} from '../computers/provider-sessions';
import {
  ProviderSessions,
  type ComputerProvider,
  type RemoteComputer,
} from '../computers/provider-sessions';

/** What the screen looks like now. */
export interface DesktopScreen {
  width: number;
  height: number;
  /** A PNG, base64. */
  screenshot: string;
}

/** One cloud desktop: a screen, a mouse and a keyboard. */
export interface CloudDesktop extends RemoteComputer {
  screen(): Promise<DesktopScreen>;
  click(
    x: number,
    y: number,
    options: {button: 'left' | 'right'; double: boolean},
  ): Promise<void>;
  type(text: string): Promise<void>;
  /** Keys pressed together, e.g. ["ctrl", "l"]. */
  press(keys: string[]): Promise<void>;
  /** Scrolls at a point (what is under the mouse is what scrolls). */
  scroll(
    direction: 'up' | 'down',
    amount: number,
    at: {x: number; y: number},
  ): Promise<void>;
  /** Opens a URL (in the browser) or a file. */
  open(target: string): Promise<void>;
}

/** Desktops: E2B in the app, an in-memory fake in tests. */
export interface DesktopProvider extends ComputerProvider<CloudDesktop> {
  /** A view-only live stream to watch it, if this server started it. */
  watchUrl(id: string): string | undefined;
}

/** One chat's desktop (see ChatComputer). */
export type ChatDesktop = ChatComputer<CloudDesktop>;

/** Cloud desktops across all of a user's chats; each can be watched live. */
export class DesktopSessions extends ProviderSessions<CloudDesktop> {
  constructor(
    sessions: ComputerSessionRepository,
    private readonly desktops: DesktopProvider,
  ) {
    super(sessions, 'desktop', desktops);
  }

  protected override details(providerId: string) {
    return {watchUrl: this.desktops.watchUrl(providerId)};
  }
}
