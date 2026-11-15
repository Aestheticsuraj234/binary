'use client';

import type {ComputerView, SessionComputer} from '@binary/shared';
import {Eye, Square} from 'lucide-react';
import {useEffect, useState} from 'react';

import {Button} from '@/components/ui/button';
import {listComputers, stopComputer} from '@/lib/computers';

const COPY: Record<
  SessionComputer,
  {label: string; stop: string; confirm: string}
> = {
  sandbox: {
    label: 'Sandbox on',
    stop: 'Stop sandbox',
    confirm: 'Stop the sandbox? Its files are deleted.',
  },
  browser: {
    label: 'Browser open',
    stop: 'Close browser',
    confirm: 'Close the browser? Its tabs and sign-ins are lost.',
  },
  desktop: {
    label: 'Desktop on',
    stop: 'Stop desktop',
    confirm: 'Stop the desktop? Everything open on it is lost.',
  },
};

interface ComputerChipProps {
  threadId: string;
  kind: SessionComputer;
  /** Changes after each reply or decision, so the chip checks again. */
  checkKey: number;
}

/**
 * "Sandbox on" or "Browser open", with a stop button, in a chat's header
 * while that chat's computer is running, so it never runs unseen. Shows
 * nothing otherwise.
 */
export function ComputerChip({threadId, kind, checkKey}: ComputerChipProps) {
  const [computer, setComputer] = useState<ComputerView>();
  const [isStopping, setIsStopping] = useState(false);
  const copy = COPY[kind];

  useEffect(() => {
    let current = true;
    listComputers().then(({computers}) => {
      if (current) {
        setComputer(
          computers.find(
            (item) => item.threadId === threadId && item.kind === kind,
          ),
        );
      }
    });
    return () => {
      current = false;
    };
  }, [threadId, kind, checkKey]);

  if (!computer) {
    return null;
  }

  async function handleStop() {
    if (!computer || !window.confirm(copy.confirm)) {
      return;
    }
    setIsStopping(true);
    if (await stopComputer(computer.id)) {
      setComputer(undefined);
    }
    setIsStopping(false);
  }

  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-2.5 text-xs"
      title={`Running for about ${computer.minutesUsed} min. It stops by itself after 10 idle minutes.`}
    >
      <span className="size-1.5 animate-pulse rounded-full bg-primary" />
      <span className="text-muted-foreground">{copy.label}</span>
      {computer.watchUrl && (
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="size-6 rounded-full text-muted-foreground hover:text-foreground"
        >
          <a
            href={computer.watchUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Watch live"
            title="Watch live (view only)"
          >
            <Eye className="size-3" />
          </a>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-6 rounded-full text-muted-foreground hover:text-destructive"
        onClick={handleStop}
        disabled={isStopping}
        aria-label={copy.stop}
        title={copy.stop}
      >
        <Square className="size-3" />
      </Button>
    </div>
  );
}
