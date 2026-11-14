'use client';

import {Trash2} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {Button} from '@/components/ui/button';
import {API_URL} from '@/lib/env';

interface DeleteAgentButtonProps {
  agentId: string;
  agentName: string;
}

/** Deletes the agent after the user confirms, then goes back to the list. */
export function DeleteAgentButton({
  agentId,
  agentName,
}: DeleteAgentButtonProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Fire ${agentName}? This cannot be undone.`)) {
      return;
    }
    setIsPending(true);
    const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => null);
    setIsPending(false);

    if (!response?.ok) {
      setError('Could not delete the agent. Try again.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 />
        Fire {agentName}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
