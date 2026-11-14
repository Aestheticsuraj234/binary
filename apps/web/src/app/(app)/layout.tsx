import type {Agent} from '@binary/shared';
import {redirect} from 'next/navigation';

import {AppSidebar} from '@/components/app/app-sidebar';
import {getFromApi} from '@/lib/server-api';
import {getSession} from '@/lib/session';

/**
 * The signed-in app: a session check, the sidebar with the user's crew, and
 * the page. `router.refresh()` re-runs this layout, so hiring or firing a
 * character updates the sidebar straight away.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, agentData] = await Promise.all([
    getSession(),
    getFromApi<{agents: Agent[]}>('/api/agents'),
  ]);
  if (!session) {
    redirect('/sign-in');
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AppSidebar agents={agentData?.agents ?? []} user={session.user} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
