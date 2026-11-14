import {
  PROVIDER_INFO,
  type PlaygroundResult,
  type Provider,
} from '@binary/shared';
import {LoaderCircle} from 'lucide-react';
import Link from 'next/link';

import {Markdown} from '@/components/chat/markdown';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';

/** What one provider's column is showing right now. */
export interface RunState {
  status: 'idle' | 'loading' | 'done' | 'error';
  result?: PlaygroundResult;
  error?: string;
}

interface ResultCardProps {
  provider: Provider;
  isConnected: boolean;
  model: string;
  onModelChange: (model: string) => void;
  run: RunState;
}

/** One provider's column: its model picker and its answer. */
export function ResultCard({
  provider,
  isConnected,
  model,
  onModelChange,
  run,
}: ResultCardProps) {
  const info = PROVIDER_INFO[provider];

  return (
    <Card className="min-h-72">
      <CardHeader className="space-y-3">
        <CardTitle>{info.label}</CardTitle>
        <NativeSelect
          size="sm"
          className="w-full"
          aria-label={`${info.label} model`}
          value={model}
          onChange={(event) => onModelChange(event.target.value)}
          disabled={!isConnected}
        >
          {info.models.map((id) => (
            <NativeSelectOption key={id} value={id}>
              {id}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        {!isConnected && (
          <p className="text-muted-foreground">
            No key yet.{' '}
            <Link
              href="/settings"
              className="text-foreground hover:text-primary"
            >
              Add one in API keys
            </Link>
            .
          </p>
        )}
        {isConnected && run.status === 'idle' && (
          <p className="text-muted-foreground">The answer will appear here.</p>
        )}
        {run.status === 'loading' && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin text-primary" />
            Thinking…
          </p>
        )}
        {run.status === 'error' && (
          <p role="alert" className="text-destructive">
            {run.error}
          </p>
        )}
        {run.result && run.status === 'done' && (
          <>
            <Markdown>{run.result.text}</Markdown>
            <p className="font-mono text-xs text-muted-foreground">
              {run.result.inputTokens} in · {run.result.outputTokens} out ·{' '}
              {(run.result.durationMs / 1000).toFixed(1)}s
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
