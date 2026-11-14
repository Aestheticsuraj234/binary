'use client';

import {characterOf, type Agent, type ThreadSummary} from '@binary/shared';
import {
  Compass,
  FlaskConical,
  Inbox,
  KeyRound,
  Menu,
  Plug,
  Plus,
  Repeat,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {usePathname, useSearchParams} from 'next/navigation';
import {useState} from 'react';

import {SignOutButton} from '@/components/app/sign-out-button';
import {Logo} from '@/components/brand/logo';
import {CharacterAvatar} from '@/components/characters/character';
import {initialsOf} from '@/lib/initials';
import {cn} from '@/lib/utils';

const LINKS = [
  {href: '/today', label: 'Today', icon: Inbox},
  {href: '/', label: 'Discover', icon: Compass},
  {href: '/routines', label: 'Routines', icon: Repeat},
  {href: '/apps', label: 'Apps & tools', icon: Plug},
  {href: '/playground', label: 'Playground', icon: FlaskConical},
  {href: '/settings', label: 'API keys', icon: KeyRound},
];

interface AppSidebarProps {
  agents: Agent[];
  recentChats: ThreadSummary[];
  /** Requests waiting for the user, shown as a count next to Today. */
  pendingApprovals: number;
  user: {name: string; email: string};
}

interface SidebarContentProps extends AppSidebarProps {
  pathname: string;
  /** The open chat, from `?chat=` on an agent's page. */
  chatId: string | null;
}

const SECTION_LABEL =
  'px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase';
const ROW =
  'group flex items-center gap-3 rounded-2xl px-2 py-1.5 text-sm transition-colors hover:bg-secondary';

/** Everything in the sidebar. Shared by the desktop column and phone drawer. */
function SidebarContent({
  agents,
  recentChats,
  pendingApprovals,
  user,
  pathname,
  chatId,
}: SidebarContentProps) {
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
            {href === '/today' && pendingApprovals > 0 && (
              <span
                className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-warning px-1.5 text-xs font-semibold text-background"
                aria-label={`${pendingApprovals} waiting for you`}
              >
                {pendingApprovals}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Crew and chats share one scrolling area, so the profile stays put. */}
      <div className="-mx-1 min-h-0 flex-1 space-y-6 overflow-y-auto px-1">
        <section className="space-y-2">
          <p className={SECTION_LABEL}>Your crew</p>
          {agents.length === 0 && (
            <p className="px-3 text-sm text-muted-foreground">
              No one hired yet.
            </p>
          )}
          <ul aria-label="Your crew" className="space-y-0.5">
            {agents.map((agent) => (
              <li key={agent.id}>
                <Link
                  href={`/agents/${agent.id}`}
                  className={cn(
                    ROW,
                    pathname === `/agents/${agent.id}` &&
                      !chatId &&
                      'bg-secondary',
                  )}
                >
                  <CharacterAvatar id={characterOf(agent.avatar)} size={32} />
                  <span className="truncate font-medium">{agent.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {recentChats.length > 0 && (
          <section className="space-y-2">
            <p className={SECTION_LABEL}>Recent chats</p>
            <ul aria-label="Recent chats" className="space-y-0.5">
              {recentChats.map((chat) => (
                <li key={chat.id}>
                  <Link
                    href={`/agents/${chat.agent.id}?chat=${chat.id}`}
                    title={`${chat.title} · ${chat.agent.name}`}
                    className={cn(
                      ROW,
                      'text-muted-foreground hover:text-foreground',
                      chatId === chat.id && 'bg-secondary text-foreground',
                    )}
                  >
                    <CharacterAvatar
                      id={characterOf(chat.agent.avatar)}
                      size={24}
                    />
                    <span className="truncate">{chat.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
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
 * a slide-out drawer on phones. Your hired characters and recent chats live
 * here, one click from a conversation.
 */
export function AppSidebar({
  agents,
  recentChats,
  pendingApprovals,
  user,
}: AppSidebarProps) {
  const pathname = usePathname();
  const chatId = useSearchParams().get('chat');
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
        <SidebarContent
          agents={agents}
          recentChats={recentChats}
          pendingApprovals={pendingApprovals}
          user={user}
          pathname={pathname}
          chatId={chatId}
        />
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
            <SidebarContent
              agents={agents}
              recentChats={recentChats}
              pendingApprovals={pendingApprovals}
              user={user}
              pathname={pathname}
              chatId={chatId}
            />
          </div>
        </div>
      )}
    </>
  );
}
