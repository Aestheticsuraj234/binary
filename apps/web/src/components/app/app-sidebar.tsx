'use client';

import {characterOf, type Agent} from '@binary/shared';
import {Compass, FlaskConical, KeyRound, Menu, Plus, X} from 'lucide-react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';

import {SignOutButton} from '@/components/app/sign-out-button';
import {Logo} from '@/components/brand/logo';
import {CharacterAvatar} from '@/components/characters/character';
import {initialsOf} from '@/lib/initials';
import {cn} from '@/lib/utils';

const LINKS = [
  {href: '/', label: 'Discover', icon: Compass},
  {href: '/playground', label: 'Playground', icon: FlaskConical},
  {href: '/settings', label: 'API keys', icon: KeyRound},
];

interface AppSidebarProps {
  agents: Agent[];
  user: {name: string; email: string};
}

interface SidebarContentProps extends AppSidebarProps {
  pathname: string;
}

/** Everything in the sidebar. Shared by the desktop column and phone drawer. */
function SidebarContent({agents, user, pathname}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/" className="px-2 pt-2">
        <Logo />
      </Link>

      <Link
        href="/agents/new"
        className="flex h-10 items-center justify-center gap-2 rounded-full border border-dashed text-sm font-medium transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-4" />
        Hire a character
      </Link>

      <nav className="space-y-1">
        {LINKS.map(({href, label, icon: Icon}) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
              pathname === href && 'bg-secondary text-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="min-h-0 flex-1 space-y-2">
        <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Your crew
        </p>
        {agents.length === 0 && (
          <p className="px-3 text-sm text-muted-foreground">
            No one hired yet.
          </p>
        )}
        <ul className="-mx-1 max-h-full space-y-1 overflow-y-auto px-1">
          {agents.map((agent) => {
            const isActive = pathname.startsWith(`/agents/${agent.id}`);
            return (
              <li key={agent.id}>
                <Link
                  href={`/agents/${agent.id}`}
                  className={cn(
                    'group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-secondary',
                    isActive && 'bg-secondary',
                  )}
                >
                  <CharacterAvatar id={characterOf(agent.avatar)} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {agent.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {agent.role}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border bg-card p-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-medium">
          {initialsOf(user.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {user.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </span>
        <SignOutButton />
      </div>
    </div>
  );
}

/**
 * The app's navigation: a fixed column on large screens, and a top bar with
 * a slide-out drawer on phones. Your hired characters live here, one click
 * from a conversation.
 */
export function AppSidebar({agents, user}: AppSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close the drawer when any link inside it is followed.
  function handleDrawerClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest('a')) {
      setIsOpen(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
        <Link href="/">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="grid size-10 place-items-center rounded-full hover:bg-secondary"
        >
          <Menu className="size-5" />
        </button>
      </header>

      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-r bg-card/40 lg:block">
        <SidebarContent agents={agents} user={user} pathname={pathname} />
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="animate-slide-in absolute inset-y-0 left-0 w-80 max-w-[85vw] border-r bg-background"
            onClick={handleDrawerClick}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-4 grid size-9 place-items-center rounded-full hover:bg-secondary"
            >
              <X className="size-4" />
            </button>
            <SidebarContent agents={agents} user={user} pathname={pathname} />
          </div>
        </div>
      )}
    </>
  );
}
