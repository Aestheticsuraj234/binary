import {PROVIDERS, type ProviderKeySummary} from '@binary/shared';
import {Lock} from 'lucide-react';
import type {Metadata} from 'next';

import {ProviderKeyCard} from '@/components/settings/provider-key-card';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'API keys · Binary'};

export default async function SettingsPage() {
  const data = await getFromApi<{keys: ProviderKeySummary[]}>(
    '/api/provider-keys',
  );
  const savedKeys = data?.keys ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">API keys</h1>
        <p className="text-muted-foreground">
          Binary calls AI models with your own keys, so you only pay your
          provider for what you use.
        </p>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="size-4 text-primary" />
          Keys are encrypted with AES-256-GCM. Only the last 4 characters are
          ever shown.
        </p>
      </div>

      <div className="space-y-4">
        {PROVIDERS.map((provider) => (
          <ProviderKeyCard
            key={provider}
            provider={provider}
            saved={savedKeys.find((key) => key.provider === provider)}
          />
        ))}
      </div>
    </main>
  );
}
