'use client';

import type {SandboxView} from '@binary/shared';
import {Square} from 'lucide-react';
import {useEffect, useState} from 'react';

import {Button} from '@/components/ui/button';
import {listSandboxes, stopSandbox} from '@/lib/sandboxes';

interface SandboxChipProps {
  threadId: string;
  /** Changes after each reply or decision, so the chip checks again. */
  checkKey: number;
}

/**
 * "Sandbox on · Stop" in a chat's header while that chat's cloud sandbox
 * is running, so it never runs unseen. Shows nothing otherwise.
 */
export function SandboxChip({threadId, checkKey}: SandboxChipProps) {
  const [sandbox, setSandbox] = useState<SandboxView>();
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    let current = true;
    listSandboxes().then(({sandboxes}) => {
      if (current) {
        setSandbox(sandboxes.find((item) => item.threadId === threadId));
      }
    });
    return () => {
      current = false;
    };
  }, [threadId, checkKey]);

  if (!sandbox) {
    return null;
  }

  async function handleStop() {
    if (
      !sandbox ||
      !window.confirm('Stop the sandbox? Its files are deleted.')
    ) {
      return;
    }
    setIsStopping(true);
    if (await stopSandbox(sandbox.id)) {
      setSandbox(undefined);
    }
    setIsStopping(false);
  }

  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-2.5 text-xs"
      title={`Running for about ${sandbox.minutesUsed} min. It stops by itself after 10 idle minutes.`}
    >
      <span className="size-1.5 animate-pulse rounded-full bg-primary" />
      <span className="text-muted-foreground">Sandbox on</span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-6 rounded-full text-muted-foreground hover:text-destructive"
        onClick={handleStop}
        disabled={isStopping}
        aria-label="Stop sandbox"
        title="Stop sandbox"
      >
        <Square className="size-3" />
      </Button>
    </div>
  );
}
