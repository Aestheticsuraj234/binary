'use client';

import {LogOut} from 'lucide-react';
import {useRouter} from 'next/navigation';

import {Button} from '@/components/ui/button';
import {authClient} from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace('/sign-in');
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      aria-label="Sign out"
    >
      <LogOut />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
