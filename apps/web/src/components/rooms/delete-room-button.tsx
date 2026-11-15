'use client';

import {Trash2} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {Button} from '@/components/ui/button';
import {deleteRoom} from '@/lib/rooms';

/** Deletes a room and its chats (the characters stay), after a confirm. */
export function DeleteRoomButton({
  roomId,
  name,
}: {
  roomId: string;
  name: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete the room ${name} and its chats? The characters stay.`,
      )
    ) {
      return;
    }
    const {error: failed} = await deleteRoom(roomId);
    if (failed) {
      setError(failed);
      return;
    }
    router.push('/rooms');
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
      >
        <Trash2 />
        Delete room
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
