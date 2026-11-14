'use client';

import {signInSchema} from '@binary/shared';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {FormField} from '@/components/auth/form-field';
import {Button} from '@/components/ui/button';
import {authClient} from '@/lib/auth-client';

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const form = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = signInSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }

    setIsPending(true);
    const result = await authClient.signIn.email(parsed.data);
    setIsPending(false);

    if (result.error) {
      setError(result.error.message ?? 'Could not sign in.');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to your Binary workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <FormField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="h-10 w-full" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New to Binary?{' '}
        <Link href="/sign-up" className="text-foreground hover:text-primary">
          Create an account
        </Link>
      </p>
    </div>
  );
}
