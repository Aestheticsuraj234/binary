import {redirect} from 'next/navigation';

import {AppNav} from '@/components/app/app-nav';
import {SignOutButton} from '@/components/app/sign-out-button';
import {Logo} from '@/components/brand/logo';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {getSession} from '@/lib/session';

/** The signed-in app: one header for every page, and a session check. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/sign-in');
  }

  const {user} = session;
  const initials = user.name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between gap-4 border-b px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <Logo />
          <AppNav />
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="hidden size-8 sm:flex">
            <AvatarFallback className="bg-secondary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm lg:inline">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
