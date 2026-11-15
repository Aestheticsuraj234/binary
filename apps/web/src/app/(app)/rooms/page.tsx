import {
  characterOf,
  ROUTING_MODE_INFO,
  type Agent,
  type Room,
} from '@binary/shared';
import {Plus, Users} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';

import {CharacterAvatar} from '@/components/characters/character';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Rooms · Binary'};

/** Rooms: several characters working together in one chat. */
export default async function RoomsPage() {
  const [roomData, agentData] = await Promise.all([
    getFromApi<{rooms: Room[]}>('/api/rooms'),
    getFromApi<{agents: Agent[]}>('/api/agents'),
  ]);
  const rooms = roomData?.rooms ?? [];
  const canCreate = (agentData?.agents.length ?? 0) >= 2;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">Rooms</h1>
          <p className="max-w-2xl text-muted-foreground">
            Put several characters in one chat. @Mention who should answer, or
            let the lead pick, and they build on each other&apos;s work.
          </p>
        </div>
        {canCreate && (
          <Button asChild className="rounded-full">
            <Link href="/rooms/new">
              <Plus />
              New room
            </Link>
          </Button>
        )}
      </div>

      {rooms.length === 0 ? (
        <div className="flex items-center gap-4 rounded-3xl border border-dashed p-5">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
            <Users className="size-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            {canCreate
              ? 'No rooms yet. Make one with two or more of your characters.'
              : 'Hire at least two characters to put them in a room.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rooms.map((room) => (
            <li key={room.id}>
              <Link
                href={`/rooms/${room.id}`}
                className="block space-y-3 rounded-3xl border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate font-semibold">{room.name}</h2>
                  <Badge variant="outline">
                    {ROUTING_MODE_INFO[room.routingMode].label}
                  </Badge>
                </div>
                <div className="flex -space-x-2">
                  {room.members.map((member) => (
                    <CharacterAvatar
                      key={member.id}
                      id={characterOf(member.avatar)}
                      size={36}
                    />
                  ))}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {room.members.map((member) => member.name).join(', ')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
