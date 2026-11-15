import {and, desc, eq, gt, isNull} from 'drizzle-orm';

import type {Database} from '../client';
import {devices} from '../schema';

/**
 * The user's own computers, paired with the Runner (Chapter 11). A device
 * starts with a pairing code; typing it into the Runner swaps it for a
 * token, of which only the hash is stored here.
 */
export class DeviceRepository {
  constructor(private readonly db: Database) {}

  /** A device waiting for its code to be typed into the Runner. */
  async createPending(userId: string, name: string, pairingCode: string) {
    const [device] = await this.db
      .insert(devices)
      .values({userId, name, os: '', pairingCode})
      .returning();
    if (!device) {
      throw new Error('Could not add the computer.');
    }
    return device;
  }

  /**
   * Pairs the device whose code this is, if it was created after `since`
   * (codes expire) and has not been paired yet. The code works only once.
   */
  async pair(
    code: string,
    {os, tokenHash, since}: {os: string; tokenHash: string; since: Date},
  ) {
    const [device] = await this.db
      .update(devices)
      .set({
        pairingCode: null,
        tokenHash,
        os,
        lastSeenAt: new Date(),
        status: 'online',
      })
      .where(
        and(
          eq(devices.pairingCode, code),
          isNull(devices.tokenHash),
          gt(devices.createdAt, since),
        ),
      )
      .returning();
    return device;
  }

  async findByTokenHash(tokenHash: string) {
    const [device] = await this.db
      .select()
      .from(devices)
      .where(eq(devices.tokenHash, tokenHash));
    return device;
  }

  /** Newest first. */
  listForUser(userId: string) {
    return this.db
      .select()
      .from(devices)
      .where(eq(devices.userId, userId))
      .orderBy(desc(devices.createdAt));
  }

  async findForUser(userId: string, id: string) {
    const [device] = await this.db
      .select()
      .from(devices)
      .where(and(eq(devices.id, id), eq(devices.userId, userId)));
    return device;
  }

  /** The Runner checked in; it may also say which folders it shares. */
  async seen(
    id: string,
    details: {os?: string; allowedFolders?: string[]} = {},
  ) {
    await this.db
      .update(devices)
      .set({lastSeenAt: new Date(), status: 'online', ...details})
      .where(eq(devices.id, id));
  }

  /** The kill switch. */
  async setPaused(userId: string, id: string, paused: boolean) {
    const [device] = await this.db
      .update(devices)
      .set({killSwitch: paused})
      .where(and(eq(devices.id, id), eq(devices.userId, userId)))
      .returning();
    return device;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(devices)
      .where(and(eq(devices.id, id), eq(devices.userId, userId)))
      .returning({id: devices.id});
    return deleted.length > 0;
  }
}
