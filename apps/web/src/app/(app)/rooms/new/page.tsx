import type {Agent} from '@binary/shared';
import {ArrowLeft} from 'lucide-react';
import type {Metadata} from 'next';
import Link from 'next/link';

import {RoomForm} from '@/components/rooms/room-form';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'New room · Binary'};

export default async function NewRoomPage() {
  const data = await getFromApi<{agents: Agent[]}>('/api/agents');

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href="/rooms"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Rooms
      </Link>
      <h1 className="text-4xl font-semibold tracking-tight">New room</h1>
      <RoomForm agents={data?.agents ?? []} />
    </main>
  );
}
