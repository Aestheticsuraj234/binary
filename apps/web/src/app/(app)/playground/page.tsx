import type {ProviderKeySummary} from '@binary/shared';
import type {Metadata} from 'next';

import {Playground} from '@/components/playground/playground';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Playground · Binary'};

export default async function PlaygroundPage() {
  const data = await getFromApi<{keys: ProviderKeySummary[]}>(
    '/api/provider-keys',
  );
  const connectedProviders = (data?.keys ?? []).map((key) => key.provider);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Playground</h1>
        <p className="text-muted-foreground">
          One prompt, every provider. Same question, three different minds.
        </p>
      </div>
      <Playground connectedProviders={connectedProviders} />
    </main>
  );
}
