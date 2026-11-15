import {randomUUID} from 'node:crypto';

import type {CloudDesktop, DesktopProvider} from './cloud-desktop';

// A 1×1 PNG: what the fake's screen looks like.
export const FAKE_SCREEN_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

/** A desktop that only remembers what was done to it, for tests. */
class FakeDesktop implements CloudDesktop {
  readonly actions: string[] = [];

  constructor(readonly id: string) {}

  async screen() {
    return {width: 1024, height: 768, screenshot: FAKE_SCREEN_PNG};
  }

  async click(
    x: number,
    y: number,
    {button, double}: {button: 'left' | 'right'; double: boolean},
  ) {
    this.actions.push(`${double ? 'double ' : ''}${button} click ${x},${y}`);
  }

  async type(text: string) {
    this.actions.push(`type ${text}`);
  }

  async press(keys: string[]) {
    this.actions.push(`press ${keys.join('+')}`);
  }

  async scroll(
    direction: 'up' | 'down',
    amount: number,
    {x, y}: {x: number; y: number},
  ) {
    this.actions.push(`scroll ${direction} ${amount} at ${x},${y}`);
  }

  async open(target: string) {
    this.actions.push(`open ${target}`);
  }

  async keepAlive() {}
}

export class FakeDesktopProvider implements DesktopProvider {
  readonly desktops = new Map<string, FakeDesktop>();

  async create() {
    const desktop = new FakeDesktop(`desktop-${randomUUID()}`);
    this.desktops.set(desktop.id, desktop);
    return desktop;
  }

  async connect(id: string) {
    return this.desktops.get(id);
  }

  async isRunning(id: string) {
    return this.desktops.has(id);
  }

  async kill(id: string) {
    this.desktops.delete(id);
  }

  watchUrl(id: string) {
    return this.desktops.has(id) ? `https://watch.test/${id}` : undefined;
  }

  /** What was done to a desktop, for tests. */
  actionsOn(id: string): string[] {
    return this.desktops.get(id)?.actions ?? [];
  }
}
