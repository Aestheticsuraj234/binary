'use client';

import {
  PROVIDER_INFO,
  saveProviderKeySchema,
  type Provider,
  type ProviderKeySummary,
} from '@binary/shared';
import {ExternalLink} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {API_URL} from '@/lib/env';

interface ProviderKeyCardProps {
  provider: Provider;
  /** The saved key's summary, or undefined when none is saved. */
  saved?: ProviderKeySummary;
}

/** Add, replace or remove one provider's API key. */
export function ProviderKeyCard({provider, saved}: ProviderKeyCardProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const info = PROVIDER_INFO[provider];
  const keyUrl = `${API_URL}/api/provider-keys/${provider}`;

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = event.currentTarget;

    const parsed = saveProviderKeySchema.safeParse({
      apiKey: new FormData(form).get('apiKey'),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the key.');
      return;
    }

    setIsPending(true);
    const response = await fetch(keyUrl, {
      method: 'PUT',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(parsed.data),
    }).catch(() => null);
    setIsPending(false);

    if (!response?.ok) {
      setError('Could not save the key. Try again.');
      return;
    }
    form.reset();
    router.refresh();
  }

  async function handleRemove() {
    setIsPending(true);
    const response = await fetch(keyUrl, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => null);
    setIsPending(false);

    if (!response?.ok) {
      setError('Could not remove the key. Try again.');
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{info.label}</CardTitle>
          {saved && <Badge variant="secondary">•••• {saved.last4}</Badge>}
          {!saved && (
            <Badge variant="outline" className="text-muted-foreground">
              Not added
            </Badge>
          )}
        </div>
        <CardDescription>
          <a
            href={info.keyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            Get a key <ExternalLink className="size-3" />
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleSave} className="flex gap-2" noValidate>
          <Input
            name="apiKey"
            type="password"
            autoComplete="off"
            aria-label={`${info.label} API key`}
            placeholder={
              saved ? 'Paste a new key to replace it' : 'Paste your key'
            }
            className="h-10"
          />
          <Button
            type="submit"
            variant="secondary"
            className="h-10"
            disabled={isPending}
          >
            Save
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {saved && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={handleRemove}
            disabled={isPending}
          >
            Remove key
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
