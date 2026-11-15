'use client';

import {
  characterOf,
  MAX_ROOM_MEMBERS,
  ROUTING_MODE_INFO,
  ROUTING_MODES,
  roomInputSchema,
  type Agent,
  type Room,
  type RoutingMode,
} from '@binary/shared';
import {Check} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {CharacterAvatar} from '@/components/characters/character';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {saveRoom} from '@/lib/rooms';
import {cn} from '@/lib/utils';

interface RoomFormProps {
  agents: Agent[];
  /** The room being edited. Without one, the form makes a new room. */
  room?: Room;
}

/** Name a room, pick who is in it, and how it decides who answers. */
export function RoomForm({agents, room}: RoomFormProps) {
  const router = useRouter();
  const [name, setName] = useState(room?.name ?? '');
  const [memberIds, setMemberIds] = useState<string[]>(
    room?.members.map((member) => member.id) ?? [],
  );
  const [routingMode, setRoutingMode] = useState<RoutingMode>(
    room?.routingMode ?? 'mention',
  );
  const [leadId, setLeadId] = useState(room?.leadAgentId ?? '');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const members = agents.filter((agent) => memberIds.includes(agent.id));
  // The lead is the chosen one if still in the room, else the first member.
  const lead = memberIds.includes(leadId) ? leadId : (memberIds[0] ?? '');

  function toggle(id: string) {
    setMemberIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < MAX_ROOM_MEMBERS
          ? [...current, id]
          : current,
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const parsed = roomInputSchema.safeParse({
      name,
      memberIds,
      routingMode,
      leadAgentId: lead,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }
    setIsPending(true);
    const {data, error: failed} = await saveRoom(parsed.data, room?.id);
    setIsPending(false);
    if (!data) {
      setError(failed ?? 'Could not save the room.');
      return;
    }
    router.push(`/rooms/${data.room.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="room-name">Name</Label>
        <Input
          id="room-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Launch team"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Who is in it{' '}
          <span className="font-normal text-muted-foreground">
            ({memberIds.length} of up to {MAX_ROOM_MEMBERS})
          </span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {agents.map((agent) => {
            const picked = memberIds.includes(agent.id);
            return (
              <button
                key={agent.id}
                type="button"
                aria-pressed={picked}
                onClick={() => toggle(agent.id)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:border-primary/50',
                  picked && 'border-primary bg-primary/5',
                )}
              >
                <CharacterAvatar id={characterOf(agent.avatar)} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {agent.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {agent.role}
                  </span>
                </span>
                {picked && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 *:w-full">
          <Label htmlFor="routing-mode">Who answers</Label>
          <NativeSelect
            id="routing-mode"
            className="h-10 w-full"
            value={routingMode}
            onChange={(event) =>
              setRoutingMode(
                ROUTING_MODES.find((mode) => mode === event.target.value) ??
                  'mention',
              )
            }
          >
            {ROUTING_MODES.map((mode) => (
              <NativeSelectOption key={mode} value={mode}>
                {ROUTING_MODE_INFO[mode].label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            {ROUTING_MODE_INFO[routingMode].description}
          </p>
        </div>
        <div className="space-y-2 *:w-full">
          <Label htmlFor="room-lead">Lead</Label>
          <NativeSelect
            id="room-lead"
            className="h-10 w-full"
            value={lead}
            onChange={(event) => setLeadId(event.target.value)}
            disabled={members.length === 0}
          >
            {members.map((member) => (
              <NativeSelectOption key={member.id} value={member.id}>
                {member.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            {routingMode === 'auto'
              ? 'Reads each message and picks who answers.'
              : 'Answers when no one is mentioned.'}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="h-11 rounded-full px-6"
        disabled={isPending}
      >
        {room ? 'Save room' : 'Create room'}
      </Button>
    </form>
  );
}
