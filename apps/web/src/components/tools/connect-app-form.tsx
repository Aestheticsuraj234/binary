'use client';

import {connectAppSchema} from '@binary/shared';
import {ExternalLink, Plug} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {API_URL} from '@/lib/env';

/**
 * Connect an app by its MCP server URL. Binary tries the connection before
 * saving, so a typo or a wrong token is caught here, not in a chat.
 */
export function ConnectAppForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = event.currentTarget;
    const values = new FormData(form);

    const parsed = connectAppSchema.safeParse({
      name: values.get('name'),
      url: values.get('url'),
      // An empty field means "no token", not an empty token.
      authorization: values.get('authorization') || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }

    setIsPending(true);
    const response = await fetch(`${API_URL}/api/apps`, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(parsed.data),
    }).catch(() => null);
    setIsPending(false);

    if (!response) {
      setError('Could not reach the API.');
      return;
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? 'Could not connect the app.');
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-3xl border bg-card p-5"
      noValidate
    >
      <div className="space-y-1">
        <h3 className="font-semibold">Connect an app</h3>
        <p className="text-sm text-muted-foreground">
          Paste an MCP server URL. For Gmail, Slack, GitHub and hundreds more,{' '}
          <a
            href="https://composio.dev"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-foreground hover:text-primary"
          >
            Composio <ExternalLink className="size-3" />
          </a>{' '}
          gives you one.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-2">
          <Label htmlFor="app-name">Name</Label>
          <Input
            id="app-name"
            name="name"
            placeholder="Gmail"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="app-url">MCP server URL</Label>
          <Input
            id="app-url"
            name="url"
            type="url"
            placeholder="https://mcp.composio.dev/..."
            className="h-10"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="app-authorization">
          Authorization header{' '}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="app-authorization"
          name="authorization"
          type="password"
          autoComplete="off"
          placeholder="Bearer ..."
          className="h-10"
        />
        <p className="text-xs text-muted-foreground">
          Encrypted before it is stored, like your API keys. Put secrets here,
          not in the URL.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="h-10 rounded-full px-5"
        disabled={isPending}
      >
        <Plug />
        {isPending ? 'Connecting…' : 'Connect'}
      </Button>
    </form>
  );
}
