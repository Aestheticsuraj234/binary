import type {ChatMessage, Room, Thread} from '@binary/shared';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';

import {RoomChat} from '@/components/rooms/room-chat';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Room · Binary'};

interface RoomPageProps {
  params: Promise<{id: string}>;
  /** `?chat=<thread id>` opens a saved chat; without it, a new one. */
  searchParams: Promise<{chat?: string}>;
}

export default async function RoomPage({params, searchParams}: RoomPageProps) {
  const [{id}, {chat}] = await Promise.all([params, searchParams]);
  const [roomData, chatData] = await Promise.all([
    getFromApi<{room: Room; threads: Thread[]}>(`/api/rooms/${id}`),
    chat
      ? getFromApi<{thread: Thread; messages: ChatMessage[]}>(
          `/api/threads/${chat}`,
        )
      : null,
  ]);
  if (!roomData || (chat && chatData?.thread.roomId !== id)) {
    notFound();
  }

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      <RoomChat
        key={roomData.room.id}
        room={roomData.room}
        threadId={chatData?.thread.id}
        title={chatData?.thread.title}
        savedMessages={chatData?.messages ?? []}
        chats={roomData.threads}
      />
    </main>
  );
}
