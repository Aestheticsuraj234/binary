import {createHash, randomBytes, randomInt} from 'node:crypto';

import type {DeviceRepository} from '@binary/db';
import type {DeviceView, RunnerEvent, RunnerJob} from '@binary/shared';

import type {RunnerHub} from './runner-hub';

// A Runner that checked in this recently counts as online. It asks for
// work every 25 seconds, so a minute allows for one missed poll.
const ONLINE_WINDOW_MS = 60_000;
// A pairing code works for this long after the computer was added.
export const PAIRING_TTL_MS = 15 * 60_000;
// No 0/O or 1/I: the code is read off a screen and typed by hand.
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type Device = NonNullable<
  Awaited<ReturnType<DeviceRepository['findByTokenHash']>>
>;

/** "K7QD-3MXP": what the user types into the Runner. */
export function newPairingCode(): string {
  const letters = Array.from(
    {length: 8},
    () => CODE_LETTERS[randomInt(CODE_LETTERS.length)],
  ).join('');
  return `${letters.slice(0, 4)}-${letters.slice(4)}`;
}

/** Only the hash is stored, like a password. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** The Runner's sign-in token: 256 random bits. */
export function newDeviceToken() {
  const token = randomBytes(32).toString('base64url');
  return {token, tokenHash: hashToken(token)};
}

function isOnline(device: Device, now = Date.now()) {
  return (
    device.lastSeenAt !== null &&
    now - device.lastSeenAt.getTime() < ONLINE_WINDOW_MS
  );
}

/** What the web app sees: never the token or its hash. */
export function toDeviceView(device: Device): DeviceView {
  return {
    id: device.id,
    name: device.name,
    os: device.os,
    pairing: device.tokenHash === null,
    online: isOnline(device),
    paused: device.killSwitch,
    allowedFolders: device.allowedFolders,
    lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    createdAt: device.createdAt.toISOString(),
  };
}

/**
 * The user's own computers as something agents can use: pick the one to
 * work on, and run a job there through the hub.
 */
export class YourComputers {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly hub: RunnerHub,
  ) {}

  /** The computer jobs go to: paired, online, not paused, seen last. */
  async pick(userId: string): Promise<Device> {
    const paired = (await this.devices.listForUser(userId)).filter(
      (device) => device.tokenHash !== null,
    );
    if (paired.length === 0) {
      throw new Error(
        'No computer is paired yet. Add one under Your computers and start the Runner.',
      );
    }
    const awake = paired.filter((device) => !device.killSwitch);
    if (awake.length === 0) {
      throw new Error(
        'Your computer is paused (the kill switch is on). Resume it under Your computers.',
      );
    }
    const online = awake
      .filter((device) => isOnline(device))
      .sort(
        (a, b) =>
          (b.lastSeenAt?.getTime() ?? 0) - (a.lastSeenAt?.getTime() ?? 0),
      );
    const [device] = online;
    if (!device) {
      throw new Error(
        'Your computer is offline. Start the Runner on it (pnpm runner start).',
      );
    }
    return device;
  }

  /** Runs a job on the user's computer and returns its output. */
  async run(
    userId: string,
    job: RunnerJob,
    options: {timeoutMs: number; onEvent?: (event: RunnerEvent) => void},
  ): Promise<unknown> {
    const device = await this.pick(userId);
    return this.hub.dispatch(device.id, job, options);
  }

  /** The computer's name and folders, for the tools' descriptions. */
  async describe(userId: string) {
    const device = await this.pick(userId).catch(() => undefined);
    return device
      ? {name: device.name, folders: device.allowedFolders}
      : undefined;
  }
}
