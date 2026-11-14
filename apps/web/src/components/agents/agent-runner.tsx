'use client';

import {runAgentSchema, type AgentRunResult} from '@binary/shared';
import {LoaderCircle, Send} from 'lucide-react';
import {useState} from 'react';

import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {API_URL} from '@/lib/env';

interface AgentRunnerProps {
  agentId: string;
  agentName: string;
}

/**
 * Send the agent one message and read its answer. A full conversation with
 * history and streaming arrives with chat in Chapter 5.
 */
export function AgentRunner({agentId, agentName}: AgentRunnerProps) {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AgentRunResult | null>(null);

  async function handleRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = runAgentSchema.safeParse({prompt});
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the message.');
      return;
    }

    setError('');
    setResult(null);
    setIsRunning(true);
    const response = await fetch(`${API_URL}/api/agents/${agentId}/run`, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(parsed.data),
    }).catch(() => null);
    setIsRunning(false);

    if (!response) {
      setError('Could not reach the API.');
      return;
    }
    const body = await response.json();
    if (!response.ok) {
      setError(body.error);
      return;
    }
    setResult(body);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleRun} className="space-y-3">
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          aria-label={`Message to ${agentName}`}
          placeholder={`Give ${agentName} a task…`}
          className="min-h-28 resize-y"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="h-10" disabled={isRunning}>
          <Send />
          Send
        </Button>
      </form>

      <div className="min-h-40 rounded-xl border p-4 text-sm">
        {!isRunning && !result && (
          <p className="text-muted-foreground">
            {agentName}&apos;s answer will appear here.
          </p>
        )}
        {isRunning && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin text-primary" />
            {agentName} is thinking…
          </p>
        )}
        {result && (
          <div className="space-y-3">
            <p className="leading-relaxed whitespace-pre-wrap">{result.text}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {result.inputTokens} in · {result.outputTokens} out ·{' '}
              {(result.durationMs / 1000).toFixed(1)}s
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
