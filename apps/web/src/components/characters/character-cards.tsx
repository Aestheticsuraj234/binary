import {
  CHARACTERS,
  characterOf,
  TEMPLATE_CHARACTERS,
  type Agent,
  type AgentTemplate,
  type CharacterId,
} from '@binary/shared';
import {ArrowRight, Plus} from 'lucide-react';
import Link from 'next/link';

import {ModelBadge} from '@/components/agents/model-badge';
import {Character, CharacterAvatar} from '@/components/characters/character';

const CARD =
  'group flex h-full flex-col overflow-hidden rounded-3xl border bg-card transition duration-200 hover:-translate-y-1 hover:border-primary/60 focus-visible:-translate-y-1';

/** The character on a soft panel tinted with its own color. */
function Stage({id, size = 132}: {id: CharacterId; size?: number}) {
  return (
    <div
      className="grid h-44 place-items-center"
      style={{backgroundColor: `${CHARACTERS[id].color}1f`}}
    >
      <Character id={id} size={size} />
    </div>
  );
}

/** A character you have hired. Opens the conversation. */
export function CrewCard({agent}: {agent: Agent}) {
  return (
    <Link href={`/agents/${agent.id}`} className={CARD}>
      <Stage id={characterOf(agent.avatar)} />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="truncate text-lg font-semibold">{agent.name}</h3>
        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
          {agent.role}
        </p>
        <ModelBadge agent={agent} />
      </div>
    </Link>
  );
}

/** A ready-made role, played by its character. Opens the hire page. */
export function CastCard({template}: {template: AgentTemplate}) {
  const id = TEMPLATE_CHARACTERS[template.slug] ?? 'pebble';
  const character = CHARACTERS[id];

  return (
    <Link href={`/agents/new?template=${template.slug}`} className={CARD}>
      <Stage id={id} />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold">{character.name}</h3>
          <span className="truncate text-xs text-muted-foreground">
            {template.name}
          </span>
        </div>
        <p className="flex-1 text-sm text-muted-foreground">
          {character.personality}
        </p>
        <span className="inline-flex items-center gap-1 text-sm font-medium transition-colors group-hover:text-primary">
          Hire {character.name}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

const SPARE_CAST: CharacterId[] = ['ember', 'moss', 'pebble', 'juno'];

/** Start from a blank page with any character. */
export function DesignYourOwnCard() {
  return (
    <Link href="/agents/new" className={`${CARD} border-dashed bg-transparent`}>
      <div className="grid h-44 place-items-center">
        <div className="flex -space-x-3">
          {SPARE_CAST.map((id) => (
            <CharacterAvatar
              key={id}
              id={id}
              size={60}
              className="ring-4 ring-background"
            />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-semibold">Design your own</h3>
        <p className="flex-1 text-sm text-muted-foreground">
          Pick any character, give it a name and a job.
        </p>
        <span className="inline-flex items-center gap-1 text-sm font-medium transition-colors group-hover:text-primary">
          <Plus className="size-4" />
          Start from scratch
        </span>
      </div>
    </Link>
  );
}
