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
      size="icon-sm"
      className="rounded-full text-muted-foreground"
      onClick={handleSignOut}
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut />
    </Button>
  );
}
