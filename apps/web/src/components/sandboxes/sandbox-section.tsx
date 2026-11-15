'use client';

import {characterOf, type SandboxView, type ToolInfo} from '@binary/shared';
import {Box, Square} from 'lucide-react';
import Link from 'next/link';
import {useState} from 'react';

import {CharacterAvatar} from '@/components/characters/character';
import {ToolRow} from '@/components/tools/tool-row';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {stopSandbox} from '@/lib/sandboxes';

interface SandboxSectionProps {
  available: boolean;
  tools: ToolInfo[];
  running: SandboxView[];
}

/**
 * The Apps page's cloud sandbox: whether E2B is set up, the tools a
 * character with a sandbox gets, and every sandbox running right now.
 */
export function SandboxSection({
  available,
  tools,
  running,
}: SandboxSectionProps) {
  const [sandboxes, setSandboxes] = useState(running);
  const [stopping, setStopping] = useState<string>();
  const [error, setError] = useState('');

  async function handleStop(id: string) {
    setError('');
    setStopping(id);
    if (await stopSandbox(id)) {
      setSandboxes((current) => current.filter((item) => item.id !== id));
    } else {
      setError('Could not stop the sandbox. Try again.');
    }
    setStopping(undefined);
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Cloud sandbox
          </h2>
          {available ? (
            <Badge variant="secondary">Set up</Badge>
          ) : (
            <Badge variant="outline">Not set up</Badge>
          )}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A private Linux machine from E2B, one per chat, for characters whose
          computer is a cloud sandbox (Edit → Computer). It stops by itself
          after 10 idle minutes; its files go with it.
        </p>
      </div>

      {!available && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium">Sandboxes are off.</p>
          <p className="text-muted-foreground">
            Get an API key at e2b.dev, add{' '}
            <code className="font-mono">E2B_API_KEY</code> to{' '}
            <code className="font-mono">apps/api/.env</code> and restart the
            API.
          </p>
        </div>
      )}

      {tools.length > 0 && (
        <ul className="divide-y rounded-3xl border bg-card px-5">
          {tools.map((tool) => (
            <ToolRow key={tool.name} tool={tool} />
          ))}
        </ul>
      )}

      {available && (
        <div className="space-y-2">
          <h3 className="font-semibold">Running now</h3>
          {sandboxes.length === 0 ? (
            <div className="flex items-center gap-4 rounded-3xl border border-dashed p-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
                <Box className="size-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                No sandbox is running. One starts when a character first runs
                code in a chat.
              </p>
            </div>
          ) : (
            <ul className="divide-y rounded-3xl border bg-card px-5">
              {sandboxes.map((sandbox) => (
                <li key={sandbox.id} className="flex items-center gap-3 py-3">
                  {sandbox.agent && (
                    <CharacterAvatar
                      id={characterOf(sandbox.agent.avatar)}
                      size={32}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {sandbox.agent?.name ?? 'A deleted character'}
                      <span className="text-muted-foreground">
                        {' · '}
                        {sandbox.threadTitle ?? 'Untitled chat'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      About {sandbox.minutesUsed} min so far
                    </p>
                  </div>
                  {sandbox.agent && sandbox.threadId && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                    >
                      <Link
                        href={`/agents/${sandbox.agent.id}?chat=${sandbox.threadId}`}
                      >
                        Chat
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => handleStop(sandbox.id)}
                    disabled={stopping === sandbox.id}
                  >
                    <Square />
                    Stop
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
