import type {KnowledgeMatch} from '@binary/shared';

import {KnowledgeMatches} from '@/components/memory/knowledge-library';

import {field, text} from './output-fields';

function isMatch(value: unknown): value is KnowledgeMatch {
  return (
    typeof field(value, 'title') === 'string' &&
    typeof field(value, 'content') === 'string' &&
    typeof field(value, 'score') === 'number'
  );
}

/** Whether a result is from a memory or knowledge tool. */
export function isMemoryOutput(output: unknown): boolean {
  return (
    Array.isArray(field(output, 'matches')) ||
    Array.isArray(field(output, 'memories')) ||
    field(output, 'saved') !== undefined ||
    typeof field(output, 'alreadyKnown') === 'string'
  );
}

/**
 * A memory or knowledge result in words: what was saved, what was already
 * known, which memories came back, or which passages a search found.
 */
export function MemoryOutput({output}: {output: unknown}) {
  const matches = field(output, 'matches');
  if (Array.isArray(matches)) {
    return <KnowledgeMatches matches={matches.filter(isMatch)} />;
  }
  const memories = field(output, 'memories');
  if (Array.isArray(memories)) {
    return memories.length === 0 ? (
      <p className="text-muted-foreground">No memories found.</p>
    ) : (
      <ul className="list-disc space-y-1 pl-4">
        {memories.map((memory: unknown, index) => (
          <li key={index}>{text(field(memory, 'content'))}</li>
        ))}
      </ul>
    );
  }
  const alreadyKnown = text(field(output, 'alreadyKnown'));
  if (alreadyKnown) {
    return (
      <p className="text-muted-foreground">
        Already remembered: “{alreadyKnown}”
      </p>
    );
  }
  return (
    <p>
      <span className="text-muted-foreground">Saved to memory: </span>“
      {text(field(field(output, 'saved'), 'content'))}”
    </p>
  );
}
