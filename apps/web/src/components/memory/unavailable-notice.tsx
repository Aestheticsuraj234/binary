import Link from 'next/link';

/** Memory and knowledge need an embedding model, from one of two keys. */
export function EmbeddingKeyNotice({what}: {what: string}) {
  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <p className="font-medium">{what} is off.</p>
      <p className="text-muted-foreground">
        It needs an embedding model: add an OpenAI or Google key under{' '}
        <Link href="/settings" className="text-foreground underline">
          API keys
        </Link>
        . (Anthropic has no embedding models.)
      </p>
    </div>
  );
}
