'use client';

import {Check, Copy, KeyRound} from 'lucide-react';
import {useState} from 'react';

import {Button} from '@/components/ui/button';
import {API_URL} from '@/lib/env';

interface WebhookDetailsProps {
  routineId: string;
  webhookId: string;
  /** Only right after the webhook was turned on: it is never shown again. */
  secret?: string;
}

function CopyButton({text, label}: {text: string; label: string}) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      aria-label={label}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}

/**
 * How other services start this routine: the URL, and the secret they must
 * send. The secret is stored as a hash, so it can be shown only once; a new
 * one can always be made.
 */
export function WebhookDetails({
  routineId,
  webhookId,
  secret: initialSecret,
}: WebhookDetailsProps) {
  const [secret, setSecret] = useState(initialSecret);
  const [error, setError] = useState('');
  const url = `${API_URL}/api/hooks/routines/${webhookId}`;
  const example = `curl -X POST ${url} \\\n  -H "X-Binary-Secret: ${secret ?? '<your secret>'}" \\\n  -d "Anything the agent should know"`;

  async function handleNewSecret() {
    if (
      secret === undefined &&
      !window.confirm('Make a new secret? The old one stops working.')
    ) {
      return;
    }
    setError('');
    const response = await fetch(
      `${API_URL}/api/routines/${routineId}/webhook-secret`,
      {
        method: 'POST',
        credentials: 'include',
      },
    ).catch(() => null);
    if (!response?.ok) {
      setError('Could not make a new secret. Try again.');
      return;
    }
    const body: {webhookSecret: string} = await response.json();
    setSecret(body.webhookSecret);
  }

  return (
    <section className="space-y-3 rounded-3xl border bg-card p-5">
      <h3 className="font-semibold">Webhook</h3>
      <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-xs">{url}</code>
        <CopyButton text={url} label="Copy webhook URL" />
      </div>
      {secret ? (
        <div className="space-y-2 rounded-xl border border-warning/40 p-3">
          <p className="text-sm text-warning">
            Copy this secret now. It won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <code
              data-testid="webhook-secret"
              className="min-w-0 flex-1 truncate font-mono text-xs"
            >
              {secret}
            </code>
            <CopyButton text={secret} label="Copy webhook secret" />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          The secret was shown once when the webhook was turned on.
        </p>
      )}
      <pre className="overflow-x-auto rounded-xl bg-muted p-3 font-mono text-xs leading-relaxed">
        {example}
      </pre>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="rounded-full"
        onClick={handleNewSecret}
      >
        <KeyRound />
        New secret
      </Button>
    </section>
  );
}
