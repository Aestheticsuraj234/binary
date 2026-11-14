'use client';

import {FlaskConical, House, KeyRound} from 'lucide-react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';

import {cn} from '@/lib/utils';

const LINKS = [
  {href: '/', label: 'Home', icon: House},
  {href: '/playground', label: 'Playground', icon: FlaskConical},
  {href: '/settings', label: 'API keys', icon: KeyRound},
];

/** Top navigation. The current page gets a subtle filled pill. */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({href, label, icon: Icon}) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
            pathname === href && 'bg-secondary text-foreground',
          )}
        >
          <Icon className="size-4" />
          <span className="hidden sm:inline">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
