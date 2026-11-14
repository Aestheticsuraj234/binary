import {and, eq, inArray} from 'drizzle-orm';

import type {Database} from '../client';
import {routines, triggers} from '../schema';

export type Trigger = typeof triggers.$inferSelect;

/**
 * Stores what starts each routine. A routine has at most one schedule and
 * one webhook; "Run now" needs no row. Updating keeps a trigger's id,
 * because Trigger.dev knows the schedule by that id.
 */
export class TriggerRepository {
  constructor(private readonly db: Database) {}

  listForRoutines(routineIds: string[]): Promise<Trigger[]> {
    if (routineIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.db
      .select()
      .from(triggers)
      .where(inArray(triggers.routineId, routineIds));
  }

  private async findOfType(routineId: string, type: Trigger['type']) {
    const [found] = await this.db
      .select()
      .from(triggers)
      .where(and(eq(triggers.routineId, routineId), eq(triggers.type, type)));
    return found;
  }

  /**
   * Sets or removes the routine's schedule. Returns the saved trigger, and
   * the id of a schedule that no longer exists (to remove it from
   * Trigger.dev too).
   */
  async setSchedule(routineId: string, cron: string | null, timezone: string) {
    const existing = await this.findOfType(routineId, 'cron');
    if (!cron) {
      if (existing) {
        await this.db.delete(triggers).where(eq(triggers.id, existing.id));
      }
      return {trigger: undefined, removedId: existing?.id};
    }
    if (existing) {
      const [updated] = await this.db
        .update(triggers)
        .set({cron, timezone})
        .where(eq(triggers.id, existing.id))
        .returning();
      return {trigger: updated, removedId: undefined};
    }
    const [created] = await this.db
      .insert(triggers)
      .values({routineId, type: 'cron', cron, timezone})
      .returning();
    return {trigger: created, removedId: undefined};
  }

  /** Turns the webhook on with a new secret hash, or off with null. */
  async setWebhook(routineId: string, secretHash: string | null) {
    const existing = await this.findOfType(routineId, 'webhook');
    if (!secretHash) {
      if (existing) {
        await this.db.delete(triggers).where(eq(triggers.id, existing.id));
      }
      return undefined;
    }
    if (existing) {
      const [updated] = await this.db
        .update(triggers)
        .set({webhookSecret: secretHash})
        .where(eq(triggers.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db
      .insert(triggers)
      .values({routineId, type: 'webhook', webhookSecret: secretHash})
      .returning();
    return created;
  }

  /** A trigger with whether its routine is switched on, for hooks and jobs. */
  async findWithRoutine(id: string) {
    const [found] = await this.db
      .select({
        id: triggers.id,
        type: triggers.type,
        webhookSecret: triggers.webhookSecret,
        routineId: routines.id,
        enabled: routines.enabled,
      })
      .from(triggers)
      .innerJoin(routines, eq(triggers.routineId, routines.id))
      .where(eq(triggers.id, id));
    return found;
  }
}
