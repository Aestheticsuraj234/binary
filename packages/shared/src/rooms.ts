import {z} from 'zod';

/**
 * How a room decides who answers (the database enum uses this list):
 *
 * - mention: the characters you @mention, or the lead if you mention none
 * - auto: the lead reads your message and picks who should answer
 */
export const ROUTING_MODES = ['mention', 'auto'] as const;

export type RoutingMode = (typeof ROUTING_MODES)[number];

export const ROUTING_MODE_INFO: Record<
  RoutingMode,
  {label: string; description: string}
> = {
  mention: {
    label: '@Mention',
    description:
      'The characters you @mention answer, in order. Mention no one and the lead answers.',
  },
  auto: {
    label: 'Automatic',
    description:
      'The lead reads each message and picks who should answer. An @mention still wins.',
  },
};

/** A room holds this many characters at most. */
export const MAX_ROOM_MEMBERS = 6;

/**
 * Replies to one message, at most, counting characters who hand work on
 * to each other with an @mention. Stops a room talking in circles.
 */
export const MAX_ROOM_REPLIES = 4;

export const roomInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name the room.')
      .max(60, 'Keep the name under 60 characters.'),
    memberIds: z
      .array(z.uuid())
      .min(2, 'Pick at least two characters.')
      .max(
        MAX_ROOM_MEMBERS,
        `A room holds ${MAX_ROOM_MEMBERS} characters at most.`,
      )
      .refine(
        (ids) => new Set(ids).size === ids.length,
        'Pick each character once.',
      ),
    routingMode: z.enum(ROUTING_MODES),
    leadAgentId: z.uuid(),
  })
  .refine((room) => room.memberIds.includes(room.leadAgentId), {
    path: ['leadAgentId'],
    message: 'The lead must be in the room.',
  });

export type RoomInput = z.infer<typeof roomInputSchema>;

export interface RoomMember {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
}

/** A room, as the web app shows it. */
export interface Room {
  id: string;
  name: string;
  routingMode: RoutingMode;
  leadAgentId: string | null;
  members: RoomMember[];
  createdAt: string;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The members a text @mentions, in the order they appear, each once.
 * Names can have spaces ("@Ada Lovelace"); longer names are tried first, so
 * "@Ada Lovelace" is not read as "@Ada".
 */
export function findMentions<T extends {id: string; name: string}>(
  text: string,
  members: T[],
): T[] {
  const byLength = [...members].sort((a, b) => b.name.length - a.name.length);
  const found: {member: T; at: number}[] = [];
  const taken: [number, number][] = [];
  for (const member of byLength) {
    const pattern = new RegExp(`@${escapeRegExp(member.name)}(?![\\w-])`, 'gi');
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      if (taken.some(([from, to]) => start < to && end > from)) {
        continue;
      }
      taken.push([start, end]);
      if (!found.some((item) => item.member.id === member.id)) {
        found.push({member, at: start});
      }
    }
  }
  return found.sort((a, b) => a.at - b.at).map((item) => item.member);
}
