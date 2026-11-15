import {
  TOOL_RISKS,
  type AgentComputer,
  type ConnectedApp,
  type ToolInfo,
} from '@binary/shared';
import {Plug} from 'lucide-react';
import type {Metadata} from 'next';

import {ComputerSection} from '@/components/computers/computer-section';
import {AppCard} from '@/components/tools/app-card';
import {ConnectAppForm} from '@/components/tools/connect-app-form';
import {RISK_INFO, RiskBadge} from '@/components/tools/risk-badge';
import {ToolRow} from '@/components/tools/tool-row';
import type {ComputerList} from '@/lib/computers';
import {getFromApi} from '@/lib/server-api';

export const metadata: Metadata = {title: 'Apps & tools · Binary'};

export default async function AppsPage() {
  const [data, computerData] = await Promise.all([
    getFromApi<{
      builtIn: ToolInfo[];
      computers: {kind: AgentComputer; available: boolean; tools: ToolInfo[]}[];
      apps: ConnectedApp[];
    }>('/api/apps'),
    getFromApi<ComputerList>('/api/computers'),
  ]);
  const running = computerData?.computers ?? [];
  const builtIn = data?.builtIn ?? [];
  const apps = data?.apps ?? [];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-4 py-8 sm:px-6 lg:py-12">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">
          Apps &amp; tools
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Tools let your characters look things up and act for you. Every
          character can use the built-in tools and your apps; characters with a
          computer (a cloud sandbox or a browser) get its tools too.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {TOOL_RISKS.map((risk) => (
          <div key={risk} className="space-y-2 rounded-2xl border p-4">
            <RiskBadge risk={risk} />
            <p className="text-sm text-muted-foreground">
              {RISK_INFO[risk].explanation}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          Built into Binary
        </h2>
        <ul className="divide-y rounded-3xl border bg-card px-5">
          {builtIn.map((tool) => (
            <ToolRow key={tool.name} tool={tool} />
          ))}
        </ul>
      </section>

      {(data?.computers ?? []).map((computer) => (
        <ComputerSection
          key={computer.kind}
          kind={computer.kind}
          available={computer.available}
          tools={computer.tools}
          running={running.filter((item) => item.kind === computer.kind)}
        />
      ))}

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Connected apps
        </h2>
        <ConnectAppForm />
        {apps.length === 0 && (
          <div className="flex items-center gap-4 rounded-3xl border border-dashed p-5">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
              <Plug className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">No apps yet</p>
              <p className="text-sm text-muted-foreground">
                Apps you connect show up here with the tools they add.
              </p>
            </div>
          </div>
        )}
        {apps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </section>
    </main>
  );
}
