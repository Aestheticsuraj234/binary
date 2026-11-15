import {and, asc, desc, eq, inArray} from 'drizzle-orm';

import type {Database} from '../client';
import {agents, roomMembers, rooms} from '../schema';

export interface RoomChanges {
  name: string;
  routingMode: 'mention' | 'auto';
  leadAgentId: string;
  memberIds: string[];
}

const MEMBER_COLUMNS = {
  roomId: roomMembers.roomId,
  id: agents.id,
  name: agents.name,
  avatar: agents.avatar,
  role: agents.role,
};

/**
 * Rooms: named groups of the user's agents that chat together (Chapter
 * 13). Every call takes the owner's id; members must be their agents.
 */
export class RoomRepository {
  constructor(private readonly db: Database) {}

  /**
   * Creates a room with its members. Returns undefined if any member is
   * not one of the user's agents.
   */
  async create(userId: string, room: RoomChanges) {
    return this.db.transaction(async (tx) => {
      if (!(await this.ownsAll(tx, userId, room.memberIds))) {
        return undefined;
      }
      const [created] = await tx
        .insert(rooms)
        .values({
          userId,
          name: room.name,
          routingMode: room.routingMode,
          leadAgentId: room.leadAgentId,
        })
        .returning();
      if (!created) {
        throw new Error('Could not create the room.');
      }
      await tx
        .insert(roomMembers)
        .values(
          room.memberIds.map((agentId) => ({roomId: created.id, agentId})),
        );
      return created;
    });
  }

  /** Renames, re-routes and replaces the members, together. */
  async update(userId: string, id: string, room: RoomChanges) {
    return this.db.transaction(async (tx) => {
      if (!(await this.ownsAll(tx, userId, room.memberIds))) {
        return undefined;
      }
      const [updated] = await tx
        .update(rooms)
        .set({
          name: room.name,
          routingMode: room.routingMode,
          leadAgentId: room.leadAgentId,
        })
        .where(and(eq(rooms.id, id), eq(rooms.userId, userId)))
        .returning();
      if (!updated) {
        return undefined;
      }
      await tx.delete(roomMembers).where(eq(roomMembers.roomId, id));
      await tx
        .insert(roomMembers)
        .values(room.memberIds.map((agentId) => ({roomId: id, agentId})));
      return updated;
    });
  }

  /** Newest first, each with its members. */
  async listForUser(userId: string) {
    const list = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.userId, userId))
      .orderBy(desc(rooms.createdAt));
    const members = await this.membersOf(list.map((room) => room.id));
    return list.map((room) => ({
      ...room,
      members: members.filter((member) => member.roomId === room.id),
    }));
  }

  async findForUser(userId: string, id: string) {
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.userId, userId)));
    if (!room) {
      return undefined;
    }
    return {...room, members: await this.membersOf([room.id])};
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.userId, userId)))
      .returning({id: rooms.id});
    return deleted.length > 0;
  }

  private membersOf(roomIds: string[]) {
    if (roomIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.db
      .select(MEMBER_COLUMNS)
      .from(roomMembers)
      .innerJoin(agents, eq(roomMembers.agentId, agents.id))
      .where(inArray(roomMembers.roomId, roomIds))
      .orderBy(asc(agents.name));
  }

  private async ownsAll(
    tx: Pick<Database, 'select'>,
    userId: string,
    agentIds: string[],
  ) {
    const owned = await tx
      .select({id: agents.id})
      .from(agents)
      .where(and(eq(agents.userId, userId), inArray(agents.id, agentIds)));
    return owned.length === new Set(agentIds).size;
  }
}
