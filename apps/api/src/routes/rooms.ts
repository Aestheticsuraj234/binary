import {roomInputSchema, type Room} from '@binary/shared';
import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {NotFoundError, parseBody, ValidationError} from '../errors';
import {isUuid} from './ids';

// How many of a room's chats its page lists.
const CHAT_LIMIT = 20;

type SavedRoom = NonNullable<
  Awaited<ReturnType<AppDependencies['rooms']['findForUser']>>
>;

function toRoomView(room: SavedRoom): Room {
  return {
    id: room.id,
    name: room.name,
    routingMode: room.routingMode,
    leadAgentId: room.leadAgentId,
    members: room.members.map(({id, name, avatar, role}) => ({
      id,
      name,
      avatar,
      role,
    })),
    createdAt: room.createdAt.toISOString(),
  };
}

/** Rooms: create, list, change, delete, and their chats. */
export function roomRoutes({rooms, threads}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  async function findRoom(userId: string, id: string) {
    const room = isUuid(id) ? await rooms.findForUser(userId, id) : undefined;
    if (!room) {
      throw new NotFoundError('Room');
    }
    return room;
  }

  routes.get('/', async (c) => {
    const list = await rooms.listForUser(c.get('user').id);
    return c.json({rooms: list.map(toRoomView)});
  });

  routes.post('/', async (c) => {
    const userId = c.get('user').id;
    const input = await parseBody(c, roomInputSchema);
    const created = await rooms.create(userId, input);
    if (!created) {
      throw new ValidationError('Pick characters you have hired.');
    }
    return c.json({room: toRoomView(await findRoom(userId, created.id))}, 201);
  });

  routes.get('/:id', async (c) => {
    const userId = c.get('user').id;
    const room = await findRoom(userId, c.req.param('id'));
    const chats = await threads.listForRoom(userId, room.id, CHAT_LIMIT);
    return c.json({room: toRoomView(room), threads: chats});
  });

  routes.put('/:id', async (c) => {
    const userId = c.get('user').id;
    const {id} = await findRoom(userId, c.req.param('id'));
    const input = await parseBody(c, roomInputSchema);
    if (!(await rooms.update(userId, id, input))) {
      throw new ValidationError('Pick characters you have hired.');
    }
    return c.json({room: toRoomView(await findRoom(userId, id))});
  });

  routes.delete('/:id', async (c) => {
    const userId = c.get('user').id;
    const {id} = await findRoom(userId, c.req.param('id'));
    await rooms.delete(userId, id);
    return c.body(null, 204);
  });

  // A new chat in the room; messages go to /api/threads/:id/messages.
  routes.post('/:id/threads', async (c) => {
    const userId = c.get('user').id;
    const room = await findRoom(userId, c.req.param('id'));
    const thread = await threads.createForRoom(userId, room.id);
    return c.json({thread}, 201);
  });

  return routes;
}
