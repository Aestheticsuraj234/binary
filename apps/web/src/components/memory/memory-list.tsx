'use client';

import type {MemoryStatus, MemoryView} from '@binary/shared';
import {Brain, Plus, Trash2} from 'lucide-react';
import {useState} from 'react';

import {EmbeddingKeyNotice} from '@/components/memory/unavailable-notice';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {addMemory, deleteMemory} from '@/lib/memory';

const DATE = new Intl.DateTimeFormat('en-GB', {dateStyle: 'medium'});

interface MemoryListProps {
  agentId: string;
  agentName: string;
  status: MemoryStatus;
  initialMemories: MemoryView[];
}

/** What a character remembers about you: add, read and delete. */
export function MemoryList({
  agentId,
  agentName,
  status,
  initialMemories,
}: MemoryListProps) {
  const [memories, setMemories] = useState(initialMemories);
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const {data, error: failed} = await addMemory(agentId, content);
    setBusy(false);
    if (failed || !data) {
      setError(failed ?? 'Could not save it.');
      return;
    }
    if (data.saved) {
      const saved = data.saved;
      setMemories((current) => [saved, ...current]);
      setContent('');
    } else {
      setNotice(`${agentName} already remembers: “${data.alreadyKnown}”`);
    }
  }

  async function handleDelete(memory: MemoryView) {
    const {error: failed} = await deleteMemory(agentId, memory.id);
    if (failed) {
      setError(failed);
      return;
    }
    setMemories((current) => current.filter((item) => item.id !== memory.id));
  }

  return (
    <div className="space-y-6">
      {!status.available && <EmbeddingKeyNotice what="Memory" />}
      {status.unsearchable > 0 && (
        <p className="text-sm text-warning">
          {status.unsearchable} older{' '}
          {status.unsearchable === 1 ? 'memory was' : 'memories were'} saved
          with another embedding model, so {agentName} can&apos;t find{' '}
          {status.unsearchable === 1 ? 'it' : 'them'} now.
        </p>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <Input
          aria-label="Something to remember"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="e.g. I prefer short answers"
          className="min-w-56 flex-1"
          disabled={!status.available}
        />
        <Button
          type="submit"
          variant="secondary"
          className="rounded-full"
          disabled={busy || !status.available || content.trim() === ''}
        >
          <Plus />
          Remember
        </Button>
      </form>
      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {memories.length === 0 ? (
        <div className="flex items-center gap-4 rounded-3xl border border-dashed p-5">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
            <Brain className="size-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            {agentName} doesn&apos;t remember anything yet. Tell it something to
            keep in a chat (&ldquo;remember that…&rdquo;), or add it here.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-3xl border bg-card px-5">
          {memories.map((memory) => (
            <li key={memory.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm">{memory.content}</p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="font-normal">
                    {memory.from === 'chat' ? 'From a chat' : 'Added by you'}
                  </Badge>
                  {DATE.format(new Date(memory.createdAt))}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(memory)}
                aria-label={`Forget: ${memory.content}`}
                title="Forget"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
