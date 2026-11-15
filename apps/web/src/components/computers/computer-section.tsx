'use client';

import {
  characterOf,
  type AgentComputer,
  type ComputerView,
  type ToolInfo,
} from '@binary/shared';
import {Box, Eye, Globe, Laptop, Monitor, Square} from 'lucide-react';
import Link from 'next/link';
import {useState} from 'react';

import {CharacterAvatar} from '@/components/characters/character';
import {ToolRow} from '@/components/tools/tool-row';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {stopComputer} from '@/lib/computers';

const COPY: Record<
  AgentComputer,
  {
    title: string;
    about: string;
    off: string;
    setup: React.ReactNode;
    icon: typeof Box;
    empty: string;
    stop: string;
  }
> = {
  sandbox: {
    title: 'Cloud sandbox',
    about:
      'A private Linux machine from E2B, one per chat, for characters whose computer is a cloud sandbox (Edit → Computer). It stops by itself after 10 idle minutes; its files go with it.',
    off: 'Sandboxes are off.',
    setup: (
      <>
        Get an API key at e2b.dev, add{' '}
        <code className="font-mono">E2B_API_KEY</code> to{' '}
        <code className="font-mono">.env</code> and restart the API.
      </>
    ),
    icon: Box,
    empty:
      'No sandbox is running. One starts when a character first runs code in a chat.',
    stop: 'Stop',
  },
  browser: {
    title: 'Browser',
    about:
      'A headless Chromium on this server, one per chat, for characters whose computer is a browser. It only reaches public addresses, never your network, and closes after 10 idle minutes.',
    off: 'Browsers are off.',
    setup: (
      <>
        Install Chromium with{' '}
        <code className="font-mono">pnpm browsers:install</code> and restart the
        API.
      </>
    ),
    icon: Globe,
    empty:
      'No browser is open. One opens when a character first visits a page in a chat.',
    stop: 'Close',
  },
  desktop: {
    title: 'Cloud desktop',
    about:
      'A full Linux desktop from E2B, one per chat, that you can watch live. The character sees screenshots; it asks before every click, key and word it types. It stops after 10 idle minutes.',
    off: 'Cloud desktops are off.',
    setup: (
      <>
        Get an API key at e2b.dev, add{' '}
        <code className="font-mono">E2B_API_KEY</code> to{' '}
        <code className="font-mono">.env</code> and restart the API.
      </>
    ),
    icon: Monitor,
    empty:
      'No desktop is running. One starts when a character first looks at it in a chat.',
    stop: 'Stop',
  },
  runner: {
    title: 'Your computer',
    about:
      'Your own computer, through the Runner app, only inside the folders you share when you start it. Reading asks nothing; commands and writes ask first. Claude Code and Codex run here too.',
    off: '',
    setup: null,
    icon: Laptop,
    empty: '',
    stop: '',
  },
};

interface ComputerSectionProps {
  kind: AgentComputer;
  available: boolean;
  tools: ToolInfo[];
  running: ComputerView[];
}

/**
 * One computer on the Apps page: whether this server can provide it, the
 * tools a character with it gets, and every one running right now.
 */
export function ComputerSection({
  kind,
  available,
  tools,
  running,
}: ComputerSectionProps) {
  const [computers, setComputers] = useState(running);
  const [stopping, setStopping] = useState<string>();
  const [error, setError] = useState('');
  const copy = COPY[kind];
  const Icon = copy.icon;

  async function handleStop(id: string) {
    setError('');
    setStopping(id);
    if (await stopComputer(id)) {
      setComputers((current) => current.filter((item) => item.id !== id));
    } else {
      setError('Could not stop it. Try again.');
    }
    setStopping(undefined);
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {copy.title}
          </h2>
          {available ? (
            <Badge variant="secondary">Set up</Badge>
          ) : (
            <Badge variant="outline">Not set up</Badge>
          )}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{copy.about}</p>
      </div>

      {!available && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium">{copy.off}</p>
          <p className="text-muted-foreground">{copy.setup}</p>
        </div>
      )}

      {tools.length > 0 && (
        <ul className="divide-y rounded-3xl border bg-card px-5">
          {tools.map((tool) => (
            <ToolRow key={tool.name} tool={tool} />
          ))}
        </ul>
      )}

      {kind === 'runner' && (
        <Link
          href="/computers"
          className="flex items-center gap-4 rounded-3xl border border-dashed p-5 hover:border-primary/50"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
            <Laptop className="size-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Pair a computer, see whether it is online, or pause it, under{' '}
            <span className="font-medium text-foreground">Your computers</span>.
          </p>
        </Link>
      )}

      {available && kind !== 'runner' && (
        <div className="space-y-2">
          <h3 className="font-semibold">Running now</h3>
          {computers.length === 0 ? (
            <div className="flex items-center gap-4 rounded-3xl border border-dashed p-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
                <Icon className="size-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{copy.empty}</p>
            </div>
          ) : (
            <ul className="divide-y rounded-3xl border bg-card px-5">
              {computers.map((computer) => (
                <li key={computer.id} className="flex items-center gap-3 py-3">
                  {computer.agent && (
                    <CharacterAvatar
                      id={characterOf(computer.agent.avatar)}
                      size={32}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {computer.agent?.name ?? 'A deleted character'}
                      <span className="text-muted-foreground">
                        {' · '}
                        {computer.threadTitle ?? 'Untitled chat'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      About {computer.minutesUsed} min so far
                    </p>
                  </div>
                  {computer.watchUrl && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                    >
                      <a
                        href={computer.watchUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Eye />
                        Watch
                      </a>
                    </Button>
                  )}
                  {computer.agent && computer.threadId && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                    >
                      <Link
                        href={`/agents/${computer.agent.id}?chat=${computer.threadId}`}
                      >
                        Chat
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => handleStop(computer.id)}
                    disabled={stopping === computer.id}
                  >
                    <Square />
                    {copy.stop}
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
