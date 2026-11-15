import type {Agent, Room} from '@binary/shared';
import {ArrowLeft} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';

import {DeleteRoomButton} from '@/components/rooms/delete-room-button';
import {RoomForm} from '@/components/rooms/room-form';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Edit room · Binary'};

interface EditRoomPageProps {
  params: Promise<{id: string}>;
}

export default async function EditRoomPage({params}: EditRoomPageProps) {
  const {id} = await params;
  const [roomData, agentData] = await Promise.all([
    getFromApi<{room: Room}>(`/api/rooms/${id}`),
    getFromApi<{agents: Agent[]}>('/api/agents'),
  ]);
  if (!roomData) {
    notFound();
  }
  const {room} = roomData;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href={`/rooms/${room.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to {room.name}
      </Link>
      <h1 className="text-4xl font-semibold tracking-tight">
        Edit {room.name}
      </h1>
      <RoomForm agents={agentData?.agents ?? []} room={room} />
      <div className="border-t pt-6">
        <DeleteRoomButton roomId={room.id} name={room.name} />
      </div>
    </main>
  );
}
