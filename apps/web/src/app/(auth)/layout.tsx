import {APP_TAGLINE} from '@binary/shared';
import {Bot, Monitor, ShieldCheck} from 'lucide-react';
import {redirect} from 'next/navigation';

import {Logo} from '@/components/brand/logo';
import {getSession} from '@/lib/session';

const FEATURES = [
  {icon: Bot, text: 'Hire AI coworkers with a role, tools and memory.'},
  {
    icon: Monitor,
    text: 'Let them work on your computer, sandboxes and browsers.',
  },
  {icon: ShieldCheck, text: 'Approve every risky action from web or phone.'},
];

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Signed-in users have nothing to do on the sign-in pages.
  if (await getSession()) {
    redirect('/');
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r bg-card p-10 lg:flex">
        <Logo />
        <div className="space-y-8">
          <h1 className="max-w-md text-4xl font-semibold tracking-tight">
            {APP_TAGLINE}
          </h1>
          <ul className="space-y-4">
            {FEATURES.map(({icon: Icon, text}) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <Icon className="size-4 text-primary" />
                <span className="text-muted-foreground">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          Open source. Runs on your own machine.
        </p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
