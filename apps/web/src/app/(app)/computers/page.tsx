import type {DeviceView} from '@binary/shared';
import type {Metadata} from 'next';

import {YourComputers} from '@/components/computers/your-computers';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Your computers · Binary'};

/** The user's own computers, paired with the Runner. */
export default async function ComputersPage() {
  const data = await getFromApi<{devices: DeviceView[]}>('/api/devices');

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-4 py-8 sm:px-6 lg:py-12">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">
          Your computers
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          The Runner is a small app that lets your characters work on your own
          computer: read and write files, run commands, or think with Claude
          Code and Codex. It only ever works inside the folders you share, and
          you can pause it at any time.
        </p>
      </div>
      <YourComputers initialDevices={data?.devices ?? []} />
    </main>
  );
}
