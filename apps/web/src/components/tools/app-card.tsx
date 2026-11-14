'use client';

import type {ConnectedApp} from '@binary/shared';
import {Lock} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {ToolRow} from '@/components/tools/tool-row';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {API_URL} from '@/lib/env';

/** Only the host, e.g. "mcp.composio.dev": paths can contain ids. */
function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** One connected app: whether it is reachable, and the tools it brings. */
export function AppCard({app}: {app: ConnectedApp}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleRemove() {
    if (
      !window.confirm(`Remove ${app.name}? Your characters lose its tools.`)
    ) {
      return;
    }
    setIsPending(true);
    const response = await fetch(`${API_URL}/api/apps/${app.id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => null);
    setIsPending(false);
    if (!response?.ok) {
      setError('Could not remove the app. Try again.');
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-3xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{app.name}</h3>
            {app.status === 'active' ? (
              <Badge variant="secondary">Connected</Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-destructive/50 text-destructive"
              >
                Can&apos;t connect
              </Badge>
            )}
          </div>
          <p className="flex items-center gap-1.5 truncate font-mono text-xs text-muted-foreground">
            {hostOf(app.url)}
            {app.hasAuthorization && (
              <Lock className="size-3" aria-label="Uses a token" />
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-muted-foreground hover:text-destructive"
          onClick={handleRemove}
          disabled={isPending}
        >
          Remove
        </Button>
      </div>

      {app.error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {app.error}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {app.tools.length > 0 && (
        <ul className="mt-2 divide-y">
          {app.tools.map((tool) => (
            <ToolRow key={tool.name} tool={tool} />
          ))}
        </ul>
      )}
    </section>
  );
}
