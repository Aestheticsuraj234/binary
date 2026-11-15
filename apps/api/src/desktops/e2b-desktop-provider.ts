import {Sandbox, SandboxNotFoundError} from '@e2b/desktop';

import type {
  CloudDesktop,
  DesktopProvider,
  DesktopScreen,
} from './cloud-desktop';

// Smaller screens make smaller screenshots for the model to read.
const RESOLUTION: [number, number] = [1024, 768];
const IDLE_TIMEOUT_MS = 10 * 60_000;
// After a click or a key, how long the screen gets to change.
const SETTLE_MS = 600;

class E2BDesktop implements CloudDesktop {
  constructor(private readonly desktop: Sandbox) {}

  get id() {
    return this.desktop.sandboxId;
  }

  async screen(): Promise<DesktopScreen> {
    const [width, height] = RESOLUTION;
    const image = await this.desktop.screenshot();
    return {width, height, screenshot: Buffer.from(image).toString('base64')};
  }

  async click(
    x: number,
    y: number,
    {button, double}: {button: 'left' | 'right'; double: boolean},
  ) {
    if (button === 'right') {
      await this.desktop.rightClick(x, y);
    } else if (double) {
      await this.desktop.doubleClick(x, y);
    } else {
      await this.desktop.leftClick(x, y);
    }
    await this.desktop.wait(SETTLE_MS);
  }

  async type(text: string) {
    await this.desktop.write(text);
    await this.desktop.wait(SETTLE_MS);
  }

  async press(keys: string[]) {
    await this.desktop.press(keys.length === 1 ? (keys[0] ?? '') : keys);
    await this.desktop.wait(SETTLE_MS);
  }

  async scroll(
    direction: 'up' | 'down',
    amount: number,
    {x, y}: {x: number; y: number},
  ) {
    // X scrolls whatever is under the pointer, so put it there first.
    await this.desktop.moveMouse(x, y);
    await this.desktop.scroll(direction, amount);
    await this.desktop.wait(SETTLE_MS);
  }

  async open(target: string) {
    await this.desktop.open(target);
    // Firefox takes a few seconds to start the first time (3 s was too
    // short on a real desktop: the model saw an empty screen).
    await this.desktop.wait(5000);
  }

  async keepAlive() {
    await this.desktop.setTimeout(IDLE_TIMEOUT_MS);
  }
}

/**
 * Real Linux desktops on E2B. Each starts a view-only live stream (a VNC
 * page that needs a key), so the user can watch the agent work.
 */
export class E2BDesktopProvider implements DesktopProvider {
  // The stream links are secrets (they carry the key), so only memory
  // holds them. After a restart a desktop works, but can't be watched.
  private readonly watchUrls = new Map<string, string>();

  constructor(private readonly apiKey: string) {}

  async create(labels: {userId: string; threadId: string}) {
    const desktop = await Sandbox.create({
      apiKey: this.apiKey,
      resolution: RESOLUTION,
      timeoutMs: IDLE_TIMEOUT_MS,
      metadata: {app: 'binary', ...labels},
    });
    await desktop.stream.start({requireAuth: true});
    this.watchUrls.set(
      desktop.sandboxId,
      desktop.stream.getUrl({
        viewOnly: true,
        resize: 'scale',
        authKey: desktop.stream.getAuthKey(),
      }),
    );
    return new E2BDesktop(desktop);
  }

  async connect(id: string) {
    try {
      const desktop = await Sandbox.connect(id, {
        apiKey: this.apiKey,
        timeoutMs: IDLE_TIMEOUT_MS,
      });
      return new E2BDesktop(desktop);
    } catch (error) {
      if (error instanceof SandboxNotFoundError) {
        this.watchUrls.delete(id);
        return undefined;
      }
      throw error;
    }
  }

  async isRunning(id: string) {
    try {
      const info = await Sandbox.getInfo(id, {apiKey: this.apiKey});
      return info.state === 'running';
    } catch (error) {
      if (error instanceof SandboxNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  async kill(id: string) {
    this.watchUrls.delete(id);
    await Sandbox.kill(id, {apiKey: this.apiKey});
  }

  watchUrl(id: string) {
    return this.watchUrls.get(id);
  }
}
