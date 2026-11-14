import {Bot, Sparkles} from 'lucide-react';
import {redirect} from 'next/navigation';

import {Logo} from '@/components/brand/logo';
import {SignOutButton} from '@/components/home/sign-out-button';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {getSession} from '@/lib/session';

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect('/sign-in');
  }

  const {user} = session;
  const nameParts = user.name.split(' ');
  const firstName = nameParts[0];
  const initials = nameParts
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <Logo />
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm sm:inline">{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-16">
        <div className="space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            You&apos;re signed in
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Welcome, {firstName}.
          </h1>
          <p className="text-muted-foreground">
            Your workspace is ready. Your AI coworkers will appear here soon.
          </p>
        </div>

        <Card className="border-dashed bg-transparent">
          <CardHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-lg bg-secondary">
              <Bot className="size-5 text-primary" />
            </div>
            <CardTitle>No agents yet</CardTitle>
            <CardDescription>
              Agents arrive in a later chapter. For now, your account and
              session are working end to end.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}
