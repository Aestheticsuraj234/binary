'use client';

import type {DeviceView} from '@binary/shared';
import {Check, Copy, Laptop, Pause, Play, Plus, Trash2} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  addDevice,
  listDevices,
  removeDevice,
  setPaused,
  type NewDevice,
} from '@/lib/devices';
import {cn} from '@/lib/utils';

// How often the page checks whether computers came online.
const REFRESH_MS = 4000;

/** A command to copy, in mono, with a copy button. */
function CommandLine({command}: {command: string}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(command).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-zinc-950 py-1 pr-1 pl-3 font-mono text-sm text-zinc-100">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">
        {command}
      </code>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 rounded-full text-zinc-400 hover:text-zinc-100"
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : `Copy: ${command}`}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}

function Status({device}: {device: DeviceView}) {
  if (device.pairing) {
    return (
      <Badge variant="outline" className="border-warning/40 text-warning">
        Waiting for pairing
      </Badge>
    );
  }
  if (device.paused) {
    return (
      <Badge variant="outline" className="border-warning/40 text-warning">
        Paused
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span
        className={cn(
          'size-1.5 rounded-full',
          device.online ? 'animate-pulse bg-primary' : 'bg-muted-foreground',
        )}
      />
      {device.online ? 'Online' : 'Offline'}
    </Badge>
  );
}

/**
 * Add a computer (shows its one-time code and the commands to run), and
 * see, pause or remove the ones already paired. The list refreshes itself,
 * so a computer turns "Online" as soon as its Runner starts.
 */
export function YourComputers({
  initialDevices,
}: {
  initialDevices: DeviceView[];
}) {
  const router = useRouter();
  const [devices, setDevices] = useState(initialDevices);
  const [name, setName] = useState('');
  const [added, setAdded] = useState<NewDevice>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string>();

  useEffect(() => {
    const timer = setInterval(() => {
      listDevices().then(({data}) => {
        if (data) {
          setDevices(data.devices);
        }
      });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const pairedNow =
    added &&
    devices.some((device) => device.id === added.device.id && !device.pairing);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy('add');
    const {data, error: failed} = await addDevice(name);
    setBusy(undefined);
    if (!data) {
      setError(failed ?? 'Could not add the computer.');
      return;
    }
    setAdded(data);
    setName('');
    setDevices((current) => [data.device, ...current]);
  }

  async function handlePause(device: DeviceView) {
    setBusy(device.id);
    const {data} = await setPaused(device.id, !device.paused);
    setBusy(undefined);
    if (data) {
      setDevices((current) =>
        current.map((item) => (item.id === device.id ? data.device : item)),
      );
    }
  }

  async function handleRemove(device: DeviceView) {
    if (
      !window.confirm(
        `Remove ${device.name}? Its Runner is signed out and your characters can no longer reach it.`,
      )
    ) {
      return;
    }
    setBusy(device.id);
    await removeDevice(device.id);
    setBusy(undefined);
    setDevices((current) => current.filter((item) => item.id !== device.id));
    if (added?.device.id === device.id) {
      setAdded(undefined);
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-3xl border bg-card p-5">
        <h2 className="font-semibold">Add a computer</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-2">
            <Label htmlFor="computer-name">Name</Label>
            <Input
              id="computer-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="MacBook"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="rounded-full"
            disabled={busy === 'add' || name.trim() === ''}
          >
            <Plus />
            Add computer
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {added && !pairedNow && (
          <div className="space-y-3 border-t pt-4 text-sm">
            <p>
              Your code is{' '}
              <span className="font-mono text-lg font-semibold tracking-wider">
                {added.pairingCode}
              </span>{' '}
              <span className="text-muted-foreground">
                (works once, for 15 minutes)
              </span>
            </p>
            <p className="text-muted-foreground">
              On {added.device.name}, in the Binary folder, pair the Runner:
            </p>
            <CommandLine command={`pnpm runner pair ${added.pairingCode}`} />
            <p className="text-muted-foreground">
              Then start it, sharing only the folders your characters may use:
            </p>
            <CommandLine command="pnpm runner start --folder ~/code/my-project" />
          </div>
        )}
        {pairedNow && (
          <p className="flex items-center gap-2 border-t pt-4 text-sm">
            <Check className="size-4 text-primary" />
            {added.device.name} is paired. Start the Runner with the folders to
            share, and it shows as Online below.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">Paired</h2>
        {devices.length === 0 ? (
          <div className="flex items-center gap-4 rounded-3xl border border-dashed p-5">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
              <Laptop className="size-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              No computers yet. Add one above to pair its Runner.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {devices.map((device) => (
              <li
                key={device.id}
                className="space-y-3 rounded-3xl border bg-card p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Laptop className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{device.name}</p>
                    {device.os && (
                      <p className="text-xs text-muted-foreground">
                        {device.os}
                      </p>
                    )}
                  </div>
                  <Status device={device} />
                </div>
                {device.allowedFolders.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Shared folders
                    </p>
                    <ul className="space-y-1">
                      {device.allowedFolders.map((folder) => (
                        <li key={folder} className="truncate font-mono text-xs">
                          {folder}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!device.pairing && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => handlePause(device)}
                      disabled={busy === device.id}
                    >
                      {device.paused ? <Play /> : <Pause />}
                      {device.paused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(device)}
                      disabled={busy === device.id}
                    >
                      <Trash2 />
                      Remove
                    </Button>
                  </div>
                )}
                {device.pairing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(device)}
                  >
                    <Trash2 />
                    Cancel
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
